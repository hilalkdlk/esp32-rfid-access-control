#include "StorageManager.h"

String baseTimestampStr = "";
unsigned long baseSyncMillis = 0;
String activeGateName = "Ana Giriş Turnikesi";
bool isGateActive = true;

// 🆔 ESP32 ÇİPİNİN DÜNYADA TEK OLAN FABRİKA EFUSE SERİ NUMARASINDAN CİHAZ ID TÜRETME (ESP32-XXXX)
String getAutoDeviceId() {
  uint64_t chipid = ESP.getEfuseMac();
  char idBuf[20];
  snprintf(idBuf, sizeof(idBuf), "ESP32-%04X%04X", (uint16_t)(chipid >> 32), (uint16_t)(chipid & 0xFFFF));
  return String(idBuf);
}

// 🌐 DONANIMA ÖZEL BENZERSİZ W5500 ETHERNET MAC ADRESİ TÜRETME
void getAutoMacAddress(byte* macOut) {
  uint64_t chipid = ESP.getEfuseMac();
  macOut[0] = 0xDE;
  macOut[1] = 0xAD;
  macOut[2] = (byte)((chipid >> 24) & 0xFF);
  macOut[3] = (byte)((chipid >> 16) & 0xFF);
  macOut[4] = (byte)((chipid >> 8) & 0xFF);
  macOut[5] = (byte)(chipid & 0xFF);
}

// 📁 LittleFS /config.json Dosyasından Atanan Kapı Adını Okuma
String getDeviceAssignedGate() {
  if (LittleFS.exists("/config.json")) {
    File file = LittleFS.open("/config.json", "r");
    DynamicJsonDocument doc(512);
    DeserializationError err = deserializeJson(doc, file);
    file.close();
    if (!err && doc.containsKey("assignedGate")) {
      return doc["assignedGate"].as<String>();
    }
  }
  return "Ana Giriş Turnikesi";
}

// 📁 LittleFS /config.json Dosyasından Kapı Hizmet Durumunu Okuma
bool getDeviceGateStatus() {
  if (LittleFS.exists("/config.json")) {
    File file = LittleFS.open("/config.json", "r");
    DynamicJsonDocument doc(512);
    DeserializationError err = deserializeJson(doc, file);
    file.close();
    if (!err && doc.containsKey("isGateActive")) {
      return doc["isGateActive"].as<bool>();
    }
  }
  return true;
}

// 📁 LittleFS /config.json Dosyasına Atanan Yeni Kapı Adını ve Durumunu Kaydetme
void saveDeviceAssignedGate(String newGateName, bool activeStatus) {
  activeGateName = newGateName;
  isGateActive = activeStatus;

  DynamicJsonDocument doc(512);
  doc["assignedGate"] = newGateName;
  doc["isGateActive"] = activeStatus;
  doc["deviceId"] = getAutoDeviceId();

  File file = LittleFS.open("/config.json", "w");
  serializeJson(doc, file);
  file.close();
  Serial.println("💾 [LITTLEFS CONFIG OK] Cihaz Kapısı Kaydedildi -> " + newGateName + (isGateActive ? " (Aktif)" : " (PASİF)"));
}

void initStorage() {
  if (!LittleFS.begin(true)) {
    Serial.println("❌ [HATA] LittleFS Dosya Sistemi Başlatılamadı!");
  } else {
    Serial.println("✅ LittleFS Bellek Hazır (cards.json, pendingLogs.json & config.json)");
    activeGateName = getDeviceAssignedGate();
    isGateActive = getDeviceGateStatus();

    // /pendingLogs.json yoksa boş dizi olarak oluştur (Terminal uyarı loglarını engellemek için)
    if (!LittleFS.exists("/pendingLogs.json")) {
      File file = LittleFS.open("/pendingLogs.json", "w");
      if (file) {
        file.print("[]");
        file.close();
      }
    }
  }
}

// 📁 LittleFS cards.json Dosyasından Yetki Kontrolü
bool checkCardAuthorizationOffline(String cardUID, String &foundHolderName) {
  foundHolderName = "Çevrimdışı Tanımsız Kullanıcı";

  if (!isGateActive) {
    Serial.println("🔒 [OFFLINE ERİŞİM REDDEDİLDİ] Kapı Pasif / Hizmet Dışıdır!");
    return false;
  }

  if (!LittleFS.exists("/cards.json")) {
    Serial.println("⚠️ LittleFS /cards.json dosyası henüz hafızada yok!");
    return false;
  }

  File file = LittleFS.open("/cards.json", "r");
  DynamicJsonDocument doc(16384);
  DeserializationError error = deserializeJson(doc, file);
  file.close();

  if (error) {
    Serial.println("❌ LittleFS cards.json ayrıştırma hatası!");
    return false;
  }

  JsonArray array = doc.as<JsonArray>();
  for (JsonObject card : array) {
    String fileUid = card["uid"].as<String>();
    fileUid.replace(" ", "");
    fileUid.toUpperCase();

    if (fileUid == cardUID) {
      if (card.containsKey("holderName")) {
        foundHolderName = card["holderName"].as<String>();
      }

      if (card["status"].as<String>() == "Aktif") {
        // Kapı Yetki Kontrolü
        if (card.containsKey("allowedGates")) {
          JsonArray gates = card["allowedGates"].as<JsonArray>();
          for (JsonVariant g : gates) {
            String gateStr = g.as<String>();
            if (gateStr == "Tüm Kapılar / Yönetici" || gateStr == activeGateName) {
              Serial.println("✅ [OFFLINE İZİN VERİLDİ] LittleFS yetkisi doğrulandı -> " + foundHolderName);
              return true;
            }
          }
        } else {
          Serial.println("✅ [OFFLINE İZİN VERİLDİ] LittleFS yetkisi doğrulandı -> " + foundHolderName);
          return true;
        }
      }
    }
  }

  Serial.println("🔒 [OFFLINE ERİŞİM REDDEDİLDİ] Kart LittleFS üzerinde yetkisiz veya engelli.");
  return false;
}

