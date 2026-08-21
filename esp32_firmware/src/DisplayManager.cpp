#include "DisplayManager.h"
#include "NetworkManager.h"
#include "StorageManager.h"

// 16x2 I2C LCD Ekran Nesnesi (Adres: 0x27, 16 Sütun, 2 Satır)
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);

// 🔍 Serial Monitor İçi Otomatik I2C Hat Tarayıcısı
void scanI2CBus() {
  Serial.println("🔍 I2C Veri Yolu Taranıyor (SDA: 21, SCL: 22)...");
  byte count = 0;
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.print("✅ [I2C CİHAZ BULUNDU] Adres: 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      count++;
    }
  }
  if (count == 0) {
    Serial.println("❌ [HATA] I2C Hattı Üzerinde Hiçbir Cihaz Bulunamadı!");
  }
}

// 📺 16x2 Karakter LCD Ekranı Başlatma Fonksiyonu
void initDisplay() {
  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  delay(200);

  scanI2CBus(); // Seri Port İçi I2C Taraması Yap

  lcd.init();      // 16x2 LCD'yi başlat
  lcd.backlight(); // Arka plan ışığını yak
  lcd.clear();     // Ekranı temizle

  Serial.println("✅ 16x2 Karakter LCD Ekran Başarıyla İlklendirildi (0x27)!");
  
  lcd.setCursor(0, 0);
  lcd.print("ESP32 KARTLI GCS");
  lcd.setCursor(0, 1);
  lcd.print("SISTEMI HAZIR...");
  delay(1200);
}

// 📺 Sabit Bekleme (Standby) Ekranı: Aktifse "KARTINIZI OKUTUNUZ", Pasifse "PASIF KAPI HIZMET DISI"
void displayStandby() {
  lcd.clear();
  if (!isGateActive) {
    lcd.setCursor(0, 0);
    lcd.print("   PASIF KAPI   ");
    lcd.setCursor(0, 1);
    lcd.print(" HIZMET DISIDIR ");
  } else {
    lcd.setCursor(0, 0);
    lcd.print("   KARTINIZI    ");
    lcd.setCursor(0, 1);
    lcd.print("    OKUTUNUZ    ");
  }
}

// 🔓 Kart Okutulunca Erişim Varsa (Yetkili): "GECIS YAPABILIRSINIZ"
void displayAccessGranted(String holderName) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("     GECIS      ");
  lcd.setCursor(0, 1);
  lcd.print(" YAPABILIRSINIZ ");
}

// 🔒 Kart Okutulunca Erişim Yoksa (Yetkisiz): "ERISIM YOK"
void displayAccessDenied(String reasonText) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("   ERISIM YOK   ");
  lcd.setCursor(0, 1);
  if (reasonText.length() > 0 && reasonText.length() <= 16) {
    int padding = (16 - reasonText.length()) / 2;
    for (int i = 0; i < padding; i++) lcd.print(" ");
    lcd.print(reasonText);
  } else {
    lcd.print("                ");
  }
}
