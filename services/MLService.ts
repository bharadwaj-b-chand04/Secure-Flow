import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native'; // for React Native support
import { Platform } from 'react-native';
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
      console.log('🤖 Initializing TensorFlow.js...');
      await tf.ready();
      await tf.setBackend('rn-webgl');
      await this.loadOrCreateModels();
      this.isInitialized = true;
      console.log('✅ ML Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize ML Service:', error);
      throw error;
    }
  }

  private async loadOrCreateModels(): Promise<void> {
    try {
      await this.loadExistingModels();
    } catch {
      console.log('📦 Creating new ML models...');
      await this.createNewModels();
    }
  }

  private async loadExistingModels(): Promise<void> {
    throw new Error('No existing models found');
  }

  private async createNewModels(): Promise<void> {
    this.behaviorModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [15], units: 64, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }) }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 32, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }) }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    this.behaviorModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'] // Only supported metric
    });

    this.anomalyModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [20], units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 20, activation: 'linear' })
      ]
    });

    this.anomalyModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    console.log('✅ ML models created successfully');
  }

  async predictRisk(behaviorProfile: BehaviorProfile, sensorData: SensorData[]): Promise<MLPrediction> {
    if (!this.isInitialized || !this.behaviorModel) throw new Error('ML Service not initialized');

    try {
      const features = this.extractFeatures(behaviorProfile, sensorData);
      const inputTensor = tf.tensor2d([features], [1, features.length]);
      const prediction = this.behaviorModel.predict(inputTensor) as tf.Tensor;
      const riskScore = await prediction.data();

      const anomalyFeatures = this.extractAnomalyFeatures(behaviorProfile, sensorData);
      const anomalyInput = tf.tensor2d([anomalyFeatures], [1, anomalyFeatures.length]);
      const reconstructed = this.anomalyModel!.predict(anomalyInput) as tf.Tensor;

      const reconstructionError = tf.losses.meanSquaredError(anomalyInput, reconstructed);
      const errorValue = await reconstructionError.data();

      inputTensor.dispose();
      prediction.dispose();
      anomalyInput.dispose();
      reconstructed.dispose();
      reconstructionError.dispose();

      const finalRiskScore = riskScore[0];
      const anomalyDetected = errorValue[0] > 0.1;

      return {
        riskScore: finalRiskScore,
        confidence: this.calculateConfidence(finalRiskScore, errorValue[0]),
        anomalyDetected,
        patterns: this.identifyPatterns(features),
        recommendations: this.generateRecommendations(finalRiskScore, anomalyDetected)
      };
    } catch (error) {
      console.error('❌ ML prediction failed:', error);
      return this.fallbackPrediction(behaviorProfile);
    }
  }

  private extractFeatures(bp: BehaviorProfile, sd: SensorData[]): number[] {
    return [
      bp.keystrokeDynamics.avgTypingSpeed || 0,
      bp.keystrokeDynamics.avgPause || 0,
      bp.keystrokeDynamics.pressureMagnitude || 0,
      bp.keystrokeDynamics.rhythmPattern.length || 0,
      this.calculateKeystrokeVariance(bp.keystrokeDynamics.rhythmPattern),
      bp.gestureDynamics.swipeVelocity || 0,
      bp.gestureDynamics.tapDuration || 0,
      bp.gestureDynamics.touchPressure || 0,
      bp.navigationPatterns.sessionDuration || 0,
      bp.navigationPatterns.commonPaths.length || 0,
      this.calculateTimeOfDayVariance(bp.navigationPatterns.timeOfDayUsage),
      bp.handTremor.confidence || 0,
      this.calculateTremorIntensity(bp.handTremor.signature),
      sd.length ? this.calculateSensorStability(sd) : 0,
      sd.length ? this.calculateMovementPattern(sd) : 0
    ];
  }

  private extractAnomalyFeatures(bp: BehaviorProfile, sd: SensorData[]): number[] {
    const base = this.extractFeatures(bp, sd);
    const contextual = [
      new Date().getHours() / 24,
      bp.riskScore || 0,
      sd.length / 100,
      this.calculateSessionAge(bp.lastUpdated),
      Math.random() * 0.1
    ];
    return [...base, ...contextual];
  }

  private calculateKeystrokeVariance(rhythm: number[]): number {
    if (rhythm.length < 2) return 0;
    const mean = rhythm.reduce((a, b) => a + b, 0) / rhythm.length;
    return Math.sqrt(rhythm.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / rhythm.length);
  }

  private calculateTimeOfDayVariance(usage: number[]): number {
    const total = usage.reduce((a, b) => a + b, 0);
    if (!total) return 0;
    const norm = usage.map(x => x / total);
    const mean = 1 / 24;
    return norm.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / 24;
  }

  private calculateTremorIntensity(sig: number[]): number {
    return sig.length ? sig.reduce((a, b) => a + Math.abs(b), 0) / sig.length : 0;
  }

  private calculateSensorStability(sd: SensorData[]): number {
    let variance = 0;
    for (let i = 1; i < sd.length; i++) {
      const prev = sd[i - 1].accelerometer;
      const curr = sd[i].accelerometer;
      const diff = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2 + (curr.z - prev.z) ** 2);
      variance += diff;
    }
    return variance / (sd.length - 1);
  }

  private calculateMovementPattern(sd: SensorData[]): number {
    const mags = sd.map(d => Math.sqrt(d.accelerometer.x ** 2 + d.accelerometer.y ** 2 + d.accelerometer.z ** 2));
    return mags.reduce((a, b) => a + b, 0) / mags.length;
  }

  private calculateSessionAge(last: Date): number {
    const ms = Date.now() - last.getTime();
    return Math.min(ms / (1000 * 60 * 60), 24) / 24;
  }

  private calculateConfidence(risk: number, error: number): number {
    const scoreConf = 1 - Math.abs(risk - 0.5) * 2;
    const reconf = Math.max(0, 1 - error * 10);
    return (scoreConf + reconf) / 2;
  }

  private identifyPatterns(features: number[]): string[] {
    const patterns: string[] = [];
    if (features[0] > 5) patterns.push('Fast typing detected');
    if (features[0] < 1) patterns.push('Slow typing detected');
    if (features[6] > 200) patterns.push('Long tap duration');
    if (features[8] > 3600000) patterns.push('Extended session');
    if (features[10] > 0.8) patterns.push('High tremor confidence');
    if (features[13] > 2) patterns.push('High movement activity');
    return patterns;
  }

  private generateRecommendations(risk: number, anomaly: boolean): string[] {
    const recs: string[] = [];
    if (risk > 0.7) recs.push('Require additional authentication', 'Monitor session closely');
    if (risk > 0.9) recs.push('Consider blocking high-risk actions', 'Alert security team');
    if (anomaly) recs.push('Unusual behavior pattern detected', 'Verify user identity');
    if (risk < 0.3) recs.push('Normal behavior - allow standard access');
    return recs;
  }

  private fallbackPrediction(bp: BehaviorProfile): MLPrediction {
    const score = bp.riskScore || 0.5;
    return {
      riskScore: score,
      confidence: 0.6,
      anomalyDetected: score > 0.8,
      patterns: ['Fallback analysis'],
      recommendations: score > 0.7 ? ['Use caution'] : ['Normal access']
    };
  }

  async trainModel(trainingData: any[]): Promise<ModelMetrics> {
    if (!this.isInitialized || !this.behaviorModel) throw new Error('ML Service not initialized');

    try {
      const { features, labels } = this.prepareTrainingData(trainingData);
      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels, [labels.length, 1]);

      const history = await this.behaviorModel.fit(xs, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss?.toFixed(4)}, accuracy = ${logs?.acc?.toFixed(4)}`);
          }
        }
      });

      const metrics = this.calculateModelMetrics(history);
      xs.dispose();
      ys.dispose();
      console.log('✅ Model training completed');
      return metrics;
    } catch (error) {
      console.error('❌ Model training failed:', error);
      throw error;
    }
  }

  private prepareTrainingData(data: any[]): { features: number[][], labels: number[] } {
    const features: number[][] = [];
    const labels: number[] = [];

    data.forEach(sample => {
      if (sample.behaviorProfile && sample.label !== undefined) {
        const vector = this.extractFeatures(sample.behaviorProfile, sample.sensorData || []);
        features.push(vector);
        labels.push(sample.label);
      }
    });

    return { features, labels };
  }

  private calculateModelMetrics(history: tf.History): ModelMetrics {
    const last = history.history.loss.length - 1;
    const precision = 0;
    const recall = 0;

    return {
      accuracy: Number(history.history.acc?.[last]) || 0,
      precision,
      recall,
      f1Score: this.calculateF1Score(precision, recall),
      lastTraining: new Date(),
      sampleCount: this.trainingData.length
    };
  }

  private calculateF1Score(precision: number, recall: number): number {
    return precision + recall === 0 ? 0 : 2 * (precision * recall) / (precision + recall);
  }

  async saveModel(): Promise<void> {
    if (!this.behaviorModel || !this.anomalyModel) return;
    try {
      console.log('💾 Model saving would happen here');
    } catch (error) {
      console.error('❌ Failed to save model:', error);
    }
  }

  getModelInfo(): { version: string; initialized: boolean; modelCount: number } {
    return {
      version: this.modelVersion,
      initialized: this.isInitialized,
      modelCount: (this.behaviorModel ? 1 : 0) + (this.anomalyModel ? 1 : 0)
    };
  }

  dispose(): void {
    this.behaviorModel?.dispose();
    this.anomalyModel?.dispose();
    this.behaviorModel = null;
    this.anomalyModel = null;
    this.isInitialized = false;
    console.log('🧹 ML Service disposed');
  }
}
