import { Platform } from 'react-native';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PerformanceMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  batteryLevel: number;
  batteryState: string;
  cpuUsage: number;
  networkLatency: number;
  frameRate: number;
  appStartTime: number;
  lastOptimization: Date;
}

export interface OptimizationSettings {
  enableBatteryOptimization: boolean;
  enableMemoryOptimization: boolean;
  enableNetworkOptimization: boolean;
  maxSensorFrequency: number;
  maxDatabaseWrites: number;
  enableBackgroundProcessing: boolean;
}

export class PerformanceService {
  private static instance: PerformanceService;
  private metrics: PerformanceMetrics | null = null;
  private settings: OptimizationSettings | null = null;
  private monitoringInterval: number | null = null; // ✅ Fixed type here
  private frameRateMonitor: any = null;
  private appStartTime = Date.now();
  private memoryWarningThreshold = 0.85;
  private batteryWarningThreshold = 0.20;

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  async initialize(): Promise<void> {
    try {
      console.log('⚡ Initializing Performance Service...');
      this.settings = await this.loadOptimizationSettings();
      await this.startMonitoring();
      await this.applyOptimizations();
      console.log('✅ Performance Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Performance Service:', error);
      throw error;
    }
  }

  private async startMonitoring(): Promise<void> {
    this.monitoringInterval = setInterval(async () => {
      await this.updateMetrics();
      await this.checkPerformanceThresholds();
    }, 10000) as unknown as number;

    await this.updateMetrics();
  }

