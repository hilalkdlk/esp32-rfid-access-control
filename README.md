# 🔐 ESP32 Tabanlı Çevrimdışı Destekli Akıllı Kartlı Geçiş Kontrol Sistemi

Bu proje, **ESP32 tabanlı**, Ethernet (W5500) üzerinden haberleşen, **internet bağlantısı kesildiğinde dahi kesintisiz çalışmaya devam edebilen çevrimdışı destekli akıllı kartlı geçiş kontrol sistemi** geliştirmeyi amaçlamaktadır.

Sistem; **ESP32 Dev Module**, **MFRC522 RFID Okuyucu**, **W5500 Ethernet Modülü**, **16x2 Karakter LCD Ekran (I2C 0x27)**, **Röle (Elektronik Kapı Kilidi)**, **LittleFS Dosya Sistemi**, **Node.js REST API (Express)**, **Firebase Cloud Firestore** ve **React tabanlı web yönetim panelinden** oluşmaktadır.

İnternet bağlantısı bulunduğunda kart doğrulama ve geçiş kayıtları anlık olarak merkezi veritabanına aktarılır. İnternet bağlantısının kesilmesi durumunda ise sistem çalışmaya devam eder, oluşan kayıtlar hassas saniye zaman damgasıyla ESP32 üzerindeki LittleFS belleğinde saklanır ve internet geri geldiğinde otomatik olarak merkezi veritabanına senkronize edilir.

---

# 📌 Proje Mimarisi

```text
                        React Web Paneli (Port 3000)
                                    │
                                    │ HTTP
                                    ▼
                         Node.js REST API (Port 5000)
                                    │
                                    ▼
                     Firebase Cloud Firestore (Veritabanı)
                                    ▲
                                    │ HTTP
                                    ▼
                      ESP32 + W5500 Ethernet Modülü
             (Port 80: Gömülü Yerel Cihaz Durum Paneli)
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
     MFRC522 RFID             Active-Low Röle          16x2 I2C LCD
    (G4 CS / G15 RST)           (GPIO 26)             (G21 SDA / G22 SCL)
           │
        LittleFS
(cards.json / pendingLogs.json)
```

---

# 🚀 Temel Özellikler

- **ESP32 Modüler C++ Firmware**: Temiz, bakımı kolay ve modüler mimari (`config.h`, `HardwareDriver`, `StorageManager`, `NetworkManager`, `DisplayManager`).
- **Çift ESP32 Kapı Desteği**: `KAPI-1` (Ana Giriş Turnikesi) ve `KAPI-2` (AR-GE Laboratuvar Kapısı) için tekil firmware altyapısı.
- **W5500 Ethernet Haberleşmesi**: Kararlı kablolu internet ve NTP UTC+3 hassas zaman senkronizasyonu.
- **MFRC522 RFID Kart Doğrulama**: Hızlı UID okuma ve kapı yetki kontrolleri.
- **16x2 Karakter LCD Ekran Entegrasyonu (PCF8574 I2C `0x27`)**:
  - Bekleme Ekranı: `KARTINIZI OKUTUNUZ`
  - Yetkili Geçiş (3 sn): `GECIS YAPABILIRSINIZ`
  - Yetkisiz Geçiş (2 sn): `ERISIM YOK`
- **Gömülü Yerel Cihaz Durum Paneli (Port 80)**:
  - ESP32'nin kendi IP adresine (`http://<ESP32-IP>/`) girildiğinde açılan ultra-hafif (1.8 KB) koyu tema teşhis ekranı.
  - Real-time LittleFS depolama metrikleri (`LittleFS: 1.24 MB / 3.42 MB kullanılıyor (%36) — Boş alan: 2.18 MB`).
  - Kayıtlı kart sayısı (`cards.json`) & bekleyen çevrimdışı log sayısı (`pendingLogs.json`).
  - W5500 Ethernet, IP adresi, REST API canlılığı, RFID, LCD ve Röle durum göstergeleri.
- **Çevrimdışı (Offline) Çalışma Desteği**: LittleFS bellek üzerinde hassas saniye zaman damgasıyla geçişlerin kaydedilmesi.
- **Otomatik Senkronizasyon**: İnternet geri geldiğinde biriken çevrimdışı logların Firestore'a aktarılması ve yerel `cards.json` dosyasının otomatik güncellenmesi.
- **React Yönetim Paneli**: Canlı log takibi, kart ekleme/silme, kapı filtreleme ve Excel/CSV dışa aktarım.

---

# ⚙️ Kullanılan Teknolojiler

