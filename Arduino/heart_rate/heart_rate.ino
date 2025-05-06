#include <Wire.h>
#include "MAX30105.h"
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

MAX30105 particleSensor;  // MAX30105 sensor instance

// BLE objects for Heart Rate Service
BLEServer *pServer = NULL;
BLECharacteristic *heartRateCharacteristic;
BLEAdvertising *pAdvertising;

bool deviceConnected = false;

// Custom server callback to detect connection events
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("Device connected.");
  }
  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("Device disconnected, restarting advertising...");
    delay(500);
    pAdvertising->start();
    Serial.println("BLE advertising restarted.");
  }
};

// Function to generate a heart rate value from the sensor reading
uint8_t generateHeartRate() {
  if (particleSensor.check()) {
    long irValue = particleSensor.getIR();
    Serial.println(irValue);

    if (irValue > 15000) {
      return map(irValue, 15000, 120000, 60, 180);
    }
  }
  return 1;
}

void setup() {
  Serial.begin(115200);
  Serial.println("Initializing BLE for Device 1 (Heart Rate Sensor)...");

  // Initialise BLE with a unique name
  BLEDevice::init("ESP32 Sensor Monitor 1");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the standard Heart Rate Service (0x180D)
  BLEService *pService = pServer->createService(BLEUUID((uint16_t)0x180D));

  // Create the Heart Rate Measurement Characteristic (0x2A37) with notify property
  heartRateCharacteristic = pService->createCharacteristic(
    BLEUUID((uint16_t)0x2A37),
    BLECharacteristic::PROPERTY_NOTIFY
  );
  heartRateCharacteristic->addDescriptor(new BLE2902());

  pService->start();

  // Set up BLE advertising
  pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLEUUID((uint16_t)0x180D));
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  pAdvertising->start();
  Serial.println("BLE Advertising started for Device 1...");

  // Initialise the MAX30105 sensor
  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("MAX30105 not found. Using simulated heart rate values.");
  } else {
    Serial.println("MAX30105 Initialised.");
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeIR(0x0A);  
  }
}

void loop() {
  uint8_t heartRate;
  
  heartRate = generateHeartRate();
  

  heartRateCharacteristic->setValue(&heartRate, 1);
  heartRateCharacteristic->notify();

  Serial.print("Heart Rate: ");
  Serial.println(heartRate);
  delay(1000);
}
