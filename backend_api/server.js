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
import { Bonjour } from 'bonjour-service'; // Yerel mDNS alan adı yayını için (esp32-server.local)
import dgram from 'dgram';           // ESP32'ye anlık UDP kart güncelleme sinyali göndermek için
import { admin, db } from './firebase.js'; // Firebase Admin ve Firestore Veritabanı Sürücüsü

// 2. ORTAM DEĞİŞKENLERİNİ YÜKLE
dotenv.config();

// 3. EXPRESS UYGULAMASINI BAŞLAT
const app = express();
const PORT = process.env.PORT || 5000;

// 4. ARA YAZILIMLAR (MIDDLEWARE)
app.use(cors());          // Tüm kaynaklardan (React paneli, ESP32) gelen HTTP isteklerine izin ver
app.use(express.json());  // Gelen JSON verilerini otomatik nesneye dönüştür (req.body)

import os from 'os';

// 5. mDNS (BONJOUR) YEREL ALAN ADI YAYINI (esp32-server.local)
try {
  const bonjour = new Bonjour();
  bonjour.publish({
    name: 'esp32-server',
    type: 'http',
    port: PORT,
    host: 'esp32-server.local'
  });
  console.log('📡 [mDNS YAYINI AKTİF] Yerel alan adı yayını başlatıldı -> http://esp32-server.local:5000');
} catch (err) {
  console.warn('⚠️ [mDNS UYARI] Bonjour yerel alan adı başlatılamadı:', err.message);
}

// 5.1. OTOMATİK IP KEŞFİ İÇİN PERİYODİK UDP BEACON YAYINI (Port 5002)
const getLocalIPv4 = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
};

const broadcastServerUDPBeacon = () => {
  try {
    const currentIp = getLocalIPv4();
    const udpSocket = dgram.createSocket('udp4');
    udpSocket.bind(() => {
      udpSocket.setBroadcast(true);
      const msg = Buffer.from(`SERVER_BEACON:${currentIp}:${PORT}`);
      udpSocket.send(msg, 0, msg.length, 5002, '255.255.255.255', (err) => {
        udpSocket.close();
      });
    });
  } catch (e) {
    // UDP Hata göz ardı edilir
  }
};

setInterval(broadcastServerUDPBeacon, 3000); // 3 saniyede bir yerel ağa IP duyurusu fırlat
console.log('📡 [UDP BEACON AKTİF] Otomatik IP Keşfi Port 5002 üzerinden başlatıldı.');

// Türkiye Saat Dilimi (Europe/Istanbul UTC+3) İle Formatlama Fonksiyonu
const getTurkeyFormattedTimestamp = () => {
  const d = new Date();
  const options = {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const parts = new Intl.DateTimeFormat('tr-TR', options).formatToParts(d);
  const hash = {};
  parts.forEach(p => hash[p.type] = p.value);
  return `${hash.year}-${hash.month}-${hash.day} ${hash.hour}:${hash.minute}:${hash.second}`;
};

// Server-Sent Events (SSE) İstemci Yöneticisi ve Yayın Fonksiyonu
const sseClients = new Set();

const broadcastSSE = (eventType, data) => {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(payload);
    } catch (err) {
      sseClients.delete(client);
    }
  });
};

// SSE Periyodik Heartbeat (Bağlantıların Kapanmasını Önlemek İçin 20sn)
setInterval(() => {
  sseClients.forEach(client => {
    try {
      client.write(`: heartbeat\n\n`);
    } catch (err) {
      sseClients.delete(client);
    }
  });
}, 20000);

// ESP32 Donanımına Anlık UDP Kart Değişikliği Bildirim Fonksiyonu (Port 5001)
const notifyESP32CardsChanged = () => {
  try {
    const message = Buffer.from('CARDS_UPDATED');
    const client = dgram.createSocket('udp4');
    client.bind(() => {
      client.setBroadcast(true);
      client.send(message, 0, message.length, 5001, '255.255.255.255', (err) => {
        client.close();
        if (!err) {
          console.log('⚡ [UDP BROADCAST] ESP32 donanımına anlık LittleFS cards.json yenileme sinyali gönderildi (Port 5001)');
        }
      });
    });
  } catch (err) {
    console.error('⚠️ [UDP BROADCAST HATA] Sinyal gönderilemedi:', err.message);
  }
};

