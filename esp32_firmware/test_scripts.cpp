/*
 * ============================================================================
 * ESP32 DONANIM TEST KODLARI KÜTÜPHANESİ
 * (Modüler mimariye geçilmeden önce main.cpp içinde yer alan test blokları)
 * ============================================================================
 */

/* ============================================================================
 * TEST 1: ESP32 TEMEL SERİ PORT KONTROL KODU
 * ============================================================================
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

/* ============================================================================
 * TEST 2: RÖLE DÖNGÜSEL AÇ/KAPAT TEST KODU
 * ============================================================================
#include <Arduino.h>

#define RELAY_PIN 26

void setup() {
    Serial.begin(115200);
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);
    Serial.println("Röle testi başladı.");
}

void loop() {
    Serial.println("Röle AÇIK");
    digitalWrite(RELAY_PIN, HIGH);
    delay(2000);

    Serial.println("Röle KAPALI");
    digitalWrite(RELAY_PIN, LOW);
    delay(2000);
}
*/

/* ============================================================================
 * TEST 3: MFRC522 RFID KART OKUMA & UID YAZDIRMA TEST KODU
 * ============================================================================
#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 5
#define RST_PIN 22

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
    Serial.begin(115200);
    SPI.begin(18, 19, 23, 5);
    rfid.PCD_Init();

    byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
    Serial.print("RC522 Version: 0x");
    Serial.println(version, HEX);
    Serial.println("RFID Kart Okuyucu Hazir. Karti okutun...");
}

void loop() {
    if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial())
        return;

    Serial.print("Kart UID: ");
    for (byte i = 0; i < rfid.uid.size; i++) {
        if (rfid.uid.uidByte[i] < 0x10) Serial.print("0");
        Serial.print(rfid.uid.uidByte[i], HEX);
        Serial.print(" ");
    }
    Serial.println();
    rfid.PICC_HaltA();
}
*/

/* ============================================================================
 * TEST 4: RFID KART + RÖLE BİRLİKTE ÇALIŞMA TEST KODU
 * ============================================================================
#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 21
#define RST_PIN 22
#define RELAY_PIN 26

MFRC522 rfid(SS_PIN, RST_PIN);
String yetkiliKart = "11 B7 5A B7";

void setup() {
    Serial.begin(115200);
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);

    SPI.begin(18, 19, 23, 5);
    rfid.PCD_Init();
    Serial.println("Sistem Hazir. Kart okutun...");
}

void loop() {
    if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial())
        return;

    String okunanKart = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
        if (rfid.uid.uidByte[i] < 0x10) okunanKart += "0";
        okunanKart += String(rfid.uid.uidByte[i], HEX);
        if (i < rfid.uid.size - 1) okunanKart += " ";
    }
    okunanKart.toUpperCase();

    Serial.print("Okunan UID: ");
    Serial.println(okunanKart);

    if (okunanKart == yetkiliKart) {
        Serial.println("Yetkili kart. Role aciliyor.");
        digitalWrite(RELAY_PIN, HIGH);
        delay(2000);
        digitalWrite(RELAY_PIN, LOW);
    } else {
        Serial.println("Yetkisiz kart.");
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    delay(500);
}
*/

/* ============================================================================
 * TEST 5: W5500 ETHERNET & DHCP BAĞLANTI TEST KODU
 * ============================================================================
#include <Arduino.h>
#include <SPI.h>
#include <Ethernet.h>

#define W5500_CS 5
#define RFID_CS 21

byte mac[] = {0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED};

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n===== W5500 DHCP TEST =====");

    pinMode(RFID_CS, OUTPUT);
    digitalWrite(RFID_CS, HIGH);

    SPI.begin(18, 19, 23);
    Ethernet.init(W5500_CS);

    Serial.println("DHCP'den IP alınıyor...");
    if (Ethernet.begin(mac) == 0) {
        Serial.println("DHCP BASARISIZ!");
        Serial.print("Hardware Status: ");
        Serial.println(Ethernet.hardwareStatus());
        Serial.print("Link Status: ");
        Serial.println(Ethernet.linkStatus());
    } else {
        Serial.println("DHCP BASARILI!");
        Serial.print("IP Adresi: ");
        Serial.println(Ethernet.localIP());
    }
}

void loop() {}
*/
