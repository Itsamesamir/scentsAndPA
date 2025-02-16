import { BleManager, Device } from "react-native-ble-plx";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";

const manager = new BleManager();
let isTracking = false;
let heartRateData = [];

const serviceUUID = "0000180d-0000-1000-8000-00805f9b34fb";
const characteristicUUID = "00002a37-0000-1000-8000-00805f9b34fb";

export const trackHeartRate = async (start) => {
    if (start) {
        isTracking = true;
        heartRateData = [];
        const deviceInfo = await getStoredDevice();
        if (deviceInfo) {
            await connectAndSubscribe(deviceInfo);
        }
    } else {
        isTracking = false;
        manager.stopDeviceScan();
        return { heartRateData };
    }
};

const getStoredDevice = async () => {
    try {
        const storedDevices = await AsyncStorage.getItem("connectedDevices");
        if (storedDevices) {
            const parsedDevices = JSON.parse(storedDevices);
            if (Array.isArray(parsedDevices) && parsedDevices.length > 0) {
                return parsedDevices[0];
            }
        }
    } catch (error) {
        console.error("Error loading device from storage:", error);
    }
    return null;
};

const connectAndSubscribe = async (deviceInfo) => {
    try {
        console.log("Connecting to:", deviceInfo.name);
        const connectedDevice = await manager.connectToDevice(deviceInfo.id);
        await connectedDevice.discoverAllServicesAndCharacteristics();
        subscribeToHeartRate(connectedDevice);
    } catch (error) {
        console.error("Connection failed:", error);
    }
};

const subscribeToHeartRate = (device) => {
    device.monitorCharacteristicForService(
        serviceUUID,
        characteristicUUID,
        (error, characteristic) => {
            if (error) {
                console.error("Heart Rate Error:", error);
                return;
            }

            if (characteristic?.value) {
                const heartRate = decodeHeartRate(characteristic.value);
                if (!isNaN(heartRate)) {
                    const timestamp = (Date.now() / 1000).toFixed(2); // Time in seconds
                    heartRateData.push({ time: timestamp, heartRate });
                    console.log("Heart Rate Recorded:", heartRate, "at", timestamp);
                }
            }
        }
    );
};

const decodeHeartRate = (base64Value) => {
    try {
        const rawData = Buffer.from(base64Value, "base64");
        return rawData[0] > 0 && rawData[0] < 250 ? rawData[0] : NaN;
    } catch (error) {
        console.error("Decoding Error:", error);
        return NaN;
    }
};