// ============================================================================
// REST API ROTALARI (FIRESTORE VERİTABANI ENTEGRELİ)
// ============================================================================

/**
 * ----------------------------------------------------------------------------
 * 0. CANLI SSE CANLI AKIŞ ENDPOINT'İ (SERVER-SENT EVENTS)
 * ----------------------------------------------------------------------------
 * Yön: GET /api/logs/stream
 */
app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');

  // Express.js İçi HTTP Yanıt Başlıklarını Anında Zorla Gönder (Pending Durumunu Önler)
  res.flushHeaders();

  res.write(`: sse connected\n\n`);
  sseClients.add(res);

  console.log(`📡 [SSE CANLI AKIŞ] İstemci bağlandı -> Canlı akış aktif (Aktif Dinleyici: ${sseClients.size})`);

  req.on('close', () => {
    sseClients.delete(res);
    console.log(`⚠️ [SSE AYRILDI] İstemci bağlantısı kesildi (Kalan Dinleyici: ${sseClients.size})`);
  });
});

/**
 * ----------------------------------------------------------------------------
 * 0. KÖK DİZİN (WELCOME ROOT) ENDPOINT'İ
 * ----------------------------------------------------------------------------
 * Yön: GET /
 */

/**
 * ----------------------------------------------------------------------------
 * 1. PING & SAĞLIK KONTROLÜ ENDPOINT'İ
 * ----------------------------------------------------------------------------
 * Yön: GET /api/health
 */
