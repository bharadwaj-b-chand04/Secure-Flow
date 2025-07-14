import { BehaviorTracker } from './BehaviorTracker';
import { SecurityEvent } from '@/types';

export class SecurityService {
  private static instance: SecurityService;
  private behaviorTracker: BehaviorTracker;
  private securityEvents: SecurityEvent[] = [];
  private panicGestureCount = 0;
  private panicGestureTimeout: number | null = null; // ✅ Changed from NodeJS.Timeout to number

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  constructor() {
    this.behaviorTracker = BehaviorTracker.getInstance();
  }

  async authenticateAction(action: string, context: any): Promise<{
    allowed: boolean;
    challengeRequired: boolean;
    riskScore: number;
    response: 'allow' | 'challenge' | 'block';
  }> {
    const riskScore = this.behaviorTracker.calculateRiskScore();
    const riskLevel = this.behaviorTracker.getRiskLevel();

    let response: 'allow' | 'challenge' | 'block' = 'allow';
    let challengeRequired = false;

    if (action === 'transfer' && context.amount > 1000) {
      if (riskLevel === 'high') {
        response = 'block';
      } else if (riskLevel === 'medium') {
        response = 'challenge';
        challengeRequired = true;
      }
    } else if (action === 'transfer' && riskLevel === 'high') {
      response = 'challenge';
      challengeRequired = true;
    } else if (riskLevel === 'high' && (action === 'login' || action === 'settings')) {
      response = 'challenge';
      challengeRequired = true;
    }

    this.logSecurityEvent({
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

  private triggerPanicMode(): void {
    console.log('PANIC MODE TRIGGERED - Security alert sent');
    this.panicGestureCount = 0;

    this.logSecurityEvent({
      id: Date.now().toString(),
      userId: 'current-user',
      type: 'gesture',
      riskScore: 1.0,
      action: 'block',
      timestamp: new Date(),
      details: { event: 'panic_gesture_triggered' },
    });

    // Add any extra cleanup or silent alert behavior here
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

  private logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);

    if (this.securityEvents.length > 100) {
      this.securityEvents.shift();
    }
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
    const riskLevel = this.behaviorTracker.getRiskLevel();

    const factors: string[] = [];
    const recommendations: string[] = [];

    if (riskScore > 0.3) {
      factors.push('Unusual typing pattern detected');
      recommendations.push('Monitor keystroke dynamics');
    }

    if (riskScore > 0.5) {
      factors.push('Abnormal navigation behavior');
      recommendations.push('Verify user identity');
    }

    if (riskScore > 0.7) {
      factors.push('High-risk session detected');
      recommendations.push('Require additional authentication');
    }

    return {
      currentRisk: riskScore,
      riskLevel,
      factors,
      recommendations,
    };
  }
}
