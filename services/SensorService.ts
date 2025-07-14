import { Platform } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { SensorData } from '@/types';
import { DatabaseService } from './DatabaseService';

export class SensorService {
  private static instance: SensorService;
  private sensorCallbacks: ((data: SensorData) => void)[] = [];
  private isMonitoring = false;
  private accelerometerSubscription: any = null;
  private gyroscopeSubscription: any = null;
  private currentSessionId: string = '';
  private currentUserId: string = '';
  private databaseService: DatabaseService;
  private lastSensorData: SensorData | null = null;
  private sensorUpdateInterval: number = 100; // ms

  static getInstance(): SensorService {
    if (!SensorService.instance) {
      SensorService.instance = new SensorService();
    }
    return SensorService.instance;
  }

  constructor() {
    this.databaseService = DatabaseService.getInstance();
    this.currentSessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async startMonitoring(userId: string = 'demo-user'): Promise<boolean> {
    if (this.isMonitoring) {
      console.log('⚠️ Sensor monitoring already active');
      return true;
    }

    this.currentUserId = userId;
    this.currentSessionId = this.generateSessionId();

    try {
      // Initialize database
      await this.databaseService.initializeDatabase();

      if (Platform.OS === 'web') {
        console.log('🌐 Web platform detected - using simulated sensors');
        this.startWebSensorSimulation();
        this.isMonitoring = true;
        return true;
      }

      // Check sensor availability
      const accelerometerAvailable = await Accelerometer.isAvailableAsync();
      const gyroscopeAvailable = await Gyroscope.isAvailableAsync();

      console.log('📱 Sensor availability:', {
        accelerometer: accelerometerAvailable,
        gyroscope: gyroscopeAvailable,
      });

      if (!accelerometerAvailable && !gyroscopeAvailable) {
        console.log('❌ No sensors available - falling back to simulation');
        this.startWebSensorSimulation();
        this.isMonitoring = true;
        return true;
      }

      // Set sensor update intervals
      Accelerometer.setUpdateInterval(this.sensorUpdateInterval);
      Gyroscope.setUpdateInterval(this.sensorUpdateInterval);

      // Start real sensor monitoring
      await this.startRealSensorMonitoring();
      this.isMonitoring = true;

      console.log('✅ Real sensor monitoring started successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to start sensor monitoring:', error);
      // Fallback to simulation
      this.startWebSensorSimulation();
      this.isMonitoring = true;
      return false;
    }
  }

  private async startRealSensorMonitoring(): Promise<void> {
    let accelerometerData = { x: 0, y: 0, z: 0 };
    let gyroscopeData = { x: 0, y: 0, z: 0 };

    // Subscribe to accelerometer
    this.accelerometerSubscription = Accelerometer.addListener((data) => {
      accelerometerData = data;
      this.processSensorData(gyroscopeData, accelerometerData);
    });

    // Subscribe to gyroscope
    this.gyroscopeSubscription = Gyroscope.addListener((data) => {
      gyroscopeData = data;
      this.processSensorData(gyroscopeData, accelerometerData);
    });

    console.log('🔄 Real sensor subscriptions active');
  }

  private startWebSensorSimulation(): void {
    console.log('🎭 Starting sensor simulation for web platform');
    
    let baseAccel = { x: 0, y: 0, z: 9.8 };
    let baseGyro = { x: 0, y: 0, z: 0 };
    
    // Simulate realistic device movement patterns
    const simulationInterval = setInterval(() => {
      if (!this.isMonitoring) {
        clearInterval(simulationInterval);
        return;
      }

      // Add realistic noise and movement patterns
      const time = Date.now() / 1000;
      const slowWave = Math.sin(time * 0.5) * 0.1;
      const fastWave = Math.sin(time * 2) * 0.05;
      const randomNoise = () => (Math.random() - 0.5) * 0.02;

      const accelerometerData = {
        x: baseAccel.x + slowWave + randomNoise(),
        y: baseAccel.y + fastWave + randomNoise(),
        z: baseAccel.z + randomNoise(),
      };

      const gyroscopeData = {
        x: baseGyro.x + slowWave * 0.1 + randomNoise(),
        y: baseGyro.y + fastWave * 0.1 + randomNoise(),
        z: baseGyro.z + randomNoise(),
      };

      this.processSensorData(gyroscopeData, accelerometerData);
    }, this.sensorUpdateInterval);
  }

  private processSensorData(gyroscope: any, accelerometer: any): void {
    const sensorData: SensorData = {
      gyroscope: {
        x: Number(gyroscope.x.toFixed(6)),
        y: Number(gyroscope.y.toFixed(6)),
        z: Number(gyroscope.z.toFixed(6)),
      },
      accelerometer: {
        x: Number(accelerometer.x.toFixed(6)),
        y: Number(accelerometer.y.toFixed(6)),
        z: Number(accelerometer.z.toFixed(6)),
      },
      timestamp: Date.now(),
    };

    this.lastSensorData = sensorData;

    // Notify callbacks
    this.notifyCallbacks(sensorData);

    // Log to database (throttled to avoid excessive writes)
    if (Math.random() < 0.1) { // Log 10% of readings to reduce database load
      this.databaseService.logSensorData(
        sensorData,
        this.currentSessionId,
        this.currentUserId
      );
    }
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log('⚠️ Sensor monitoring not active');
      return;
    }

    this.isMonitoring = false;

    // Unsubscribe from real sensors
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
    }

