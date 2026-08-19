#include "NetworkManager.h"
#include "StatusPanelHTML.h"
#include <EthernetUdp.h>

bool isInternetAvailable = false;
unsigned long lastHeartbeat = 0;
unsigned long lastCardsSync = 0;
EthernetClient ethClient;
EthernetUDP cardSyncUDP;
EthernetUDP serverBeaconUDP;
const uint16_t UDP_CARD_SYNC_PORT = 5001;
const uint16_t UDP_SERVER_BEACON_PORT = 5002;
IPAddress discoveredServerIP(0, 0, 0, 0);
String lastScannedUID = "Henüz Yok";
String lastScannedResult = "-";

// ESP32 Framework Uyumluluğu İçin EthernetServer Sınıfı
class ESP32EthernetServer : public EthernetServer {
public:
  ESP32EthernetServer(uint16_t port) : EthernetServer(port) {}
  virtual void begin(uint16_t port = 0) override {
    (void)port;
    EthernetServer::begin();
  }
};

// ESP32 Yerel Durum Arayüzü İçin Port 80 Web Sunucusu
ESP32EthernetServer statusServer(80);

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

  // Yerel Cihaz Durum Arayüzü Sunucusunu Başlat (Port 80)
  statusServer.begin();
  
  // Anlık Kart Güncelleme UDP Dinleyicisini Başlat (Port 5001)
  cardSyncUDP.begin(UDP_CARD_SYNC_PORT);

  // Otomatik IP Keşfi UDP Dinleyicisini Başlat (Port 5002)
  serverBeaconUDP.begin(UDP_SERVER_BEACON_PORT);

  if (isInternetAvailable) {
    Serial.println("🖥️ Yerel Cihaz Durum Paneli Aktif -> http://" + Ethernet.localIP().toString() + "/");
    Serial.println("⚡ Anlık UDP Dinleyici Aktif -> Port 5001 & Port 5002 (Otomatik IP Keşfi)");
  } else {
    Serial.println("🖥️ Yerel Cihaz Durum Paneli Aktif (Port 80 dinleniyor, IP bekleniyor)");
  }
}

// 🌐 Ethernet Bağlantısı & İnternet Kontrolü
void checkEthernetConnection() {
  selectEthernet();
  if (Ethernet.linkStatus() == LinkON) {
    if (!isInternetAvailable) {
      Serial.println("🌐 [İnternet Bağlantısı Kuruldu] LittleFS senkronizasyonu başlatılıyor...");
      Serial.println("🖥️ Yerel Cihaz Durum Paneli -> http://" + Ethernet.localIP().toString() + "/");
      isInternetAvailable = true;
      updateLocalCardsFromAPI(); // Kart listesini hemen güncelle
      syncPendingLogs();        // Çevrimdışı oluşan logları otomatik olarak REST API'ye aktar!
      displayStandby();         // LCD Ekranı Güncelle
    }
  } else {
    if (isInternetAvailable) {
      Serial.println("🔌 [İnternet Kesildi] Çevrimdışı Moda Geçildi (LittleFS cards.json Kullanılacak).");
      isInternetAvailable = false;
      displayStandby();         // LCD Ekranı Güncelle
    }
  }
}

// 📡 REST API SUNUCUSUNA OTOMATİK KEŞFEDİLEN IP, mDNS VEYA YEDEK IP İLE BAĞLANTI
bool connectToAPIServer() {
  selectEthernet();

  // 1. Otomatik UDP Beacon İle Keşfedilen Canlı Sunucu IP'si
  if (discoveredServerIP[0] != 0) {
    if (ethClient.connect(discoveredServerIP, API_PORT)) {
      return true;
    }
  }

  // 2. mDNS Yerel Alan Adı Üzerinden Bağlan (esp32-server.local:5000)
  if (ethClient.connect(API_HOST, API_PORT)) {
    return true;
  }

  // 3. mDNS Beklemedeyse Doğrudan Yedek IP Üzerinden Bağlan (10.130.0.52:5000)
  IPAddress fallbackIP(10, 130, 0, 52);
  if (ethClient.connect(fallbackIP, API_PORT)) {
    return true;
  }

  return false;
}

