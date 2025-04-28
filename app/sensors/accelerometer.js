import { useContext, useEffect, useState, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { Vibration } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { BleContext } from '../utilities/BleContext';
import { Buffer } from 'buffer';

const PRESSURE_SERVICE_UUID = "6e400000-b5a3-f393-e0a9-e50e24dcca9e";
const THRESHOLD = 0.05;           // Ignore small fluctuations
const REP_PEAK = 0.7;            // Cue level for rep initiation
const REP_END = -0.6;            // Rep ends when value returns below this threshold
const MIN_REP_TIME = 200;        // Minimum valid rep time in ms
const VIBRATION_DURATION = 200;  // Vibration duration in ms
const WAIT_TIME = 1200;          // 1-second wait after first vibration

const manager = new BleManager();

export const useAccelerometerTracker = (start) => {
    const { connectedDevices = [], setConnectedDevices } = useContext(BleContext);
    const [repData, setRepData] = useState([]);

    // Refs to hold mutable values.
    const repReadyRef = useRef(false);
    const repStartTimeRef = useRef(0);
    const currentRepPressureValuesRef = useRef([]);
    const vibrationTriggeredRef = useRef(false);
    const accelerometerSubscriptionRef = useRef(null);
    const pressureSubscriptionRef = useRef(null);

    // When starting a new recording session, clear any previous rep data.
    useEffect(() => {
        if (start) {
            setRepData([]);
            currentRepPressureValuesRef.current = [];
        }
    }, [start]);

    // If recording stops and a rep is still "open", finalize it.
    useEffect(() => {
        if (!start && repReadyRef.current) {
            const repDuration = Date.now() - repStartTimeRef.current;
            if (repDuration >= MIN_REP_TIME) {
                const maxPressure = currentRepPressureValuesRef.current.length > 0
                    ? Math.max(...currentRepPressureValuesRef.current)
                    : 0;
                setRepData(prev => [...prev, { tut: (repDuration / 1000).toFixed(2), maxPressure }]);
                console.log(`Final rep completed. TUT: ${(repDuration / 1000).toFixed(2)} sec, Max Pressure: ${maxPressure}`);
            }
            repReadyRef.current = false;
            vibrationTriggeredRef.current = false;
        }
    }, [start]);

    // Set up sensor subscriptions when "start" is true.
    useEffect(() => {
        console.log("Setting up accelerometer and pressure subscriptions...");
        if (!start) return;
        console.log("Recording started.");
        if (!connectedDevices || connectedDevices.length === 0) {
            console.warn("No connected BLE devices available for pressure tracking.");
            return;
        }
        // Select the first device that provides the pressure service.
        const deviceWithPressure = connectedDevices.find(device =>
            device.serviceUUIDs?.includes(PRESSURE_SERVICE_UUID)
        );
        if (!deviceWithPressure) {
            console.warn("No device with pressure service found.");
            return;
        }
        // Subscribe to pressure notifications.
        pressureSubscriptionRef.current = manager.monitorCharacteristicForDevice(
            deviceWithPressure.id,
            PRESSURE_SERVICE_UUID,
            "6E400002-B5A3-F393-E0A9-E50E24DCCA9E",
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

        // Set a fast update interval for the accelerometer.
        Accelerometer.setUpdateInterval(50);

        // Listen to accelerometer changes.
        accelerometerSubscriptionRef.current = Accelerometer.addListener(({ y }) => {
            const filteredY = Math.abs(y) < THRESHOLD ? 0 : y;
            // --- Rep initiation ---
            if (!repReadyRef.current && !vibrationTriggeredRef.current && filteredY >= REP_PEAK) {
                vibrationTriggeredRef.current = true;
                // Clear pressure values for this new rep.
                currentRepPressureValuesRef.current = [];
                Vibration.vibrate(VIBRATION_DURATION);
                console.log("First vibration: Peak detected at", filteredY);
                setTimeout(() => {
                    Vibration.vibrate(VIBRATION_DURATION);
                    console.log("Second vibration: Rep start confirmed");
                    repReadyRef.current = true;
                    repStartTimeRef.current = Date.now();
                }, WAIT_TIME);
            }
            // --- Rep end ---
            if (repReadyRef.current && filteredY <= REP_END) {
                const repDuration = Date.now() - repStartTimeRef.current;
                if (repDuration >= MIN_REP_TIME) {
                    const maxPressure = currentRepPressureValuesRef.current.length > 0
                        ? Math.max(...currentRepPressureValuesRef.current)
                        : 0;
                    setRepData(prev => [
                        ...prev,
                        { tut: (repDuration / 1000).toFixed(2), maxPressure },
                    ]);
                    console.log(`Rep completed. TUT: ${(repDuration / 1000).toFixed(2)} sec, Max Pressure: ${maxPressure}`);
                } else {
                    console.log("Ignored short rep (movement too brief)");
                }
                // Reset for next rep.
                repReadyRef.current = false;
                vibrationTriggeredRef.current = false;
            }
        });

        // Cleanup on unmount or dependency change.
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
