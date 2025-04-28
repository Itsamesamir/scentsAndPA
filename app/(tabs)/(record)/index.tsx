import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Vibration, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Link } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BleContext } from '../../utilities/BleContext';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { useAccelerometerTracker } from '../../sensors/accelerometer';
import { backEndUrl } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const manager = new BleManager();

export default function RecordPage() {
  const { connectedDevices, setConnectedDevices } = useContext(BleContext);

  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('Bicep Curl');
  const [selectedChannel, setSelectedChannel] = useState("1");
  const [isRunning, setIsRunning] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [reps, setReps] = useState(0);
  const [timeUnderTension, setTimeUnderTension] = useState([]);
  // heartRates will store HR values received while accelerometer is running
  // Each entry is an object: { time: <timestamp>, hr: <value> }
  const [heartRates, setHeartRates] = useState<{ time: number; hr: number }[]>([]);
  // postRecordingHR will store HR values received after the user stops (but before 4 minutes are up)
  const [postRecordingHR, setPostRecordingHR] = useState<{ time: number; hr: number }[]>([]);
  const [countdown, setCountdown] = useState(5);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [hrRecording, setHrRecording] = useState(false);

  // Timer refs for our message loop and HR recording
  const statOnIntervalRef = useRef(null);
  const statOffTimeoutRef = useRef(null);
  const hrTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartRateSubscription = useRef(null);
  
  // Ref to always have the latest value of isRunning inside the HR callback.
  const isRunningRef = useRef(isRunning);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // Use the custom accelerometer tracker hook. It tracks data while isRunning is true.
  const repData = useAccelerometerTracker(isRunning);
  const repDataRef = useRef(repData);
  useEffect(() => {
    repDataRef.current = repData;
  }, [repData]);
  const heartRatesRef = useRef([]);
  const postRecordingHRRef = useRef([]);

  useEffect(() => {
    heartRatesRef.current = heartRates;
  }, [heartRates]);

  useEffect(() => {
    postRecordingHRRef.current = postRecordingHR;
  }, [postRecordingHR]);
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

  const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"; // For stat commands
  const CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
  const HR_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb"; // Standard Heart Rate Service

  // Send STAT ON using the selected channel.
  const sendStatOn = async () => {
    const targetDevice = connectedDevices.find((device) =>
      device.serviceUUIDs.includes(SERVICE_UUID.toLowerCase())
    );
    if (!targetDevice) {
      console.error("No device found with the required service UUID.");
      return;
    }
    const message = `CHAN${selectedChannel}:STAT ON\n`;
    const encodedMessage = Buffer.from(message, "utf-8").toString("base64");
    try {
      await targetDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        encodedMessage
      );
      console.log("STAT ON sent:", message);
    } catch (error) {
      console.error("Error sending STAT ON:", error);
    }
  };

  // Send STAT OFF using the selected channel.
  const sendStatOff = async () => {
    const targetDevice = connectedDevices.find((device) =>
      device.serviceUUIDs.includes(SERVICE_UUID.toLowerCase())
    );
    if (!targetDevice) {
      console.error("No device found with the required service UUID.");
      return;
    }
    const message = `CHAN${selectedChannel}:STAT OFF\n`;
    const encodedMessage = Buffer.from(message, "utf-8").toString("base64");
    try {
      await targetDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        encodedMessage
      );
      console.log("STAT OFF sent:", message);
    } catch (error) {
      console.error("Error sending STAT OFF:", error);
    }
  };

  // Message loop functions (unchanged)
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

  // Start heart rate monitoring: subscribe to HR notifications and update the state arrays.
  const startHeartRateMonitoring = () => {
    // Clear previous data for both recording phases.
    setHeartRates([]);
    setPostRecordingHR([]);
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
            const timeStamp = Date.now();
            const hrData = { time: timeStamp, hr: decodedValue };
            // Use the ref to determine if we are still in the "recording" phase.
            if (isRunningRef.current) {
              console.log(`Recording HR: ${decodedValue} BPM at ${timeStamp}`);
              setHeartRates(prev => [...prev, hrData]);
            } else {
              console.log(`Post-recording HR: ${decodedValue} BPM at ${timeStamp}`);
              setPostRecordingHR(prev => [...prev, hrData]);
            }
          }
          //console.log(heartRates,postRecordingHR)
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

  // Function called when 4 minutes of HR recording have elapsed.
  // Now accepts both HR arrays and the accelerometer data.
  const sendDataToDatabase = async (recordingHR, postRecordingHR, accelerometerData) => {
    try {
      const email = await AsyncStorage.getItem('user_email'); // Retrieve email from AsyncStorage
      if (!email) {
        alert('User email not found. Please log in again.');
        return;
      }

      const payload = {
        userEmail: email,
        exerciseName: selectedExercise, // from component state
        channel: selectedChannel,       // from component state
        hrDuringRecording: recordingHR,
        hrPostRecording: postRecordingHR,
        accelerometerData: accelerometerData,
      };
      console.log(recordingHR, postRecordingHR, accelerometerData);
      const response = await fetch(`${backEndUrl}/saveRecording`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        setHeartRates([]);
        setPostRecordingHR([]);
        alert(`Recording saved successfully.`);
      } else {
        alert(`Error saving recording: ${data.message}`);
      }
    } catch (error) {
      console.error('Error saving recording:', error);
      alert(`Error saving recording: ${error.message}`);
    }
  };


  // Toggle recording:
  // - If accelerometer is running, clicking stops it.
  // - If not running and HR monitoring is not active, start countdown then start both sensors.
  // - If HR monitoring is active (within 4 minutes), alert that HR is still recording.
  const handleToggle = async () => {
    if (isRunning) {
      // Stop accelerometer tracking.
      setIsRunning(false);
      // console.log("Final rep data:", repData);
      // setReps(repData.length);
      // setTimeUnderTension(repData.map(rep => rep.tut));
      // Note: HR monitoring continues until the 4-minute timer ends.
      //stopMessageLoop();
    } else {
      // If HR is still recording, prevent restarting.
      if (hrRecording) {
        Alert.alert("HR still recording");
        return;
      }
      // Start countdown and then both sensors.
      setIsCountingDown(true);
      setCountdown(5);
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setIsCountingDown(false);
            Vibration.vibrate();
            // Start accelerometer tracking.
            
            setIsRunning(true);
            // Start heart rate monitoring.
            setHeartRates([]);
            setPostRecordingHR([]);
            startHeartRateMonitoring();
            setHrRecording(true);
            // Optionally, start the STAT message loop if needed:
             //startMessageLoop();
           // Set a 4-minute timer for HR data recording.
            hrTimerRef.current = setTimeout(() => {
              stopHeartRateMonitoring();
              setHrRecording(false);
              // After 4 minutes, send HR data (both arrays) and accelerometer rep data to your database.
             sendDataToDatabase(heartRatesRef.current,postRecordingHRRef.current, repDataRef.current);
            }, 240000);
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
      <Text style={styles.label}>Channel</Text>
      <View style={styles.dropdownContainer}>
        <Picker
          selectedValue={selectedChannel}
          onValueChange={(itemValue) => setSelectedChannel(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="1" value="1" />
          <Picker.Item label="2" value="2" />
          <Picker.Item label="3" value="3" />
          <Picker.Item label="4" value="4" />
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
              HR during recording:{" "}
              {heartRates
                .map(item => `${item.hr} (@${new Date(item.time).toLocaleTimeString()})`)
                .join(', ')}
            </Text>
            <Text style={styles.modalTitle}>
              HR post-recording:{" "}
              {postRecordingHR
                .map(item => `${item.hr} (@${new Date(item.time).toLocaleTimeString()})`)
                .join(', ')}
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
