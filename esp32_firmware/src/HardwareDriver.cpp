#include "HardwareDriver.h"

MFRC522 rfid(SS_PIN, RST_PIN);

void setupHardware() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Active-Low Röle: Başlangıçta HIGH (Röle Kapanır / Kapı Kilitli)

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

// 🔓 YETKİLİ GEÇİŞ: Röle 3 Saniye AÇIK (LOW)
void grantAccess() {
  Serial.println("🔓 [ERİŞİM İZNİ VERİLDİ] Röle Tetiklendi, Kapı Açıldı!");
  digitalWrite(RELAY_PIN, LOW);   // Active-Low: Röle Açılır
  delay(3000);                    // 3 Saniye Kapıyı Açık Tut
  digitalWrite(RELAY_PIN, HIGH);  // Active-Low: Röle Kapanır
  Serial.println("🔒 Kapı Tekrar Kilitlendi.");
}

// 🔒 YETKİSİZ GEÇİŞ: Röle Kapalı
void denyAccess() {
  Serial.println("🔒 [YETKİSİZ ERİŞİM] Geçiş Reddedildi, Röle Kilitli!");
  digitalWrite(RELAY_PIN, HIGH);  // Active-Low: Röle Kapalı
}
