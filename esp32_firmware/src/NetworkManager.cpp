#include "NetworkManager.h"

bool isInternetAvailable = false;
unsigned long lastHeartbeat = 0;
unsigned long lastCardsSync = 0;
EthernetClient ethClient;

void initNetwork() {
  selectEthernet();
  Ethernet.init(W5500_CS);
  Serial.println("🌐 W5500 Ethernet başlatılıyor, DHCP'den IP alınıyor...");
  if (Ethernet.begin((byte*)MAC_ADDRESS) == 0) {
    Serial.println("⚠️ W5500 DHCP üzerinden IP alamadı. Çevrimdışı (LittleFS) modda devam ediliyor.");
    isInternetAvailable = false;
  } else {
    Serial.print("✅ W5500 Ethernet Bağlandı! IP Adresi: ");
    Serial.println(Ethernet.localIP());
    isInternetAvailable = true;
    
    // Türkiye Saat Dilimi NTP Zaman Senkronizasyonu (UTC+3)
    configTime(3 * 3600, 0, "pool.ntp.org", "time.nist.gov");

    // Açılışta API'den güncel kart listesini otomatik olarak çekip LittleFS'e kaydet!
    updateLocalCardsFromAPI();
    syncPendingLogs();
  }
}

// 🌐 Ethernet Bağlantısı & İnternet Kontrolü
void checkEthernetConnection() {
  selectEthernet();
  if (Ethernet.linkStatus() == LinkON) {
    if (!isInternetAvailable) {
      Serial.println("🌐 [İnternet Bağlantısı Kuruldu] LittleFS senkronizasyonu başlatılıyor...");
      isInternetAvailable = true;
      updateLocalCardsFromAPI(); // Kart listesini hemen güncelle
      syncPendingLogs();        // Çevrimdışı oluşan logları otomatik olarak REST API'ye aktar!
    }
  } else {
    if (isInternetAvailable) {
      Serial.println("🔌 [İnternet Kesildi] Çevrimdışı Moda Geçildi (LittleFS cards.json Kullanılacak).");
      isInternetAvailable = false;
    }
  }
}

// 🔄 API'DEN GÜNCEL KART LİSTESİNİ ÇEKİP LITTLEFS cards.json DOSYASINI OTOMATİK GÜNCELLEME
void updateLocalCardsFromAPI() {
  if (!isInternetAvailable) return;

  Serial.println("⚡ [LITTLEFS SENKRON] REST API'den güncel cards.json listesi isteniyor...");

  selectEthernet();
  if (ethClient.connect(API_HOST, API_PORT)) {
    ethClient.println("GET /api/cards HTTP/1.1");
    ethClient.println("Host: " + String(API_HOST));
    ethClient.println("Connection: close");
    ethClient.println();

    unsigned long timeout = millis();
    while (ethClient.available() == 0) {
      if (millis() - timeout > 4000) {
        Serial.println("⚠️ [Zamanaşımı] Kart güncellemesi yanıt vermedi.");
        ethClient.stop();
        selectRFID();
        return;
      }
    }

    String response = ethClient.readString();
    ethClient.stop();
    selectRFID();

    int jsonStart = response.indexOf("{\"success\":true");
    if (jsonStart != -1) {
      String jsonBody = response.substring(jsonStart);
      
      DynamicJsonDocument doc(4096);
      DeserializationError err = deserializeJson(doc, jsonBody);
      
      if (!err) {
        if (doc.containsKey("timestamp")) {
          baseTimestampStr = doc["timestamp"].as<String>();
          baseSyncMillis = millis();
        }
        if (doc.containsKey("data")) {
          File file = LittleFS.open("/cards.json", "w");
          serializeJson(doc["data"], file);
          file.close();
          
          Serial.println("✅ [LITTLEFS OK] LittleFS cards.json ve Zaman Ofseti (" + baseTimestampStr + ") başarıyla güncellendi!");
        }
      }
    }
  } else {
    selectRFID();
  }
}

