#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ----------------------------------------------------------------------------
// HARDWARE PIN TANIMLAMALARI (ESP32 Donanım Bağlantıları)
// ----------------------------------------------------------------------------
#define SS_PIN          4    // MFRC522 RFID CS (SDA/SS) Pin -> GPIO 4
#define RST_PIN         15   // MFRC522 RFID Reset Pin -> GPIO 15
#define RELAY_PIN       26   // Röle (Elektronik Kapı Kilidi) Pin
#define W5500_CS        5    // W5500 Ethernet CS Pin

// SPI Pinleri (Sabit Hardware SPI): SCK = 18, MISO = 19, MOSI = 23

// ----------------------------------------------------------------------------
// BU ESP32 DONANIMININ BULUNDUĞU KAPI İSMİ VE MAC ADRESİ
// ----------------------------------------------------------------------------

// === 1. ESP32 CİHAZI (Ana Giriş Turnikesi) ===
// const char DEVICE_GATE[] = "Ana Giriş Turnikesi";
// const byte MAC_ADDRESS[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };

// === 2. ESP32 CİHAZI (AR-GE Laboratuvar Kapısı) - [ŞU AN YÜKLEMEYE HAZIR AKTİF] ===
const char DEVICE_GATE[] = "AR-GE Laboratuvar Kapısı";
const byte MAC_ADDRESS[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xEE };

// ----------------------------------------------------------------------------
// REST API SUNUCU VE ZAMAN AYARLARI
// ----------------------------------------------------------------------------
const char API_HOST[] = "10.130.0.118";
const int API_PORT = 5000;

const unsigned long HEARTBEAT_INTERVAL = 10000;   // 10 saniyede bir internet & otomatik senkron kontrolü
const unsigned long CARDS_SYNC_INTERVAL = 300000;  // 5 dakikada bir otomatik cards.json güncelleme

#endif // CONFIG_H
