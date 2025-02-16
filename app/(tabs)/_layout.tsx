import { Tabs } from 'expo-router';

import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';

import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Entypo from '@expo/vector-icons/Entypo';
export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
      tabBarActiveTintColor: Colors[colorScheme ?? 'dark'].tint,
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarBackground: TabBarBackground,
      tabBarLabelStyle: { color: 'black' },
      
      }}>
    
      <Tabs.Screen
      name="history"
      options={{
        title: 'History',
        tabBarIcon: ({ color }) => <Entypo name="text" size={24} color="black" />,
       
      }}
      />
      <Tabs.Screen
      name="(home)"
      options={{
      title: 'Home',
      tabBarIcon: ({ color }) => <AntDesign name="home" size={24} color="black"/>,
      
      }}
    />
    <Tabs.Screen
      name="(record)"
      options={{
      title: 'Record',
      tabBarIcon: ({ color }) => <FontAwesome5 name="record-vinyl" size={24} color="black" />,
    
      }}
    />
    
    </Tabs>
  );
}
