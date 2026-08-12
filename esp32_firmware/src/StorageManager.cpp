#include "StorageManager.h"

String baseTimestampStr = "";
unsigned long baseSyncMillis = 0;

void initStorage() {
  if (!LittleFS.begin(true)) {
    Serial.println("❌ [HATA] LittleFS Dosya Sistemi Başlatılamadı!");
  } else {
    Serial.println("✅ LittleFS Bellek Hazır (cards.json & pendingLogs.json)");
  }
}

// 📁 LittleFS cards.json Dosyasından Yetki Kontrolü
bool checkCardAuthorizationOffline(String cardUID, String &foundHolderName) {
  foundHolderName = "Çevrimdışı Tanımsız Kullanıcı";

  if (!LittleFS.exists("/cards.json")) {
    Serial.println("⚠️ LittleFS /cards.json dosyası henüz hafızada yok!");
    return false;
  }

  File file = LittleFS.open("/cards.json", "r");
  DynamicJsonDocument doc(4096);
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
            if (gateStr == "Tüm Kapılar / Yönetici" || gateStr == String(DEVICE_GATE)) {
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
  DynamicJsonDocument doc(4096);
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

  // Çevrimdışı kart okutma anındaki HASSAS GERÇEK SAAT HESABI (Saniye Hassasiyetinde)
  String currentTimestamp = "";
  if (baseTimestampStr.length() >= 19 && baseSyncMillis > 0) {
    int y, m, d, hh, mm, ss;
    if (sscanf(baseTimestampStr.c_str(), "%d-%d-%d %d:%d:%d", &y, &m, &d, &hh, &mm, &ss) == 6) {
      struct tm t = {0};
      t.tm_year = y - 1900;
      t.tm_mon = m - 1;
      t.tm_mday = d;
      t.tm_hour = hh;
      t.tm_min = mm;
      t.tm_sec = ss;

      time_t epoch = mktime(&t);
      unsigned long elapsedSec = (millis() - baseSyncMillis) / 1000;
      epoch += elapsedSec;

      struct tm *resTime = localtime(&epoch);
      char buf[30];
      snprintf(buf, sizeof(buf), "%04d-%02d-%02d %02d:%02d:%02d",
               resTime->tm_year + 1900,
               resTime->tm_mon + 1,
               resTime->tm_mday,
               resTime->tm_hour,
               resTime->tm_min,
               resTime->tm_sec);
      currentTimestamp = String(buf);
    }
  }

  JsonObject newLog = array.createNestedObject();
  newLog["uid"] = cardUID;
  newLog["holderName"] = holderName;
  newLog["gate"] = DEVICE_GATE;
  newLog["direction"] = "Giriş";
  newLog["status"] = isGranted ? "Yetkili" : "Yetkisiz";
  newLog["relayTriggered"] = isGranted;
  if (currentTimestamp.length() > 0) {
    newLog["timestamp"] = currentTimestamp; // ⏱️ Kartın fiziki okunduğu TAM SANİYEYİ kaydet!
  }

  File file = LittleFS.open("/pendingLogs.json", "w");
  serializeJson(doc, file);
  file.close();

  Serial.print("💾 [OFFLINE LOG OK] LittleFS pendingLogs.json dosyasına eklendi (Toplam Bekleyen: ");
  Serial.print(array.size());
  Serial.println(") -> Kullanıcı: " + holderName + " | Röle: " + (isGranted ? "AÇIK" : "KAPALI"));
}
