import  { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Accelerometer } from 'expo-sensors';

export default function App() {
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });

  const threshold = 0.1; // Threshold value to ignore small fluctuations

  const filterData = (data: { x: any; y: any; z: any; timestamp?: number; }) => {
    // Apply threshold to filter small noise
    return {
      x: Math.abs(data.x) < threshold ? 0 : data.x,
      y: Math.abs(data.y) < threshold ? 0 : data.y,
      z: Math.abs(data.z) < threshold ? 0 : data.z,
    };
  };

  useEffect(() => {
    // Set the update interval (100ms for smooth updates)
    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener((data) => {
      const filteredData = filterData(data);
      setAccelerometerData(filteredData);
    });

    // Cleanup when the component is unmounted
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Accelerometer Data:</Text>
      <Text style={styles.data}>x: {accelerometerData.x.toFixed(2)}</Text>
      <Text style={styles.data}>y: {accelerometerData.y.toFixed(2)}</Text>
      <Text style={styles.data}>z: {accelerometerData.z.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  data: {
    fontSize: 16,
    marginTop: 10,
  },
});
