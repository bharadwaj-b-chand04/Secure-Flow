import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SensorMonitor } from '@/components/SensorMonitor';
import { SecurityIndicator } from '@/components/SecurityIndicator';
import { SensorData } from '@/types';

export function SecurityAnalyticsDashboard() {
  const [riskScore, setRiskScore] = useState<number>(0);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');

  const handleSensorData = (data: SensorData) => {
    // Basic risk calculation logic based on sensor magnitudes
    const accel = data.accelerometer;
    const gyro = data.gyroscope;

    const accelMag = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
    const gyroMag = Math.sqrt(gyro.x ** 2 + gyro.y ** 2 + gyro.z ** 2);

    const normalizedAccel = Math.min(accelMag / 20, 1);  // max 20 m/s²
    const normalizedGyro = Math.min(gyroMag / 15, 1);    // max 15 rad/s

    const score = (normalizedAccel * 0.6 + normalizedGyro * 0.4);
    setRiskScore(score);

    if (score < 0.3) setRiskLevel('low');
    else if (score < 0.7) setRiskLevel('medium');
    else setRiskLevel('high');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Security Analytics</Text>

      {/* Security Indicator showing the risk level */}
      <SecurityIndicator 
        riskLevel={riskLevel} 
        riskScore={riskScore} 
        showDetails 
      />

      {/* Sensor Monitor collecting sensor data */}
      <SensorMonitor onSensorData={handleSensorData} />

      {/* Additional components like alerts, summaries can go here */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0A0A0A',
  },
  title: {
    fontSize: 22,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
});
