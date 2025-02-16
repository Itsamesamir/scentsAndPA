import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
  Dimensions,
  Pressable,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';

export default function HistoryPage() {
  const navigation = useNavigation();

  const screenWidth = Dimensions.get('window').width;

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
        color: (opacity = 1) => `rgba(94, 74, 142, ${opacity})`, // Purple line
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      {/* Header with Back Button */}
      <View style={styles.header}>
        
        <Text style={styles.title}>History</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#5e4a8e" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Session"
          placeholderTextColor="#a3a3a3"
        />
      </View>

      {/* Scrollable Charts */}
      <ScrollView>
        <View style={styles.chartWrapper}>
          <Text style={styles.timestamp}>12/11/2024 - 08:12 p.m.</Text>
          <Text style={styles.chartTitle}>Bicep Curls Peppermint</Text>
          <LineChart
            data={data}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        </View>
        <View style={styles.chartWrapper}>
          <Text style={styles.timestamp}>12/11/2024 - 08:12 p.m.</Text>
          <Text style={styles.chartTitle}>Bicep Curls Lavender</Text>
          <LineChart
            data={data}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        </View>
        <View style={styles.chartWrapper}>
          <Text style={styles.timestamp}>12/11/2024 - 08:12 p.m.</Text>
          <Text style={styles.chartTitle}>Bicep Curls Lavender</Text>
          <LineChart
            data={data}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        </View>
        
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginTop: StatusBar.currentHeight || 0, // Adjust for status bar height
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5e4a8e',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f5f0fc',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#5e4a8e',
  },
  chartWrapper: {
    marginVertical: 10,
    marginHorizontal: 20,
  },
  timestamp: {
    fontSize: 14,
    color: '#5e4a8e',
    marginBottom: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#5e4a8e',
  },
  chart: {
    borderRadius: 16,
    backgroundColor: '#fff',
  },
});
