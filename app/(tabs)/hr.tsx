import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BleManager, Device } from "react-native-ble-plx";
import { decode as atob } from "base-64"; // Use base-64 package
const base64 = require("base-64");
import { Buffer } from "buffer"; // Use buffer for proper binary decoding

const manager = new BleManager();

export default function HeartRateScreen() {
  const [device, setDevice] = useState<Device | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const getDeviceFromStorage = async () => {
      try {
        const storedDevices = await AsyncStorage.getItem("connectedDevices");
        if (storedDevices) {
          const parsedDevices = JSON.parse(storedDevices);
          if (Array.isArray(parsedDevices) && parsedDevices.length > 0) {
            const deviceInfo = parsedDevices[0]; // Connect to the first stored device
            setDevice(deviceInfo);
            connectAndSubscribe(deviceInfo);
          }
        }
      } catch (error) {
        console.error("Error loading device from storage:", error);
      }
    };

    getDeviceFromStorage();
  }, []);

  const connectAndSubscribe = async (deviceInfo: { id: string; name: string }) => {
    try {
      console.log("Attempting to connect to:", deviceInfo.name, deviceInfo.id);
      const connectedDevice = await manager.connectToDevice(deviceInfo.id);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      setIsConnected(true);
      setDevice(connectedDevice);
      subscribeToHeartRate(connectedDevice);
    } catch (error) {
      console.error("Failed to connect:", error);
      setIsConnected(false);
      Alert.alert("Connection Error", "Failed to reconnect to the device.");
    }
  };


  const subscribeToHeartRate = (device: Device) => {
    try {
        const serviceUUID = "0000180d-0000-1000-8000-00805f9b34fb"; // Heart Rate Service UUID
        const characteristicUUID = "00002a37-0000-1000-8000-00805f9b34fb"; // Heart Rate Measurement UUID

        console.log("Subscribing to Heart Rate Characteristic...");

        return device.monitorCharacteristicForService(
            serviceUUID,
            characteristicUUID,
            (error, characteristic) => {
                if (error) {
                    console.error("Error receiving heart rate data:", error);
                    setIsConnected(false);
                    return;
                }

                if (characteristic?.value) {
                    const decodedValue = decodeHeartRate(characteristic.value);

                    if (!isNaN(decodedValue)) {
                        setHeartRate(decodedValue);
                        console.log("Heart Rate:", decodedValue);
                    } else {
                        console.warn("Received NaN heart rate value.");
                    }
                }
            }
        );
    } catch (error) {
        console.error("Error subscribing to heart rate:", error);
    }
};





const decodeHeartRate = (base64Value: string) => {
    try {
        const rawData = Buffer.from(base64Value, "base64"); // Decode Base64 to byte array

        if (rawData.length === 0) {
            console.warn("Received empty heart rate data.");
            return NaN;
        }

        console.log("Raw Heart Rate Data:", rawData); // Debugging: See actual received bytes

        // The heart rate value is stored in the first or second byte
        const heartRate = rawData[0]; // Extract heart rate value from the first byte

        if (heartRate > 0 && heartRate < 250) {
            return heartRate;
        } else {
            console.warn("Invalid heart rate received:", heartRate);
            return NaN;
        }
    } catch (error) {
        console.error("Error decoding heart rate:", error);
        return NaN;
    }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Heart Rate Monitor</Text>
      <Text style={styles.deviceText}>
        {isConnected ? `Connected to: ${device?.name}` : "Not Connected"}
      </Text>
      <Text style={styles.heartRate}>
        {isConnected && heartRate ? `Heart Rate: ${heartRate} BPM` : "Waiting for data..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#5e4a8e", marginBottom: 20 },
  deviceText: { fontSize: 18, color: "#333", marginBottom: 10 },
  heartRate: { fontSize: 22, fontWeight: "bold", color: "red", marginTop: 20 },
});
