/**
 * ============================================================================
 * DOSYA: backend_api/firebase.js
 * AÇIKLAMA: Firebase Cloud Firestore Veritabanı Admin Bağlantı Modülü.
 * ============================================================================
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';

// ES Module (import) yapısı içinde JSON dosyasını güvenle okumak için createRequire kullanımı
const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// 1. FIREBASE ADMIN SDK İLKLENDİRMESİ (INITIALIZATION)
// Hizmet hesabı anahtarı (serviceAccountKey.json) ile Firebase projenize admin yetkisiyle bağlanır.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ [FIREBASE] Cloud Firestore Veritabanı Bağlantısı Başarıyla Kuruldu!');
}

// 2. FIRESTORE VERİTABANI SÜRÜCÜSÜNÜ AL VE DIŞA AKTAR
const db = admin.firestore();

export { admin, db };
