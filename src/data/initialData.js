// Initial mock data for ESP32 RFID Access Control System

export const INITIAL_CARDS = [
  {
    id: "card-1",
    uid: "A3 8F 42 C1",
    holderName: "Ahmet Yılmaz",
    employeeId: "EMP-2024-001",
    department: "AR-GE Mühendisliği",
    accessLevel: "Tüm Kapılar / Yönetici",
    status: "Aktif",
    issueDate: "2024-01-15",
    expiryDate: "2026-12-31",
    syncedToESP32: true,
    lastAccess: "2026-08-04 08:45"
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
    expiryDate: "2026-12-31",
    syncedToESP32: true,
    lastAccess: "2026-08-04 09:10"
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
    expiryDate: "2026-12-31",
    syncedToESP32: true,
    lastAccess: "2026-08-04 08:30"
  },
  {
    id: "card-4",
    uid: "D1 77 33 08",
    holderName: "Zeynep Çelik",
    employeeId: "STJ-2026-012",
    department: "Yazılım Stajyer",
    accessLevel: "Standart Kapılar",
    status: "Aktif",
    issueDate: "2026-06-01",
    expiryDate: "2026-09-01",
    syncedToESP32: true,
    lastAccess: "2026-08-04 09:00"
  },
  {
    id: "card-5",
    uid: "E8 00 12 AF",
    holderName: "Caner Öztürk",
    employeeId: "EMP-2023-105",
    department: "Lojistik & Depo",
    accessLevel: "Standart Kapılar",
    status: "Engelli",
    issueDate: "2023-11-20",
    expiryDate: "2025-11-20",
    syncedToESP32: true,
    lastAccess: "2026-07-28 17:15"
  }
];

export const INITIAL_LOGS = [
  {
    id: "log-1",
    timestamp: "2026-08-04 09:10:15",
    uid: "B4 12 90 FC",
    holderName: "Ayşe Kaya",
    gate: "Ana Giriş Turnikesi",
    direction: "Giriş",
    status: "Yetkili (İzin Verildi)",
    mode: "Online (API)",
    relayTriggered: true,
    buzzerBeeps: 1,
    syncedToFirestore: true
  },
  {
    id: "log-2",
    timestamp: "2026-08-04 09:00:22",
    uid: "D1 77 33 08",
    holderName: "Zeynep Çelik",
    gate: "Ana Giriş Turnikesi",
    direction: "Giriş",
    status: "Yetkili (İzin Verildi)",
    mode: "Online (API)",
    relayTriggered: true,
    buzzerBeeps: 1,
    syncedToFirestore: true
  },
  {
    id: "log-3",
    timestamp: "2026-08-04 08:45:00",
    uid: "A3 8F 42 C1",
    holderName: "Ahmet Yılmaz",
    gate: "AR-GE Laboratuvar Kapısı",
    direction: "Giriş",
    status: "Yetkili (İzin Verildi)",
    mode: "Online (API)",
    relayTriggered: true,
    buzzerBeeps: 1,
    syncedToFirestore: true
  },
  {
    id: "log-4",
    timestamp: "2026-08-04 08:35:10",
    uid: "FF FF FF FF",
    holderName: "Tanımlanmamış Kart",
    gate: "Yönetim Katı Turnikesi",
    direction: "Giriş",
    status: "Yetkisiz Kart (Reddedildi)",
    mode: "Offline (LittleFS)",
    relayTriggered: false,
    buzzerBeeps: 3,
    syncedToFirestore: false
  },
  {
    id: "log-5",
    timestamp: "2026-08-04 08:30:45",
    uid: "C9 55 E3 11",
    holderName: "Mehmet Demir",
    gate: "Otopark Bariyeri",
    direction: "Giriş",
    status: "Yetkili (İzin Verildi)",
    mode: "Online (API)",
    relayTriggered: true,
    buzzerBeeps: 1,
    syncedToFirestore: true
  }
];

export const INITIAL_ESP32_STATUS = {
  isOnline: true,
  ipAddress: "192.168.1.150",
  macAddress: "DE:AD:BE:EF:FE:ED",
  ethernetConnected: true,
  littleFSUsedBytes: "48 KB / 1.5 MB",
  cardsJsonCount: 5,
  pendingLogsCount: 1,
  lastSyncTime: "2026-08-04 09:15:00"
};

export const DEPARTMENTS = [
  "AR-GE Mühendisliği",
  "Bilgi İşlem / IT",
  "İnsan Kaynakları",
  "Yazılım Stajyer",
  "Lojistik & Depo",
  "Yönetim & İdari İşler",
  "Güvenlik"
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
