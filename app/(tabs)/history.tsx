import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backEndUrl } from '../config';

export default function HistoryPage() {
  const [recordings, setRecordings] = useState([]);
  const [basePressure, setBasePressure] = useState(null);
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40; // account for horizontal margins

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(94, 74, 142, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(94, 74, 142, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '2', strokeWidth: '1', stroke: '#5e4a8e' },
    propsForBackgroundLines: { stroke: '#e3d6f5' },
  };

  const averageHRData = (arr) => {
    if (!Array.isArray(arr) || !arr.length) return [];
    const vals = arr.map(e => Array.isArray(e) ? e[1] : e?.hr ?? 0);
    const out = [];
    for (let i = 0; i < vals.length; i += 15) {
      const slice = vals.slice(i, i + 15);
      out.push(slice.reduce((sum, v) => sum + v, 0) / slice.length);
    }
    return out;
  };

  const getBarColor = (pct) => {
    if (pct >= 110) return '#005500';
    if (pct >= 100) return '#007700';
    if (pct >= 90)  return '#00aa00';
    if (pct >= 70)  return '#e6e600';
    if (pct >= 60)  return '#e67300';
    return '#cc0000';
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const email = await AsyncStorage.getItem('user_email');
          if (!email) return alert('Please log in again.');

          const recRes = await fetch(`${backEndUrl}/getData`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const { recordings: recs = [] } = await recRes.json();
          setRecordings(recs);

          const presRes = await fetch(`${backEndUrl}/getBasePressure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const { pressure } = await presRes.json();
          setBasePressure(pressure);
        } catch (err) {
          console.error(err);
        }
      })();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#5e4a8e" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Session"
          placeholderTextColor="#a3a3a8"
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {recordings.map((rec, idx) => {
          const hrDuring = averageHRData(rec.hrDuringRecording);
          const hrPost   = averageHRData(rec.hrPostRecording);
          const timestamp = new Date(rec.recordedAt).toLocaleString();
          const scent     = `Scent: ${rec.channel}`;

          const lineData = (data) => ({
            labels: data.map((_, i) => (i % 4 === 0 ? `${i * 15}s` : '')),
            datasets: [{ data }],
          });

          const tutVals = rec.accelerometerData?.map(d => parseFloat(d.tut) || 0) || [];
          const tutLabs = tutVals.map((_, i) => `${i + 1}`);

          // bar chart sizing and scroll behavior
          const BAR_WIDTH       = 1;
          const BAR_SLOT        = 5;
          const totalBars       = tutVals.length;
          const MIN_BARS_VISIBLE = 7;
          const extraWidth      = totalBars * BAR_SLOT;
          const chartActualWidth =
            totalBars > MIN_BARS_VISIBLE
              ? chartWidth + extraWidth    // scrollable extra when >7 bars
              : chartWidth;               // full-screen width otherwise
          const barPercentage   = BAR_WIDTH / BAR_SLOT;

          return (
            <View key={idx} style={styles.card}>
              <Text style={styles.timestamp}>{timestamp}</Text>

              {/* HR During */}
              <Text style={styles.chartTitle}>
                {rec.exerciseName} – HR During ({scent})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={lineData(hrDuring)}
                  width={chartWidth}
                  height={200}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  withDots={false}
                  withInnerLines
                  withOuterLines
                />
              </ScrollView>

              {/* HR Post */}
              <Text style={styles.chartTitle}>
                {rec.exerciseName} – HR Post ({scent})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={lineData(hrPost)}
                  width={chartWidth}
                  height={200}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  withDots={false}
                  withInnerLines
                  withOuterLines
                />
              </ScrollView>

              {/* TUT / Rep */}
              {tutVals.length > 0 && (
                <>
                  <Text style={styles.chartTitle}>
                    {rec.exerciseName} – TUT / Rep ({scent})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <BarChart
                      data={{
                        labels: tutLabs,
                        datasets: [{ data: tutVals, colors: tutVals.map((_, i) => () => {
                          const pct = basePressure
                            ? (rec.accelerometerData[i].maxPressure / basePressure) * 100
                            : 0;
                          return getBarColor(pct);
                        }) }],
                      }}
                      width={chartActualWidth}
                      height={200}
                      fromZero
                      barPercentage={barPercentage}
                      chartConfig={{
                        ...chartConfig,
                        color: (op) => `rgba(0,0,0,${op})`,
                        fillShadowGradientOpacity: 1,
                        useShadowColorFromDataset: false,
                      }}
                      style={[styles.chart, { marginRight: BAR_SLOT }]}
                      withInnerLines
                      showBarTops={false}
                      withCustomBarColorFromData
                      flatColor
                    />
                  </ScrollView>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fefefe' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginTop: StatusBar.currentHeight || 0,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5e4a8e',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 10,
    backgroundColor: '#f5f0fc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#5e4a8e' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timestamp: { fontSize: 12, color: '#666', marginBottom: 8 },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5e4a8e',
    marginTop: 8,
    marginBottom: 4,
  },
  chart: { borderRadius: 12 },
});
