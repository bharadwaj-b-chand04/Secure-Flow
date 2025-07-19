import { BehaviorTracker } from './BehaviorTracker';
import { SecurityEvent } from '@/types';
import { MLService } from './MLService';
import { categorizeRisk } from '@/utils/riskUtils';
import { DatabaseService } from './DatabaseService';

export class SecurityService {
  private static instance: SecurityService;
  private behaviorTracker: BehaviorTracker;
  private securityEvents: SecurityEvent[] = [];
  private panicGestureCount = 0;
  private panicGestureTimeout: number | null = null;
  private databaseService: DatabaseService;

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  constructor() {
    this.behaviorTracker = BehaviorTracker.getInstance();
    this.databaseService = DatabaseService.getInstance();
  }

  async authenticateAction(action: string, context: any): Promise<{
    allowed: boolean;
    challengeRequired: boolean;
    riskScore: number;
    response: 'allow' | 'challenge' | 'block';
  }> {
    const mlService = MLService.getInstance();
    await mlService.initialize();

    const behaviorProfile = this.behaviorTracker.getBehaviorProfile();
    const sensorData = this.behaviorTracker['sensorData'] || [];

    const mlPrediction = await mlService.predictRisk(behaviorProfile!, sensorData);
    const riskScore = mlPrediction.riskScore;
    const riskLevel = categorizeRisk(riskScore);

    let response: 'allow' | 'challenge' | 'block' = 'allow';
    let challengeRequired = false;

    if (action === 'transfer' && context.amount > 1000) {
      if (riskLevel === 'high') {
        response = 'block';
      } else if (riskLevel === 'medium') {
        response = 'challenge';
        challengeRequired = true;
      }
    } else if (riskLevel === 'high') {
      response = 'challenge';
      challengeRequired = true;
    }

    await this.logSecurityEvent({
      id: Date.now().toString(),
      userId: context.userId || 'unknown',
      type: action as any,
      riskScore,
      action: response,
      timestamp: new Date(),
      details: context,
    });

    return {
      allowed: response === 'allow',
      challengeRequired,
      riskScore,
      response,
    };
  }

  async verifyPin(pin: string): Promise<boolean> {
    const correctPin = '123456'; // Replace this with secure retrieval logic later
    const isValid = pin === correctPin;

    await this.logSecurityEvent({
      id: Date.now().toString(),
      userId: 'current-user',
      type: 'login',
      riskScore: isValid ? 0.1 : 0.9,
      action: isValid ? 'allow' : 'block',
      timestamp: new Date(),
      details: { pinEntered: pin }
    });

    return isValid;
  }

  handlePanicGesture(): void {
    this.panicGestureCount++;

    if (this.panicGestureTimeout) {
      clearTimeout(this.panicGestureTimeout);
    }

    this.panicGestureTimeout = setTimeout(() => {
      this.panicGestureCount = 0;
    }, 2000) as unknown as number;

    if (this.panicGestureCount >= 3) {
      this.triggerPanicMode();
    }
  }

  private async triggerPanicMode(): Promise<void> {
    console.log('🚨 PANIC MODE TRIGGERED');
    this.panicGestureCount = 0;

    await this.logSecurityEvent({
      id: Date.now().toString(),
      userId: 'current-user',
      type: 'gesture',
      riskScore: 1.0,
      action: 'block',
      timestamp: new Date(),
      details: { event: 'panic_gesture_triggered' },
    });
  }

  generateDecoyChallenge(): {
    isDecoy: boolean;
    challenge: string;
    expectedBehavior: string;
  } {
    const riskScore = this.behaviorTracker.calculateRiskScore();

    if (riskScore > 0.7) {
      return {
        isDecoy: true,
        challenge: 'Enter your PIN to continue',
        expectedBehavior: 'normal_pin_entry',
      };
    }

    return {
      isDecoy: false,
      challenge: 'Enter your PIN to continue',
      expectedBehavior: 'normal_pin_entry',
    };
  }

  validateDecoyResponse(response: string, expectedBehavior: string): boolean {
    const riskScore = this.behaviorTracker.calculateRiskScore();

    if (riskScore > 0.8) {
      return Math.random() < 0.3;
    }

    return Math.random() < 0.9;
  }

  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    this.securityEvents.push(event);
    if (this.securityEvents.length > 100) {
      this.securityEvents.shift();
    }

    await this.databaseService.logSecurityEvent(
      event.userId,
      event.type,
      event.riskScore,
      event.action,
      event.details
    );
  }

  getSecurityEvents(): SecurityEvent[] {
    return this.securityEvents;
  }

  getRiskAnalysis(): {
    currentRisk: number;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  } {
    const riskScore = this.behaviorTracker.calculateRiskScore();
    const riskLevel = categorizeRisk(riskScore);

    const factors: string[] = [];
    const recommendations: string[] = [];

    if (riskScore > 0.3) {
      factors.push('Unusual typing pattern');
      recommendations.push('Monitor keystrokes');
    }

    if (riskScore > 0.5) {
      factors.push('Abnormal navigation');
      recommendations.push('Verify identity');
    }

    if (riskScore > 0.7) {
      factors.push('High-risk session');
      recommendations.push('Trigger challenge');
    }

    return {
      currentRisk: riskScore,
      riskLevel,
      factors,
      recommendations,
    };
  }
}
