import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PinInput } from '@/components/PinInput';
import { BiometricPrompt } from '@/components/BiometricPrompt';
import { SecurityIndicator } from '@/components/SecurityIndicator';
import { BehaviorTracker } from '@/services/BehaviorTracker';
import { SecurityService } from '@/services/SecurityService';
import { SensorService } from '@/services/SensorService';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'pin' | 'biometric'>('pin');
  const [showBiometric, setShowBiometric] = useState(false);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [riskScore, setRiskScore] = useState(0);
  const [isDecoyMode, setIsDecoyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const behaviorTracker = BehaviorTracker.getInstance();
  const securityService = SecurityService.getInstance();
  const sensorService = SensorService.getInstance();

  useEffect(() => {
    behaviorTracker.initializeProfile('demo-user');
    sensorService.startMonitoring();

    const unsubscribe = sensorService.subscribe((data) => {
      behaviorTracker.recordSensorData(data);
      updateRiskScore();
    });

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
    setIsLoading(true);
    const isValidPin = pin === '123456';

    if (!isValidPin) {
      setIsLoading(false);
      Alert.alert('Invalid PIN', 'Please try again.');
      return;
    }

    const authResult = await securityService.authenticateAction('login', {
      userId: 'demo-user',
      pin,
      timestamp: Date.now(),
    });

    setIsLoading(false);

    if (authResult.challengeRequired) {
      const decoyChallenge = securityService.generateDecoyChallenge();
      setIsDecoyMode(decoyChallenge.isDecoy);
      setShowBiometric(true);
    } else if (authResult.allowed) {
      router.replace('/(tabs)');
    } else {
      Alert.alert(
        'Access Denied',
        'Your session has been flagged for security review.'
      );
    }
  };

  const handleBiometricSuccess = () => {
    setShowBiometric(false);

    if (isDecoyMode) {
      setTimeout(() => {
        Alert.alert(
          'Security Alert',
          'Unusual activity detected. Please contact support.'
        );
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
    <LinearGradient colors={['#000000', '#1A1A1A']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Shield size={48} color="#00D4FF" />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Enter your PIN to continue</Text>
        </View>

        <SecurityIndicator riskLevel={riskLevel} riskScore={riskScore} />

        {isLoading ? (
          <ActivityIndicator size="large" color="#00D4FF" style={{ marginTop: 32 }} />
        ) : (
          <PinInput
            onComplete={handlePinComplete}
            onKeystroke={handleKeystroke}
            isDecoy={isDecoyMode}
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.panicButton}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              securityService.handlePanicGesture();
            }}
            accessible
            accessibilityLabel="Emergency Action"
            accessibilityRole="button"
          >
            <Text style={styles.panicButtonText}>Emergency</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpButton}
            activeOpacity={0.6}
            onPress={() =>
              Alert.alert(
                'Help',
                'SecureFlow monitors your behavior patterns to ensure account security.'
              )
            }
            accessible
            accessibilityLabel="Help and Information"
            accessibilityRole="button"
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginTop: 12,
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  panicButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
  },
  panicButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  helpButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  helpButtonText: {
    color: '#00D4FF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});
