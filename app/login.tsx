import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PinInput } from '@/components/PinInput';
import { BiometricPrompt } from '@/components/BiometricPrompt';
import { SecurityIndicator } from '@/components/SecurityIndicator';
import { BehaviorTracker } from '@/services/BehaviorTracker';
import { SecurityService } from '@/services/SecurityService';
import { SensorService } from '@/services/SensorService';

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'pin' | 'biometric'>('pin');
  const [showBiometric, setShowBiometric] = useState(false);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [riskScore, setRiskScore] = useState(0);
  const [isDecoyMode, setIsDecoyMode] = useState(false);
  
  const behaviorTracker = BehaviorTracker.getInstance();
  const securityService = SecurityService.getInstance();
  const sensorService = SensorService.getInstance();

  useEffect(() => {
    // Initialize behavior tracking
    behaviorTracker.initializeProfile('demo-user');
    
    // Start sensor monitoring
    sensorService.startMonitoring();
    
    // Subscribe to sensor data
    const unsubscribe = sensorService.subscribe((data) => {
      behaviorTracker.recordSensorData(data);
      updateRiskScore();
    });

    // Record navigation
    behaviorTracker.recordNavigation('login');

    return () => {
      unsubscribe();
      sensorService.stopMonitoring();
    };
  }, []);

  const updateRiskScore = () => {
    const score = behaviorTracker.calculateRiskScore();
    const level = behaviorTracker.getRiskLevel();
    setRiskScore(score);
    setRiskLevel(level);
  };

  const handlePinComplete = async (pin: string) => {
    // Simulate PIN validation
    const isValidPin = pin === '123456';
    
    if (!isValidPin) {
      Alert.alert('Invalid PIN', 'Please try again.');
      return;
    }

    // Check if authentication is required
    const authResult = await securityService.authenticateAction('login', {
      userId: 'demo-user',
      pin,
      timestamp: Date.now(),
    });

    if (authResult.challengeRequired) {
      // Check if this should be a decoy challenge
      const decoyChallenge = securityService.generateDecoyChallenge();
      setIsDecoyMode(decoyChallenge.isDecoy);
      setShowBiometric(true);
    } else if (authResult.allowed) {
      // Direct login
      router.replace('/(tabs)');
    } else {
      Alert.alert('Access Denied', 'Your session has been flagged for security review.');
    }
  };

  const handleBiometricSuccess = () => {
    setShowBiometric(false);
    
    if (isDecoyMode) {
      // In decoy mode, show fake success then redirect to security
      setTimeout(() => {
        Alert.alert('Security Alert', 'Unusual activity detected. Please contact support.');
      }, 1000);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleBiometricCancel = () => {
    setShowBiometric(false);
    setIsDecoyMode(false);
  };

  const handleKeystroke = (key: string, timestamp: number) => {
    updateRiskScore();
  };

  return (
    <LinearGradient
      colors={['#000000', '#1A1A1A']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Shield size={48} color="#007AFF" />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Enter your PIN to continue</Text>
        </View>

        <SecurityIndicator riskLevel={riskLevel} riskScore={riskScore} />

        <PinInput
          onComplete={handlePinComplete}
          onKeystroke={handleKeystroke}
          isDecoy={isDecoyMode}
        />

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.panicButton}
            onPress={() => securityService.handlePanicGesture()}
          >
            <Text style={styles.panicButtonText}>Emergency</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => Alert.alert('Help', 'SecureFlow monitors your behavior patterns to ensure account security.')}
          >
            <Text style={styles.helpButtonText}>How it works</Text>
          </TouchableOpacity>
        </View>
      </View>

      <BiometricPrompt
        visible={showBiometric}
        onSuccess={handleBiometricSuccess}
        onCancel={handleBiometricCancel}
        title="Additional Verification Required"
        subtitle={`Risk Level: ${riskLevel.toUpperCase()}`}
        riskLevel={riskLevel}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    marginTop: 8,
    fontFamily: 'Inter-Medium',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 12,
  },
  panicButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  panicButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  helpButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  helpButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});