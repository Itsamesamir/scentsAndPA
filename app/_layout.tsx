import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, Slot } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BleProvider } from "./utilities/BleContext"; // Adjust the import path as needed

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('user_token'); // Check for user authentication token
     
        if (!token) {
          // Delay navigation until after mounting
          setTimeout(() => {
            router.replace('/(auth)/login'); // Redirect to login if no token
            }, 0);
        }
        
      } catch (error) {
        console.error('Error checking authentication:', error);
        setTimeout(() => {
          router.replace('/(auth)/login'); // Redirect to home on error
        }, 0);
      }
    };

    checkAuth();
  }, []);

  // Always render the Slot component for expo-router to function correctly
  return (
   <BleProvider>
     <View style={{ flex: 1 }}>
      <Slot />
    </View>
   </BleProvider> 
   
  );
}
