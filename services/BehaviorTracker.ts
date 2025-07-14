import { Platform } from 'react-native';
import { BehaviorProfile, SensorData, SecurityEvent } from '@/types';
import { DatabaseService } from './DatabaseService';

export class BehaviorTracker {
  private static instance: BehaviorTracker;
  private behaviorProfile: BehaviorProfile | null = null;
  private keystrokeData: number[] = [];
  private gestureData: any[] = [];
  private navigationHistory: string[] = [];
  private sensorData: SensorData[] = [];
  private sessionStartTime: number = 0;
  private lastRiskScore: number = 0;
  private databaseService: DatabaseService;

  static getInstance(): BehaviorTracker {
    if (!BehaviorTracker.instance) {
      BehaviorTracker.instance = new BehaviorTracker();
    }
    return BehaviorTracker.instance;
  }

  constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  initializeProfile(userId: string): void {
    this.behaviorProfile = {
      userId,
      keystrokeDynamics: {
        avgTypingSpeed: 0,
        avgPause: 0,
        pressureMagnitude: 0,
        rhythmPattern: [],
      },
      gestureDynamics: {
        swipeVelocity: 0,
        tapDuration: 0,
        touchPressure: 0,
      },
      navigationPatterns: {
        commonPaths: [],
        sessionDuration: 0,
        timeOfDayUsage: new Array(24).fill(0),
      },
      locationPatterns: {
        commonLocations: [],
        travelSpeed: 0,
      },
      handTremor: {
        signature: [],
        confidence: 0,
      },
      transactionHabits: {
        avgAmount: 0,
        commonRecipients: [],
        preferredTimes: [],
      },
      riskScore: 0,
      lastUpdated: new Date(),
    };
    this.sessionStartTime = Date.now();
    
    // Initialize database and load existing profile
    this.loadBehaviorProfile(userId);
  }

  private async loadBehaviorProfile(userId: string): Promise<void> {
    try {
      await this.databaseService.initializeDatabase();
      const savedProfile = await this.databaseService.getBehaviorProfile(userId);
      
      if (savedProfile && this.behaviorProfile) {
        // Merge saved profile with current profile
        this.behaviorProfile.keystrokeDynamics = savedProfile.keystrokeDynamics;
        this.behaviorProfile.gestureDynamics = savedProfile.gestureDynamics;
        this.behaviorProfile.navigationPatterns = savedProfile.navigationPatterns;
        this.behaviorProfile.handTremor = savedProfile.handTremor;
        this.behaviorProfile.riskScore = savedProfile.riskScore;
        
        console.log('✅ Loaded existing behavior profile');
      }
    } catch (error) {
      console.error('❌ Failed to load behavior profile:', error);
    }
  }

  recordKeystroke(key: string, timestamp: number, pressure?: number): void {
    if (!this.behaviorProfile) return;

    this.keystrokeData.push(timestamp);
    
    // Calculate typing speed and patterns
    if (this.keystrokeData.length > 1) {
      const timeDiff = timestamp - this.keystrokeData[this.keystrokeData.length - 2];
      const currentSpeed = 1000 / timeDiff; // Keys per second
      
      // Update profile with exponential moving average
      this.behaviorProfile.keystrokeDynamics.avgTypingSpeed = 
        this.behaviorProfile.keystrokeDynamics.avgTypingSpeed * 0.9 + currentSpeed * 0.1;
      
      if (pressure) {
        this.behaviorProfile.keystrokeDynamics.pressureMagnitude = 
          this.behaviorProfile.keystrokeDynamics.pressureMagnitude * 0.9 + pressure * 0.1;
      }
    }

    // Keep only last 10 keystrokes for pattern analysis
    if (this.keystrokeData.length > 10) {
      this.keystrokeData.shift();
    }
  }

