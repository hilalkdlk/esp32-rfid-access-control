# 🔐 ESP32 Tabanlı Çevrimdışı Destekli Akıllı Kartlı Geçiş Kontrol Sistemi

Bu proje, **ESP32 mikrodenetleyicisi**, W5500 Ethernet modülü, MFRC522 RFID okuyucu, Node.js REST API, Firebase Cloud Firestore ve React web yönetim panelinden oluşan **çevrimdışı (offline) destekli akıllı kartlı geçiş kontrol sistemidir.**

Sistem, internet bağlantısı varken tüm geçiş verilerini ve kart izinlerini merkezi veritabanı (Firestore) üzerinden anlık yönetir. İnternet kesildiğinde ise ESP32, dahili flash belleğindeki **LittleFS** dosya sisteminden (`cards.json`) kart doğrulamaya devam eder ve geçiş hareketlerini (`pendingLogs.json`) tarih/saat damgasıyla biriktirir. İnternet geri geldiğinde biriken loglar otomatik olarak veritabanına senkronize edilir.

---

## 📌 Sistem Mimarisi

```text
                        React Web Paneli (Port 3000)
                                     │
                                     │ HTTP / SSE Canlı Akış
                                     ▼
                          Node.js REST API (Port 5000)
                                     │
                                     ▼
                      Firebase Cloud Firestore (Veritabanı)
                                     ▲
                                     │ HTTP / UDP Sinyal
                                     ▼
                       ESP32 + W5500 Ethernet Modülü
              (Port 80: Gömülü Yerel Cihaz Durum Paneli)
                                     │
            ┌────────────────────────┼────────────────────────┐
            │                        │                        │
      MFRC522 RFID             Active-LOW Röle          16x2 I2C LCD
    (G4 CS / G15 RST)           (GPIO 26)             (G21 SDA / G22 SCL)
            │
         LittleFS
 (cards.json / pendingLogs.json / config.json)
```

---

## 🚀 Temel Özellikler

- **Sıfır Ayar Donanım Kimliği (Zero-Config eFuse MAC ID):** Her ESP32 kendi fabrika seri numarasından benzersiz kimlik (`ESP32-7C0EF188`) türetir. Tüm kartlara birebir aynı C++ yazılımı yüklenebilir.
- **Dinamik Kapı & Donanım Eşleştirme:** Web arayüzünden yeni kapılar tanımlanabilir ve ağdaki ESP32 kartları tek tıkla ilgili kapılara atanabilir (`POST /api/device/assign`). Atama anında ESP32'ye UDP sinyali gönderilerek cihazın kapı ismi ve ekran yazısı canlı güncellenir.
- **W5500 Ethernet Haberleşmesi:** Kablosuz parazitlerden etkilenmeyen, kesintisiz ve kararlı IP ağ iletişimi.
- **MFRC522 RFID & Active-LOW Röle:** 13.56 MHz kart okuma ve optokuplör yalıtımlı elektronik kapı kilidi kontrolü (ilk açılışta güvenlik için kapalı başlar).
- **16x2 I2C LCD Ekran (0x27):** Kullanıcıya anlık durum mesajları basar (*"LUTFEN KART OKUTUNUZ"*, *"GECIS ONAYLANDI"*, *"KAPI YETKISI YOK"*).
- **Çevrimdışı (Offline) Çalışma & Otomatik Senkronizasyon:** İnternet yokken LittleFS üzerindeki `cards.json` ile yetki kontrolü yapılır ve kayıtlar `pendingLogs.json` dosyasına yazılır. Bağlantı geldiğinde saniyeler içinde veritabanına aktarılır ve yerel hafıza temizlenir.
- **ESP32 Dahili Cihaz Durum Paneli (Port 80):** Doğrudan ESP32'nin IP adresine (`http://<ESP32-IP>:80`) girildiğinde açılan, PROGMEM belleğe gömülü cihaz durum ve LittleFS bellek doluluk paneli.
- **React Web Yönetim Paneli:**
  - **Kart Listesi & İzinler:** Kart sahipleri, departmanlar, aktif/pasif durumu ve kapı izinleri (`allowedGates`) matrisi.
  - **Kart Ekleme & Canlı 3D NFC Kart Önizleme:** Form verileri yazıldıkça canlı 3D hover efektli dijital kart görüntüsü.
  - **Kapı & Donanım Yönetimi:** Kapı ekleme, düzenleme ve ESP32 cihaz eşleştirme ekranı.
  - **Geçiş Logları & Turnike Simülatörü:** Canlı geçiş takibi, yeşil/kırmızı yetki rozetleri, turnike test simülatörü, LittleFS senkronizasyon barı ve Excel/CSV indirme.
  - **İstatistik & Grafik Analiz:** Günlük ve saatlik geçiş grafik panelleri.

