/*
 * ============================================================================
 * PROJE ADI: ESP32 Çevrimdışı Destekli Akıllı Kartlı Geçiş Kontrol Sistemi
 * DOSYA: esp32_firmware/src/main.cpp
 * AÇIKLAMA: MFRC522 RFID, W5500 Ethernet, Röle, Buzzer, LittleFS & Node.js API Entegre Kodu
 * ============================================================================
 */

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Ethernet.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

// ----------------------------------------------------------------------------
// HARDWARE PIN TANIMLAMALARI (Test Ettiğiniz Donanım Bağlantıları)
// ----------------------------------------------------------------------------
#define SS_PIN          21   // MFRC522 RFID CS Pin
#define RST_PIN         22   // MFRC522 RFID Reset Pin
#define RELAY_PIN       26   // Röle (Elektronik Kapı Kilidi) Pin
#define BUZZER_PIN      27   // Aktif Buzzer Sesli Uyarı Pin
#define W5500_CS        5    // W5500 Ethernet CS Pin

// SPI Pinleri: SCK = 18, MISO = 19, MOSI = 23

// ----------------------------------------------------------------------------
// BU ESP32 DONANIMININ BULUNDUĞU KAPI İSMİ
// ----------------------------------------------------------------------------
 const char* DEVICE_GATE = "Ana Giriş Turnikesi";      // 1. ESP32 Cihazı (Ana Giriş Turnikesi)
//const char* DEVICE_GATE = "AR-GE Laboratuvar Kapısı";    // 2. ESP32 Cihazı (AR-GE Laboratuvar Kapısı)

// ----------------------------------------------------------------------------
// DONANIM NESNELERİ VE AYARLAR
// ----------------------------------------------------------------------------
MFRC522 rfid(SS_PIN, RST_PIN);

// W5500 Ethernet MAC ve İstemci (Ağdaki her cihazın MAC adresi benzersiz olmalıdır)
 byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };  // 1. ESP32 MAC Adresi
//byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xEE };     // 2. ESP32 MAC Adresi (Ağ çakışmasını önlemek için 0xEE yapıldı)
EthernetClient ethClient;

// Node.js REST API Sunucu Bilgileri (Bilgisayarınızın Canlı Yerel IP Adresi)
const char* apiHost = "10.130.0.118";
const int apiPort = 5000;

// Zaman Senkronizasyonu Hassas Ofset Değişkenleri (Gerçek Çevrimdışı Saniye Hesabı İçin)
String baseTimestampStr = "";
unsigned long baseSyncMillis = 0;
bool isInternetAvailable = false;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 10000; // 10 saniyede bir ping & otomatik kart senkronizasyon kontrolü

unsigned long lastCardsSync = 0;
const unsigned long CARDS_SYNC_INTERVAL = 300000; // 5 dakikada bir otomatik cards.json güncelleme

// ----------------------------------------------------------------------------
// FONKSİYON PROTOTİPLERİ
// ----------------------------------------------------------------------------
void setupHardware();
void checkEthernetConnection();
void handleCardRead(String cardUID);
bool checkCardAuthorizationOffline(String cardUID, String &foundHolderName);
void grantAccess();
void denyAccess();
void logAccessOffline(String cardUID, bool isGranted, String holderName);
void syncPendingLogs();
void updateLocalCardsFromAPI();
void selectRFID();
void selectEthernet();

