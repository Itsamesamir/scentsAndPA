import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import AsyncStorage from "@react-native-async-storage/async-storage";

const manager = new BleManager();

export default function ConnectDevicesScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<Device[]>([]);

  useEffect(() => {
    return () => {
      manager.stopDeviceScan();
      manager.destroy();
    };
  }, []);

  useEffect(() => {
    const loadConnectedDevices = async () => {
      try {
        const storedDevices = await AsyncStorage.getItem("connectedDevices");
        if (storedDevices) {
          setConnectedDevices(JSON.parse(storedDevices));
        }
      } catch (error) {
        console.error("Error loading stored devices:", error);
      }
    };
    loadConnectedDevices();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);

        return (
          granted["android.permission.ACCESS_FINE_LOCATION"] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted["android.permission.BLUETOOTH_SCAN"] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted["android.permission.BLUETOOTH_CONNECT"] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
        Alert.alert("Permissions required", "Please grant permissions to use Bluetooth.");
        return false;
      }
    }
    return true;
  };

 const startScan = async () => {
    const foundDevices = new Map();

    try {
        const hasPermissions = await requestPermissions();
        if (!hasPermissions) {
            setIsScanning(false);
            return;
        }

        setIsScanning(true);
        setAvailableDevices([]);

        // Ensure Bluetooth is powered on
        if (Platform.OS === "android" && (await manager.state()) !== "PoweredOn") {
            Alert.alert("Bluetooth is not enabled");
            setIsScanning(false);
            return;
        }

        // Stop any existing scans before restarting
        manager.stopDeviceScan();

        // Reset Bluetooth cache to find previously connected devices again
        await manager.cancelTransaction("scanTransaction");
        
        manager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.error(error);
                setIsScanning(false);
                return;
            }

            if (device?.name && !foundDevices.has(device.id)) {
                foundDevices.set(device.id, device);
                setAvailableDevices(Array.from(foundDevices.values()));
            }
        });

          setTimeout(() => {
              manager.stopDeviceScan();
              setIsScanning(false);
          }, 10000);
      } catch (error) {
          console.error("Error scanning for devices:", error);
          setIsScanning(false);
      }
  };


  const connectToDevice = async (device: Device) => {
    try {
      console.log("Connecting to device:", device.id);
      const connectedDevice = await manager.connectToDevice(device.id);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      const services = await connectedDevice.services();
      
      console.log("Discovered services:", services);

      for (const service of services) {
        const characteristics = await connectedDevice.characteristicsForService(service.uuid);
        console.log(`Characteristics for ${service.uuid}:`, characteristics);
      }


      setConnectedDevices((prev) => {
        const updatedDevices = [...prev, connectedDevice];
        AsyncStorage.setItem("connectedDevices", JSON.stringify(updatedDevices));
        return updatedDevices;
      });

      setAvailableDevices((prev) => prev.filter((d) => d.id !== connectedDevice.id));
      Alert.alert(`Connected to ${connectedDevice.name}`);
    } catch (error) {
      console.error("Error connecting to device:", error);
      Alert.alert("Connection failed", "Ensure the device is in range and try again.");
    }
  };

  const disconnectDevice = async (device: Device) => {
    try {
      

      // Get currently connected devices by their IDs
      const connected = await manager.devices(connectedDevices.map(d => d.id));
      

      // Find the device in the connected list
      const targetDevice = connected.find((d) => d.id === device.id);
      if (!targetDevice) {
        Alert.alert("Disconnection Error", "Device not found or already disconnected.");
        return;
      }

      await targetDevice.cancelConnection();
      console.log("Disconnected from:", targetDevice.id);

      // Remove from connected devices list
      setConnectedDevices((prevDevices) =>
        prevDevices.filter((d) => d.id !== targetDevice.id)
      );

      // Update AsyncStorage
      const storedDevices = await AsyncStorage.getItem("connectedDevices");
      if (storedDevices) {
        const parsedDevices = JSON.parse(storedDevices);
        const updatedDevices = parsedDevices.filter((d) => d.id !== targetDevice.id);
        await AsyncStorage.setItem("connectedDevices", JSON.stringify(updatedDevices));
      }

      Alert.alert(`Disconnected from ${device.name}`);
    } catch (error) {
      console.error("Error disconnecting from device:", error);
      Alert.alert("Disconnection Error", "Could not disconnect. Try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect to Devices</Text>

      {/* Scan Button */}
      <TouchableOpacity style={styles.scanButton} onPress={startScan} disabled={isScanning}>
        <Text style={styles.buttonText}>{isScanning ? "Scanning..." : "Scan for Devices"}</Text>
      </TouchableOpacity>

      {/* Connected Devices */}
      <Text style={styles.listTitle}>Connected Devices:</Text>
      <FlatList
        data={connectedDevices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.deviceItem} onPress={() => disconnectDevice(item)}>
            <Text style={styles.deviceName}>{item.name}</Text>
            <Text style={styles.deviceId}>{item.id}</Text>
            <Text style={styles.disconnectText}>Tap to Disconnect</Text>
          </TouchableOpacity>
        )}
      />

      {/* Available Devices */}
      <Text style={styles.listTitle}>Available Devices:</Text>
      <FlatList
        data={availableDevices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.deviceItem} onPress={() => connectToDevice(item)}>
            <Text style={styles.deviceName}>{item.name}</Text>
            <Text style={styles.deviceId}>{item.id}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  scanButton: { backgroundColor: "#5e4a8e", paddingVertical: 15, borderRadius: 5, alignItems: "center", marginBottom: 20 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  listTitle: { fontSize: 20, fontWeight: "bold", marginTop: 20, marginBottom: 10 },
  deviceItem: { padding: 15, borderWidth: 1, borderColor: "#ddd", borderRadius: 5, marginBottom: 10 },
  deviceName: { fontSize: 16, fontWeight: "bold" },
  deviceId: { fontSize: 12, color: "#666" },
  disconnectText: { color: "red", fontSize: 14, textAlign: "right", fontWeight: "bold" },
});
