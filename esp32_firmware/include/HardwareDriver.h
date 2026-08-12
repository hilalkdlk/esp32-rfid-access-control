#ifndef HARDWARE_DRIVER_H
#define HARDWARE_DRIVER_H

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include "config.h"

extern MFRC522 rfid;

void setupHardware();
void selectRFID();
void selectEthernet();
void grantAccess();
void denyAccess();

#endif // HARDWARE_DRIVER_H