---

## 🛠️ Donanım Pin Haritası

| Donanım Bileşeni | Modül Pini | ESP32 GPIO Pini | Açıklama |
| :--- | :--- | :--- | :--- |
| **MFRC522 RFID Okuyucu** | **SDA (CS)** | **GPIO 4** | SPI Chip Select |
| | **RST** | **GPIO 15** | Reset Pini |
| | **SCK / MISO / MOSI** | **GPIO 18 / 19 / 23** | Ortak Hardware SPI Bus |
| **W5500 Ethernet Modülü** | **CS** | **GPIO 5** | SPI Chip Select |
| | **SCK / MISO / MOSI** | **GPIO 18 / 19 / 23** | Ortak Hardware SPI Bus |
| **16x2 I2C LCD Ekran** | **SDA / SCL** | **GPIO 21 / 22** | I2C Haberleşme (Adres: `0x27`) |
| **Active-LOW Röle Kartı** | **IN** | **GPIO 26** | Dijital Çıkış (Active-LOW) |

---

## 🔌 REST API Endpoint Listesi (Port 5000)

```http
GET    /api/health         - API ve Firestore canlılık durumunu kontrol eder
GET    /                   - Sunucu hoşgeldin ve durum bilgisi
GET    /api/cards          - Yetkili kart listesini döner (ESP32 senkronizasyonu için)
POST   /api/cards          - Yeni yetkili kart ekler
DELETE /api/cards/:id      - Kart kaydını siler
GET    /api/gates          - Tanımlı kapıları listeler
POST   /api/gates          - Yeni kapı ekler
PUT    /api/gates/:id      - Kapı adını/bilgilerini günceller (kart izinlerini otomatik günceller)
DELETE /api/gates/:id      - Kapı kaydını siler
GET    /api/device/config  - ESP32 donanımının atandığı kapı konfigürasyonunu döner
POST   /api/device/assign  - ESP32 cihazını fiziki kapı ile eşleştirir
GET    /api/devices        - Ağdaki aktif ESP32 cihazlarını listeler
POST   /api/logs           - Anlık geçiş hareketini Firestore'a kaydeder ve yetki kontrolü yapar
POST   /api/logs/sync      - Çevrimdışı biriken yerel logları toplu veritabanına senkronize eder
GET    /api/events         - Server-Sent Events (SSE) canlı veri akış kanalı
```

---

## 💻 Kurulum ve Çalıştırma

### 1. Node.js REST API Sunucusunu Başlatma
```bash
cd backend_api
npm install
node server.js
```

### 2. React Web Panelini Başlatma
```bash
npm install
npm run dev
```
*(Tarayıcınızda `http://localhost:3000` adresinden yönetim paneline erişebilirsiniz).*

### 3. ESP32 Gömülü Yazılımı Yükleme
- PlatformIO eklentisi yüklü VS Code üzerinde `esp32_firmware` klasörünü açın.
- **Upload (→)** butonuna basarak koda müdahale etmeden herhangi bir ESP32 kartınıza yükleyin.
- Cihaz açıldığında seri numarasından kimliğini türetecek ve sunucudan kapı atamasını otomatik çekecektir.
