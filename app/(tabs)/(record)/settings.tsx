import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backEndUrl } from '../../config';

const ExerciseSettings = () => {
  const [initialDelay, setInitialDelay] = useState('5 Seconds');
  const [frequency, setFrequency] = useState('10 Seconds');
  const [pressure, setPressure] = useState('5 psi');
  const [exercise, setExercise] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Load saved settings on mount
    const loadSettings = async () => {
      try {
        const savedInitialDelay = await AsyncStorage.getItem('initialDelay');
        const savedFrequency = await AsyncStorage.getItem('frequency');
        const savedPressure = await AsyncStorage.getItem('pressure');
        if (savedInitialDelay) setInitialDelay(savedInitialDelay);
        if (savedFrequency) setFrequency(savedFrequency);
        if (savedPressure) setPressure(savedPressure);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem('initialDelay', initialDelay);
      await AsyncStorage.setItem('frequency', frequency);
      await AsyncStorage.setItem('pressure', pressure);
      Alert.alert('Settings Saved', `Initial Delay: ${initialDelay}\nFrequency: ${frequency}\nPressure: ${pressure}`);
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings.');
    }
  };

  const handleNewExercise = async () => {
    try {
      const response = await fetch(`${backEndUrl}/newExercise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({name: exercise }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'New exercise added successfully');
        setExercise(''); // Clear the input field
      } else {
        setError(data.message || 'Error adding exercise');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Exercise Settings</Text>

      <View style={styles.settingContainer}>
        <Text style={styles.label}>Initial Delay</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={initialDelay} onValueChange={(itemValue) => setInitialDelay(itemValue)}>
            <Picker.Item label="5 Seconds" value="5 Seconds" />
            <Picker.Item label="10 Seconds" value="10 Seconds" />
            <Picker.Item label="15 Seconds" value="15 Seconds" />
          </Picker>
        </View>
      </View>

      <View style={styles.settingContainer}>
        <Text style={styles.label}>Frequency</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={frequency} onValueChange={(itemValue) => setFrequency(itemValue)}>
            <Picker.Item label="10 Seconds" value="10 Seconds" />
            <Picker.Item label="20 Seconds" value="20 Seconds" />
            <Picker.Item label="30 Seconds" value="30 Seconds" />
          </Picker>
        </View>
      </View>

      <View style={styles.settingContainer}>
        <Text style={styles.label}>Pressure</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={pressure} onValueChange={(itemValue) => setPressure(itemValue)}>
            <Picker.Item label="5 psi" value="5 psi" />
            <Picker.Item label="10 psi" value="10 psi" />
            <Picker.Item label="15 psi" value="15 psi" />
          </Picker>
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Enter new exercise"
        value={exercise}
        onChangeText={setExercise}
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.addExerciseButton} onPress={handleNewExercise}>
        <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#6F4ACF',
  },
  settingContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    overflow: 'hidden',
  },
  saveButton: {
    backgroundColor: '#6F4ACF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  addExerciseButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  addExerciseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default ExerciseSettings;
