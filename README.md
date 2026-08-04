# 🔐 ESP32 Çevrimdışı Destekli Kartlı Geçiş Kontrol Sistemi - React Paneli

Bu proje, ESP32 gömülü sistem (W5500 Ethernet, MFRC522 RFID, Röle Kapı Kilidi, Active Buzzer ve LittleFS dosya sistemi), Node.js REST API ve Firebase Cloud Firestore mimarisiyle entegre çalışan **Çevrimdışı (Offline) Destekli Akıllı Kartlı Geçiş Kontrol Yönetim Paneli**dir.

## 🌟 Ekran Akışı & Özellikler

1. **Kart Listeleme Ekranı**:
   - Sistem genel metrikleri ve durum kartları (Aktif/Pasif/Bekleyen).
   - RFID Kart UID, Kart Sahibi, Birim, Yetki Seviyesi ve Senkronizasyon Durumu.
   - Hızlı arama, birim filtreleme, kart engelleme/aktifleştirme ve silme.

2. **Kart Ekleme Ekranı**:
   - RFID UID Otomatik üretme veya simüle okutma.
   - **Canlı 3D Visual NFC Kart Önizlemesi** (Form doldurulurken anlık değişen şık dijital kart).
   - Kayıt tamamlandığında başarı efekti ve ESP32 `cards.json` senkronizasyonu.

3. **Giriş-Çıkış Logları Ekranı**:
   - **Canlı ESP32 & Turnike Geçiş Simülatörü**: Online API veya Offline (LittleFS) modunda kart okutma simülasyonu.
   - Offline modda oluşan logların `pendingLogs.json` dosyasına yazılması ve internet geldiğinde otomatik Firestore senkronizasyonu.
   - Zaman sıralı log tablosu, kapı/turnike filtreleri ve durum göstergeleri.

## 🚀 Kurulum ve Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```