## Donanım
- ESP32 38-Pin Development Board
- MFRC522 RFID Reader (`SS=GPIO 4`, `RST=GPIO 15`)
- W5500 Ethernet Module (`CS=GPIO 5`)
- 16x2 Karakter LCD Ekran + PCF8574 I2C Adaptörü (`Adres=0x27`, `SDA=GPIO 21`, `SCL=GPIO 22`)
- 1 Kanal Active-Low Röle Modülü (`GPIO 26`)

## Yazılım
- **C++ (ESP32 Firmware)**: Modüler PlatformIO projesi (`ArduinoJson`, `LittleFS`, `Ethernet`, `LiquidCrystal_I2C`, `SPI`, `Wire`)
- **Node.js & Express.js**: REST API Sunucusu (Port 5000)
- **Firebase Admin SDK**: Cloud Firestore Veritabanı
- **React & Vite**: Yönetim Paneli Web Uygulaması (Port 3000)

---

# 📂 Sistem Bileşenleri

## 🖥️ ESP32 Firmware Modül Yapısı (`esp32_firmware`)

- `config.h`: Pin tanımlamaları, `DEVICE_ID` / `DEVICE_GATE` seçimi (`KAPI-1` vs `KAPI-2`), MAC adresi ve API IP ayarları.
- `HardwareDriver.h / .cpp`: Active-Low röle tetikleme ve SPI CS seçicileri (`selectRFID()`, `selectEthernet()`).
- `StorageManager.h / .cpp`: LittleFS dosya sistemi yönetimi, çevrimdışı kart yetki doğrulama, hassas saat hesabı ile log kaydı ve real-time depolama metrikleri.
- `NetworkManager.h / .cpp`: W5500 Ethernet bağlantı takibi, NTP zaman alma, REST API senkronizasyonu ve Port 80 Gömülü Cihaz Durum Paneli sunucusu.
- `DisplayManager.h / .cpp`: 16x2 I2C LCD ekran sürücüsü ve ekran durum yönetimi.
- `StatusPanelHTML.h`: ESP32 Flash belleğinde (`PROGMEM`) saklanan ultra-hafif (1.8 KB) yerel cihaz durum arayüzü HTML/CSS/JS şablonu.
- `main.cpp`: Yalnızca 35 satırdan oluşan temiz kontrolör döngüsü.
- `test_scripts.cpp`: Donanım test kodları kütüphanesi.

---

## 🔌 REST API Endpointleri (Node.js - Port 5000)

```http
GET    /api/cards         - Tüm yetkili kartları listeler ve ESP32 senkronizasyonu için sunar
POST   /api/cards         - Yeni yetkili kart ekler
DELETE /api/cards/:id     - Yetkili kartı siler
POST   /api/logs          - Anlık okutulan kart logunu Firebase Firestore'a kaydeder
POST   /api/logs/sync     - ESP32'nin çevrimdışı topladığı bekleyen logları toplu senkronize eder
GET    /api/health        - API ve Firestore canlılık durumunu kontrol eder
```

---

## 🌐 Gömülü Yerel Cihaz Durum Paneli (Port 80)

ESP32'nin IP adresine (`http://<ESP32-IP>/`) tarayıcıdan girildiğinde açılan salt-okunur yerel teşhis ekranıdır.

```http
GET /             - Ultra-hafif HTML/CSS/JS Cihaz Durum Sayfası
GET /api/status    - Canlı metrik JSON çıktısı (LittleFS depolama, kart sayısı, donanım durumları)
```

---

# 🚀 Çalıştırma ve Kurulum

### 1. Node.js REST API Sunucusunu Başlatma
```bash
cd backend_api
npm install
node server.js
```

### 2. React Web Paneli Başlatma
```bash
cd web
npm install
npm run dev
```

### 3. ESP32 Firmware Yükleme
- PlatformIO eklentisi yüklü VS Code üzerinde `esp32_firmware` klasörünü açın.
- `include/config.h` içinden cihazın `KAPI-1` veya `KAPI-2` ayarını seçin.
- **Upload (→)** butonuna basarak ESP32 kartınıza yükleyin.

---

# 📌 Proje Durumu

- [x] React Yönetim Paneli
- [x] Node.js REST API & Express.js Sunucusu
- [x] Firebase Cloud Firestore Veritabanı Entegrasyonu
- [x] ESP32 Modüler C++ Firmware Mimarisi
- [x] 16x2 Karakter LCD Ekran Entegrasyonu (I2C `0x27`)
- [x] LittleFS Desteği & Hassas Saniye Zaman Damgası Hesabı
- [x] Çevrimdışı (Offline) Mod & Çift ESP32 Kapı Desteği (`KAPI-1` / `KAPI-2`)
- [x] Otomatik Senkronizasyon
- [x] ESP32 Gömülü Yerel Cihaz Durum Paneli (Port 80)
