import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Activity, Database, Play, Square, RotateCcw, TrendingUp } from 'lucide-react-native';
import { SensorService } from '@/services/SensorService';
import { DatabaseService } from '@/services/DatabaseService';
import { SensorData } from '@/types';

interface SensorMonitorProps {
  userId?: string;
  onSensorData?: (data: SensorData) => void;
}

export function SensorMonitor({ userId = 'demo-user', onSensorData }: SensorMonitorProps) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [currentData, setCurrentData] = useState<SensorData | null>(null);
  const [sensorStats, setSensorStats] = useState<any>(null);
  const [dbStats, setDbStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sensorService = SensorService.getInstance();
  const databaseService = DatabaseService.getInstance();
  const sessionId = 'session-' + new Date().toISOString();

  useEffect(() => {
    const unsubscribe = sensorService.subscribe(async (data) => {
      setCurrentData(data);
      onSensorData?.(data);

      try {
        await databaseService.logSensorData(data, sessionId, userId);
      } catch (err) {
        console.warn('❗️ Failed to log sensor data:', err);
      }
    });

    loadStats();
    const statsInterval = setInterval(loadStats, 5000);

    return () => {
      unsubscribe();
      clearInterval(statsInterval);
    };
  }, []);

  const loadStats = async () => {
    try {
      const [sensorStats, dbStats] = await Promise.all([
        sensorService.getSensorStats(),
        databaseService.getDatabaseStats(),
      ]);
      setSensorStats(sensorStats);
      setDbStats(dbStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleStartMonitoring = async () => {
    try {
      setError(null);
      setIsSimulated(false);
      const success = await sensorService.startMonitoring(userId);
      setIsMonitoring(true);

      if (!success) {
        setIsSimulated(true);
        setError('Live sensors unavailable — using fallback data');
      }
    } catch (error) {
      setError(`Failed to start monitoring: ${error}`);
    }
  };

  const handleStopMonitoring = () => {
    sensorService.stopMonitoring();
    setIsMonitoring(false);
    setCurrentData(null);
  };

  const handleSimulateTremor = () => {
    sensorService.simulateHandTremor();
  };

  const handleSimulateWalking = () => {
    sensorService.simulateWalkingPattern();
  };

  const formatSensorValue = (value: number): string => value.toFixed(4);

  const getSensorMagnitude = (data: { x: number; y: number; z: number }): number =>
    Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Activity size={24} color="#00D4FF" />
        <Text style={styles.title}>Sensor Monitor</Text>
        <View style={[styles.statusDot, { backgroundColor: isMonitoring ? '#00D4AA' : '#FF4444' }]} />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMonitoring && styles.controlButtonActive]}
          onPress={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
        >
          {isMonitoring ? <Square size={16} color="#FFFFFF" /> : <Play size={16} color="#FFFFFF" />}
          <Text style={styles.controlButtonText}>
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </Text>
        </TouchableOpacity>

        {isMonitoring && (
          <View style={styles.simulationControls}>
            <TouchableOpacity style={styles.simButton} onPress={handleSimulateTremor}>
              <Text style={styles.simButtonText}>Tremor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.simButton} onPress={handleSimulateWalking}>
              <Text style={styles.simButtonText}>Walking</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isSimulated && (
          <View style={styles.fallbackBanner}>
            <Text style={styles.fallbackText}>
              You're in fallback mode — real-time simulation is active.
            </Text>
          </View>
        )}

        {currentData && (
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>Live Sensor Data</Text>

            <View style={styles.sensorCard}>
              <Text style={styles.sensorLabel}>Gyroscope (rad/s)</Text>
              <View style={styles.sensorValues}>
                <Text style={styles.sensorValue}>X: {formatSensorValue(currentData.gyroscope.x)}</Text>
                <Text style={styles.sensorValue}>Y: {formatSensorValue(currentData.gyroscope.y)}</Text>
                <Text style={styles.sensorValue}>Z: {formatSensorValue(currentData.gyroscope.z)}</Text>
              </View>
              <Text style={styles.magnitudeText}>
                Magnitude: {formatSensorValue(getSensorMagnitude(currentData.gyroscope))}
              </Text>
            </View>

            <View style={styles.sensorCard}>
              <Text style={styles.sensorLabel}>Accelerometer (m/s²)</Text>
              <View style={styles.sensorValues}>
                <Text style={styles.sensorValue}>X: {formatSensorValue(currentData.accelerometer.x)}</Text>
                <Text style={styles.sensorValue}>Y: {formatSensorValue(currentData.accelerometer.y)}</Text>
                <Text style={styles.sensorValue}>Z: {formatSensorValue(currentData.accelerometer.z)}</Text>
              </View>
              <Text style={styles.magnitudeText}>
                Magnitude: {formatSensorValue(getSensorMagnitude(currentData.accelerometer))}
              </Text>
            </View>

            <View style={styles.timestampCard}>
              <Text style={styles.timestampText}>
                Last Update: {new Date(currentData.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        )}

        {sensorStats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Session Statistics</Text>

            <View style={styles.statCard}>
              <Database size={20} color="#00D4FF" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Total Readings</Text>
                <Text style={styles.statValue}>{sensorStats.totalReadings}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <TrendingUp size={20} color="#00D4AA" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Avg Gyroscope</Text>
                <Text style={styles.statValue}>
                  {formatSensorValue(getSensorMagnitude(sensorStats.avgGyroscope))}
                </Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <RotateCcw size={20} color="#FFB800" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Avg Accelerometer</Text>
                <Text style={styles.statValue}>
                  {formatSensorValue(getSensorMagnitude(sensorStats.avgAccelerometer))}
                </Text>
              </View>
            </View>
          </View>
        )}

        {dbStats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Database Statistics</Text>

            <View style={styles.statCard}>
              <Database size={20} color="#007AFF" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Sensor Logs</Text>
                <Text style={styles.statValue}>{dbStats.sensorLogs}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <Activity size={20} color="#FF8800" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Behavior Profiles</Text>
                <Text style={styles.statValue}>{dbStats.behaviorProfiles}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}




const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  fallbackBanner: {
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderColor: '#FFB80040',
    borderWidth: 1,
  },
  fallbackText: {
    color: '#FFB800',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  controls: {
    marginBottom: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  controlButtonActive: {
    backgroundColor: '#FF4444',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  simulationControls: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  simButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  simButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  content: {
    maxHeight: 400,
  },
  dataSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  sensorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sensorLabel: {
    color: '#00D4FF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  sensorValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sensorValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'RobotoMono-Regular',
  },
  magnitudeText: {
    color: '#B0B0B0',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  timestampCard: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  timestampText: {
    color: '#00D4FF',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  statsSection: {
    marginBottom: 20,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    color: '#B0B0B0',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
