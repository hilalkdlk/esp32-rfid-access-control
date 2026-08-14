#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ----------------------------------------------------------------------------
// HARDWARE PIN TANIMLAMALARI (ESP32 Donanım Bağlantıları)
// ----------------------------------------------------------------------------
#define SS_PIN          4    // MFRC522 RFID CS (SDA/SS) Pin -> GPIO 4
#define RST_PIN         15   // MFRC522 RFID Reset Pin -> GPIO 15
#define RELAY_PIN       26   // Röle (Elektronik Kapı Kilidi) Pin -> GPIO 26
#define W5500_CS        5    // W5500 Ethernet CS Pin -> GPIO 5

// 16x2 Karakter LCD Ekran (PCF8574 I2C Adaptörlü) Pin ve Adres Tanımlamaları
#define OLED_SDA_PIN    21   // LCD I2C SDA Pin -> GPIO 21
#define OLED_SCL_PIN    22   // LCD I2C SCL Pin -> GPIO 22
#define LCD_I2C_ADDR    0x27 // 16x2 LCD PCF8574 I2C Adresi
#define LCD_COLS        16   // LCD Satır Başı Karakter Sayısı (16 Sütun)
#define LCD_ROWS        2    // LCD Satır Sayısı (2 Satır)

// SPI Pinleri (Sabit Hardware SPI): SCK = 18, MISO = 19, MOSI = 23

// ----------------------------------------------------------------------------
// ÇİFT ESP32 CİHAZ YAPILANDIRMASI (KAPI-1 VEYA KAPI-2 SEÇİMİ)
// ----------------------------------------------------------------------------
/*
// === 1. ESP32 CİHAZI (Ana Giriş Turnikesi - KAPI-1) ===
 const char DEVICE_ID[] = "KAPI-1";
 const char DEVICE_GATE[] = "Ana Giriş Turnikesi";
 const byte MAC_ADDRESS[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
*/
// === 2. ESP32 CİHAZI (AR-GE Laboratuvar Kapısı - KAPI-2) - [ŞU AN YÜKLEMEYE HAZIR AKTİF] ===
const char DEVICE_ID[] = "KAPI-2";
const char DEVICE_GATE[] = "AR-GE Laboratuvar Kapısı";
const byte MAC_ADDRESS[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xEE };

// ----------------------------------------------------------------------------
// REST API SUNUCU VE ZAMAN AYARLARI
// ----------------------------------------------------------------------------
const char API_HOST[] = "10.130.0.71";
const int API_PORT = 5000;

const unsigned long HEARTBEAT_INTERVAL = 10000;   // 10 saniyede bir internet & otomatik senkron kontrolü
const unsigned long CARDS_SYNC_INTERVAL = 300000;  // 5 dakikada bir otomatik cards.json güncelleme

#endif // CONFIG_H
