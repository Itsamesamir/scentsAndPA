import React, { useState, useContext, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { BleContext } from "../../utilities/BleContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer"; // Use buffer for proper binary decoding
import { backEndUrl } from '../../config'

interface Device {
  id: string;
  name: string;
  serviceUUIDs?: string[];
  readCharacteristicForService: (serviceUUID: string, charUUID: string) => Promise<{ value: string }>;
}

export default function SensorDataScreen() {
  const { connectedDevices, setConnectedDevices } = useContext(BleContext);
  const manager = new BleManager();
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [pressure, setPressure] = useState<number | null>(null);
  const router = useRouter();

  const HR_SERVICE_UUID =     "0000180d-0000-1000-8000-00805f9b34fb";
  const PRESSURE_SERVICE_UUID = "6e400000-b5a3-f393-e0a9-e50e24dcca9e";
  useEffect(() => {
  const loadConnectedDevices = async () => {
    try {
      console.log("🔄 Checking for already connected BLE devices...");

      const serviceUUIDs = [
        "0000180d-0000-1000-8000-00805f9b34fb", // Heart Rate Service
        "6E400000-B5A3-F393-E0A9-E50E24DCCA9E", // Custom Pressure Sensor Service
      ];

      // Fetch already connected devices
      const connectedDevices = await manager.connectedDevices(serviceUUIDs);

      console.log("✅ Found connected devices:", connectedDevices);

      // Fetch services for each connected device
      const devicesWithServices = await Promise.all(
        connectedDevices.map(async (device) => {
          try {
            await device.discoverAllServicesAndCharacteristics();
            const services = await device.services();
            const serviceUUIDs = services.map((service) => service.uuid);

            console.log(`✅ Services for ${device.id}:`, serviceUUIDs);

            return { ...device, serviceUUIDs };
          } catch (error) {
            console.error(`❌ Error fetching services for ${device.id}:`, error);
            return null;
          }
        })
      );

      setConnectedDevices(devicesWithServices.filter(Boolean)); // Remove nulls
    } catch (error) {
      if (error instanceof Error && error.message.includes("Operation was cancelled")) {
          console.warn("Ignoring BLE Operation cancelled error.");
          return;
      }
      console.error("❌ Error loading connected devices:", error);
    }
  };

  loadConnectedDevices();
}, []);
  const updateHR = async (HR) => {
    try {
        const email = await AsyncStorage.getItem('user_email'); // Retrieve email from AsyncStorage
        if (!email) {
            alert('User email not found. Please log in again.');
            return;
        }

        const response = await fetch(`${backEndUrl}/updateHR`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, HR }), // Send email and HR to backend
        });

        const data = await response.json();
        if (response.ok) {
            alert(`HR updated successfully: ${data.HR}`);
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error updating HR:', error);
    }
  };



  const decodeHeartRate = (base64Value: string) => {
    try {
      const rawData = Buffer.from(base64Value, "base64"); // Decode Base64 to byte array

      if (rawData.length === 0) {
        console.warn("Received empty heart rate data.");
        return NaN;
      }

      console.log("Raw Heart Rate Data:", rawData); // Debug: log the raw bytes

      // Extract heart rate from the first byte
      const heartRate = rawData[0];

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

  const monitorHeartRate = (device: Device) => {
    let heartRates: number[] = [];
    console.log(`Starting heart rate monitoring for ${device.id} for 20 seconds`);

    // Subscribe to heart rate notifications using monitorCharacteristicForDevice
    const subscription = manager.monitorCharacteristicForDevice(
      device.id,
      HR_SERVICE_UUID,
      "00002a37-0000-1000-8000-00805f9b34fb",
      (error, characteristic) => {
        if (error) {
          if (error.message.includes("Operation was cancelled")) {
              console.warn("Ignoring BLE Operation cancelled error."); // Silent ignore
              return;
          }
          console.error("Monitor error:", error);
          return;
        }
        if (characteristic?.value) {
          // Decode the Base64 value using the provided function
          const decodedValue = decodeHeartRate(characteristic.value);
          if (!isNaN(decodedValue)) {
            console.log(`Decoded Heart Rate: ${decodedValue} BPM`);
            heartRates.push(decodedValue);
          }
        }
      }
    );

    // After 20 seconds, unsubscribe and average the collected values
    setTimeout(() => {
      subscription.remove();
      if (heartRates.length > 0) {
        const sum = heartRates.reduce((acc, curr) => acc + curr, 0);
        const average = sum / heartRates.length;
        console.log(`Average heart rate over 20 seconds: ${average} BPM`);
        setHeartRate(average);
        updateHR(average);
      } else {
        console.log("No heart rate data received in 20 seconds.");
        setHeartRate(null);
      }
    }, 20000);
  };





  const monitorPressure = (device: Device) => {
    let pressureReadings: number[] = [];
    console.log(`Starting pressure monitoring for ${device.id} for 10 seconds`);

    // Subscribe to pressure notifications using monitorCharacteristicForDevice
    const subscription = manager.monitorCharacteristicForDevice(
        device.id,
        PRESSURE_SERVICE_UUID,
        "6E400002-B5A3-F393-E0A9-E50E24DCCA9E",
        (error, characteristic) => {
            if (error) {
                if (error.message.includes("Operation was cancelled")) {
                    console.warn("Ignoring BLE Operation cancelled error.");
                    return;
                }
                console.error("Monitor error:", error);
                return;
            }

            if (characteristic?.value) {
                // Decode the Base64 value
                const decodedValue = decodePressure(characteristic.value);
                if (!isNaN(decodedValue)) {
                    console.log(`Decoded Pressure Value: ${decodedValue}`);
                    pressureReadings.push(decodedValue);
                }
            }
        }
    );

    // Stop monitoring after 10 seconds
    setTimeout(() => {
        subscription.remove();
        if (pressureReadings.length > 0) {
            const maxPressure = Math.max(...pressureReadings);
            console.log(`Max Pressure over 10 seconds: ${maxPressure}`);
            setPressure(maxPressure);
            updatePressure(maxPressure);
        } else {
            console.log("No pressure data received in 10 seconds.");
            setPressure(null);
        }
    }, 10000);
};
const decodePressure = (base64Value: string) => {
    try {
        const rawData = Buffer.from(base64Value, "base64"); // Convert Base64 to buffer
        if (rawData.length === 0) {
            console.warn("Received empty pressure data.");
            return NaN;
        }

        console.log("Raw Pressure Data:", rawData); // Debug log

        // Extract pressure value from the first two bytes (little-endian format)
        const pressureValue = rawData.readUInt16LE(0);

        return pressureValue;
      
    } catch (error) {
        console.error("Error decoding pressure:", error);
        return NaN;
    }
};
const updatePressure = async (pressure) => {
    try {
        const email = await AsyncStorage.getItem('user_email'); // Retrieve email from AsyncStorage
        if (!email) {
            alert('User email not found. Please log in again.');
            return;
        }
        console.log('email', email, 'pressure', pressure);
        const response = await fetch(`${backEndUrl}/updatePressure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pressure }), // Send email and pressure to backend
        });

        const data = await response.json();
        if (response.ok) {
            alert(`Pressure updated successfully: ${data.pressure}`);
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error updating pressure:', error);
    }
};


  const handleLogout = async () => {
    try {
      // Fetch connected devices directly from BleManager
       const serviceUUIDs = [
      "0000180d-0000-1000-8000-00805f9b34fb", // Heart Rate Service
      "6E400000-B5A3-F393-E0A9-E50E24DCCA9E", // Custom Pressure Sensor Service
    ];

    // Disconnect all connected BLE devices
    const connectedBleDevices = await manager.connectedDevices(serviceUUIDs);

    // Disconnect all connected BLE devices
    for (const device of connectedBleDevices) {
      try {
        await device.cancelConnection();
        console.log(`Disconnected from ${device.id}`);
      } catch (error) {
        console.error(`Error disconnecting ${device.id}:`, error);
      }
    }

    // Clear state and AsyncStorage
    setConnectedDevices([]);
    await AsyncStorage.removeItem("connectedDevices");
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  console.log("Connected devices:", connectedDevices);
  connectedDevices.forEach(device => {
  console.log("Device ID:", device.id);
  console.log("Device Name:", device.name);
  console.log("Service UUIDs:", device.serviceUUIDs); // Check if this exists
});
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sensor Data</Text>

      {connectedDevices.map((device: Device) => (
        <View key={device.id} style={styles.deviceItem}>
          <Text style={styles.deviceName}>{device.name}</Text>
          {device.serviceUUIDs?.includes(HR_SERVICE_UUID) && (
        <TouchableOpacity onPress={() => monitorHeartRate(device)}>
          <Text style={styles.dataButton}>Measure Heart Rate</Text>
        </TouchableOpacity>
          )}
          {device.serviceUUIDs?.includes(PRESSURE_SERVICE_UUID) && (
        <TouchableOpacity onPress={() => monitorPressure(device)}>
          <Text style={styles.dataButton}>Measure Pressure</Text>
        </TouchableOpacity>
          )}
        </View>
      ))}
     
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  deviceItem: { padding: 15, borderWidth: 1, borderColor: "#ddd", borderRadius: 5, marginBottom: 10 },
  deviceName: { fontSize: 16, fontWeight: "bold" },
  dataTitle: { fontSize: 20, fontWeight: "bold", marginTop: 20, textAlign: "center" },
  dataButton: { fontSize: 16, color: "blue", textAlign: "center", marginTop: 10 },
  logoutButton: { backgroundColor: "#8B5D67", paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, marginTop: 20, alignSelf: "center" },
  logoutButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