  recordGesture(gestureType: string, velocity: number, duration: number, pressure?: number): void {
    if (!this.behaviorProfile) return;

    const gesture = {
      type: gestureType,
      velocity,
      duration,
      pressure: pressure || 0,
      timestamp: Date.now(),
    };

    this.gestureData.push(gesture);
    
    // Update gesture dynamics
    this.behaviorProfile.gestureDynamics.swipeVelocity = 
      this.behaviorProfile.gestureDynamics.swipeVelocity * 0.8 + velocity * 0.2;
    
    this.behaviorProfile.gestureDynamics.tapDuration = 
      this.behaviorProfile.gestureDynamics.tapDuration * 0.8 + duration * 0.2;

    if (pressure) {
      this.behaviorProfile.gestureDynamics.touchPressure = 
        this.behaviorProfile.gestureDynamics.touchPressure * 0.8 + pressure * 0.2;
    }

    // Keep only last 20 gestures
    if (this.gestureData.length > 20) {
      this.gestureData.shift();
    }
  }

  recordNavigation(screen: string): void {
    if (!this.behaviorProfile) return;

    this.navigationHistory.push(screen);
    
    // Update common paths
    if (this.navigationHistory.length >= 2) {
      const path = this.navigationHistory.slice(-2).join(' -> ');
      if (!this.behaviorProfile.navigationPatterns.commonPaths.includes(path)) {
        this.behaviorProfile.navigationPatterns.commonPaths.push(path);
      }
    }

    // Update time of day usage
    const hour = new Date().getHours();
    this.behaviorProfile.navigationPatterns.timeOfDayUsage[hour]++;

    // Keep only last 50 navigation events
    if (this.navigationHistory.length > 50) {
      this.navigationHistory.shift();
    }
  }

  recordSensorData(sensorData: SensorData): void {
    if (!this.behaviorProfile) return;

    this.sensorData.push(sensorData);
    
    // Analyze hand tremor pattern
    if (this.sensorData.length >= 10) {
      const tremorSignature = this.analyzeHandTremor(this.sensorData.slice(-10));
      this.behaviorProfile.handTremor.signature = tremorSignature;
      this.behaviorProfile.handTremor.confidence = this.calculateTremorConfidence(tremorSignature);
    }

    // Keep only last 100 sensor readings
    if (this.sensorData.length > 100) {
      this.sensorData.shift();
    }
  }

  private analyzeHandTremor(data: SensorData[]): number[] {
    // Simplified tremor analysis - calculate variance in acceleration
    const signature: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      
      const deltaX = Math.abs(curr.accelerometer.x - prev.accelerometer.x);
      const deltaY = Math.abs(curr.accelerometer.y - prev.accelerometer.y);
      const deltaZ = Math.abs(curr.accelerometer.z - prev.accelerometer.z);
      
      const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
      signature.push(magnitude);
    }
    
