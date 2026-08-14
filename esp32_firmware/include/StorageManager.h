#ifndef STORAGE_MANAGER_H
#define STORAGE_MANAGER_H

#include <Arduino.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include "config.h"

extern String baseTimestampStr;
extern unsigned long baseSyncMillis;

void initStorage();
bool checkCardAuthorizationOffline(String cardUID, String &foundHolderName);
void logAccessOffline(String cardUID, bool isGranted, String holderName);

// 📊 LittleFS Depolama Metrikleri ve Veri Sayıları (Device Status Panel İçin)
size_t getLittleFSTotalBytes();
size_t getLittleFSUsedBytes();
size_t getLittleFSFreeBytes();
float getLittleFSUsagePercentage();
int getRegisteredCardCount();
int getPendingLogCount();

#endif // STORAGE_MANAGER_H
