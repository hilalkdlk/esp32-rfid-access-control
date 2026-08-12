#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <Arduino.h>
#include <Ethernet.h>
#include <ArduinoJson.h>
#include "config.h"
#include "HardwareDriver.h"
#include "StorageManager.h"

extern bool isInternetAvailable;
extern unsigned long lastHeartbeat;
extern unsigned long lastCardsSync;
extern EthernetClient ethClient;

void initNetwork();
void checkEthernetConnection();
void updateLocalCardsFromAPI();
void syncPendingLogs();
void handleCardRead(String cardUID);

#endif // NETWORK_MANAGER_H