    return signature;
  }

  private calculateTremorConfidence(signature: number[]): number {
    if (signature.length < 5) return 0;
    
    // Calculate coefficient of variation as confidence metric
    const mean = signature.reduce((sum, val) => sum + val, 0) / signature.length;
    const variance = signature.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signature.length;
    const stdDev = Math.sqrt(variance);
    
    // Higher consistency = higher confidence
    return Math.max(0, 1 - (stdDev / mean));
  }

  calculateRiskScore(): number {
    if (!this.behaviorProfile) return 0.5;

    let riskScore = 0;
    let factors = 0;

    // Keystroke dynamics risk
    if (this.keystrokeData.length > 5) {
      const currentSpeed = this.getCurrentTypingSpeed();
      const expectedSpeed = this.behaviorProfile.keystrokeDynamics.avgTypingSpeed;
      const speedDeviation = Math.abs(currentSpeed - expectedSpeed) / expectedSpeed;
      riskScore += Math.min(speedDeviation, 1.0);
      factors++;
    }

    // Gesture dynamics risk
    if (this.gestureData.length > 0) {
      const recentGestures = this.gestureData.slice(-5);
      const avgVelocity = recentGestures.reduce((sum, g) => sum + g.velocity, 0) / recentGestures.length;
      const expectedVelocity = this.behaviorProfile.gestureDynamics.swipeVelocity;
      const velocityDeviation = Math.abs(avgVelocity - expectedVelocity) / expectedVelocity;
      riskScore += Math.min(velocityDeviation, 1.0);
      factors++;
    }

    // Navigation pattern risk
    if (this.navigationHistory.length > 0) {
      const currentPath = this.navigationHistory.slice(-2).join(' -> ');
      const isKnownPath = this.behaviorProfile.navigationPatterns.commonPaths.includes(currentPath);
      if (!isKnownPath) {
        riskScore += 0.3;
      }
      factors++;
    }

    // Hand tremor risk
    if (this.behaviorProfile.handTremor.confidence > 0.5) {
      const currentTremor = this.sensorData.length > 0 ? this.analyzeHandTremor(this.sensorData.slice(-5)) : [];
      const similarity = this.calculateTremorSimilarity(currentTremor, this.behaviorProfile.handTremor.signature);
      riskScore += 1 - similarity;
      factors++;
    }

    // Time-based risk
    const currentHour = new Date().getHours();
    const usageAtHour = this.behaviorProfile.navigationPatterns.timeOfDayUsage[currentHour];
    const totalUsage = this.behaviorProfile.navigationPatterns.timeOfDayUsage.reduce((sum, count) => sum + count, 0);
    const timeRisk = usageAtHour / totalUsage < 0.1 ? 0.2 : 0;
    riskScore += timeRisk;
    factors++;

    const finalScore = factors > 0 ? riskScore / factors : 0.5;
    this.lastRiskScore = Math.max(0, Math.min(1, finalScore));
    
    return this.lastRiskScore;
  }

  private getCurrentTypingSpeed(): number {
    if (this.keystrokeData.length < 2) return 0;
    
    const recentKeystrokes = this.keystrokeData.slice(-5);
    const totalTime = recentKeystrokes[recentKeystrokes.length - 1] - recentKeystrokes[0];
    return (recentKeystrokes.length - 1) / (totalTime / 1000);
  }

  private calculateTremorSimilarity(current: number[], stored: number[]): number {
    if (current.length === 0 || stored.length === 0) return 0;
    
    const minLength = Math.min(current.length, stored.length);
    let similarity = 0;
    
    for (let i = 0; i < minLength; i++) {
      const diff = Math.abs(current[i] - stored[i]);
      similarity += 1 - Math.min(diff, 1);
    }
    
    return similarity / minLength;
  }

  getRiskLevel(): 'low' | 'medium' | 'high' {
    const score = this.calculateRiskScore();
    if (score < 0.3) return 'low';
    if (score < 0.7) return 'medium';
    return 'high';
  }

  shouldTriggerChallenge(): boolean {
    return this.getRiskLevel() === 'high';
  }

  shouldBlockAction(): boolean {
    return this.calculateRiskScore() > 0.9;
  }

  updateSessionData(): void {
    if (!this.behaviorProfile) return;
    
    const sessionDuration = Date.now() - this.sessionStartTime;
    this.behaviorProfile.navigationPatterns.sessionDuration = 
      this.behaviorProfile.navigationPatterns.sessionDuration * 0.8 + sessionDuration * 0.2;
    
    this.behaviorProfile.lastUpdated = new Date();
    
    // Save to database
    this.saveBehaviorProfile();
  }

  private async saveBehaviorProfile(): Promise<void> {
    if (!this.behaviorProfile) return;
    
    try {
      await this.databaseService.saveBehaviorProfile(
        this.behaviorProfile.userId,
        this.behaviorProfile
      );
    } catch (error) {
      console.error('❌ Failed to save behavior profile:', error);
    }
  }

  getBehaviorProfile(): BehaviorProfile | null {
    return this.behaviorProfile;
  }

  reset(): void {
    this.keystrokeData = [];
    this.gestureData = [];
    this.navigationHistory = [];
    this.sensorData = [];
    this.sessionStartTime = Date.now();
  }
}