/*
 * ============================================================================
 * PROJE ADI: ESP32 Çevrimdışı Destekli Akıllı Kartlı Geçiş Kontrol Sistemi
 * DOSYA: esp32_firmware/src/main.cpp
 * AÇIKLAMA: Ana Kontrol Döngüsü (Modüler Mimari + Yerel Cihaz Durum Paneli)
 * ============================================================================
 */

#include <Arduino.h>
#include "config.h"
#include "HardwareDriver.h"
#include "StorageManager.h"
#include "NetworkManager.h"
#include "DisplayManager.h"

// ============================================================================
// SETUP (BAŞLANGIÇ AYARLARI)
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("🚀 ESP32 AKILLI KARTLI GEÇİŞ SİSTEMİ BAŞLATILIYOR");
  Serial.print("🆔 Cihaz ID (eFuse) : ");
  Serial.println(getAutoDeviceId());
  Serial.print("🚪 Kapı İsmi (Aktif): ");
  Serial.println(activeGateName);
  Serial.println("==================================================");

  // 1. Donanım Pinleri ve SPI Veri Yolunu Başlat (Röle Active-Low)
  setupHardware();

  // 2. 16x2 Karakter LCD Ekranı Başlat (SDA=21, SCL=22)
  initDisplay();

  // 3. LittleFS Dosya Sistemini Başlat (cards.json & pendingLogs.json)
  initStorage();

  // 4. W5500 Ethernet ve Ağ Sunucu Senkronizasyonunu Başlat (Web Status Server Port 80)
  initNetwork();

  // 5. MFRC522 RFID Okuyucu Başlatma
  selectRFID();
  rfid.PCD_Init();
  byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.print("📡 MFRC522 RFID Okuyucu Versiyonu: 0x");
  Serial.println(version, HEX);
  Serial.println("👉 Sistem Hazır! Kart Okutulması Bekleniyor...\n");

  // LCD Ekranı Bekleme Moduna ("KARTINIZI OKUTUNUZ") Al
  displayStandby();
}

// ============================================================================
// MAIN LOOP (SÜREKLİ DÖNGÜ)
// ============================================================================
void loop() {
  // 1. Gelen Yerel ESP32 Cihaz Durum Web İsteklerini İşle (Port 80)
  handleStatusWebRequests();

  // 2. Periyodik İnternet Bağlantısı Kontrolü (10 saniyede bir)
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    lastHeartbeat = millis();
    checkEthernetConnection();
  }

  // 3. Web Panelinden Gelen Anlık UDP Kart Değişiklik Sinyalini Dinle (Port 5001 - Anında LittleFS Güncelleme)
  listenForCardSyncUDPSignal();

  // 4. Yeni Kart Okutuldu mu Kontrol Et
  selectRFID();
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }
  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }

  // 5. Okunan Kart UID Numarasını Boşluksuz String Formatına Çevir (Örn: "E49A1277")
  String cardUID = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) cardUID += "0";
    cardUID += String(rfid.uid.uidByte[i], HEX);
  }
  cardUID.toUpperCase();

  Serial.print("📡 [RFID KART OKUNDU] UID: ");
  Serial.print(cardUID);
  Serial.print(" @ Kapı: ");
  Serial.println(activeGateName);

  // 6. Kart Okuma İşlemini İşle (Online REST API veya Offline LittleFS)
  handleCardRead(cardUID);

  // RFID Okuyucuyu Bir Sonraki Okumaya Hazırla
  selectRFID();
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(1000);
}