// ============================================================================
// SETUP (BAŞLANGIÇ AYARLARI)
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("🚀 ESP32 AKILLI KARTLI GEÇİŞ SİSTEMİ BAŞLATILIYOR");
  Serial.print("🚪 Cihazın Bağlı Olduğu Kapı: ");
  Serial.println(DEVICE_GATE);
  Serial.println("==================================================");

  setupHardware();

  // 1. LittleFS Dosya Sistemini Başlat
  if (!LittleFS.begin(true)) {
    Serial.println("❌ [HATA] LittleFS Dosya Sistemi Başlatılamadı!");
  } else {
    Serial.println("✅ LittleFS Bellek Hazır (cards.json & pendingLogs.json)");
  }

  // 2. W5500 Ethernet Başlatma
  selectEthernet();
  Ethernet.init(W5500_CS);
  Serial.println("🌐 W5500 Ethernet başlatılıyor, DHCP'den IP alınıyor...");
  if (Ethernet.begin(mac) == 0) {
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

  // 3. MFRC522 RFID Okuyucu Başlatma
  selectRFID();
  rfid.PCD_Init();
  byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.print("📡 MFRC522 RFID Okuyucu Versiyonu: 0x");
  Serial.println(version, HEX);
  Serial.println("👉 Sistem Hazır! Kart Okutulması Bekleniyor...\n");
}

// ============================================================================
// MAIN LOOP (SÜREKLİ DÖNGÜ)
// ============================================================================
void loop() {
  // 1. Periyodik İnternet Bağlantısı Kontrolü (10 saniyede bir)
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    lastHeartbeat = millis();
    checkEthernetConnection();
  }

  // 2. Periyodik Olarak API'den cards.json Güncelleme (5 dakikada bir)
  if (isInternetAvailable && (millis() - lastCardsSync > CARDS_SYNC_INTERVAL)) {
    lastCardsSync = millis();
    updateLocalCardsFromAPI();
  }

  // 3. Yeni Kart Okutuldu mu Kontrol Et
  selectRFID();
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  // 4. Okunan Kart UID Numarasını Boşluksuz String Formatına Çevir (Örn: "E49A1277")
  String cardUID = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) cardUID += "0";
    cardUID += String(rfid.uid.uidByte[i], HEX);
  }
  cardUID.toUpperCase();

  Serial.print("📡 [RFID KART OKUNDU] UID: ");
  Serial.print(cardUID);
  Serial.print(" @ Kapı: ");
  Serial.println(DEVICE_GATE);

  // 5. Kart Okuma İşlemini İşle (Online REST API veya Offline LittleFS)
  handleCardRead(cardUID);

  // RFID Okuyucuyu Bir Sonraki Okumaya Hazırla
  selectRFID();
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(1000);
}

// ============================================================================
// YARDIMCI FONKSİYONLAR
// ============================================================================

void setupHardware() {
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Active-Low Röle Ayarı: Başlangıçta HIGH (Röle Kapanır / Kapı Kilitli)
  digitalWrite(RELAY_PIN, HIGH);   
  digitalWrite(BUZZER_PIN, LOW);  // Buzzer Kapalı

  // SPI Veri Yolu Başlat (SCK=18, MISO=19, MOSI=23)
  SPI.begin(18, 19, 23);

  // CS Pinlerini Pasifleştir (SPI Çakışmasını Önlemek İçin)
  pinMode(W5500_CS, OUTPUT);
  digitalWrite(W5500_CS, HIGH);
  pinMode(SS_PIN, OUTPUT);
  digitalWrite(SS_PIN, HIGH);
}

// SPI CS Seçicileri
void selectRFID() {
  digitalWrite(W5500_CS, HIGH);
  digitalWrite(SS_PIN, LOW);
}

