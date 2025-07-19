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
    this.loadBehaviorProfile(userId);
  }

  private async loadBehaviorProfile(userId: string): Promise<void> {
    try {
      await this.databaseService.initializeDatabase();
      const savedProfile = await this.databaseService.getBehaviorProfile(userId);

      if (savedProfile && this.behaviorProfile) {
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

    if (this.keystrokeData.length > 1) {
      const timeDiff = timestamp - this.keystrokeData[this.keystrokeData.length - 2];
      const currentSpeed = 1000 / timeDiff;

      this.behaviorProfile.keystrokeDynamics.avgTypingSpeed =
        this.behaviorProfile.keystrokeDynamics.avgTypingSpeed * 0.9 + currentSpeed * 0.1;

      if (pressure) {
        this.behaviorProfile.keystrokeDynamics.pressureMagnitude =
          this.behaviorProfile.keystrokeDynamics.pressureMagnitude * 0.9 + pressure * 0.1;
      }
    }

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

    this.behaviorProfile.gestureDynamics.swipeVelocity =
      this.behaviorProfile.gestureDynamics.swipeVelocity * 0.8 + velocity * 0.2;

    this.behaviorProfile.gestureDynamics.tapDuration =
      this.behaviorProfile.gestureDynamics.tapDuration * 0.8 + duration * 0.2;

    if (pressure) {
      this.behaviorProfile.gestureDynamics.touchPressure =
        this.behaviorProfile.gestureDynamics.touchPressure * 0.8 + pressure * 0.2;
    }

    if (this.gestureData.length > 20) {
      this.gestureData.shift();
    }
  }

  recordNavigation(screen: string): void {
    if (!this.behaviorProfile) return;

    this.navigationHistory.push(screen);

    if (this.navigationHistory.length >= 2) {
      const path = this.navigationHistory.slice(-2).join(' -> ');
      if (!this.behaviorProfile.navigationPatterns.commonPaths.includes(path)) {
        this.behaviorProfile.navigationPatterns.commonPaths.push(path);
      }
    }

    const hour = new Date().getHours();
    this.behaviorProfile.navigationPatterns.timeOfDayUsage[hour]++;

    if (this.navigationHistory.length > 50) {
      this.navigationHistory.shift();
    }
  }

  recordSensorData(sensorData: SensorData): void {
    if (!this.behaviorProfile) return;

    this.sensorData.push(sensorData);

    if (this.sensorData.length >= 10) {
      const tremorSignature = this.analyzeHandTremor(this.sensorData.slice(-10));
      this.behaviorProfile.handTremor.signature = tremorSignature;
      this.behaviorProfile.handTremor.confidence = this.calculateTremorConfidence(tremorSignature);
    }

    if (this.sensorData.length > 100) {
      this.sensorData.shift();
    }
  }

  private analyzeHandTremor(data: SensorData[]): number[] {
    const signature: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const dx = Math.abs(curr.accelerometer.x - prev.accelerometer.x);
      const dy = Math.abs(curr.accelerometer.y - prev.accelerometer.y);
      const dz = Math.abs(curr.accelerometer.z - prev.accelerometer.z);
      const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);
      signature.push(magnitude);
    }

    return signature;
  }

  private calculateTremorConfidence(signature: number[]): number {
    if (signature.length < 5) return 0;
    const mean = signature.reduce((sum, val) => sum + val, 0) / signature.length;
    const variance = signature.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signature.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 1 - (stdDev / mean));
  }

  calculateRiskScore(): number {
    if (!this.behaviorProfile) return 0.5;

    let riskScore = 0;
    let factors = 0;

    if (this.keystrokeData.length > 5) {
      const currentSpeed = this.getCurrentTypingSpeed();
      const expectedSpeed = this.behaviorProfile.keystrokeDynamics.avgTypingSpeed || 1;
      const speedDeviation = Math.abs(currentSpeed - expectedSpeed) / expectedSpeed;
      riskScore += Math.min(speedDeviation, 1.0);
      factors++;
    }

    if (this.gestureData.length > 0) {
      const recent = this.gestureData.slice(-5);
      const avgVelocity = recent.reduce((sum, g) => sum + g.velocity, 0) / recent.length;
      const expected = this.behaviorProfile.gestureDynamics.swipeVelocity || 1;
      const deviation = Math.abs(avgVelocity - expected) / expected;
      riskScore += Math.min(deviation, 1.0);
      factors++;
    }

    if (this.navigationHistory.length > 0) {
      const path = this.navigationHistory.slice(-2).join(' -> ');
      const known = this.behaviorProfile.navigationPatterns.commonPaths.includes(path);
      if (!known) riskScore += 0.3;
      factors++;
    }

    if (this.behaviorProfile.handTremor.confidence > 0.5) {
      const currentTremor = this.sensorData.length > 0 ? this.analyzeHandTremor(this.sensorData.slice(-5)) : [];
      const similarity = this.calculateTremorSimilarity(currentTremor, this.behaviorProfile.handTremor.signature);
      riskScore += 1 - similarity;
      factors++;
    }

    const hour = new Date().getHours();
    const hourUse = this.behaviorProfile.navigationPatterns.timeOfDayUsage[hour];
    const totalUse = this.behaviorProfile.navigationPatterns.timeOfDayUsage.reduce((a, b) => a + b, 0) || 1;
    if (hourUse / totalUse < 0.1) riskScore += 0.2;
    factors++;

    const final = factors > 0 ? riskScore / factors : 0.5;
    this.lastRiskScore = Math.max(0, Math.min(1, final));
    this.behaviorProfile.riskScore = this.lastRiskScore; // ✅ Persist to profile

    return this.lastRiskScore;
  }

  private getCurrentTypingSpeed(): number {
    if (this.keystrokeData.length < 2) return 0;
    const recent = this.keystrokeData.slice(-5);
    const totalTime = recent[recent.length - 1] - recent[0];
    return (recent.length - 1) / (totalTime / 1000);
  }

  private calculateTremorSimilarity(current: number[], stored: number[]): number {
    if (current.length === 0 || stored.length === 0) return 0;
    const min = Math.min(current.length, stored.length);
    let similarity = 0;
    for (let i = 0; i < min; i++) {
      const diff = Math.abs(current[i] - stored[i]);
      similarity += 1 - Math.min(diff, 1);
    }
    return similarity / min;
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

  async updateSessionData(): Promise<void> {
    if (!this.behaviorProfile) return;
    const sessionDuration = Date.now() - this.sessionStartTime;
    this.behaviorProfile.navigationPatterns.sessionDuration =
      this.behaviorProfile.navigationPatterns.sessionDuration * 0.8 + sessionDuration * 0.2;

    this.behaviorProfile.lastUpdated = new Date();

    // ✅ Save only if risk score has changed significantly
    if (Math.abs(this.behaviorProfile.riskScore - this.lastRiskScore) > 0.1) {
      this.behaviorProfile.riskScore = this.lastRiskScore;
      await this.saveBehaviorProfile();
    }
  }

  private async saveBehaviorProfile(): Promise<void> {
    if (!this.behaviorProfile) return;
    try {
      await this.databaseService.saveBehaviorProfile(this.behaviorProfile.userId, this.behaviorProfile);
    } catch (error) {
      console.error('❌ Failed to save behavior profile:', error);
    }
  }

  getBehaviorProfile(): BehaviorProfile | null {
    return this.behaviorProfile;
  }

  async reset(): Promise<void> {
    this.keystrokeData = [];
    this.gestureData = [];
    this.navigationHistory = [];
    this.sensorData = [];
    this.sessionStartTime = Date.now();
    if (this.behaviorProfile) {
      this.behaviorProfile.riskScore = 0;
      await this.saveBehaviorProfile(); // ✅ optional
    }
  }
}