// 🔄 API'DEN GÜNCEL KART LİSTESİNİ ÇEKİP LITTLEFS cards.json DOSYASINI OTOMATİK GÜNCELLEME
void updateLocalCardsFromAPI() {
  if (!isInternetAvailable) return;

  Serial.println("⚡ [LITTLEFS SENKRON] REST API'den güncel cards.json listesi isteniyor...");

  if (connectToAPIServer()) {
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
      
      DynamicJsonDocument doc(16384);
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
  String holderNameResolved = "Kullanici";

  if (isInternetAvailable) {
    Serial.println("🌐 REST API'ye yetki kontrol isteği gönderiliyor...");
    
    if (connectToAPIServer()) {
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

        // Ekranda Göstermek İçin JSON Yanıtından holderName Çek
        int nameStart = response.indexOf("\"holderName\":\"");
        if (nameStart > 0) {
          int nameEnd = response.indexOf("\"", nameStart + 14);
          if (nameEnd > nameStart) {
            holderNameResolved = response.substring(nameStart + 14, nameEnd);
          }
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
    isAuthorized = checkCardAuthorizationOffline(cardUID, holderNameResolved);
    
    // Çevrimdışı Okutmayı LittleFS pendingLogs.json Dosyasına Yaz!
    logAccessOffline(cardUID, isAuthorized, holderNameResolved);
  }

  // Son okutulan kart bilgisini Cihaz Durum Paneli için sakla
  lastScannedUID = cardUID;
  lastScannedResult = isAuthorized ? ("Yetkili (" + holderNameResolved + ")") : "Yetkisiz (Reddedildi)";

  // İzin Durumuna Göre LCD Ekranı Güncelle ve Röle Çalıştır
  if (isAuthorized) {
    displayAccessGranted(holderNameResolved);
    grantAccess();
  } else {
    displayAccessDenied("Kapı Yetkisi Yok");
    denyAccess();
    delay(2000); // Erişim Yok mesajı ekranda 2 saniye kalsın
  }

  // Okuma ve Röle Süreci Bittiğinde LCD Ekranı Tekrar Bekleme Moduna ("KARTINIZI OKUTUNUZ") Al
  displayStandby();
}

// ⚡ LittleFS pendingLogs.json Üzerindeki Bekleyen Logları REST API'ye Aktarma
void syncPendingLogs() {
  if (!LittleFS.exists("/pendingLogs.json")) return;

  File file = LittleFS.open("/pendingLogs.json", "r");
  String pendingJson = file.readString();
  file.close();

  if (pendingJson.length() < 5) return;

  Serial.println("⚡ [LITTLEFS SENKRON] Bekleyen tüm çevrimdışı loglar REST API'ye (Firestore) aktarılıyor...");

  if (connectToAPIServer()) {
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

// 🌐 YEREL ESP32 CİHAZ DURUM PANELİ (DEVICE STATUS PANEL WEB SERVER - PORT 80)
void handleStatusWebRequests() {
  selectEthernet();
  EthernetClient client = statusServer.available();
  if (!client) {
    selectRFID();
    return;
  }

  unsigned long timeout = millis();
  String requestLine = "";
  boolean currentLineIsBlank = true;
  while (client.connected() && (millis() - timeout < 1000)) {
    if (client.available()) {
      char c = client.read();
      if (requestLine.length() < 100) {
        requestLine += c;
      }
      if (c == '\n' && currentLineIsBlank) {
        // İSTEK ALINDI - YANIT OLUŞTUR
        if (requestLine.indexOf("GET /api/status") >= 0) {
          // CANLI METRİK JSON YANITI
          size_t totalBytes = getLittleFSTotalBytes();
          size_t usedBytes = getLittleFSUsedBytes();
          size_t freeBytes = getLittleFSFreeBytes();
          float usagePct = getLittleFSUsagePercentage();

          float totalMB = (float)totalBytes / (1024.0 * 1024.0);
          float usedMB = (float)usedBytes / (1024.0 * 1024.0);
          float freeMB = (float)freeBytes / (1024.0 * 1024.0);

          DynamicJsonDocument doc(1024);
          doc["deviceId"] = DEVICE_ID;
          doc["gateName"] = DEVICE_GATE;
          doc["ip"] = Ethernet.localIP().toString();
          doc["ethernet"] = (Ethernet.linkStatus() == LinkON);
          doc["apiServer"] = isInternetAvailable;
          doc["rfid"] = true;
          doc["relay"] = (digitalRead(RELAY_PIN) == LOW);
          doc["lcd"] = true;

          JsonObject lfs = doc.createNestedObject("littlefs");
          lfs["totalMB"] = String(totalMB, 2);
          lfs["usedMB"] = String(usedMB, 2);
          lfs["freeMB"] = String(freeMB, 2);
          lfs["usagePercent"] = String(usagePct, 1);

          doc["cardsCount"] = getRegisteredCardCount();
          doc["pendingLogsCount"] = getPendingLogCount();
          doc["lastUID"] = lastScannedUID;
          doc["lastResult"] = lastScannedResult;

          String jsonStr;
          serializeJson(doc, jsonStr);

          client.println("HTTP/1.1 200 OK");
          client.println("Content-Type: application/json");
          client.println("Access-Control-Allow-Origin: *");
          client.println("Connection: close");
          client.println();
          client.println(jsonStr);
        } else {
          // HTML WEBPAGE YANITI (512-Byte Parçalı Akış)
          String htmlStr = String(FPSTR(STATUS_PANEL_HTML));
          client.println("HTTP/1.1 200 OK");
          client.println("Content-Type: text/html; charset=utf-8");
          client.println("Content-Length: " + String(htmlStr.length()));
          client.println("Connection: close");
          client.println();

          // W5500 Ethernet Soket Paketi Kesilmesini Önlemek İçin 512 Baytlık Parçalarla Gönder
          size_t totalLen = htmlStr.length();
          size_t pos = 0;
          while (pos < totalLen) {
            size_t chunkSize = totalLen - pos;
            if (chunkSize > 512) chunkSize = 512;
            client.write((const uint8_t*)(htmlStr.c_str() + pos), chunkSize);
            pos += chunkSize;
          }
        }
        break;
      }
      if (c == '\n') {
        currentLineIsBlank = true;
      } else if (c != '\r') {
        currentLineIsBlank = false;
      }
    }
  }

  delay(10);
  client.stop();
  selectRFID();
}

// ⚡ Anlık UDP Kart Güncelleme & Otomatik IP Keşfi Dinleyicisi (Port 5001 & Port 5002)
void listenForCardSyncUDPSignal() {
  selectEthernet();

  // 1. Port 5002 Sunucu Otomatik IP Keşfi UDP Duyurusu (SERVER_BEACON:10.130.0.52:5000)
  int beaconPacketSize = serverBeaconUDP.parsePacket();
  if (beaconPacketSize) {
    char beaconBuffer[64];
    int len = serverBeaconUDP.read(beaconBuffer, 63);
    if (len > 0) beaconBuffer[len] = 0;
    
    String pkt = String(beaconBuffer);
    if (pkt.startsWith("SERVER_BEACON:")) {
      int firstColon = pkt.indexOf(':');
      int secondColon = pkt.indexOf(':', firstColon + 1);
      if (secondColon != -1) {
        String discoveredIPStr = pkt.substring(firstColon + 1, secondColon);
        IPAddress newIP;
        if (newIP.fromString(discoveredIPStr)) {
          if (discoveredServerIP != newIP) {
            discoveredServerIP = newIP;
            Serial.println("📡 [OTOMATİK IP KEŞFEDİLDİ] API Sunucusunun Canlı IP Adresi Bulundu -> " + discoveredServerIP.toString());
            isInternetAvailable = true;
          }
        }
      }
    }
  }

  // 2. Port 5001 Anlık Kart Güncelleme Sinyali
  int packetSize = cardSyncUDP.parsePacket();
  if (packetSize) {
    char packetBuffer[64];
    int len = cardSyncUDP.read(packetBuffer, 63);
    if (len > 0) packetBuffer[len] = 0;
    
    if (String(packetBuffer).indexOf("CARDS_UPDATED") != -1) {
      Serial.println("⚡ [UDP SİNYAL ALINDI] Web panelinden kart değişikliği yapıldı! LittleFS cards.json anında güncelleniyor...");
      updateLocalCardsFromAPI();
    }
  }
  selectRFID();
}
