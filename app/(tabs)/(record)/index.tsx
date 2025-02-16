import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Vibration } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Link } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { trackAccelerometer } from '../../sensors/accelerometer';
import { backEndUrl } from '../../config';

export default function RecordPage() {
  interface Exercise {
    _id: string;
    name: string;
  }

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('Bicep Curl');
  const [isRunning, setIsRunning] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [reps, setReps] = useState(0);
  const [timeUnderTension, setTimeUnderTension] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(5);
  const [isCountingDown, setIsCountingDown] = useState(false);

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

  const handleToggle = async () => {
    if (isRunning) {
      const result = await trackAccelerometer(false);
      if (result) {
        const { reps: calculatedReps, timeUnderTension: calculatedTUT } = result;
        setReps(calculatedReps);
        setTimeUnderTension(calculatedTUT);
      }
      setModalVisible(true);
      setIsRunning(false);
    } else {
      setIsCountingDown(true);
      setCountdown(5);
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setIsCountingDown(false);
            Vibration.vibrate(); // Vibrate when countdown ends
            trackAccelerometer(true);
            setIsRunning(true);
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
              <Text key={index} style={styles.modalTitle}>Rep {index + 1}: {tut} sec</Text>
            ))}
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
