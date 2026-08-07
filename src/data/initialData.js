// Initial mock data for ESP32 RFID Access Control System

export const INITIAL_CARDS = [];

export const INITIAL_LOGS = [];

export const INITIAL_ESP32_STATUS = {
  isOnline: true,
  ipAddress: "192.168.1.150",
  macAddress: "DE:AD:BE:EF:FE:ED",
  ethernetConnected: true,
  littleFSUsedBytes: "48 KB / 1.5 MB",
  cardsJsonCount: 0,
  pendingLogsCount: 0,
  lastSyncTime: "2026-08-07 09:15:00"
};

export const CARD_TYPES = [
  "Öğrenci",
  "Personel"
];

export const FACULTIES = [
  "Mühendislik ve Doğa Bilimleri Fakültesi",
  "Fen - Edebiyat Fakültesi",
  "İktisadi ve İdari Bilimler Fakültesi",
  "Tıp Fakültesi",
  "Mimarlık ve Tasarım Fakültesi",
  "Hukuk Fakültesi",
  "Eğitim Fakültesi"
];

export const STUDENT_DEPARTMENTS = [
  "Bilgisayar Mühendisliği",
  "Yazılım Mühendisliği",
  "Elektrik - Elektronik Mühendisliği",
  "Endüstri Mühendisliği",
  "Makine Mühendisliği",
  "Biyomedikal Mühendisliği",
  "İşletme",
  "İktisat",
  "Tıp",
  "Mimarlık"
];

export const DEPARTMENTS = [
  "AR-GE Mühendisliği",
  "Bilgi İşlem / IT",
  "İnsan Kaynakları",
  "Yazılım Stajyer",
  "Lojistik & Depo",
  "Yönetim & İdari İşler",
  "Güvenlik",
  "Akademik Personel"
];

export const ACCESS_LEVELS = [
  "Standart Kapılar",
  "Tüm Kapılar / Yönetici",
  "VIP & Server Oda",
  "Sadece Lab & AR-GE",
  "Otopark & Depo"
];

export const GATES = [
  "Ana Giriş Turnikesi",
  "AR-GE Laboratuvar Kapısı",
  "Yönetim Katı Turnikesi",
  "Otopark Bariyeri",
  "Server Oda Kapısı"
];
