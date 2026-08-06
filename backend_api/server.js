/**
 * ============================================================================
 * PROJE ADI: ESP32 Çevrimdışı Destekli Kartlı Geçiş Kontrol Sistemi REST API
 * DOSYA: backend_api/server.js
 * AÇIKLAMA: Node.js, Express & Firebase Cloud Firestore entegreli canlı REST API.
 * ============================================================================
 */

// 1. GEREKLİ KÜTÜPHANELERİN İÇE AKTARILMASI
import express from 'express'; // Web sunucusu ve API rotaları için
import cors from 'cors';       // Güvenli erişim izinleri için
import dotenv from 'dotenv';   // Ortam değişkenleri okuyucu (.env)
import { db } from './firebase.js'; // Firebase Cloud Firestore Veritabanı Sürücüsü

// 2. ORTAM DEĞİŞKENLERİNİ YÜKLE
dotenv.config();

// 3. EXPRESS UYGULAMASINI BAŞLAT
const app = express();
const PORT = process.env.PORT || 5000;

// 4. ARA YAZILIMLAR (MIDDLEWARE)
app.use(cors());          // Tüm kaynaklardan (React paneli, ESP32) gelen HTTP isteklerine izin ver
app.use(express.json());  // Gelen JSON verilerini otomatik nesneye dönüştür (req.body)

// ============================================================================
// REST API ROTALARI (FIRESTORE VERİTABANI ENTEGRELİ)
// ============================================================================

/**
 * ----------------------------------------------------------------------------
 * 1. PING & SAĞLIK KONTROLÜ ENDPOINT'İ
 * ----------------------------------------------------------------------------
 * Yön: GET /api/health
 * Amacı: ESP32 W5500 Ethernet çipinin internete çıkıp sunucuya ve Firestore'a
 *        ulaşıp ulaşamadığını test etmesi içindir.
 */
