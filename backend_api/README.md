# 🌐 Node.js REST API & Firebase Cloud Firestore Backend

Bu klasör, ESP32 ve React Yönetim Paneli arasındaki iletişimi sağlayan Node.js Express REST API ve Firebase Firestore veritabanı sürücüsünü barındırır.

## 🚀 Planlanan Endpoint'ler (Adım 4 & 5)
- `GET /api/health` - İnternet / ESP32 Ping Testi
- `GET /api/cards` - Yetkili kart listesini döner (LittleFS `cards.json` güncellenmesi için)
- `POST /api/logs/sync` - LittleFS `pendingLogs.json` üzerindeki bekleyen logları Firestore'a topluca aktarır
