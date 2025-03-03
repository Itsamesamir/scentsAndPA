import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Vibration } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Link } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BleContext } from '../../utilities/BleContext';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { useAccelerometerTracker } from '../../sensors/accelerometer';
import { backEndUrl } from '../../config';

const manager = new BleManager();

export default function RecordPage() {
  // Define Exercise interface if using TypeScript; otherwise, this is for clarity.
  // interface Exercise {
  //   _id: string;
  //   name: string;
  // }

  const { connectedDevices, setConnectedDevices } = useContext(BleContext);

  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('Bicep Curl');
  const [isRunning, setIsRunning] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [reps, setReps] = useState(0);
  const [timeUnderTension, setTimeUnderTension] = useState([]);
  const [heartRates, setHeartRates] = useState([]);
  const [countdown, setCountdown] = useState(5);
  const [isCountingDown, setIsCountingDown] = useState(false);

  const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"; // For stat commands
  const CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
  const HR_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb"; // Standard Heart Rate Service

  // Timer refs for our message loop
  const statOnIntervalRef = useRef(null);
  const statOffTimeoutRef = useRef(null);
  // Ref to hold the heart rate subscription so we can cancel it later.
  const heartRateSubscription = useRef(null);

  // Use the custom accelerometer tracker hook.
  // When isRunning is true, tracking is active.
  const repData = useAccelerometerTracker(isRunning);

  useFocusEffect(
    useCallback(() => {
      const fetchExercises = async () => {
        try {
          const response = await fetch(`${backEndUrl}/getExercises`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setExercises(data);
        } catch (error) {
          console.error('Error fetching exercises:', error);
        }
      };
      fetchExercises();
    }, [])
  );

  useEffect(() => {
    const loadConnectedDevices = async () => {
      try {
        console.log("🔄 Checking for already connected BLE devices...");
        const serviceUUIDs = [
          SERVICE_UUID,
          HR_SERVICE_UUID,
          "6E400000-B5A3-F393-E0A9-E50E24DCCA9E", // Custom Pressure Sensor Service
        ];
        const devices = await manager.connectedDevices(serviceUUIDs);
        console.log("✅ Found connected devices:", devices);
        const devicesWithServices = await Promise.all(
          devices.map(async (device) => {
            try {
              await device.discoverAllServicesAndCharacteristics();
              const services = await device.services();
              // Attach serviceUUIDs directly to the device instance (all in lowercase)
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
        if (error instanceof Error && error.message.includes("Operation was cancelled")) {
          console.warn("Ignoring BLE Operation cancelled error.");
          return;
        }
        console.error("❌ Error loading connected devices:", error);
      }
    };
    loadConnectedDevices();
  }, []);

  // Send STAT ON and STAT OFF commands using the target device
  const sendStatOn = async () => {
    const targetDevice = connectedDevices.find((device) =>
      device.serviceUUIDs.includes(SERVICE_UUID.toLowerCase())
    );
    if (!targetDevice) {
      console.error("No device found with the required service UUID.");
      return;
    }
    const message = `CHAN1:STAT ON\n`;
    const encodedMessage = Buffer.from(message, "utf-8").toString("base64");
    try {
      await targetDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        encodedMessage
      );
      console.log("STAT ON sent");
    } catch (error) {
      console.error("Error sending STAT ON:", error);
    }
  };

  const sendStatOff = async () => {
    const targetDevice = connectedDevices.find((device) =>
      device.serviceUUIDs.includes(SERVICE_UUID.toLowerCase())
    );
    if (!targetDevice) {
      console.error("No device found with the required service UUID.");
      return;
    }
    const message = `CHAN1:STAT OFF\n`;
    const encodedMessage = Buffer.from(message, "utf-8").toString("base64");
    try {
      await targetDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        encodedMessage
      );
      console.log("STAT OFF sent");
    } catch (error) {
      console.error("Error sending STAT OFF:", error);
    }
  };

  // Start the loop: send STAT ON immediately, schedule STAT OFF after 5 sec,
  // then every 10 sec clear any pending STAT OFF, send STAT OFF, then STAT ON, etc.
  const startMessageLoop = async () => {
    await sendStatOn();
    statOffTimeoutRef.current = setTimeout(async () => {
      await sendStatOff();
    }, 5000);

    statOnIntervalRef.current = setInterval(async () => {
      if (statOffTimeoutRef.current !== null) {
        clearTimeout(statOffTimeoutRef.current);
        statOffTimeoutRef.current = null;
        await sendStatOff();
      }
      await sendStatOn();
      statOffTimeoutRef.current = setTimeout(async () => {
        await sendStatOff();
      }, 5000);
    }, 10000);
  };

  // Stop the loop: cancel timers and send STAT OFF if needed.
  const stopMessageLoop = async () => {
    if (statOnIntervalRef.current !== null) {
      clearInterval(statOnIntervalRef.current);
      statOnIntervalRef.current = null;
    }
    if (statOffTimeoutRef.current !== null) {
      clearTimeout(statOffTimeoutRef.current);
      statOffTimeoutRef.current = null;
      await sendStatOff();
    }
  };

  // Start heart rate monitoring: subscribe to HR notifications and update the state array.
  const startHeartRateMonitoring = () => {
    // Clear previous heart rate data.
    setHeartRates([]);
    const targetDevice = connectedDevices.find((device) =>
      device.serviceUUIDs.includes(HR_SERVICE_UUID.toLowerCase())
    );
    if (!targetDevice) {
      console.warn("No device found with the required Heart Rate Service UUID.");
      return;
    }
    heartRateSubscription.current = manager.monitorCharacteristicForDevice(
      targetDevice.id,
      HR_SERVICE_UUID,
      "00002a37-0000-1000-8000-00805f9b34fb",
      (error, characteristic) => {
        if (error) {
          if (error.message.includes("Operation was cancelled")) {
            console.warn("Ignoring BLE Operation cancelled error.");
            return;
          }
          console.error("Heart rate monitor error:", error);
          return;
        }
        if (characteristic?.value) {
          const decodedValue = decodeHeartRate(characteristic.value);
          if (!isNaN(decodedValue)) {
            console.log(`Decoded Heart Rate: ${decodedValue} BPM`);
            setHeartRates(prev => [...prev, decodedValue]);
          }
        }
      }
    );
  };

  // Stop heart rate monitoring by removing the subscription.
  const stopHeartRateMonitoring = () => {
    if (heartRateSubscription.current) {
      heartRateSubscription.current.remove();
      heartRateSubscription.current = null;
    }
  };

  // Decode heart rate value from Base64-encoded data.
  const decodeHeartRate = (base64Value) => {
    try {
      const rawData = Buffer.from(base64Value, "base64");
      if (rawData.length === 0) {
        console.warn("Received empty heart rate data.");
        return NaN;
      }
      console.log("Raw Heart Rate Data:", rawData);
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

  // Toggle recording: when starting, begin countdown, then start the message loop and heart rate monitoring;
  // when stopping, end the message loop and heart rate monitoring and show results.
  const handleToggle = async () => {
    if (isRunning) {
      // Stop tracking by setting isRunning to false. The custom hook will clean up.
      setIsRunning(false);
      console.log("Final rep data:", repData);
      setReps(repData.length);
      setTimeUnderTension(repData.map(rep => rep.tut));
      //await stopMessageLoop();
      //stopHeartRateMonitoring();
      //setModalVisible(true);
      //setIsRunning(false);
    } else {
      setIsCountingDown(true);
      setCountdown(5);
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setIsCountingDown(false);
            Vibration.vibrate();
            setIsRunning(true);
            //startMessageLoop();
            //startHeartRateMonitoring();
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  return (
    <View style={styles.container}>
      <Link href="/settings" asChild>
        <TouchableOpacity style={styles.settingsButton}>
          <MaterialIcons name="settings" size={20} color="white" />
        </TouchableOpacity>
      </Link>
      <Text style={styles.title}>Record</Text>
      {isCountingDown ? (
        <Text style={styles.countdownText}>{countdown}</Text>
      ) : (
        <TouchableOpacity style={styles.startButton} onPress={handleToggle}>
          <Text style={styles.startButtonText}>{isRunning ? 'Stop' : 'Start'}</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.label}>Exercise</Text>
      <View style={styles.dropdownContainer}>
        <Picker
          selectedValue={selectedExercise}
          onValueChange={(itemValue) => setSelectedExercise(itemValue)}
          style={styles.picker}
        >
          {exercises.map((exercise) => (
            <Picker.Item key={exercise._id} label={exercise.name} value={exercise.name} />
          ))}
        </Picker>
      </View>
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reps: {reps}</Text>
            {timeUnderTension.map((tut, index) => (
              <Text key={index} style={styles.modalTitle}>
                Rep {index + 1}: {tut} sec
              </Text>
            ))}
            <Text style={styles.modalTitle}>
              Heart Rate Readings: {heartRates.join(', ')}
            </Text>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.submitButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5e4a8e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5e4a8e',
    marginBottom: 40,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#5e4a8e',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#5e4a8e',
    width: 200,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 18,
    color: '#5e4a8e',
    marginBottom: 10,
  },
  dropdownContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#5e4a8e',
    borderRadius: 5,
    marginBottom: 20,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#5e4a8e',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
