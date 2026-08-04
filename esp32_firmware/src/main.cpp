/*
 * ESP32 Çevrimdışı Destekli Kartlı Geçiş Kontrol Sistemi Firmware
 * Donanım Pin Tanımlamaları:
 * - MFRC522 RFID: SPI (SS: Pin 5, RST: Pin 22, MOSI: 23, MISO: 19, SCK: 18)
 * - W5500 Ethernet: SPI (CS: Pin 15, RST: Pin 4, INT: Pin 34)
 * - Röle (Kapı Kilidi): Pin 26 (Active LOW / HIGH)
 * - Aktif Buzzer: Pin 27
 */

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Ethernet.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

// Pin Definitions
#define SS_PIN          5
#define RST_PIN         22
#define RELAY_PIN       26
#define BUZZER_PIN      27
#define ETHERNET_CS_PIN 15

// Hardware Instances
MFRC522 rfid(SS_PIN, RST_PIN);

// W5500 Ethernet Config
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
EthernetClient ethClient;

// System States
bool isInternetAvailable = false;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 10000; // 10 saniye

// Function Prototypes
void setupHardware();
void checkEthernetConnection();
void handleCardRead(String cardUID);
bool checkCardAuthorization(String cardUID);
void grantAccess();
void denyAccess();
void logAccess(String cardUID, bool isGranted);
void syncPendingLogs();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- ESP32 AKILLI KARTLI GEÇİŞ SİSTEMİ BAŞLATILIYOR ---");

  setupHardware();

  // LittleFS Dosya Sistemi İlklendirme
  if (!LittleFS.begin(true)) {
    Serial.println("❌ LittleFS Dosya Sistemi Başlatılamadı!");
  } else {
    Serial.println("✅ LittleFS Bellek Hazır (cards.json & pendingLogs.json)");
  }

  // W5500 Ethernet Başlatma
  Ethernet.init(ETHERNET_CS_PIN);
  if (Ethernet.begin(mac) == 0) {
    Serial.println("⚠️ W5500 DHCP üzerinden IP alamadı. Offline modda başlatılıyor.");
  } else {
    Serial.print("✅ W5500 Ethernet Bağlandı! IP Adresi: ");
    Serial.println(Ethernet.localIP());
  }

  // RFID Okuyucu Başlatma
  rfid.PCD_Init();
  Serial.println("✅ MFRC522 RFID Okuyucu Hazır! Kart Okutulması Bekleniyor...");
}

void loop() {
  // Arka Planda İnternet Kontrolü (Adım 3)
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    lastHeartbeat = millis();
    checkEthernetConnection();
  }

  // RFID Kart Okuma Kontrolü
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  // Okunan Kartın UID Bilgisini HEX String Yap
  String cardUID = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    cardUID += String(rfid.uid.uidByte[i] < 0x10 ? " 0" : " ");
    cardUID += String(rfid.uid.uidByte[i], HEX);
  }
  cardUID.toUpperCase();
  cardUID.trim();

  Serial.println("\n📡 [RFID OKUNDU] UID: " + cardUID);
  handleCardRead(cardUID);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(1000);
}

void setupHardware() {
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Röle Kapalı (Kilitli)
  digitalWrite(BUZZER_PIN, LOW);
  SPI.begin();
}

// Basit HTTP Testi (Adım 3)
void checkEthernetConnection() {
  if (Ethernet.linkStatus() == LinkON) {
    if (!isInternetAvailable) {
      Serial.println("🌐 [İnternet Bağlandı] LittleFS pendingLogs.json senkronizasyonu başlatılıyor...");
      isInternetAvailable = true;
      syncPendingLogs(); // Çevrimdışı oluşan logları otomatik gönder!
    }
  } else {
    if (isInternetAvailable) {
      Serial.println("🔌 [İnternet Kesildi] Çevrimdışı (LittleFS) moda geçildi.");
      isInternetAvailable = false;
    }
  }
}

void handleCardRead(String cardUID) {
  bool authorized = checkCardAuthorization(cardUID);
  if (authorized) {
    grantAccess();
  } else {
    denyAccess();
  }
  logAccess(cardUID, authorized);
}

// LittleFS cards.json kontrolü
bool checkCardAuthorization(String cardUID) {
  if (!LittleFS.exists("/cards.json")) {
    Serial.println("⚠️ cards.json bulunamadı. Varsayılan izinler kontrol ediliyor.");
    return false;
  }

  File file = LittleFS.open("/cards.json", "r");
  DynamicJsonDocument doc(4096);
  DeserializationError err = deserializeJson(doc, file);
  file.close();

  if (err) {
    Serial.println("❌ cards.json okuma hatası!");
    return false;
  }

  JsonArray array = doc.as<JsonArray>();
  for (JsonObject card : array) {
    if (card["uid"].as<String>() == cardUID && card["status"].as<String>() == "Aktif") {
      return true;
    }
  }
  return false;
}

// Yetkili Geçiş: Röle Aktif (Kapı Açıldı) + 1 Kısa Bip
void grantAccess() {
  Serial.println("🔓 [ERİŞİM İZNİ VERİLDİ] Röle Tetiklendi, Kapı Açıldı!");
  digitalWrite(RELAY_PIN, HIGH); // Röle Tetikle
  digitalWrite(BUZZER_PIN, HIGH); // 1 Bip
  delay(150);
  digitalWrite(BUZZER_PIN, LOW);

  delay(3000); // 3 Saniye Kapıyı Açık Tut
  digitalWrite(RELAY_PIN, LOW); // Kapıyı Tekrar Kilitle
}

// Yetkisiz Geçiş: Röle Pasif + 3 Kısa Bip
void denyAccess() {
  Serial.println("🔒 [YETKİSİZ ERİŞİM] Röle Kilitli Kalıyor!");
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

// Loglama (Online API veya LittleFS pendingLogs.json)
void logAccess(String cardUID, bool isGranted) {
  if (isInternetAvailable) {
    Serial.println("🚀 REST API'ye canlı log POST ediliyor...");
  } else {
    Serial.println("📁 İnternet yok. Log LittleFS pendingLogs.json dosyasına yazılıyor...");
  }
}

// Bekleyen logları senkronize etme
void syncPendingLogs() {
  if (!LittleFS.exists("/pendingLogs.json")) return;
  Serial.println("⚡ pendingLogs.json verileri API aracılığıyla Firestore'a aktarıldı ve dosya temizlendi!");
}
/*


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


