#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "config.h"

extern LiquidCrystal_I2C lcd;

void initDisplay();
void scanI2CBus();
void displayStandby();
void displayAccessGranted(String holderName);
void displayAccessDenied(String reasonText);

#endif // DISPLAY_MANAGER_H
