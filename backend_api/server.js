/**
 * ============================================================================
 * PROJE ADI: ESP32 Çevrimdışı Destekli Kartlı Geçiş Kontrol Sistemi REST API
 * DOSYA: backend_api/server.js
 * AÇIKLAMA: Node.js & Express framework'ü ile geliştirilmiş RESTful API sunucusu.
 * ============================================================================
 */

// 1. GEREKLİ KÜTÜPHANELERİN İÇE AKTARILMASI (IMPORT)
import express from 'express'; // Web sunucusu ve API rotalarını oluşturmak için ana kütüphane
import cors from 'cors';       // Farklı portlardan (örneğin React 3000 portu) gelen isteklere izin veren güvenlik kütüphanesi
import dotenv from 'dotenv';   // .env dosyasındaki ortam değişkenlerini (PORT vb.) okumak için

// 2. ORTAM DEĞİŞKENLERİNİ YÜKLE
dotenv.config();

// 3. EXPRESS UYGULAMASINI BAŞLAT
const app = express();
const PORT = process.env.PORT || 5000; // Sunucunun çalışacağı port (Varsayılan: 5000)

// 4. ARA YAZILIMLAR (MIDDLEWARE)
app.use(cors());          // Tüm kaynaklardan (React paneli, ESP32) gelen HTTP isteklerine izin ver
app.use(express.json());  // Gelen HTTP isteklerindeki JSON verilerini otomatik olarak JavaScript nesnesine dönüştür (req.body)

// ============================================================================
// GECİCİ BELLEK VERİTABANI (IN-MEMORY DATABASE)
// NOT: Adım 5'te bu diziler yerine doğrudan Firebase Cloud Firestore veritabanı bağlanacaktır.
// ============================================================================

// Sistemde Kayıtlı Yetkili RFID Kartlar Listesi
let cards = [
  {
    id: "card-1",
    uid: "A3 8F 42 C1",                 // MFRC522 RFID Okuyucudan okunan Benzersiz Kart Numarası
    holderName: "Ahmet Yılmaz",          // Kart Sahibinin Adı Soyadı
    employeeId: "EMP-2024-001",          // Sicil / T.C. Kimlik No
    department: "AR-GE Mühendisliği",     // Çalıştığı Birim / Departman
    accessLevel: "Tüm Kapılar / Yönetici",// İzin Verilen Geçiş Yetki Seviyesi
    status: "Aktif",                     // Durum: "Aktif" (Geçişe İzin Ver) veya "Engelli" (Geçişi Reddet)
    issueDate: "2024-01-15",             // Kart Veriliş Tarihi
    syncedToESP32: true                 // ESP32 LittleFS cards.json senkronizasyon durumu
  },
  {
    id: "card-2",
    uid: "B4 12 90 FC",
    holderName: "Ayşe Kaya",
    employeeId: "EMP-2024-042",
    department: "İnsan Kaynakları",
    accessLevel: "Standart Kapılar",
    status: "Aktif",
    issueDate: "2024-03-10",
    syncedToESP32: true
  },
  {
    id: "card-3",
    uid: "C9 55 E3 11",
    holderName: "Mehmet Demir",
    employeeId: "EMP-2024-088",
    department: "Bilgi İşlem / IT",
    accessLevel: "VIP & Server Oda",
    status: "Aktif",
    issueDate: "2024-02-01",
    syncedToESP32: true
  }
];

// Sistemdeki Tüm Giriş-Çıkış Geçiş Kayıtları (Loglar)
let logs = [
  {
    id: "log-1",
    timestamp: new Date().toISOString(), // Geçişin gerçekleştiği tarih ve saat
    uid: "A3 8F 42 C1",                   // Okutulan Kartın UID Numarası
    holderName: "Ahmet Yılmaz",            // Kart Sahibi
    gate: "Ana Giriş Turnikesi",          // İşlemin Yapıldığı Kapı/Turnike Adı
    direction: "Giriş",                   // Yön: "Giriş" veya "Çıkış"
    status: "Yetkili",                    // Geçiş Sonucu: "Yetkili" veya "Yetkisiz"
    relayTriggered: true,                 // Röle Tetiklendi mi? (true = Kapı Açıldı)
    buzzerBeeps: 1,                       // Buzzer Ses Uyarısı (1 Bip = Yetkili, 3 Bip = Yetkisiz)
    syncedToFirestore: true               // Veritabanına kaydedildi mi?
  }
];

