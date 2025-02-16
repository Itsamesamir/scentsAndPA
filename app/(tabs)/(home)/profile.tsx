import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Button,StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, Link} from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function Profile ()  {
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      router.replace('/(auth)/login'); // Redirect to the login screen
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  return (
    <View style={styles.container}>
        <View style={styles.header}>
        
       
      
    
      </View>
      <Text style={styles.heading}>Profile</Text>

      {/* Buttons Container */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.recordButton}>
          <Text style={styles.buttonText}>Record HR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.recordButton}>
          <Text style={styles.buttonText}>Record pressure</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} >
        <Text style={styles.logoutButtonText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6F4ACF',
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  recordButton: {
    backgroundColor: '#6F4ACF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginHorizontal: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#8B5D67',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

