#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define FORCE_SENSOR_PIN 35  // GPIO36 for force sensor

// BLE objects for the custom Force Sensor service
BLEServer *pServer = NULL;
BLECharacteristic *forceSensorCharacteristic;
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

void setup() {
  Serial.begin(115200);
  Serial.println("Initialising BLE for Device 2 (Force Sensor)...");

  // Initialise BLE with a unique name
  BLEDevice::init("ESP32 Sensor Monitor 2");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create a custom service with a unique UUID
  BLEService *pService = pServer->createService(
    BLEUUID("6E400000-B5A3-F393-E0A9-E50E24DCCA9E")
  );

  // Create the Force Sensor Characteristic with notify property
  forceSensorCharacteristic = pService->createCharacteristic(
    BLEUUID("6E400002-B5A3-F393-E0A9-E50E24DCCA9E"),
    BLECharacteristic::PROPERTY_NOTIFY
  );
  forceSensorCharacteristic->addDescriptor(new BLE2902());

  pService->start();

  // Set up BLE advertising for the custom service
  pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLEUUID("6E400000-B5A3-F393-E0A9-E50E24DCCA9E"));
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  pAdvertising->start();
  Serial.println("BLE Advertising started for Device 2...");

  // Set up ADC for the force sensor
  analogSetAttenuation(ADC_11db);
}

void loop() {
  int forceValue;
  
  forceValue = analogRead(FORCE_SENSOR_PIN);
 

  forceSensorCharacteristic->setValue((uint8_t*)&forceValue, sizeof(forceValue));
  forceSensorCharacteristic->notify();

  Serial.print("Force Sensor Value: ");
  Serial.println(forceValue);
  delay(1000);
}