app.get('/api/health', async (req, res) => {
  try {
    // Firestore veritabanı bağlantı durumunu test et
    const cardsSnapshot = await db.collection('cards').get();
    const logsSnapshot = await db.collection('access_logs').limit(1).get();

    res.json({
      status: "ONLINE",
      message: "ESP32 REST API Servisi ve Firebase Firestore Canlı!",
      timestamp: new Date().toISOString(),
      firestoreConnected: true,
      totalCardsInFirestore: cardsSnapshot.size,
      totalLogsInFirestore: logsSnapshot.size
    });
  } catch (error) {
    console.error('[API HATA] Firestore Bağlantı Hatası:', error.message);
    res.status(500).json({
      status: "ERROR",
      message: "Firestore veritabanı bağlantı hatası oluştu.",
      error: error.message
    });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 2. YETKİLİ KART LİSTESİ ENDPOINT'İ (ESP32 LITTLEFS CARDS.JSON İÇİN)
 * ----------------------------------------------------------------------------
 * Yön: GET /api/cards
 * Amacı: Firestore "cards" koleksiyonundaki tüm kartları çekerek ESP32'ye döner.
 *        ESP32 bu verilerle dahili LittleFS "cards.json" dosyasını günceller.
 */
app.get('/api/cards', async (req, res) => {
  try {
    const snapshot = await db.collection('cards').get();
    const cardsList = [];

    snapshot.forEach(doc => {
      cardsList.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      count: cardsList.length,
      data: cardsList
    });
  } catch (error) {
    console.error('[API HATA] Kartlar çekilirken hata oluştu:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 3. YENİ KART EKLEME ENDPOINT'İ (REACT YÖNETİM PANELİNDEN)
 * ----------------------------------------------------------------------------
 * Yön: POST /api/cards
 * Amacı: React panelinden eklenen yeni RFID kartı canlı Firestore "cards"
 *        koleksiyonuna yeni bir belge (document) olarak kaydeder.
 */
app.post('/api/cards', async (req, res) => {
  try {
    const { uid, holderName, employeeId, department, accessLevel, status } = req.body;
    
    if (!uid || !holderName) {
      return res.status(400).json({ success: false, error: "UID ve Kart Sahibi ad-soyad zorunludur." });
    }

    const newCardData = {
      uid: uid.toUpperCase().trim(),
      holderName,
      employeeId: employeeId || "EMP-2026-000",
      department: department || "Genel",
      accessLevel: accessLevel || "Standart Kapılar",
      status: status || "Aktif",
      issueDate: new Date().toISOString().split('T')[0],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      syncedToESP32: true
    };

    // Firestore "cards" koleksiyonuna kaydet
    const docRef = await db.collection('cards').add(newCardData);
    
    console.log(`[FIRESTORE] Yeni RFID Kart Eklendi: ${newCardData.holderName} (${newCardData.uid}) -> ID: ${docRef.id}`);

    res.status(201).json({
      success: true,
      message: "Kart başarıyla Firestore veritabanına eklendi.",
      data: { id: docRef.id, ...newCardData }
    });
  } catch (error) {
    console.error('[API HATA] Kart eklenirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 4. KART DURUMU GÜNCELLEME ENDPOINT'İ (AKTİF / ENGELLİ)
 * ----------------------------------------------------------------------------
 * Yön: PUT /api/cards/:id/status
 * Amacı: Firestore'daki bir kartın durumunu ("Aktif" veya "Engelli") günceller.
 */
app.put('/api/cards/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const cardRef = db.collection('cards').doc(id);
    const doc = await cardRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Güncellenecek kart bulunamadı." });
    }

    await cardRef.update({ 
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[FIRESTORE] Kart Durumu Güncellendi: ID ${id} -> ${status}`);

    res.json({
      success: true,
      message: "Kart durumu başarıyla güncellendi.",
      data: { id, status }
    });
  } catch (error) {
    console.error('[API HATA] Kart durumu güncellenirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 5. KART SİLME ENDPOINT'İ
 * ----------------------------------------------------------------------------
 * Yön: DELETE /api/cards/:id
 * Amacı: Belirtilen kartı Firestore "cards" koleksiyonundan tamamen siler.
 */
app.delete('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('cards').doc(id).delete();
    
    console.log(`[FIRESTORE] Kart Silindi: ID ${id}`);
    res.json({ success: true, message: "Kart veritabanından silindi." });
  } catch (error) {
    console.error('[API HATA] Kart silinirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 6. GEÇİŞ LOGLARINI GÖRÜNTÜLEME ENDPOINT'İ (LİMİT KORUMALI: EN SON 100 LOG)
 * ----------------------------------------------------------------------------
 * Yön: GET /api/logs
 * Amacı: Performansı ve veritabanı kotasını korumak için Firestore "access_logs"
 *        koleksiyonundan EN SON gerçekleşen 100 log kaydını getirir.
 */
app.get('/api/logs', async (req, res) => {
  try {
    // Sınır Koruması: En son gerçekleşen 100 log kaydını getir
    const limitCount = parseInt(req.query.limit) || 100;

    const snapshot = await db.collection('access_logs')
      .orderBy('timestamp', 'desc')
      .limit(limitCount)
      .get();

    const logsList = [];
    snapshot.forEach(doc => {
      logsList.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      limitApplied: limitCount,
      count: logsList.length,
      data: logsList
    });
  } catch (error) {
    console.error('[API HATA] Loglar çekilirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 7. CANLI KART GEÇİŞ KAYDI EKLEME ENDPOINT'İ (ESP32 CANLI KART OKUTMA)
 * ----------------------------------------------------------------------------
 * Yön: POST /api/logs
 * Amacı: ESP32 üzerinde MFRC522 ile bir kart okutulduğunda (İnternet varken),
 *        ESP32 bu adrese HTTP POST atar. API kart yetkisini kontrol edip 
 *        Firestore "access_logs" koleksiyonuna yazar ve ESP32'ye Röle/Buzzer cevabı döner.
 */
app.post('/api/logs', async (req, res) => {
  try {
    const { uid, gate, direction } = req.body;
    
    if (!uid) {
      return res.status(400).json({ success: false, error: "Kart UID zorunludur." });
    }

    const cleanUid = uid.toUpperCase().replace(/\s+/g, '');
    
    // Firestore "cards" koleksiyonundan bu UID'ye sahip aktif kartı ara
    const cardsSnapshot = await db.collection('cards').get();
    let targetCard = null;

    cardsSnapshot.forEach(doc => {
      const c = doc.data();
      if (c.uid.replace(/\s+/g, '') === cleanUid) {
        targetCard = { id: doc.id, ...c };
      }
    });

    const isAuthorized = targetCard && targetCard.status === 'Aktif';

    const newLogData = {
      uid: uid.toUpperCase().trim(),
      holderName: targetCard ? targetCard.holderName : 'Tanımlanmamış Yabancı Kart',
      gate: gate || 'Ana Giriş Turnikesi',
      direction: direction || 'Giriş',
      status: isAuthorized ? 'Yetkili' : 'Yetkisiz',
      relayTriggered: isAuthorized, // Yetkili ise Röle Tetiklenir
      buzzerBeeps: isAuthorized ? 1 : 3, // Yetkili ise 1 Bip, Yetkisiz ise 3 Bip
      timestamp: new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      syncedToFirestore: true
    };

    // Firestore "access_logs" koleksiyonuna kaydet
    const docRef = await db.collection('access_logs').add(newLogData);

    console.log(`[FIRESTORE CANLI LOG] Kart Okutuldu: ${newLogData.holderName} (${newLogData.uid}) -> ${newLogData.status}`);

    // ESP32'ye Röle ve Buzzer komut cevabını geri dön
    res.status(201).json({
      success: true,
      authorized: isAuthorized,
      relayTriggered: isAuthorized,
      buzzerBeeps: isAuthorized ? 1 : 3,
      data: { id: docRef.id, ...newLogData }
    });
  } catch (error) {
    console.error('[API HATA] Canlı geçiş logu yazılırken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 8. LITTLEFS PENDINGLOGS TOPLU SENKRONİZASYON ENDPOINT'İ (BATCH WRITE)
 * ----------------------------------------------------------------------------
 * Yön: POST /api/logs/sync
 * Amacı: İnternet kesintisi sonrasında internet geri geldiğinde ESP32'nin 
 *        LittleFS "pendingLogs.json" dosyasında biriken kayıtları Firestore'a 
 *        topluca (batch write) güvenle aktarır.
 */
app.post('/api/logs/sync', async (req, res) => {
  try {
    const { pendingLogs } = req.body;
    
    if (!Array.isArray(pendingLogs) || pendingLogs.length === 0) {
      return res.json({ success: true, syncedCount: 0, message: "Senkronize edilecek bekleyen log bulunamadı." });
    }

    // Firestore Toplu Yazma (Batch Write) İşlemi
    const batch = db.batch();

    pendingLogs.forEach(pLog => {
      const logRef = db.collection('access_logs').doc();
      batch.set(logRef, {
        ...pLog,
        syncedToFirestore: true,
        syncedTime: new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Tüm bekleyen logları tek hamlede Firestore'a yaz
    await batch.commit();

    console.log(`[FIRESTORE SENKRON] LittleFS üzerinden ${pendingLogs.length} adet çevrimdışı log Firestore'a aktarıldı.`);

    res.json({
      success: true,
      syncedCount: pendingLogs.length,
      message: "LittleFS pendingLogs.json kayıtları başarıyla Firestore'a aktarıldı."
    });
  } catch (error) {
    console.error('[API HATA] Toplu senkronizasyon hatası:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// EXPRESS SUNUCUSUNU BAŞLAT
// ============================================================================
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 ESP32 Node.js REST API & Firebase Firestore Aktif!`);
  console.log(`📍 Sunucu Adresi : http://localhost:${PORT}`);
  console.log(`🔍 Health Test    : http://localhost:${PORT}/api/health`);
  console.log(`🎴 Kart Listesi   : http://localhost:${PORT}/api/cards`);
  console.log(`==================================================\n`);
});
