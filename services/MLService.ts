import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { BehaviorProfile, SensorData } from '@/types';
import { DatabaseService } from './DatabaseService';

export interface MLPrediction {
  riskScore: number;
  confidence: number;
  anomalyDetected: boolean;
  patterns: string[];
  recommendations: string[];
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastTraining: Date;
  sampleCount: number;
}

export class MLService {
  private static instance: MLService;
  private behaviorModel: tf.LayersModel | null = null;
  private anomalyModel: tf.LayersModel | null = null;
  private isInitialized = false;
  private databaseService: DatabaseService;
  private modelVersion = '1.0.0';
  private trainingData: any[] = [];

  static getInstance(): MLService {
    if (!MLService.instance) {
      MLService.instance = new MLService();
    }
    return MLService.instance;
  }

  constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await tf.ready();
      await tf.setBackend('rn-webgl');
      await this.loadOrCreateModels();
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ MLService init error:', error);
    }
  }
  async predictRisk(behaviorProfile: BehaviorProfile, sensorData: SensorData[]): Promise<{
  riskScore: number;
  confidence: number;
  anomalyDetected: boolean;
  patterns: string[];
  recommendations: string[];
}> {
  // Simulated dummy logic for hackathon/demo
  const riskScore = Math.random(); // Replace with real model logic later
  const confidence = 1 - Math.abs(riskScore - 0.5);
  const anomalyDetected = riskScore > 0.7;

  const patterns = anomalyDetected
    ? ['Swipe irregularity', 'Location mismatch']
    : ['Normal usage pattern'];

  const recommendations = anomalyDetected
    ? ['Trigger challenge', 'Log high-risk event']
    : ['Allow'];

  return {
    riskScore,
    confidence,
    anomalyDetected,
    patterns,
    recommendations,
  };
}


  private async loadOrCreateModels(): Promise<void> {
    try {
      await this.loadExistingModels();
    } catch {
      await this.createNewModels();
    }
  }

  private async loadExistingModels(): Promise<void> {
    throw new Error('No existing models found');
  }

  private async createNewModels(): Promise<void> {
    this.behaviorModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [15], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });

    this.behaviorModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    this.anomalyModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [20], units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 20, activation: 'linear' }),
      ],
    });

    this.anomalyModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });
  }

 
  private extractFeatures(bp: BehaviorProfile, sd: SensorData[]): number[] {
    return [
      bp.keystrokeDynamics.avgTypingSpeed || 0,
      bp.keystrokeDynamics.avgPause || 0,
      bp.keystrokeDynamics.pressureMagnitude || 0,
      bp.keystrokeDynamics.rhythmPattern.length,
      this.variance(bp.keystrokeDynamics.rhythmPattern),
      bp.gestureDynamics.swipeVelocity || 0,
      bp.gestureDynamics.tapDuration || 0,
      bp.gestureDynamics.touchPressure || 0,
      bp.navigationPatterns.sessionDuration || 0,
      bp.navigationPatterns.commonPaths.length || 0,
      this.variance(bp.navigationPatterns.timeOfDayUsage),
      bp.handTremor.confidence || 0,
      this.avgMagnitude(bp.handTremor.signature),
      this.sensorStability(sd),
      this.movementMagnitude(sd),
    ];
  }

  private extractAnomalyFeatures(bp: BehaviorProfile, sd: SensorData[]): number[] {
    return [
      ...this.extractFeatures(bp, sd),
      new Date().getHours() / 24,
      bp.riskScore || 0,
      sd.length / 100,
      this.sessionAge(bp.lastUpdated),
      Math.random() * 0.1,
    ];
  }

  private variance(arr: number[]): number {
    if (!arr.length) return 0;
    const mean = arr.reduce((a, b) => a + b) / arr.length;
    return arr.reduce((sum, x) => sum + (x - mean) ** 2, 0) / arr.length;
  }

  private avgMagnitude(arr: number[]): number {
    return arr.length ? arr.reduce((a, b) => a + Math.abs(b), 0) / arr.length : 0;
  }

  private sensorStability(sd: SensorData[]): number {
    let total = 0;
    for (let i = 1; i < sd.length; i++) {
      const dx = sd[i].accelerometer.x - sd[i - 1].accelerometer.x;
      const dy = sd[i].accelerometer.y - sd[i - 1].accelerometer.y;
      const dz = sd[i].accelerometer.z - sd[i - 1].accelerometer.z;
      total += Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
    }
    return sd.length > 1 ? total / (sd.length - 1) : 0;
  }

  private movementMagnitude(sd: SensorData[]): number {
    return sd.length
      ? sd.map(d => Math.sqrt(d.accelerometer.x ** 2 + d.accelerometer.y ** 2 + d.accelerometer.z ** 2)).reduce((a, b) => a + b) / sd.length
      : 0;
  }

  private sessionAge(last: Date): number {
    return Math.min((Date.now() - last.getTime()) / 1000 / 3600, 24) / 24;
  }

  private calculateConfidence(risk: number, error: number): number {
    const riskConf = 1 - Math.abs(risk - 0.5) * 2;
    const errorConf = Math.max(0, 1 - error * 10);
    return (riskConf + errorConf) / 2;
  }

  private identifyPatterns(f: number[]): string[] {
    const patterns = [];
    if (f[0] > 5) patterns.push('Fast typing');
    if (f[0] < 1) patterns.push('Slow typing');
    if (f[6] > 200) patterns.push('Long tap');
    if (f[8] > 3600000) patterns.push('Long session');
    if (f[12] > 1.5) patterns.push('High tremor');
    return patterns;
  }

  private generateRecommendations(risk: number, anomaly: boolean): string[] {
    const recs: string[] = [];
    if (risk > 0.7) recs.push('Challenge user');
    if (risk > 0.9) recs.push('Block actions');
    if (anomaly) recs.push('Anomaly detected - verify identity');
    if (risk < 0.3) recs.push('Low risk - allow');
    return recs;
  }

  private fallbackPrediction(bp: BehaviorProfile): MLPrediction {
    const score = bp.riskScore || 0.5;
    return {
      riskScore: score,
      confidence: 0.5,
      anomalyDetected: score > 0.8,
      patterns: ['Fallback'],
      recommendations: score > 0.7 ? ['Challenge'] : ['Allow'],
    };
  }

  async trainModel(trainingData: any[]): Promise<ModelMetrics> {
    if (!this.behaviorModel) throw new Error('No model loaded');

    const { features, labels } = this.prepareTrainingData(trainingData);
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    const history = await this.behaviorModel.fit(xs, ys, {
      epochs: 20,
      batchSize: 16,
      validationSplit: 0.2,
    });

    const accArray = history.history.acc as number[] | undefined;
    const accuracy = accArray && accArray.length > 0 ? accArray[accArray.length - 1] : 0;

    xs.dispose();
    ys.dispose();

    return {
      accuracy,
      precision: 0,
      recall: 0,
      f1Score: 0,
      lastTraining: new Date(),
      sampleCount: features.length,
    };
  }

  private prepareTrainingData(data: any[]): { features: number[][]; labels: number[] } {
    const features: number[][] = [];
    const labels: number[] = [];

    for (const item of data) {
      if (item.behaviorProfile && item.label !== undefined) {
        const f = this.extractFeatures(item.behaviorProfile, item.sensorData || []);
        features.push(f);
        labels.push(item.label);
      }
    }

    return { features, labels };
  }

  dispose(): void {
    this.behaviorModel?.dispose();
    this.anomalyModel?.dispose();
    this.behaviorModel = null;
    this.anomalyModel = null;
    this.isInitialized = false;
  }
}
