import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BleManager, Device } from "react-native-ble-plx";
import { Buffer } from "buffer";

const manager = new BleManager();
const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"; // Correct Service UUID
const CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // Correct Characteristic UUID

export default function BLEDeviceControl() {
  const [device, setDevice] = useState<Device | null>(null);

  useEffect(() => {
    const getDeviceFromStorage = async () => {
  try {
    const storedDevices = await AsyncStorage.getItem("connectedDevices");
    if (storedDevices) {
      const parsedDevices = JSON.parse(storedDevices);
      if (Array.isArray(parsedDevices) && parsedDevices.length > 0) {
        const deviceInfo = parsedDevices[0];
        console.log("Stored Device Info:", deviceInfo);

        // Reconnect to the device
        const connectedDevice = await manager.connectToDevice(deviceInfo.id);
        await connectedDevice.discoverAllServicesAndCharacteristics();

        setDevice(connectedDevice);
        console.log("Device reconnected:", connectedDevice);
      }
    }
  } catch (error) {
    console.error("Error loading device from storage:", error);
  }
};

    getDeviceFromStorage();
  }, []);

  const sendMessage = async (channelID: string) => {
    if (!device) {
      Alert.alert("No Device Connected", "Please connect to a device first.");
      return;
    }

    try {
      const message = `CHAN${channelID}:STAT OFF\n`;
      const encodedMessage = Buffer.from(message, "utf-8").toString("base64");

      await device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        encodedMessage
      );
      
      console.log("Message sent:", message);
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Error", "Failed to send message to the device.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Device Control</Text>
      <Text
        style={styles.sendButton}
        onPress={() => sendMessage("1")} // Change channelID as needed
      >
        Send Message
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#5e4a8e", marginBottom: 20 },
  sendButton: {
    fontSize: 18,
    color: "white",
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
  },
});
