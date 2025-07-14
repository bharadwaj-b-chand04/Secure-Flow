// types.ts

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  accountNumber: string;
  balance: number;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  recipient?: string;
  description: string;
  timestamp: Date;
  category?: string;
}

export interface BehaviorProfile {
  userId: string;

  keystrokeDynamics: {
    avgTypingSpeed: number;         // characters per second
    avgPause: number;               // ms between keys
    pressureMagnitude: number;      // normalized pressure (0–1)
    rhythmPattern: number[];        // timing patterns (e.g., [80, 120, 100])
  };

  gestureDynamics: {
    swipeVelocity: number;          // px/s
    tapDuration: number;            // ms
    touchPressure: number;          // normalized pressure
  };

  navigationPatterns: {
    commonPaths: string[];          // screen routes
    sessionDuration: number;        // seconds
    timeOfDayUsage: number[];       // 24-length hourly histogram
  };

  locationPatterns: {
    commonLocations: string[];      // GPS or labeled zones
    travelSpeed: number;            // m/s
  };

  handTremor: {
    signature: number[];            // frequency-domain signal
    confidence: number;             // 0–1
  };

  transactionHabits: {
    avgAmount: number;
    commonRecipients: string[];
    preferredTimes: number[];       // hourly histogram
  };

  riskScore: number;                // 0.0 – 1.0
  lastUpdated: Date;
}

export interface SecurityEvent {
  id: string;
  userId: string;
  type: 'login' | 'transaction' | 'navigation' | 'gesture' | 'location';
  riskScore: number;                // 0.0 – 1.0
  action: 'allow' | 'challenge' | 'block';
  timestamp: Date;
  details: Record<string, any>;     // dynamic payload
}

export interface SensorData {
  gyroscope: { x: number; y: number; z: number };
  accelerometer: { x: number; y: number; z: number };
  timestamp: number;
}
