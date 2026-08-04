import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-Memory Database (Adım 4 - Firestore entegrasyonu öncesi hızlı ve bağımsız test için)
let cards = [
  {
    id: "card-1",
    uid: "A3 8F 42 C1",
    holderName: "Ahmet Yılmaz",
    employeeId: "EMP-2024-001",
    department: "AR-GE Mühendisliği",
    accessLevel: "Tüm Kapılar / Yönetici",
    status: "Aktif",
    issueDate: "2024-01-15",
    syncedToESP32: true
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

let logs = [
  {
    id: "log-1",
    timestamp: new Date().toISOString(),
    uid: "A3 8F 42 C1",
    holderName: "Ahmet Yılmaz",
    gate: "Ana Giriş Turnikesi",
    direction: "Giriş",
    status: "Yetkili",
    relayTriggered: true,
    buzzerBeeps: 1,
    syncedToFirestore: true
  }
];

// --- API ENDPOINT'LERİ ---

// 1. Health & Ping Test Endpoint (ESP32 Adım 3 Bağlantı Kontrolü)
app.get('/api/health', (req, res) => {
  res.json({
    status: "ONLINE",
    message: "ESP32 REST API Servisi Aktif ve Çalışıyor!",
    timestamp: new Date().toISOString(),
    cardsCount: cards.length,
    logsCount: logs.length
  });
});

// 2. Yetkili Kart Listesi (ESP32 LittleFS cards.json senkronizasyonu için)
app.get('/api/cards', (req, res) => {
  res.json({
    success: true,
    count: cards.length,
    data: cards
  });
});

// 3. Yeni Kart Ekle (React Web Panelinden)
app.post('/api/cards', (req, res) => {
  const { uid, holderName, employeeId, department, accessLevel, status } = req.body;
  
  if (!uid || !holderName) {
    return res.status(400).json({ success: false, error: "UID ve Kart Sahibi zorunludur." });
  }

  const newCard = {
    id: `card-${Date.now()}`,
    uid: uid.toUpperCase(),
    holderName,
    employeeId: employeeId || "N/A",
    department: department || "Genel",
    accessLevel: accessLevel || "Standart",
    status: status || "Aktif",
    issueDate: new Date().toISOString().split('T')[0],
    syncedToESP32: true
  };

  cards.unshift(newCard);
  console.log(`[API] Yeni RFID Kart eklendi: ${newCard.holderName} (${newCard.uid})`);
  
  res.status(201).json({
    success: true,
    message: "Kart başarıyla eklendi.",
    data: newCard
  });
});

// 4. Kart Durumu Güncelle (Aktif / Engelli)
app.put('/api/cards/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const cardIndex = cards.findIndex(c => c.id === id);
  if (cardIndex === -1) {
    return res.status(404).json({ success: false, error: "Kart bulunamadı." });
  }

  cards[cardIndex].status = status;
  console.log(`[API] Kart durumu güncellendi: ${cards[cardIndex].holderName} -> ${status}`);

  res.json({
    success: true,
    data: cards[cardIndex]
  });
});

// 5. Kart Sil
app.delete('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  cards = cards.filter(c => c.id !== id);
  console.log(`[API] Kart silindi: ID ${id}`);
  res.json({ success: true, message: "Kart silindi." });
});

// 6. Tüm Geçiş Loglarını Getir
app.get('/api/logs', (req, res) => {
  res.json({
    success: true,
    count: logs.length,
    data: logs
  });
});

// 7. Yeni Geçiş Kaydı Ekle (ESP32 Canlı Geçiş veya Turnike Simülatörü)
app.post('/api/logs', (req, res) => {
  const { uid, gate, direction } = req.body;
  
  const targetCard = cards.find(c => c.uid.replace(/\s+/g, '') === uid.replace(/\s+/g, ''));
  const isAuthorized = targetCard && targetCard.status === 'Aktif';

  const newLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toLocaleString('tr-TR'),
    uid,
    holderName: targetCard ? targetCard.holderName : 'Tanımlanmamış Yabancı Kart',
    gate: gate || 'Ana Giriş Turnikesi',
    direction: direction || 'Giriş',
    status: isAuthorized ? 'Yetkili' : 'Yetkisiz',
    relayTriggered: isAuthorized,
    buzzerBeeps: isAuthorized ? 1 : 3,
    syncedToFirestore: true
  };

  logs.unshift(newLog);
  console.log(`[API LOG] Geçiş Kaydı: ${newLog.holderName} (${newLog.uid}) -> ${newLog.status}`);

  res.status(201).json({
    success: true,
    authorized: isAuthorized,
    relayTriggered: isAuthorized,
    buzzerBeeps: isAuthorized ? 1 : 3,
    data: newLog
  });
});

// 8. LittleFS pendingLogs.json Toplu Senkronizasyon (Internet Geldiğinde)
app.post('/api/logs/sync', (req, res) => {
  const { pendingLogs } = req.body;
  if (Array.isArray(pendingLogs)) {
    pendingLogs.forEach(pLog => {
      logs.unshift({
        ...pLog,
        syncedToFirestore: true,
        syncedTime: new Date().toISOString()
      });
    });
    console.log(`[API SYNC] LittleFS üzerinden ${pendingLogs.length} adet bekleyen log Firestore'a aktarıldı.`);
  }

  res.json({
    success: true,
    syncedCount: pendingLogs ? pendingLogs.length : 0,
    message: "LittleFS pendingLogs.json verileri başarıyla senkronize edildi."
  });
});

// Sunucuyu Başlat
app.listen(PORT, () => {
  console.log(`\n🚀 Node.js REST API Servisi Çalışıyor!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health Test: http://localhost:${PORT}/api/health`);
  console.log(`🎴 Kart Listesi: http://localhost:${PORT}/api/cards\n`);
});
