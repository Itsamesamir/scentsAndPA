import { useContext, useEffect, useState, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { Vibration } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { BleContext } from '../utilities/BleContext';
import { Buffer } from 'buffer';

const PRESSURE_SERVICE_UUID = "6e400000-b5a3-f393-e0a9-e50e24dcca9e";
const THRESHOLD = 0.1;           // Ignore small fluctuations
const REP_PEAK = 0.7;            // Cue level for rep initiation
const REP_END = -0.8;            // Rep ends when value returns to -0.8
const MIN_REP_TIME = 200;        // Minimum valid rep time in ms
const VIBRATION_DURATION = 200;  // Vibration duration in ms
const WAIT_TIME = 1000;          // 1-second wait after first vibration

const manager = new BleManager();

export const useAccelerometerTracker = (start) => {
    const { connectedDevices = [], setConnectedDevices } = useContext(BleContext);
    const [repData, setRepData] = useState([]);

    // Refs for mutable values without triggering re-renders.
    const repReadyRef = useRef(false);
    const repStartTimeRef = useRef(0);
    const currentRepPressureValuesRef = useRef([]);
    const vibrationTriggeredRef = useRef(false);
    const accelerometerSubscriptionRef = useRef(null);
    const pressureSubscriptionRef = useRef(null);

    // Load connected devices once.
    useEffect(() => {
        const loadConnectedDevices = async () => {
            try {
                console.log("🔄 Checking for already connected BLE devices...");
                const serviceUUIDs = [PRESSURE_SERVICE_UUID];
                const devices = (await manager.connectedDevices(serviceUUIDs)) || [];
                console.log("✅ Found connected devices:", devices);

                const devicesWithServices = await Promise.all(
                    devices.map(async (device) => {
                        try {
                            await device.discoverAllServicesAndCharacteristics();
                            const services = await device.services();
                            // Save service UUIDs in lowercase.
                            device.serviceUUIDs = services.map((service) => service.uuid.toLowerCase());
                            console.log(`✅ Services for ${device.id}:`, device.serviceUUIDs);
                            return device;
                        } catch (error) {
                            console.error(`❌ Error fetching services for ${device.id}:`, error);
                            return null;
                        }
                    })
                );
                setConnectedDevices(devicesWithServices.filter(Boolean));
            } catch (error) {
                console.error("❌ Error loading connected devices:", error);
            }
        };

        loadConnectedDevices();
    }, [setConnectedDevices]);

    // Set up sensor subscriptions when "start" is true.
    useEffect(() => {
        if (!start) {
            return;
        }
        if (!connectedDevices || connectedDevices.length === 0) {
            console.warn("No connected BLE devices available for pressure tracking.");
            return;
        }

        // Use the first connected device.
        const device = connectedDevices[0];

        // Set up pressure sensor monitoring.
        pressureSubscriptionRef.current = manager.monitorCharacteristicForDevice(
            device.id,
            PRESSURE_SERVICE_UUID,
            "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
            (error, characteristic) => {
                if (error) {
                    if (error.message && error.message.includes("Operation was cancelled")) {
                        console.warn("Ignoring BLE Operation cancelled error.");
                        return;
                    }
                    console.error("Pressure monitor error:", error);
                    return;
                }
                if (characteristic?.value) {
                    const decodedPressure = decodePressure(characteristic.value);
                    if (!isNaN(decodedPressure) && repReadyRef.current) {
                        currentRepPressureValuesRef.current.push(decodedPressure);
                    }
                }
            }
        );

        // Set a fast update interval.
        Accelerometer.setUpdateInterval(50);

        // Listen to accelerometer changes.
        accelerometerSubscriptionRef.current = Accelerometer.addListener(({ y }) => {
            const filteredY = Math.abs(y) < THRESHOLD ? 0 : y;

            // --- Rep initiation ---
            // Only trigger if not already in a rep and no vibration has been triggered.
            if (!repReadyRef.current && !vibrationTriggeredRef.current && filteredY >= REP_PEAK) {
                vibrationTriggeredRef.current = true;
                Vibration.vibrate(VIBRATION_DURATION);
                console.log("First vibration: Peak detected at", filteredY);
                setTimeout(() => {
                    Vibration.vibrate(VIBRATION_DURATION);
                    console.log("Second vibration: Rep start confirmed");
                    repReadyRef.current = true;
                    repStartTimeRef.current = Date.now();
                    // Clear pressure values for the new rep.
                    currentRepPressureValuesRef.current = [];
                }, WAIT_TIME);
            }

            // --- Rep end ---
            if (repReadyRef.current && filteredY <= REP_END) {
                const repDuration = Date.now() - repStartTimeRef.current;
                if (repDuration >= MIN_REP_TIME) {
                    const maxPressure =
                        currentRepPressureValuesRef.current.length > 0
                            ? Math.max(...currentRepPressureValuesRef.current)
                            : 0;
                    setRepData((prev) => [
                        ...prev,
                        { tut: (repDuration / 1000).toFixed(2), maxPressure },
                    ]);
                    console.log(
                        `Rep completed. TUT: ${(repDuration / 1000).toFixed(2)} sec, Max Pressure: ${maxPressure}`
                    );
                } else {
                    console.log("Ignored short rep (movement too brief)");
                }
                // Reset for the next rep.
                repReadyRef.current = false;
                vibrationTriggeredRef.current = false;
            }
        });

        // Cleanup subscriptions when the hook stops or dependencies change.
        return () => {
            if (accelerometerSubscriptionRef.current) {
                accelerometerSubscriptionRef.current.remove();
                accelerometerSubscriptionRef.current = null;
            }
            if (pressureSubscriptionRef.current) {
                pressureSubscriptionRef.current.remove();
                pressureSubscriptionRef.current = null;
            }
        };
    }, [start, connectedDevices]);

    return repData;
};

const decodePressure = (base64Value) => {
    try {
        const rawData = Buffer.from(base64Value, "base64");
        if (!rawData || rawData.length === 0) {
            console.warn("Received empty pressure data.");
            return NaN;
        }
        // Extract pressure value from the first 2 bytes (little-endian).
        return rawData.readUInt16LE(0);
    } catch (error) {
        console.error("Error decoding pressure:", error);
        return NaN;
    }
};