// 📁 Çevrimdışı Log Kaydı (LittleFS pendingLogs.json Dosyasına Çoklu Dizi Olarak Ekleme)
void logAccessOffline(String cardUID, bool isGranted, String holderName) {
  DynamicJsonDocument doc(16384);
  JsonArray array;

  if (LittleFS.exists("/pendingLogs.json")) {
    File file = LittleFS.open("/pendingLogs.json", "r");
    DeserializationError err = deserializeJson(doc, file);
    file.close();
    
    if (!err && doc.is<JsonArray>()) {
      array = doc.as<JsonArray>();
    } else {
      array = doc.to<JsonArray>();
    }
  } else {
    array = doc.to<JsonArray>();
  }

  // Çevrimdışı kart okutma anındaki HASSAS GERÇEK SAAT HESABI (Standard C mktime & strftime)
  String currentTimestamp = "";
  unsigned long nowMillis = millis();
  unsigned long elapsedSec = (nowMillis >= baseSyncMillis && baseSyncMillis > 0) ? ((nowMillis - baseSyncMillis) / 1000) : 0;

  if (baseTimestampStr.length() >= 19 && baseSyncMillis > 0) {
    int y = 0, m = 0, d = 0, hh = 0, mm = 0, ss = 0;
    if (sscanf(baseTimestampStr.c_str(), "%d-%d-%d %d:%d:%d", &y, &m, &d, &hh, &mm, &ss) == 6) {
      struct tm t;
      memset(&t, 0, sizeof(struct tm));
      t.tm_year = y - 1900;
      t.tm_mon = m - 1;
      t.tm_mday = d;
      t.tm_hour = hh;
      t.tm_min = mm;
      t.tm_sec = ss;

      time_t baseUnix = mktime(&t);
      if (baseUnix != (time_t)(-1)) {
        time_t currentUnix = baseUnix + elapsedSec;
        struct tm *currentTm = localtime(&currentUnix);
        char buf[30];
        strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", currentTm);
        currentTimestamp = String(buf);
      }
    }
  }

  JsonObject newLog = array.createNestedObject();
  newLog["uid"] = cardUID;
  newLog["holderName"] = holderName;
  newLog["gate"] = activeGateName;
  newLog["direction"] = "Giriş";
  newLog["status"] = isGranted ? "Yetkili" : "Yetkisiz";
  newLog["relayTriggered"] = isGranted;
  newLog["secAgo"] = elapsedSec; // ⏱️ Kartın kaç saniye önce okutulduğu bilgisi
  if (currentTimestamp.length() > 0) {
    newLog["timestamp"] = currentTimestamp; // ⏱️ Kartın okunduğu TAM SANİYEYİ kaydet
  }

  File file = LittleFS.open("/pendingLogs.json", "w");
  serializeJson(doc, file);
  file.close();

  Serial.print("💾 [OFFLINE LOG OK] LittleFS pendingLogs.json dosyasına eklendi (Toplam Bekleyen: ");
  Serial.print(array.size());
  Serial.println(") -> Kullanıcı: " + holderName + " | Röle: " + (isGranted ? "AÇIK" : "KAPALI"));
}

// ----------------------------------------------------------------------------
// 📊 LITTLEFS DEPOLAMA METRİKLERİ VE SAYILARI (DEVICE STATUS PANEL İÇİN)
// ----------------------------------------------------------------------------

size_t getLittleFSTotalBytes() {
  return LittleFS.totalBytes();
}

size_t getLittleFSUsedBytes() {
  return LittleFS.usedBytes();
}

size_t getLittleFSFreeBytes() {
  size_t total = LittleFS.totalBytes();
  size_t used = LittleFS.usedBytes();
  return (total > used) ? (total - used) : 0;
}

float getLittleFSUsagePercentage() {
  size_t total = LittleFS.totalBytes();
  size_t used = LittleFS.usedBytes();
  if (total == 0) return 0.0;
  return (float)(used * 100.0) / (float)total;
}

int getRegisteredCardCount() {
  if (!LittleFS.exists("/cards.json")) return 0;
  File file = LittleFS.open("/cards.json", "r");
  DynamicJsonDocument doc(16384);
  DeserializationError err = deserializeJson(doc, file);
  file.close();
  if (!err && doc.is<JsonArray>()) {
    return doc.as<JsonArray>().size();
  }
  return 0;
}

int getPendingLogCount() {
  if (!LittleFS.exists("/pendingLogs.json")) return 0;
  File file = LittleFS.open("/pendingLogs.json", "r");
  DynamicJsonDocument doc(16384);
  DeserializationError err = deserializeJson(doc, file);
  file.close();
  if (!err && doc.is<JsonArray>()) {
    return doc.as<JsonArray>().size();
  }
  return 0;
}