app.get('/api/health', async (req, res) => {
  try {
    const cardsSnapshot = await db.collection('cards').get();
    const logsSnapshot = await db.collection('access_logs').limit(100).get();

    res.json({
      status: "ONLINE",
      message: "ESP32 REST API Servisi ve Firebase Firestore Canlı!",
      timestamp: getTurkeyFormattedTimestamp(),
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

// ----------------------------------------------------------------------------
// 📟 DONANIM ESP32 CİHAZ YÖNETİMİ & KABLOSUZ KAPI ATAMA ENDPOINTLERİ
// ----------------------------------------------------------------------------

// GET /api/device/config - ESP32 Cihaz Yapılandırmasını Çek ve Otomatik Kaydet
app.get('/api/device/config', async (req, res) => {
  try {
    const deviceId = req.query.deviceId || "ESP32-A4E2";
    const clientIp = req.ip ? req.ip.replace('::ffff:', '') : '10.130.0.85';
    const devRef = db.collection('devices').doc(deviceId);
    const doc = await devRef.get();

    let assignedGate = deviceId;
    if (doc.exists && doc.data().assignedGate) {
      assignedGate = doc.data().assignedGate;
    }

    let gateStatus = "Aktif";
    const gateSnap = await db.collection('gates').where('name', '==', assignedGate).limit(1).get();
    if (!gateSnap.empty) {
      gateStatus = gateSnap.docs[0].data().status || "Aktif";
    }

    await devRef.set({
      deviceId: deviceId,
      assignedGate: assignedGate,
      ipAddress: clientIp,
      status: "Online",
      lastSeen: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({
      success: true,
      deviceId: deviceId,
      assignedGate: assignedGate,
      gateStatus: gateStatus
    });
  } catch (error) {
    console.error('[API HATA] Cihaz ayarları çekilirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/devices - Ağdaki Tüm ESP32 Cihazlarını ve Atanan Kapılarını Listele
app.get('/api/devices', async (req, res) => {
  try {
    const snapshot = await db.collection('devices').get();
    const devicesList = [];
    snapshot.forEach(doc => {
      devicesList.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      data: devicesList
    });
  } catch (error) {
    console.error('[API HATA] Cihazlar çekilirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/device/assign - ESP32 Cihazına Web Panelinden Yeni Kapı Ata
app.post('/api/device/assign', async (req, res) => {
  try {
    const { deviceId, gateName } = req.body;

    if (!deviceId || !gateName) {
      return res.status(400).json({ success: false, message: "deviceId ve gateName zorunludur." });
    }

    const devRef = db.collection('devices').doc(deviceId);
    await devRef.set({
      deviceId: deviceId,
      assignedGate: gateName.trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`📟 [FIRESTORE] Cihaz Kapısı Atandı: ${deviceId} -> ${gateName}`);

    let gateStatus = "Aktif";
    const gateSnap = await db.collection('gates').where('name', '==', gateName.trim()).limit(1).get();
    if (!gateSnap.empty) {
      gateStatus = gateSnap.docs[0].data().status || "Aktif";
    }

    // ESP32 donanımına UDP sinyali at (DEVICE_GATE_UPDATED:<deviceId>:<gateName>:<gateStatus>)
    try {
      const client = dgram.createSocket('udp4');
      client.bind(() => {
        client.setBroadcast(true);
        const msg = Buffer.from(`DEVICE_GATE_UPDATED:${deviceId}:${gateName.trim()}:${gateStatus}`);
        client.send(msg, 0, msg.length, 5001, '255.255.255.255', () => {
          client.close();
        });
      });
    } catch (e) {
      console.error('UDP Sinyal Hatası:', e);
    }

    broadcastSSE('device_updated', { deviceId, assignedGate: gateName });

    res.json({
      success: true,
      message: `'${deviceId}' cihazının kapısı '${gateName}' olarak güncellendi ve kablosuz sinyal gönderildi.`,
      data: { deviceId, assignedGate: gateName }
    });
  } catch (error) {
    console.error('[API HATA] Cihaz kapısı atanırken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/devices/:id - Eski veya Pasif Test Cihazını Sil
app.delete('/api/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('devices').doc(id).delete();
    console.log(`🗑️ [FIRESTORE] Cihaz Silindi: ${id}`);
    broadcastSSE('devices_updated', { message: 'device deleted', id });
    res.json({ success: true, message: "Cihaz silindi." });
  } catch (error) {
    console.error('[API HATA] Cihaz silinirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------------------------------
// 🚪 KAPILARI LİSTELEME, EKLEME, DÜZENLEME VE SİLME ENDPOINTLERİ
// ----------------------------------------------------------------------------

// GET /api/gates - Sistemdeki Tüm Kayıtlı Kapıları Getir
app.get('/api/gates', async (req, res) => {
  try {
    const snapshot = await db.collection('gates').get();
    const gatesList = [];
    snapshot.forEach(doc => {
      gatesList.push({
        id: doc.id,
        ...doc.data()
      });
    });

    if (gatesList.length === 0) {
      const defaultGates = [
        { name: 'Ana Giriş Turnikesi', gateCode: 'KAPI-01', description: 'Ana Bina Turnike Geçişi', status: 'Aktif', ipAddress: '10.130.0.52' },
        { name: 'AR-GE Laboratuvar Kapısı', gateCode: 'KAPI-02', description: 'B Blok AR-GE Laboratuvarı', status: 'Aktif', ipAddress: '10.130.0.53' }
      ];
      for (const g of defaultGates) {
        const ref = await db.collection('gates').add({
          ...g,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        gatesList.push({ id: ref.id, ...g });
      }
    }

    res.json({ success: true, data: gatesList });
  } catch (error) {
    console.error('[API HATA] Kapılar getirilirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/gates - Yeni Kapı Ekle
app.post('/api/gates', async (req, res) => {
  try {
    const { name, gateCode, description, status, ipAddress } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Kapı adı zorunludur." });
    }

    const newGate = {
      name: name.trim(),
      gateCode: (gateCode || 'KAPI-XX').trim(),
      description: (description || '').trim(),
      status: status || 'Aktif',
      ipAddress: ipAddress ? ipAddress.trim() : '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('gates').add(newGate);
    console.log(`🚪 [FIRESTORE] Yeni Kapı Eklendi: ${newGate.name} (${newGate.gateCode})`);

    broadcastSSE('gates_updated', { message: 'gate added' });
    res.status(201).json({ success: true, message: "Kapı başarıyla eklendi.", data: { id: docRef.id, ...newGate } });
  } catch (error) {
    console.error('[API HATA] Kapı eklenirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/gates/:id - Mevcut Kapıyı Güncelle (Ad, Kod, IP, Durum)
app.put('/api/gates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gateCode, description, status, ipAddress } = req.body;

    const gateRef = db.collection('gates').doc(id);
    const gateDoc = await gateRef.get();
    if (!gateDoc.exists) {
      return res.status(404).json({ success: false, error: "Güncellenecek kapı bulunamadı." });
    }

    const oldName = gateDoc.data().name;
    const updateData = {
      ...(name && { name: name.trim() }),
      ...(gateCode && { gateCode: gateCode.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(status && { status }),
      ...(ipAddress !== undefined && { ipAddress: ipAddress.trim() }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await gateRef.set(updateData, { merge: true });
    console.log(`🚪 [FIRESTORE] Kapı Güncellendi: ${oldName} -> ${name || oldName}`);

    const targetName = name ? name.trim() : oldName;
    const effectiveStatus = status || gateDoc.data().status || "Aktif";

    if (name && name.trim() !== oldName) {
      const newName = name.trim();
      const batch = db.batch();

      // 1. Cihazlara atanan kapı ismini güncelle
      const devSnapshot = await db.collection('devices').where('assignedGate', '==', oldName).get();
      devSnapshot.forEach(dDoc => {
        batch.update(dDoc.ref, { assignedGate: newName });
      });

      // 2. Yetkili kartlardaki eski kapı iznini yeni kapı ismi ile güncelle
      const cardsSnapshot = await db.collection('cards').get();
      cardsSnapshot.forEach(cardDoc => {
        const cardData = cardDoc.data();
        let needsUpdate = false;
        let updatedAllowed = Array.isArray(cardData.allowedGates) ? [...cardData.allowedGates] : [];
        let updatedAccessLevel = cardData.accessLevel || '';

        if (updatedAllowed.includes(oldName)) {
          updatedAllowed = updatedAllowed.map(g => g === oldName ? newName : g);
          needsUpdate = true;
        }

        if (updatedAccessLevel.includes(oldName)) {
          updatedAccessLevel = updatedAccessLevel.replace(new RegExp(oldName, 'g'), newName);
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(cardDoc.ref, {
            allowedGates: updatedAllowed,
            accessLevel: updatedAccessLevel,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      await batch.commit();
      console.log(`🔑 [FIRESTORE] '${oldName}' kapısının ismi '${newName}' olarak güncellendi ve tüm kullanıcı izinleri aktarıldı.`);

      // Eşleşmiş ESP32 Donanımlarına UDP Kablosuz Sinyal At
      devSnapshot.forEach(dDoc => {
        try {
          const client = dgram.createSocket('udp4');
          client.bind(() => {
            client.setBroadcast(true);
            const msg = Buffer.from(`DEVICE_GATE_UPDATED:${dDoc.id}:${newName}:${effectiveStatus}`);
            client.send(msg, 0, msg.length, 5001, '255.255.255.255', () => { client.close(); });
          });
        } catch (e) {}
      });
    }

    // ESP32 Donanımlarına Anında UDP Kablosuz Kart Güncelleme Sinyali At
    try {
      const client = dgram.createSocket('udp4');
      client.bind(() => {
        client.setBroadcast(true);
        const msg = Buffer.from(`CARDS_UPDATED:ALL`);
        client.send(msg, 0, msg.length, 5001, '255.255.255.255', () => { client.close(); });
      });
    } catch (e) {}

    broadcastSSE('gates_updated', { message: 'gate updated' });
    broadcastSSE('cards_updated', { message: 'cards updated after gate rename' });
    res.json({ success: true, message: "Kapı ve tüm kullanıcı yetkileri başarıyla güncellendi.", data: { id, ...updateData } });
  } catch (error) {
    console.error('[API HATA] Kapı güncellenirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/gates/:id - Kapı Sil (ve Kullanıcı İzinlerinden Temizle)
app.delete('/api/gates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const gateDoc = await db.collection('gates').doc(id).get();
    if (!gateDoc.exists) {
      return res.status(404).json({ success: false, error: "Silinecek kapı bulunamadı." });
    }

    const deletedGateName = gateDoc.data().name;
    await db.collection('gates').doc(id).delete();
    console.log(`🚪 [FIRESTORE] Kapı Silindi: ${deletedGateName} (ID: ${id})`);

    const batch = db.batch();

    // 1. Cihazlardan silinen kapı atamasını temizle
    const devSnap = await db.collection('devices').where('assignedGate', '==', deletedGateName).get();
    devSnap.forEach(dDoc => {
      batch.update(dDoc.ref, { assignedGate: dDoc.id });
    });

    // 2. Kullanıcı kartlarından silinen kapı ismini izinlerden kaldır
    const cardSnap = await db.collection('cards').get();
    cardSnap.forEach(cardDoc => {
      const cardData = cardDoc.data();
      let updatedAllowed = Array.isArray(cardData.allowedGates) ? [...cardData.allowedGates] : [];
      let updatedAccessLevel = cardData.accessLevel || '';

      if (updatedAllowed.includes(deletedGateName)) {
        updatedAllowed = updatedAllowed.filter(g => g !== deletedGateName);
        if (updatedAllowed.length === 0) {
          updatedAllowed = [];
        }
        updatedAccessLevel = updatedAllowed.join(', ') || 'Yetki Yok';

        batch.update(cardDoc.ref, {
          allowedGates: updatedAllowed,
          accessLevel: updatedAccessLevel,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    await batch.commit();

    // ESP32 Donanımlarına UDP Kablosuz Sinyal At
    try {
      const client = dgram.createSocket('udp4');
      client.bind(() => {
        client.setBroadcast(true);
        const msg = Buffer.from(`CARDS_UPDATED:ALL`);
        client.send(msg, 0, msg.length, 5001, '255.255.255.255', () => { client.close(); });
      });
    } catch (e) {}

    broadcastSSE('gates_updated', { message: 'gate deleted' });
    res.json({ success: true, message: `'${deletedGateName}' kapısı silindi ve kullanıcı izinlerinden kaldırıldı.` });
  } catch (error) {
    console.error('[API HATA] Kapı silinirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 2. YETKİLİ KART LİSTESİ ENDPOINT'İ (ESP32 LITTLEFS CARDS.JSON İÇİN)
 * ----------------------------------------------------------------------------
 * Yön: GET /api/cards
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
      timestamp: getTurkeyFormattedTimestamp(),
      serverEpoch: Math.floor(Date.now() / 1000),
      data: cardsList
    });
  } catch (error) {
    console.error('[API HATA] Kartlar çekilirken hata oluştu:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 3. YENİ KART EKLEME ENDPOINT'İ (REACT YÖNETİM PANELİNDEN - MÜKERRER UID KONTROLLÜ)
 * ----------------------------------------------------------------------------
 * Yön: POST /api/cards
 */
app.post('/api/cards', async (req, res) => {
  try {
    const { uid, holderName, cardType, employeeId, faculty, department, accessLevel, allowedGates, status } = req.body;
    
    if (!uid || !holderName) {
      return res.status(400).json({ success: false, error: "UID ve Kart Sahibi ad-soyad zorunludur." });
    }

    // UID boşluklarını temizle ve büyük harfe çevir (Örn: "E49A1277")
    const cleanUid = uid.replace(/\s+/g, '').toUpperCase().trim();

    // MÜKERRER KART KONTROLÜ (Veritabanında aynı UID var mı?)
    const cardsSnapshot = await db.collection('cards').get();
    let duplicateCard = null;

    cardsSnapshot.forEach(doc => {
      const c = doc.data();
      if (c.uid && c.uid.replace(/\s+/g, '').toUpperCase() === cleanUid) {
        duplicateCard = c;
      }
    });

    if (duplicateCard) {
      console.warn(`[FIRESTORE ENGEL] Mükerrer Kart Ekleme Denemesi: ${cleanUid} (Kullanıcı: ${duplicateCard.holderName})`);
      return res.status(409).json({
        success: false,
        error: `Bu RFID Kart UID numarası (${cleanUid}) zaten '${duplicateCard.holderName}' kullanıcısına tanımlı! Aynı kart mükerrer olarak eklenemez.`
      });
    }

    const newCardData = {
      uid: cleanUid,
      holderName: holderName.trim(),
      cardType: cardType || "Personel",
      employeeId: employeeId || "EMP-2026-000",
      faculty: faculty || "N/A",
      department: department || "Genel",
      accessLevel: accessLevel || "Ana Giriş Turnikesi",
      allowedGates: allowedGates || [accessLevel],
      status: status || "Aktif",
      issueDate: new Date().toISOString().split('T')[0],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      syncedToESP32: true
    };

    const docRef = await db.collection('cards').add(newCardData);
    
    console.log(`[FIRESTORE] Yeni RFID Kart Eklendi: ${newCardData.holderName} (${newCardData.uid}) -> ID: ${docRef.id}`);

    // SSE Yayın: Kart listesi değişti
    broadcastSSE('cards_updated', { message: 'new card added' });

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
 * 4. KART BİLGİLERİNİ GÜNCELLEME ENDPOINT'İ (TÜM ALANLAR)
 * ----------------------------------------------------------------------------
 * Yön: PUT /api/cards/:id
 */
app.put('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { holderName, cardType, employeeId, faculty, department, accessLevel, allowedGates, status } = req.body;

    const cardRef = db.collection('cards').doc(id);
    const doc = await cardRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Güncellenecek kart bulunamadı." });
    }

    const updateData = {
      ...(holderName && { holderName: holderName.trim() }),
      ...(cardType && { cardType }),
      ...(employeeId && { employeeId: employeeId.trim() }),
      ...(faculty && { faculty }),
      ...(department && { department }),
      ...(accessLevel && { accessLevel }),
      ...(allowedGates && { allowedGates }),
      ...(status && { status }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncedToESP32: true
    };

    await cardRef.update(updateData);

    console.log(`[FIRESTORE] Kart Bilgileri Güncellendi: ID ${id} -> ${holderName || doc.data().holderName}`);

    // SSE Yayın: Kart listesi güncellendi
    broadcastSSE('cards_updated', { message: 'card updated' });

    // UDP Yayın: ESP32 donanımına anında LittleFS tazeleme sinyali at
    notifyESP32CardsChanged();

    res.json({
      success: true,
      message: "Kart bilgileri başarıyla güncellendi.",
      data: { id, ...doc.data(), ...updateData }
    });
  } catch (error) {
    console.error('[API HATA] Kart güncellenirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 5. KART DURUMU GÜNCELLEME ENDPOINT'İ (AKTİF / ENGELLİ)
 * ----------------------------------------------------------------------------
 * Yön: PUT /api/cards/:id/status
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

    // SSE Yayın: Kart listesi güncellendi
    broadcastSSE('cards_updated', { message: 'card status updated' });

    // UDP Yayın: ESP32 donanımına anında LittleFS tazeleme sinyali at
    notifyESP32CardsChanged();

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
 * 6. KART SİLME ENDPOINT'İ
 * ----------------------------------------------------------------------------
 * Yön: DELETE /api/cards/:id
 */
app.delete('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('cards').doc(id).delete();
    
    console.log(`[FIRESTORE] Kart Silindi: ID ${id}`);

    // SSE Yayın: Kart silindi
    broadcastSSE('cards_updated', { message: 'card deleted' });

    // UDP Yayın: ESP32 donanımına anında LittleFS tazeleme sinyali at
    notifyESP32CardsChanged();

    res.json({ success: true, message: "Kart veritabanından silindi." });
  } catch (error) {
    console.error('[API HATA] Kart silinirken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 7. GEÇİŞ LOGLARINI GÖRÜNTÜLEME ENDPOINT'İ (TOLERANSLI KRONOLOJİK SIRALAMA)
 * ----------------------------------------------------------------------------
 * Yön: GET /api/logs
 */
app.get('/api/logs', async (req, res) => {
  try {
    const limitCount = parseInt(req.query.limit) || 100;

    // Strict Chronological Order (Most recent timestamp on top)
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

    // Safely sort chronologically in memory (Newest first)
    logsList.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return timeB - timeA;
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
 * 8. CANLI KART GEÇİŞ KAYDI EKLEME (STRICT KAPI YETKİ KONTROLÜ İLE)
 * ----------------------------------------------------------------------------
 * Yön: POST /api/logs
 */
app.post('/api/logs', async (req, res) => {
  try {
    const { uid, gate, direction } = req.body;
    
    if (!uid) {
      return res.status(400).json({ success: false, error: "Kart UID zorunludur." });
    }

    const cleanUid = uid.toUpperCase().replace(/\s+/g, '');
    const currentGate = gate || 'Ana Giriş Turnikesi';
    
    const cardsSnapshot = await db.collection('cards').get();
    let targetCard = null;

    cardsSnapshot.forEach(doc => {
      const c = doc.data();
      if (c.uid && c.uid.replace(/\s+/g, '').toUpperCase() === cleanUid) {
        targetCard = { id: doc.id, ...c };
      }
    });

    // 1. Kart Durumu Aktif mi?
    const isActive = targetCard && targetCard.status === 'Aktif';

    // 2. Kartın Bu Özel Kapıya Yetkisi Var mı? (Strict Gate Control)
    let hasGatePermission = false;
    if (isActive) {
      const cardAccess = targetCard.allowedGates || targetCard.accessLevel;
      if (
        cardAccess === "Tüm Kapılar / Yönetici" ||
        (Array.isArray(cardAccess) && (cardAccess.includes("Tüm Kapılar / Yönetici") || cardAccess.includes(currentGate))) ||
        (typeof cardAccess === 'string' && (cardAccess.includes("Tüm Kapılar") || cardAccess.includes(currentGate)))
      ) {
        hasGatePermission = true;
      }
    }

    const isAuthorized = isActive && hasGatePermission;

    let statusText = 'Yetkili';
    if (!targetCard) {
      statusText = 'Tanımlanmamış Yabancı Kullanıcı';
    } else if (!isActive) {
      statusText = 'Kullanıcı Engelli (Pasif)';
    } else if (!hasGatePermission) {
      statusText = 'Kapı Yetkisi Yok (Yetkisiz Kapı)';
    }

    const trTimestamp = getTurkeyFormattedTimestamp();

    const newLogData = {
      uid: cleanUid,
      holderName: targetCard ? targetCard.holderName : 'Tanımlanmamış Yabancı Kullanıcı',
      gate: currentGate,
      direction: direction || 'Giriş',
      status: statusText,
      relayTriggered: isAuthorized, // SADECE KART AKTİF VE KAPI YETKİSİ VARSA RÖLE AÇILIR!
      buzzerBeeps: isAuthorized ? 1 : 3, // İzin varsa 1 Bip, İzin yoksa 3 Bip!
      timestamp: trTimestamp,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      syncedToFirestore: true
    };

    const docRef = await db.collection('access_logs').add(newLogData);

    console.log(`[FIRESTORE CANLI LOG] Kart Okutuldu: ${newLogData.holderName} (${newLogData.uid}) @ ${currentGate} -> Sonuç: ${newLogData.status} | Saat: ${trTimestamp}`);

    const createdLogObj = { id: docRef.id, ...newLogData };

    // SSE Canlı Yayın: Yeni geçen kartı anında (<50ms) açık olan tüm React sekmelerine push et!
    broadcastSSE('new_log', createdLogObj);

    res.status(201).json({
      success: true,
      authorized: isAuthorized,
      relayTriggered: isAuthorized,
      buzzerBeeps: isAuthorized ? 1 : 3,
      data: createdLogObj
    });
  } catch (error) {
    console.error('[API HATA] Canlı geçiş logu yazılırken hata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 9. LITTLEFS PENDINGLOGS TOPLU SENKRONİZASYON ENDPOINT'İ (TÜRKİYE SAATİ VE İSİM KORUMALI)
 * ----------------------------------------------------------------------------
 * Yön: POST /api/logs/sync
 */
app.post('/api/logs/sync', async (req, res) => {
  try {
    const { pendingLogs } = req.body;
    
    if (!Array.isArray(pendingLogs) || pendingLogs.length === 0) {
      return res.json({ success: true, syncedCount: 0, message: "Senkronize edilecek bekleyen log bulunamadı." });
    }

    // Firestore'daki mevcut tüm kartları çekerek UID ile Kart Sahibi eşleşmesi sağla
    const cardsSnapshot = await db.collection('cards').get();
    const cardsMap = new Map();

    cardsSnapshot.forEach(doc => {
      const c = doc.data();
      if (c.uid) {
        const cleanUid = c.uid.toUpperCase().replace(/\s+/g, '');
        cardsMap.set(cleanUid, c);
      }
    });

    const batch = db.batch();
    const trTimestamp = getTurkeyFormattedTimestamp();

    pendingLogs.forEach(pLog => {
      const logRef = db.collection('access_logs').doc();
      const cleanLogUid = (pLog.uid || '').toUpperCase().replace(/\s+/g, '');
      const matchedCard = cardsMap.get(cleanLogUid);

      let resolvedHolderName = 'Tanımlanmamış Yabancı Kullanıcı';
      let isAuthorized = false;
      let statusText = 'Yetkisiz (Çevrimdışı)';

      if (matchedCard) {
        resolvedHolderName = matchedCard.holderName;
        const currentGate = pLog.gate || 'Ana Giriş Turnikesi';
        const cardAccess = matchedCard.allowedGates || matchedCard.accessLevel;
        
        const hasGatePermission = (
          cardAccess === "Tüm Kapılar / Yönetici" ||
          (Array.isArray(cardAccess) && (cardAccess.includes("Tüm Kapılar / Yönetici") || cardAccess.includes(currentGate))) ||
          (typeof cardAccess === 'string' && (cardAccess.includes("Tüm Kapılar") || cardAccess.includes(currentGate)))
        );

        if (matchedCard.status === 'Aktif' && (hasGatePermission || pLog.relayTriggered === true)) {
          isAuthorized = true;
          statusText = 'Yetkili (Çevrimdışı Okutma)';
        } else if (!hasGatePermission) {
          statusText = 'Kapı Yetkisi Yok (Çevrimdışı)';
        } else {
          statusText = 'Kullanıcı Engelli (Çevrimdışı)';
        }
      } else if (pLog.relayTriggered === true || (pLog.status && pLog.status.includes('Yetkili'))) {
        isAuthorized = true;
        resolvedHolderName = (pLog.holderName && pLog.holderName !== 'Çevrimdışı Tanımsız Kullanıcı') ? pLog.holderName : 'Çevrimdışı İzinli Kullanıcı';
        statusText = 'Yetkili (Çevrimdışı Okutma)';
      } else if (pLog.holderName && pLog.holderName !== 'Çevrimdışı Tanımsız Kullanıcı') {
        resolvedHolderName = pLog.holderName;
      }

      let scanTime = trTimestamp;
      if (pLog.timestamp && String(pLog.timestamp).length >= 10) {
        scanTime = pLog.timestamp;
      } else if (typeof pLog.secAgo === 'number' && pLog.secAgo >= 0) {
        const pastDate = new Date(Date.now() - Math.round(pLog.secAgo) * 1000);
        const options = {
          timeZone: 'Europe/Istanbul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        };
        const parts = new Intl.DateTimeFormat('tr-TR', options).formatToParts(pastDate);
        const hash = {};
        parts.forEach(p => hash[p.type] = p.value);
        scanTime = `${hash.year}-${hash.month}-${hash.day} ${hash.hour}:${hash.minute}:${hash.second}`;
      }

      batch.set(logRef, {
        uid: cleanLogUid || 'UNKNOWN',
        holderName: resolvedHolderName,
        gate: pLog.gate || 'Ana Giriş Turnikesi',
        direction: pLog.direction || 'Giriş',
        status: statusText,
        relayTriggered: isAuthorized,
        buzzerBeeps: isAuthorized ? 1 : 3,
        timestamp: scanTime,
        syncedToFirestore: true,
        syncedTime: trTimestamp,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    console.log(`[FIRESTORE SENKRON OK] LittleFS üzerinden ${pendingLogs.length} adet çevrimdışı log Türkiye saatiyle (${trTimestamp}) Firestore'a aktarıldı.`);

    // SSE Canlı Yayın: LittleFS senkronizasyonu bitti, açık olan React sekmelerine haber ver!
    broadcastSSE('sync_logs', { syncedCount: pendingLogs.length });

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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(` ESP32 Node.js REST API & Firebase Firestore Aktif!`);
  console.log(` Sunucu Adresi : http://localhost:${PORT}`);
  console.log(` Health Test    : http://127.0.0.1:${PORT}/api/health`);
  console.log(` Kart Listesi   : http://127.0.0.1:${PORT}/api/cards`);
  console.log(`==================================================\n`);
});