    if (this.gyroscopeSubscription) {
      this.gyroscopeSubscription.remove();
      this.gyroscopeSubscription = null;
    }

    console.log('🛑 Sensor monitoring stopped');
  }

  private notifyCallbacks(data: SensorData): void {
    this.sensorCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('❌ Error in sensor callback:', error);
      }
    });
  }

  subscribe(callback: (data: SensorData) => void): () => void {
    this.sensorCallbacks.push(callback);
    
    return () => {
      const index = this.sensorCallbacks.indexOf(callback);
      if (index > -1) {
        this.sensorCallbacks.splice(index, 1);
      }
    };
  }

  getCurrentSensorData(): SensorData | null {
    return this.lastSensorData;
  }

  getSessionId(): string {
    return this.currentSessionId;
  }

  getUserId(): string {
    return this.currentUserId;
  }

  isActive(): boolean {
    return this.isMonitoring;
  }

  async getSensorStats(): Promise<any> {
    return await this.databaseService.getSensorStats(this.currentUserId, this.currentSessionId);
  }

  async getSensorHistory(limit: number = 100): Promise<any[]> {
    return await this.databaseService.getSensorLogs(this.currentUserId, this.currentSessionId, limit);
  }

  // Simulate specific movement patterns for testing
  simulateHandTremor(): void {
    if (!this.isMonitoring) return;

    console.log('🤲 Simulating hand tremor pattern');
    
    const tremorPattern = [
      { gyro: { x: 0.15, y: 0.08, z: 0.03 }, accel: { x: 0.1, y: 0.05, z: 9.82 } },
      { gyro: { x: 0.18, y: 0.12, z: 0.05 }, accel: { x: 0.15, y: 0.08, z: 9.85 } },
      { gyro: { x: 0.12, y: 0.06, z: 0.025 }, accel: { x: 0.12, y: 0.06, z: 9.78 } },
      { gyro: { x: 0.08, y: 0.04, z: 0.018 }, accel: { x: 0.08, y: 0.04, z: 9.81 } },
      { gyro: { x: 0.14, y: 0.09, z: 0.035 }, accel: { x: 0.11, y: 0.07, z: 9.83 } },
    ];

    tremorPattern.forEach((pattern, index) => {
      setTimeout(() => {
        this.processSensorData(pattern.gyro, pattern.accel);
      }, index * 150);
    });
  }

  simulateWalkingPattern(): void {
    if (!this.isMonitoring) return;

    console.log('🚶 Simulating walking pattern');
    
    // Simulate rhythmic walking motion
    let step = 0;
    const walkingInterval = setInterval(() => {
      if (!this.isMonitoring || step >= 20) {
        clearInterval(walkingInterval);
        return;
      }

      const walkPhase = (step % 4) / 4 * Math.PI * 2;
      const gyroscope = {
        x: Math.sin(walkPhase) * 0.3,
        y: Math.cos(walkPhase) * 0.2,
        z: Math.sin(walkPhase * 2) * 0.1,
      };

      const accelerometer = {
        x: Math.sin(walkPhase) * 0.5,
        y: Math.cos(walkPhase) * 0.3 + 9.8,
        z: Math.sin(walkPhase * 1.5) * 0.4,
      };

      this.processSensorData(gyroscope, accelerometer);
      step++;
    }, 200);
  }

  async clearSensorHistory(olderThanDays: number = 7): Promise<void> {
    await this.databaseService.clearOldSensorData(olderThanDays);
  }
}