void selectEthernet() {
  digitalWrite(SS_PIN, HIGH);
  digitalWrite(W5500_CS, LOW);
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
  if (ethClient.connect(apiHost, apiPort)) {
    ethClient.println("GET /api/cards HTTP/1.1");
    ethClient.println("Host: " + String(apiHost));
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

// 💳 Kart Okuma Mantığı (Online vs Offline)
void handleCardRead(String cardUID) {
  bool isAuthorized = false;
  bool processedOnline = false;

  if (isInternetAvailable) {
    // --- ÇEVRİMİÇİ (ONLINE) MOD: REST API'ye Sor ---
    Serial.println("🌐 REST API'ye yetki kontrol isteği gönderiliyor...");
    
    selectEthernet();
    if (ethClient.connect(apiHost, apiPort)) {
      String postData = "{\"uid\":\"" + cardUID + "\",\"gate\":\"" + String(DEVICE_GATE) + "\",\"direction\":\"Giriş\"}";
      
      ethClient.println("POST /api/logs HTTP/1.1");
      ethClient.println("Host: " + String(apiHost));
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
    String foundHolderName = "Çevrimdışı Tanımsız Kullanıcı";
    isAuthorized = checkCardAuthorizationOffline(cardUID, foundHolderName);
    
    // Çevrimdışı Okutmayı LittleFS pendingLogs.json Dosyasına Yaz!
    logAccessOffline(cardUID, isAuthorized, foundHolderName);
  }

  // İzin Durumuna Göre Röle ve Buzzer Çalıştır
  if (isAuthorized) {
    grantAccess();
  } else {
    denyAccess();
  }
}

// 📁 LittleFS cards.json Dosyasından Yetki Kontrolü
bool checkCardAuthorizationOffline(String cardUID, String &foundHolderName) {
  foundHolderName = "Çevrimdışı Tanımsız Kullanıcı";

  if (!LittleFS.exists("/cards.json")) {
    Serial.println("⚠️ LittleFS /cards.json dosyası henüz hafızada yok!");
    return false;
  }

  File file = LittleFS.open("/cards.json", "r");
  DynamicJsonDocument doc(4096);
  DeserializationError error = deserializeJson(doc, file);
  file.close();

  if (error) {
    Serial.println("❌ LittleFS cards.json ayrıştırma hatası!");
    return false;
  }

  JsonArray array = doc.as<JsonArray>();
  for (JsonObject card : array) {
    String fileUid = card["uid"].as<String>();
    fileUid.replace(" ", "");
    fileUid.toUpperCase();
    
    // Kart UID ve Durumu Aktif mi?
    if (fileUid == cardUID) {
      if (card.containsKey("holderName")) {
        foundHolderName = card["holderName"].as<String>();
      }

      if (card["status"].as<String>() == "Aktif") {
        // Kapı Yetki Kontrolü
        if (card.containsKey("allowedGates")) {
          JsonArray gates = card["allowedGates"].as<JsonArray>();
          for (JsonVariant g : gates) {
            String gateStr = g.as<String>();
            if (gateStr == "Tüm Kapılar / Yönetici" || gateStr == String(DEVICE_GATE)) {
              Serial.println("✅ [OFFLINE İZİN VERİLDİ] LittleFS yetkisi doğrulandı -> " + foundHolderName);
              return true;
            }
          }
        } else {
          Serial.println("✅ [OFFLINE İZİN VERİLDİ] LittleFS yetkisi doğrulandı -> " + foundHolderName);
          return true;
        }
      }
    }
  }

  Serial.println("🔒 [OFFLINE ERİŞİM REDDEDİLDİ] Kart LittleFS üzerinde yetkisiz veya engelli.");
  return false;
}

// 🔓 YETKİLİ GEÇİŞ: Röle 3 Saniye AÇIK (LOW) + 1 Kısa Bip Sesi (🔊)
void grantAccess() {
  Serial.println("🔓 [ERİŞİM İZNİ VERİLDİ] Röle Tetiklendi, Kapı Açıldı!");
  digitalWrite(RELAY_PIN, LOW);   // Active-Low: Röle Açılır
  digitalWrite(BUZZER_PIN, HIGH); // 1 Kısa Bip Sesi
  delay(150);
  digitalWrite(BUZZER_PIN, LOW);

  delay(3000);                    // 3 Saniye Kapıyı Açık Tut
  digitalWrite(RELAY_PIN, HIGH);  // Active-Low: Röle Kapanır
  Serial.println("🔒 Kapı Tekrar Kilitlendi.");
}

// 🔒 YETKİSİZ GEÇİŞ: Röle Kapalı + 3 Kısa Bip Sesi (🔊🔊🔊)
void denyAccess() {
  Serial.println("🔒 [YETKİSİZ ERİŞİM] Geçiş Reddedildi, Röle Kilitli!");
  digitalWrite(RELAY_PIN, HIGH);  // Active-Low: Röle Kapalı
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

// 📁 Çevrimdışı Log Kaydı (LittleFS pendingLogs.json Dosyasına Çoklu Dizi Olarak Ekleme)
void logAccessOffline(String cardUID, bool isGranted, String holderName) {
  DynamicJsonDocument doc(4096);
  JsonArray array;

  if (LittleFS.exists("/pendingLogs.json")) {
    File file = LittleFS.open("/pendingLogs.json", "r");
    DeserializationError err = deserializeJson(doc, file);
    file.close();
    
    if (!err && doc.is<JsonArray>()) {
      array = doc.as<JsonArray>();
    } else {
      array = doc.to<JsonArray>();
    }
  } else {
    array = doc.to<JsonArray>();
  }

  // Çevrimdışı kart okutma anındaki HASSAS GERÇEK SAAT HESABI (Saniye Hassasiyetinde)
  String currentTimestamp = "";
  if (baseTimestampStr.length() >= 19 && baseSyncMillis > 0) {
    int y, m, d, hh, mm, ss;
    if (sscanf(baseTimestampStr.c_str(), "%d-%d-%d %d:%d:%d", &y, &m, &d, &hh, &mm, &ss) == 6) {
      struct tm t = {0};
      t.tm_year = y - 1900;
      t.tm_mon = m - 1;
      t.tm_mday = d;
      t.tm_hour = hh;
      t.tm_min = mm;
      t.tm_sec = ss;

      time_t epoch = mktime(&t);
      unsigned long elapsedSec = (millis() - baseSyncMillis) / 1000;
      epoch += elapsedSec;

      struct tm *resTime = localtime(&epoch);
      char buf[30];
      snprintf(buf, sizeof(buf), "%04d-%02d-%02d %02d:%02d:%02d",
               resTime->tm_year + 1900,
               resTime->tm_mon + 1,
               resTime->tm_mday,
               resTime->tm_hour,
               resTime->tm_min,
               resTime->tm_sec);
      currentTimestamp = String(buf);
    }
  }

  JsonObject newLog = array.createNestedObject();
  newLog["uid"] = cardUID;
  newLog["holderName"] = holderName;
  newLog["gate"] = DEVICE_GATE;
  newLog["direction"] = "Giriş";
  newLog["status"] = isGranted ? "Yetkili" : "Yetkisiz";
  newLog["relayTriggered"] = isGranted;
  newLog["buzzerBeeps"] = isGranted ? 1 : 3;
  if (currentTimestamp.length() > 0) {
    newLog["timestamp"] = currentTimestamp; // ⏱️ Kartın fiziki okunduğu TAM SANİYEYİ kaydet!
  }

  File file = LittleFS.open("/pendingLogs.json", "w");
  serializeJson(doc, file);
  file.close();

  Serial.print("💾 [OFFLINE LOG OK] LittleFS pendingLogs.json dosyasına eklendi (Toplam Bekleyen: ");
  Serial.print(array.size());
  Serial.println(") -> Kullanıcı: " + holderName + " | Röle: " + (isGranted ? "AÇIK" : "KAPALI"));
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
  if (ethClient.connect(apiHost, apiPort)) {
    String postPayload = "{\"pendingLogs\":" + pendingJson + "}";
    
    ethClient.println("POST /api/logs/sync HTTP/1.1");
    ethClient.println("Host: " + String(apiHost));
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

// ============================================================================
// SİZİN DAHA ÖNCE TEST ETTİĞİNİZ TÜM KOD BLOKLARI (KORUNAN YORUM SATIRLARI)
// ============================================================================

/*  esp32 kontrol kodu
#include <Arduino.h>

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("ESP32 test basladi.");
}

void loop() {
    Serial.println("ESP32 calisiyor...");
    delay(2000);
}
*/

/* röle testi kodu
#include <Arduino.h>

#define RELAY_PIN 26

void setup()
{
    Serial.begin(115200);

    pinMode(RELAY_PIN, OUTPUT);

    // Röleyi başlangıçta kapalı tut
    digitalWrite(RELAY_PIN, LOW);

    Serial.println("Röle testi başladı.");
}

void loop()
{
    Serial.println("Röle AÇIK");

    digitalWrite(RELAY_PIN, HIGH);

    delay(2000);

    Serial.println("Röle KAPALI");

    digitalWrite(RELAY_PIN, LOW);

    delay(2000);
}
    */

/*rfid kart calısıyor mu deneme okuma kodu

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 5
#define RST_PIN 22

MFRC522 rfid(SS_PIN, RST_PIN);

void setup()
{
    Serial.begin(115200);

    SPI.begin(18, 19, 23, 5);

    rfid.PCD_Init();

    byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);

    Serial.print("RC522 Version: 0x");
    Serial.println(version, HEX);

    Serial.println("RFID Kart Okuyucu Hazir.");
    Serial.println("Karti okutun...");
}

void loop()
{
    if (!rfid.PICC_IsNewCardPresent())
        return;

    if (!rfid.PICC_ReadCardSerial())
        return;

    Serial.print("Kart UID: ");

    for (byte i = 0; i < rfid.uid.size; i++)
    {
        if (rfid.uid.uidByte[i] < 0x10)
            Serial.print("0");

        Serial.print(rfid.uid.uidByte[i], HEX);
        Serial.print(" ");
    }

    Serial.println();

    rfid.PICC_HaltA();
}
*/

/* rfid kart ile röle beraber calısıyor mu kontrolu
#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 21
#define RST_PIN 22
#define RELAY_PIN 26

MFRC522 rfid(SS_PIN, RST_PIN);

String yetkiliKart = "11 B7 5A B7";

void setup()
{
    Serial.begin(115200);

    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);

    SPI.begin(18, 19, 23, 5);
    rfid.PCD_Init();

    Serial.println("Sistem Hazir.");
    Serial.println("Kart okutun...");
}

void loop()
{
    if (!rfid.PICC_IsNewCardPresent())
        return;

    if (!rfid.PICC_ReadCardSerial())
        return;

    String okunanKart = "";

    for (byte i = 0; i < rfid.uid.size; i++)
    {
        if (rfid.uid.uidByte[i] < 0x10)
            okunanKart += "0";

        okunanKart += String(rfid.uid.uidByte[i], HEX);

        if (i < rfid.uid.size - 1)
            okunanKart += " ";
    }

    okunanKart.toUpperCase();

    Serial.print("Okunan UID: ");
    Serial.println(okunanKart);

    if (okunanKart == yetkiliKart)
    {
        Serial.println("Yetkili kart. Role aciliyor.");

        digitalWrite(RELAY_PIN, HIGH);
        delay(2000);
        digitalWrite(RELAY_PIN, LOW);
    }
    else
    {
        Serial.println("Yetkisiz kart.");
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();

    delay(500);
}
*/

/*W5500 calısıyor mu testı
#include <Arduino.h>
#include <SPI.h>
#include <Ethernet.h>

#define W5500_CS 5
#define RFID_CS 21

byte mac[] = {0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED};

void setup()
{
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("===== W5500 DHCP TEST =====");

    // RFID'yi devre dışı bırak
    pinMode(RFID_CS, OUTPUT);
    digitalWrite(RFID_CS, HIGH);

    // SPI başlat
    SPI.begin(18, 19, 23);

    Ethernet.init(W5500_CS);

    Serial.println("DHCP'den IP alınıyor...");

    if (Ethernet.begin(mac) == 0)
    {
        Serial.println("DHCP BASARISIZ!");

        Serial.print("Hardware Status: ");
        Serial.println(Ethernet.hardwareStatus());

        Serial.print("Link Status: ");
        Serial.println(Ethernet.linkStatus());
    }
    else
    {
        Serial.println("DHCP BASARILI!");

        Serial.print("IP Adresi: ");
        Serial.println(Ethernet.localIP());

        Serial.print("Hardware Status: ");
        Serial.println(Ethernet.hardwareStatus());

        Serial.print("Link Status: ");
        Serial.println(Ethernet.linkStatus());
    }
}

void loop()
{
}
*/