// 💳 KART OKUMA İŞLEMİ (ONLINE REST API VEYA OFFLINE LITTLEFS)
void handleCardRead(String cardUID) {
  bool isAuthorized = false;
  bool processedOnline = false;
  String holderName = "Kullanıcı";

  if (isInternetAvailable) {
    Serial.println("🌐 REST API'ye yetki kontrol isteği gönderiliyor...");
    
    selectEthernet();
    if (ethClient.connect(API_HOST, API_PORT)) {
      String postData = "{\"uid\":\"" + cardUID + "\",\"gate\":\"" + String(DEVICE_GATE) + "\",\"direction\":\"Giriş\"}";
      
      ethClient.println("POST /api/logs HTTP/1.1");
      ethClient.println("Host: " + String(API_HOST));
      ethClient.println("Content-Type: application/json");
      ethClient.print("Content-Length: ");
      ethClient.println(postData.length());
      ethClient.println("Connection: close");
      ethClient.println();
      ethClient.println(postData);

      unsigned long timeout = millis();
      while (ethClient.available() == 0) {
        if (millis() - timeout > 3000) {
          Serial.println("⚠️ [API Zamanaşımı] Çevrimdışı doğrulama moduna geçiliyor.");
          ethClient.stop();
          break;
        }
      }

      if (ethClient.available()) {
        String response = ethClient.readString();
        ethClient.stop();
        processedOnline = true;
        
        if (response.indexOf("\"authorized\":true") > 0) {
          isAuthorized = true;
        }
      }
    } else {
      Serial.println("⚠️ REST API Sunucusuna Bağlanılamadı! Çevrimdışı (LittleFS) doğrulama moduna geçiliyor.");
    }
    selectRFID();
  }

  // --- EĞER ONLINE CEVAP ALINAMADIYSA ÇEVRİMDİŞİ (OFFLINE) MODA DÜŞ ---
  if (!processedOnline) {
    Serial.println("📁 Çevrimdışı Mod: LittleFS cards.json dosyasından kontrol ediliyor...");
    isAuthorized = checkCardAuthorizationOffline(cardUID, holderName);
    
    // Çevrimdışı Okutmayı LittleFS pendingLogs.json Dosyasına Yaz!
    logAccessOffline(cardUID, isAuthorized, holderName);
  }

  // İzin Durumuna Göre Röle Çalıştır
  if (isAuthorized) {
    grantAccess();
  } else {
    denyAccess();
  }
}

// ⚡ LittleFS pendingLogs.json Üzerindeki Bekleyen Logları REST API'ye Aktarma
void syncPendingLogs() {
  if (!LittleFS.exists("/pendingLogs.json")) return;

  File file = LittleFS.open("/pendingLogs.json", "r");
  String pendingJson = file.readString();
  file.close();

  if (pendingJson.length() < 5) return;

  Serial.println("⚡ [LITTLEFS SENKRON] Bekleyen tüm çevrimdışı loglar REST API'ye (Firestore) aktarılıyor...");

  selectEthernet();
  if (ethClient.connect(API_HOST, API_PORT)) {
    String postPayload = "{\"pendingLogs\":" + pendingJson + "}";
    
    ethClient.println("POST /api/logs/sync HTTP/1.1");
    ethClient.println("Host: " + String(API_HOST));
    ethClient.println("Content-Type: application/json");
    ethClient.print("Content-Length: ");
    ethClient.println(postPayload.length());
    ethClient.println("Connection: close");
    ethClient.println();
    ethClient.println(postPayload);

    delay(500);
    ethClient.stop();
    selectRFID();

    // Senkronize edilen dosyayı temizle
    LittleFS.remove("/pendingLogs.json");
    Serial.println("✅ [LITTLEFS SENKRON OK] Bekleyen tüm çevrimdışı loglar REST API'ye (Firestore) aktarıldı ve LittleFS temizlendi!");
  } else {
    selectRFID();
  }
}