// ============================================================================
// REST API ROTALARI (ENDPOINTS)
// ============================================================================

/**
 * ----------------------------------------------------------------------------
 * 1. PING & SAĞLIK KONTROLÜ ENDPOINT'İ
 * ----------------------------------------------------------------------------
 * Yön: GET /api/health
 * Amacı: ESP32'nin W5500 Ethernet ile internete çıkıp sunucuya ulaşıp ulaşamadığını 
 *        test etmesi içindir. ESP32 bu adrese HTTP GET atarak "ONLINE" cevabı alır.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: "ONLINE",
    message: "ESP32 REST API Servisi Aktif ve Çalışıyor!",
    timestamp: new Date().toISOString(),
    cardsCount: cards.length,
    logsCount: logs.length
  });
});

/**
 * ----------------------------------------------------------------------------
 * 2. YETKİLİ KART LİSTESİ ENDPOINT'İ
 * ----------------------------------------------------------------------------
 * Yön: GET /api/cards
 * Amacı: ESP32 ilk açıldığında veya belirli aralıklarla bu adresten güncel kart 
 *        listesini çeker ve kendi dahili belleğindeki LittleFS "cards.json" 
 *        dosyasını günceller. Böylece internet kesildiğinde bu listeyle doğrulama yapar.
 */
app.get('/api/cards', (req, res) => {
  res.json({
    success: true,
    count: cards.length,
    data: cards
  });
});

/**
 * ----------------------------------------------------------------------------
 * 3. YENİ KART EKLEME ENDPOINT'İ
 * ----------------------------------------------------------------------------
 * Yön: POST /api/cards
 * Amacı: React yönetim panelinden (Kart Ekleme ekranı) yeni bir RFID kart tanımlandığında
 *        gönderilen verileri alır ve sistem kart listesine ekler.
 */
app.post('/api/cards', (req, res) => {
  // Gelen İstek Gövdesinden (body) Değişkenleri Al
  const { uid, holderName, employeeId, department, accessLevel, status } = req.body;
  
  // Zorunlu alan kontrolü
  if (!uid || !holderName) {
    return res.status(400).json({ success: false, error: "UID ve Kart Sahibi ad-soyad zorunludur." });
  }

  // Yeni Kart Nesnesi Oluştur
  const newCard = {
    id: `card-${Date.now()}`,
    uid: uid.toUpperCase().trim(),
    holderName,
    employeeId: employeeId || "EMP-2026-000",
    department: department || "Genel",
    accessLevel: accessLevel || "Standart Kapılar",
    status: status || "Aktif",
    issueDate: new Date().toISOString().split('T')[0],
    syncedToESP32: true
  };

  // Kartı listenin en başına ekle
  cards.unshift(newCard);
  console.log(`[API LOG] Yeni RFID Kart Kaydedildi: ${newCard.holderName} (${newCard.uid})`);
  
  // Başarılı yanıtı ve eklenen kart bilgisini geri dön
  res.status(201).json({
    success: true,
    message: "Kart başarıyla eklendi.",
    data: newCard
  });
});

/**
 * ----------------------------------------------------------------------------
 * 4. KART DURUMU GÜNCELLEME ENDPOINT'İ (ENGELLE / AKTİFLEŞTİR)
 * ----------------------------------------------------------------------------
 * Yön: PUT /api/cards/:id/status
 * Amacı: Bir kartın durumunu "Aktif"ten "Engelli"ye veya tam tersine çevirir.
 */
app.put('/api/cards/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const cardIndex = cards.findIndex(c => c.id === id);
  if (cardIndex === -1) {
    return res.status(404).json({ success: false, error: "Güncellenecek kart bulunamadı." });
  }

  cards[cardIndex].status = status;
  console.log(`[API LOG] Kart Durumu Güncellendi: ${cards[cardIndex].holderName} -> ${status}`);

  res.json({
    success: true,
    data: cards[cardIndex]
  });
});

/**
 * ----------------------------------------------------------------------------
 * 5. KART SİLME ENDPOINT'İ
 * ----------------------------------------------------------------------------
 * Yön: DELETE /api/cards/:id
 * Amacı: Belirtilen kartı sistemden tamamen kaldırır.
 */
app.delete('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  cards = cards.filter(c => c.id !== id);
  console.log(`[API LOG] Kart Silindi: ID ${id}`);
  res.json({ success: true, message: "Kart başarıyla silindi." });
});

