# 📟 ESP32 Gömülü Sistem Firmware (Arduino C++)

Bu klasör, ESP32 38-Pin Geliştirme Kartı, W5500 Ethernet Modülü, MFRC522 RFID Okuyucu, Röle ve Aktif Buzzer için yazılmış gömülü sistem kodlarını barındırır.

## 🛠️ Pin Bağlantıları

- **MFRC522 RFID Okuyucu (SPI)**:
  - `SDA (SS)` ➔ Pin 5
  - `SCK` ➔ Pin 18
  - `MOSI` ➔ Pin 23
  - `MISO` ➔ Pin 19
  - `RST` ➔ Pin 22

- **W5500 Ethernet Modülü (SPI)**:
  - `CS` ➔ Pin 15
  - `RST` ➔ Pin 4

- **Röle (Elektronik Kapı Kilidi)**:
  - `IN` ➔ Pin 26

- **Aktif Buzzer (Sesli Uyarı)**:
  - `VCC/IN` ➔ Pin 27
