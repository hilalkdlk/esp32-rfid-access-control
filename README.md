# 🔐 ESP32 Tabanlı Çevrimdışı Destekli Kartlı Geçiş Kontrol Sistemi

Bu proje, **ESP32 tabanlı**, Ethernet üzerinden haberleşen, **internet bağlantısı kesildiğinde dahi çalışmaya devam edebilen çevrimdışı destekli kartlı geçiş kontrol sistemi** geliştirmeyi amaçlamaktadır.

Sistem; **ESP32**, **MFRC522 RFID okuyucu**, **W5500 Ethernet modülü**, **Röle**, **LittleFS**, **Node.js REST API**, **Firebase Cloud Firestore** ve **React tabanlı web yönetim panelinden** oluşmaktadır.

İnternet bağlantısı bulunduğunda kart doğrulama ve giriş-çıkış kayıtları anlık olarak merkezi veritabanına aktarılır. İnternet bağlantısının kesilmesi durumunda ise sistem çalışmaya devam eder, oluşan kayıtlar ESP32 üzerinde geçici olarak saklanır ve bağlantı yeniden sağlandığında otomatik olarak merkezi veritabanına senkronize edilir.

---

# 📌 Proje Mimarisi

```text
                    React Web Paneli
                           │
                           │ HTTP
                           ▼
                 Node.js REST API (Express)
                           │
                           ▼
             Firebase Cloud Firestore
                           ▲
                           │ HTTP
                           ▼
        ESP32 + W5500 Ethernet Modülü
              │
     ┌────────┴────────┐
     │                 │
 MFRC522 RFID       Röle
     │
 LittleFS
(cards.json / pendingLogs.json)
```

---

# 🚀 Temel Özellikler

- ESP32 tabanlı gömülü sistem
- W5500 Ethernet haberleşmesi
- MFRC522 RFID kart doğrulama
- Röle ile geçiş kontrolü
- React tabanlı yönetim paneli
- Node.js REST API
- Firebase Cloud Firestore veritabanı
- Yetkili kart yönetimi
- Giriş-çıkış kayıtlarının tutulması
- Çevrimdışı (Offline) çalışma desteği
- LittleFS ile yerel veri saklama
- İnternet geri geldiğinde otomatik senkronizasyon

---

# ⚙️ Kullanılan Teknolojiler

## Donanım

- ESP32 38 Pin Development Board
- MFRC522 RFID Reader
- W5500 Ethernet Module
- 1 Kanal Röle Modülü

## Yazılım

- C++ (ESP32 Firmware)
- PlatformIO
- Node.js
- Express.js
- React
- Firebase Cloud Firestore
- LittleFS
- ArduinoJson

---

# 📂 Sistem Bileşenleri

## ESP32

- RFID kartı okur.
- Kart doğrulamasını gerçekleştirir.
- Röleyi kontrol eder.
- API ile haberleşir.
- İnternet olmadığında LittleFS kullanır.
- Bekleyen kayıtları senkronize eder.

---

## REST API

- Kart listeleme
- Kart ekleme
- Kart silme
- Log kaydetme
- ESP32 için güncel kart listesini sağlama

---

## Firebase Cloud Firestore

### cards

Yetkili kart bilgilerinin tutulduğu koleksiyon.

### logs

Giriş-çıkış kayıtlarının tutulduğu koleksiyon.

---

## React Web Paneli

### Kart Yönetimi

- Kart listeleme
- Yeni kart ekleme
- Kart silme

### Giriş-Çıkış Logları

- Tüm geçiş kayıtlarını görüntüleme
- Arama ve filtreleme

---

# 🌐 Çalışma Mantığı

## Online Mod

1. Kart okutulur.
2. ESP32 kartı doğrular.
3. Röle tetiklenir.
4. Log API'ye gönderilir.
5. Firestore'a kaydedilir.
6. Web panelinde anlık görüntülenir.

---

## Offline Mod

1. Kart okutulur.
2. ESP32, `cards.json` dosyasındaki kartları kullanarak doğrulama yapar.
3. Log kaydı `pendingLogs.json` dosyasına eklenir.
4. Sistem internet olmadan çalışmaya devam eder.

---

## Otomatik Senkronizasyon

ESP32 belirli aralıklarla internet bağlantısını kontrol eder.

Bağlantı tekrar sağlandığında:

- Bekleyen loglar API'ye gönderilir.
- Başarılı gönderilen kayıtlar silinir.
- Tüm kayıtlar tamamlandıktan sonra güncel kart listesi tekrar alınarak `cards.json` güncellenir.

---

# 📁 LittleFS Dosya Yapısı

```text
LittleFS

├── cards.json
└── pendingLogs.json
```

**cards.json**

Yetkili kartların yerel kopyası.

**pendingLogs.json**

İnternet kesintisi sırasında oluşan giriş-çıkış kayıtları.

---

# 🔌 REST API Endpointleri

```http
GET    /cards
POST   /cards
DELETE /cards/:id
POST   /logs
```

---

# 🚀 Kurulum

```bash
npm install
npm run dev
```

---

# 📌 Proje Durumu

🚧 Geliştirme aşamasındadır.

Planlanan özellikler:

- [x] React Yönetim Paneli
- [ ] Node.js REST API
- [ ] Firebase Entegrasyonu
- [ ] ESP32 Haberleşmesi
- [ ] LittleFS Desteği
- [ ] Offline Mod
- [ ] Otomatik Senkronizasyon