/**
 * ----------------------------------------------------------------------------
 * 6. GEÇİŞ LOGLARINI GÖRÜNTÜLEME ENDPOINT'İ
 * ----------------------------------------------------------------------------
 * Yön: GET /api/logs
 * Amacı: React yönetim panelinde "Giriş-Çıkış Logları" ekranında tüm geçmiş 
 *        hareketleri görüntülemek için kullanılır.
 */
app.get('/api/logs', (req, res) => {
  res.json({
    success: true,
    count: logs.length,
    data: logs
  });
});

/**
 * ----------------------------------------------------------------------------
 * 7. CANLI KART GEÇİŞ KAYDI EKLEME ENDPOINT'İ (ESP32 KART OKUTMA)
 * ----------------------------------------------------------------------------
 * Yön: POST /api/logs
 * Amacı: ESP32 üzerinde MFRC522 ile bir kart okutulduğunda (İnternet varken), 
 *        ESP32 bu adrese HTTP POST atar. API kartın yetkili olup olmadığını 
 *        kontrol eder ve ESP32'ye Röle ve Buzzer komutu cevabı döner!
 */
app.post('/api/logs', (req, res) => {
  const { uid, gate, direction } = req.body;
  
  // Okutulan UID numarasına sahip aktif bir kart var mı kontrol et
  const targetCard = cards.find(c => c.uid.replace(/\s+/g, '') === uid.replace(/\s+/g, ''));
  const isAuthorized = targetCard && targetCard.status === 'Aktif';

  // Yeni Log Kaydı Oluştur
  const newLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toLocaleString('tr-TR'),
    uid,
    holderName: targetCard ? targetCard.holderName : 'Tanımlanmamış Yabancı Kart',
    gate: gate || 'Ana Giriş Turnikesi',
    direction: direction || 'Giriş',
    status: isAuthorized ? 'Yetkili' : 'Yetkisiz',
    relayTriggered: isAuthorized, // Yetkili ise true (ESP32 röleyi tetikler)
    buzzerBeeps: isAuthorized ? 1 : 3, // Yetkili ise 1 Bip, Yetkisiz ise 3 Bip sesi
    syncedToFirestore: true
  };

  logs.unshift(newLog); // En yeni logu listenin tepesine ekle
  console.log(`[API CANLI LOG] Kart Okutuldu: ${newLog.holderName} (${newLog.uid}) -> Sonuç: ${newLog.status}`);

  // ESP32'ye geri dönen yanıt (Röle tetiklensin mi, Buzzer kaç kere ötsün)
  res.status(201).json({
    success: true,
    authorized: isAuthorized,
    relayTriggered: isAuthorized,
    buzzerBeeps: isAuthorized ? 1 : 3,
    data: newLog
  });
});

/**
 * ----------------------------------------------------------------------------
 * 8. LITTLEFS PENDINGLOGS TOPLU SENKRONİZASYON ENDPOINT'İ
 * ----------------------------------------------------------------------------
 * Yön: POST /api/logs/sync
 * Amacı: İnternet kesintisi sırasında ESP32'nin dahili LittleFS belleğindeki 
 *        "pendingLogs.json" dosyasına kaydedilen geçici loglar, internet geri 
 *        geldiğinde bu adrese topluca gönderilir ve veritabanına aktarılır.
 */
app.post('/api/logs/sync', (req, res) => {
  const { pendingLogs } = req.body;
  let count = 0;
  
  if (Array.isArray(pendingLogs)) {
    count = pendingLogs.length;
    pendingLogs.forEach(pLog => {
      logs.unshift({
        ...pLog,
        syncedToFirestore: true,
        syncedTime: new Date().toISOString()
      });
    });
    console.log(`[API SENKRON] LittleFS üzerinden ${count} adet birikmiş çevrimdışı log veritabanına aktarıldı.`);
  }

  res.json({
    success: true,
    syncedCount: count,
    message: "LittleFS pendingLogs.json verileri başarıyla senkronize edildi."
  });
});

// ============================================================================
// SUNUCUYU BELİRTİLEN PORTTA BAŞLAT
// ============================================================================
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 ESP32 Node.js REST API Servisi Başlatıldı!`);
  console.log(`📍 Sunucu Adresi : http://localhost:${PORT}`);
  console.log(`🔍 Health Test    : http://localhost:${PORT}/api/health`);
  console.log(`🎴 Kart Listesi   : http://localhost:${PORT}/api/cards`);
  console.log(`==================================================\n`);
});
