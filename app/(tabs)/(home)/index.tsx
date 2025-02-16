import React from 'react';
import { View, Text, Button, ScrollView, StyleSheet, SafeAreaView, StatusBar,Dimensions, TouchableOpacity, Pressable } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';



export default function HomeScreen() {
  const screenWidth = Dimensions.get('window').width;
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user_token'); // Clear the token
      console.log('User logged out.');
      router.replace('/(auth)/login'); // Redirect to the login screen
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  const chartConfig = {
    backgroundColor: '#ffffff', // White background
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2, // Decimal places for data points
    color: (opacity = 1) => `rgba(94, 74, 142, ${opacity})`, // Purple axes and lines
    labelColor: (opacity = 1) => `rgba(94, 74, 142, ${opacity})`, // Purple labels
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#5e4a8e', // Purple stroke around dots
    },
    propsForBackgroundLines: {
      stroke: '#e3d6f5', // Light purple gridlines
    },
  };

  const data = {
    labels: ['0s', '10s', '20s', '30s', '40s', '50s'],
    datasets: [
      {
        data: [60, 70, 80, 90, 95, 100],
      },
    ],
  };

 return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.header}>
        <Link href="/connect" asChild>
          <Pressable style={styles.settingsButton}>
            <MaterialIcons name="settings" size={20} color="white"  />
          </Pressable>
        </Link>
        <Link href="/profile" asChild>
          <Pressable style={styles.settingsButton}>
            <MaterialIcons name="person" size={20} color="white"  />
          </Pressable>
        </Link>
      

    
      </View>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>ScentsAndPA</Text>
      </View>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.chartTitle}>Bicep Curls Peppermint</Text>
        <LineChart
          data={data}
          width={screenWidth - 20}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
        />
        <Text style={styles.chartTitle}>Bicep Curls Lavender</Text>
        <LineChart
          data={data}
          width={screenWidth - 20}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
        />
        <Text style={styles.chartTitle}>Bicep Curls Citrus</Text>
        <LineChart
          data={data}
          width={screenWidth - 20}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 15,
    marginTop: StatusBar.currentHeight || 0, // Add dynamic padding based on status bar height

  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5e4a8e',
    justifyContent: 'center',
    alignItems: 'center',
  },
   titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5e4a8e', // Purple color
    marginBottom: 40,
    
   
   
  },
 
  scrollView: {
    marginTop: 10,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    marginLeft: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    alignSelf: 'center',
  },
});