  private async updateMetrics(): Promise<void> {
    try {
      const [batteryLevel, batteryState, memoryInfo, networkLatency] = await Promise.all([
        this.getBatteryLevel(),
        this.getBatteryState(),
        this.getMemoryInfo(),
        this.measureNetworkLatency()
      ]);

      this.metrics = {
        memoryUsage: memoryInfo,
        batteryLevel,
        batteryState,
        cpuUsage: await this.estimateCPUUsage(),
        networkLatency,
        frameRate: this.getCurrentFrameRate(),
        appStartTime: this.appStartTime,
        lastOptimization: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to update performance metrics:', error);
    }
  }

  private async getBatteryLevel(): Promise<number> {
    try {
      if (Platform.OS === 'web') return 0.8;
      return await Battery.getBatteryLevelAsync();
    } catch {
      return 1.0;
    }
  }

  private async getBatteryState(): Promise<string> {
    try {
      if (Platform.OS === 'web') return 'unknown';
      const state = await Battery.getBatteryStateAsync();
      return this.mapBatteryState(state);
    } catch {
      return 'unknown';
    }
  }

  private mapBatteryState(state: Battery.BatteryState): string {
    switch (state) {
      case Battery.BatteryState.CHARGING: return 'charging';
      case Battery.BatteryState.FULL: return 'full';
      case Battery.BatteryState.UNPLUGGED: return 'unplugged';
      default: return 'unknown';
    }
  }

  private async getMemoryInfo(): Promise<PerformanceMetrics['memoryUsage']> {
    try {
      if (Platform.OS === 'web') {
        const performance = (global as any).performance;
        if (performance && performance.memory) {
          const used = performance.memory.usedJSHeapSize;
          const total = performance.memory.totalJSHeapSize;
          return { used, total, percentage: used / total };
        }
      }
      const deviceMemory = await this.getDeviceMemory();
      const estimatedUsed = deviceMemory * 0.3;
      return { used: estimatedUsed, total: deviceMemory, percentage: estimatedUsed / deviceMemory };
    } catch {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  private async getDeviceMemory(): Promise<number> {
    try {
      const deviceInfo = await Device.getDeviceTypeAsync();
      switch (deviceInfo) {
        case Device.DeviceType.PHONE: return 4 * 1024 * 1024 * 1024;
        case Device.DeviceType.TABLET: return 6 * 1024 * 1024 * 1024;
        case Device.DeviceType.DESKTOP: return 8 * 1024 * 1024 * 1024;
        default: return 4 * 1024 * 1024 * 1024;
      }
    } catch {
      return 4 * 1024 * 1024 * 1024;
    }
  }

  private async measureNetworkLatency(): Promise<number> {
    try {
      const start = Date.now();
      await fetch('https://httpbin.org/get', { method: 'HEAD', cache: 'no-cache' });
      return Date.now() - start;
    } catch {
      return 0;
    }
  }

  private async estimateCPUUsage(): Promise<number> {
    const start = Date.now();
    let iterations = 0;
    while (Date.now() - start < 10) {
      iterations++;
      Math.random() * Math.random();
    }
    const expectedIterations = 100000;
    const usage = Math.min(iterations / expectedIterations, 1.0);
    return 1.0 - usage;
  }

  private getCurrentFrameRate(): number {
    return 60;
  }

  private async checkPerformanceThresholds(): Promise<void> {
    if (!this.metrics || !this.settings) return;
    const warnings: string[] = [];

    if (this.metrics.memoryUsage.percentage > this.memoryWarningThreshold) {
      warnings.push(`High memory usage: ${Math.round(this.metrics.memoryUsage.percentage * 100)}%`);
      await this.optimizeMemoryUsage();
    }

    if (this.metrics.batteryLevel < this.batteryWarningThreshold) {
      warnings.push(`Low battery: ${Math.round(this.metrics.batteryLevel * 100)}%`);
      await this.optimizeBatteryUsage();
    }

    if (this.metrics.networkLatency > 2000) {
      warnings.push(`High network latency: ${this.metrics.networkLatency}ms`);
      await this.optimizeNetworkUsage();
    }

    if (warnings.length > 0) {
      console.log('⚠️ Performance warnings:', warnings);
    }
  }

  private async optimizeMemoryUsage(): Promise<void> {
    if (!this.settings?.enableMemoryOptimization) return;
    try {
      console.log('🧹 Optimizing memory...');
      await this.clearOldCacheData();
      await this.reduceSensorDataRetention();
      if (global.gc) global.gc();
    } catch (error) {
      console.error('❌ Memory optimization failed:', error);
    }
  }

  private async optimizeBatteryUsage(): Promise<void> {
    if (!this.settings?.enableBatteryOptimization) return;
    try {
      console.log('🔋 Optimizing battery...');
      this.settings.maxSensorFrequency = Math.max(200, this.settings.maxSensorFrequency * 1.5);
      this.settings.maxDatabaseWrites = Math.max(10, this.settings.maxDatabaseWrites * 0.7);
      this.settings.enableBackgroundProcessing = false;
      await this.saveOptimizationSettings();
    } catch (error) {
      console.error('❌ Battery optimization failed:', error);
    }
  }

  private async optimizeNetworkUsage(): Promise<void> {
    if (!this.settings?.enableNetworkOptimization) return;
    try {
      console.log('🌐 Optimizing network...');
    } catch (error) {
      console.error('❌ Network optimization failed:', error);
    }
  }

  private async clearOldCacheData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const oldKeys = keys.filter(key => key.startsWith('cache_') && this.isCacheExpired(key));
      if (oldKeys.length > 0) {
        await AsyncStorage.multiRemove(oldKeys);
        console.log(`🗑️ Cleared ${oldKeys.length} old cache entries`);
      }
    } catch (error) {
      console.error('❌ Failed to clear cache data:', error);
    }
  }

  private isCacheExpired(key: string): boolean {
    const match = key.match(/cache_(\d+)_/);
    if (match) {
      const timestamp = parseInt(match[1]);
      const ageMs = Date.now() - timestamp;
      return ageMs > 24 * 60 * 60 * 1000;
    }
    return false;
  }

  private async reduceSensorDataRetention(): Promise<void> {
    console.log('🧹 Reducing sensor data retention...');
  }

  private async applyOptimizations(): Promise<void> {
    if (!this.settings) return;
    try {
      console.log('⚙️ Applying performance optimizations...');
    } catch (error) {
      console.error('❌ Failed to apply optimizations:', error);
    }
  }

  async updateOptimizationSettings(newSettings: Partial<OptimizationSettings>): Promise<void> {
    try {
      this.settings = {
        ...this.getDefaultSettings(),
        ...this.settings,
        ...newSettings
      };
      await this.saveOptimizationSettings();
      await this.applyOptimizations();
    } catch (error) {
      console.error('❌ Failed to update optimization settings:', error);
      throw error;
    }
  }

  private async loadOptimizationSettings(): Promise<OptimizationSettings> {
    try {
      const stored = await AsyncStorage.getItem('performance_settings');
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('❌ Failed to load optimization settings:', error);
    }
    return this.getDefaultSettings();
  }

  private async saveOptimizationSettings(): Promise<void> {
    if (!this.settings) return;
    try {
      await AsyncStorage.setItem('performance_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('❌ Failed to save optimization settings:', error);
    }
  }

  private getDefaultSettings(): OptimizationSettings {
    return {
      enableBatteryOptimization: true,
      enableMemoryOptimization: true,
      enableNetworkOptimization: true,
      maxSensorFrequency: 100,
      maxDatabaseWrites: 50,
      enableBackgroundProcessing: true
    };
  }

  getMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  getSettings(): OptimizationSettings | null {
    return this.settings;
  }

  async generatePerformanceReport(): Promise<{
    summary: string;
    recommendations: string[];
    metrics: PerformanceMetrics;
    optimizationOpportunities: string[];
  }> {
    if (!this.metrics) {
      throw new Error('Performance metrics not available');
    }

    const recommendations: string[] = [];
    const optimizationOpportunities: string[] = [];

    if (this.metrics.memoryUsage.percentage > 0.7) {
      recommendations.push('Clear cache to free memory');
      optimizationOpportunities.push('Enable aggressive memory optimization');
    }

    if (this.metrics.batteryLevel < 0.3) {
      recommendations.push('Enable battery optimization mode');
      optimizationOpportunities.push('Reduce sensor frequency');
    }

    if (this.metrics.networkLatency > 1000) {
      recommendations.push('Check network quality');
      optimizationOpportunities.push('Enable network request batching');
    }

    return {
      summary: this.generatePerformanceSummary(),
      recommendations,
      metrics: this.metrics,
      optimizationOpportunities
    };
  }

  private generatePerformanceSummary(): string {
    if (!this.metrics) return 'Performance data unavailable';

    const memoryStatus = this.metrics.memoryUsage.percentage < 0.7 ? 'Good' :
                         this.metrics.memoryUsage.percentage < 0.85 ? 'Fair' : 'Poor';

    const batteryStatus = this.metrics.batteryLevel > 0.5 ? 'Good' :
                          this.metrics.batteryLevel > 0.2 ? 'Fair' : 'Poor';

    const networkStatus = this.metrics.networkLatency < 500 ? 'Good' :
                          this.metrics.networkLatency < 1000 ? 'Fair' : 'Poor';

    return `Memory: ${memoryStatus}, Battery: ${batteryStatus}, Network: ${networkStatus}`;
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.frameRateMonitor) {
      this.frameRateMonitor.stop();
      this.frameRateMonitor = null;
    }

    console.log('🛑 Performance monitoring stopped');
  }

  dispose(): void {
    this.stopMonitoring();
    this.metrics = null;
    this.settings = null;
    console.log('🧹 Performance Service disposed');
  }
}
