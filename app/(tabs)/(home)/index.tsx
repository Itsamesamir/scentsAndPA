import React from 'react';
import { View, Text, Button, ScrollView, StyleSheet, SafeAreaView, StatusBar,Dimensions, TouchableOpacity, Pressable } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';



export default function HomeScreen() {
  const screenWidth = Dimensions.get('window').width;
  const router = useRouter();


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
        <Text style={styles.welcome}>Welcome back!</Text>
      </View>
      
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
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5e4a8e',
  },
  welcome: {
    fontSize: 18,
    color: '#555',
    marginTop: 8,
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
