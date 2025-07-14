import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Eye, Bell, Lock, Smartphone, Activity, LogOut, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SecurityIndicator } from '@/components/SecurityIndicator';
import { SensorMonitor } from '@/components/SensorMonitor';
import { SecurityAnalyticsDashboard } from '@/components/SecurityAnalyticsDashboard';
import { BehaviorTracker } from '@/services/BehaviorTracker';
import { SecurityService } from '@/services/SecurityService';
import { DatabaseService } from '@/services/DatabaseService';
import { MLService } from '@/services/MLService';
import { BiometricService } from '@/services/BiometricService';
import { PerformanceService } from '@/services/PerformanceService';

export default function SettingsScreen() {
  const router = useRouter();
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [behaviorTrackingEnabled, setBehaviorTrackingEnabled] = useState(true);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [riskScore, setRiskScore] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [mlEnabled, setMlEnabled] = useState(false);
  const [performanceMode, setPerformanceMode] = useState<'normal' | 'optimized'>('normal');
  
  const behaviorTracker = BehaviorTracker.getInstance();
  const securityService = SecurityService.getInstance();
  const databaseService = DatabaseService.getInstance();
  const mlService = MLService.getInstance();
  const biometricService = BiometricService.getInstance();
  const performanceService = PerformanceService.getInstance();

  useEffect(() => {
    // Record navigation
    behaviorTracker.recordNavigation('settings');
    updateRiskScore();
    
    // Initialize database
    databaseService.initializeDatabase().catch(console.error);
    
    // Initialize advanced services
    initializeAdvancedServices();
  }, []);

  const initializeAdvancedServices = async () => {
    try {
      await Promise.all([
        mlService.initialize(),
        biometricService.initialize(),
        performanceService.initialize()
      ]);
      setMlEnabled(true);
      console.log('✅ Advanced services initialized');
    } catch (error) {
      console.error('❌ Failed to initialize advanced services:', error);
    }
  };

  const updateRiskScore = () => {
    const score = behaviorTracker.calculateRiskScore();
    const level = behaviorTracker.getRiskLevel();
    setRiskScore(score);
    setRiskLevel(level);
  };

  const handleSecurityAnalysis = () => {
    const analysis = securityService.getRiskAnalysis();
    Alert.alert(
      'Security Analysis',
      `Current Risk: ${Math.round(analysis.currentRisk * 100)}%\n\n` +
      `Risk Level: ${analysis.riskLevel.toUpperCase()}\n\n` +
      `Factors:\n${analysis.factors.join('\n')}\n\n` +
      `Recommendations:\n${analysis.recommendations.join('\n')}`
    );
  };

  const handleViewBehaviorProfile = () => {
    const profile = behaviorTracker.getBehaviorProfile();
    if (profile) {
      Alert.alert(
        'Behavior Profile',
        `Avg Typing Speed: ${profile.keystrokeDynamics.avgTypingSpeed.toFixed(2)} keys/sec\n` +
        `Avg Tap Duration: ${profile.gestureDynamics.tapDuration.toFixed(0)}ms\n` +
        `Session Duration: ${Math.round(profile.navigationPatterns.sessionDuration / 60000)}min\n` +
        `Tremor Confidence: ${Math.round(profile.handTremor.confidence * 100)}%`
      );
    }
  };

  const handleMLToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        await mlService.initialize();
        setMlEnabled(true);
        Alert.alert('ML Enabled', 'Machine learning models are now active for enhanced security analysis.');
      } else {
        mlService.dispose();
        setMlEnabled(false);
        Alert.alert('ML Disabled', 'Machine learning features have been disabled.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle ML features.');
    }
  };

  const handleBiometricTest = async () => {
    try {
      const result = await biometricService.authenticate({
        promptMessage: 'Test biometric authentication',
        cancelLabel: 'Cancel Test'
      });
      
      if (result.success) {
        Alert.alert('Success', 'Biometric authentication test passed!');
      } else {
        Alert.alert('Failed', result.error || 'Biometric test failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Biometric test failed');
    }
  };

  const handlePerformanceReport = async () => {
    try {
      const report = await performanceService.generatePerformanceReport();
      Alert.alert(
        'Performance Report',
        `${report.summary}\n\nRecommendations:\n${report.recommendations.join('\n')}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate performance report');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            behaviorTracker.reset();
            router.replace('/login');
          }
        }
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showToggle = false, 
    toggleValue = false, 
    onToggle 
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showToggle?: boolean;
    toggleValue?: boolean;
    onToggle?: (value: boolean) => void;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={showToggle}
    >
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showToggle && (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: '#333333', true: '#007AFF' }}
          thumbColor={toggleValue ? '#FFFFFF' : '#CCCCCC'}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#000000', '#1A1A1A']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        <SecurityIndicator riskLevel={riskLevel} riskScore={riskScore} />

        {showAnalytics && (
          <View style={styles.analyticsContainer}>
            <SecurityAnalyticsDashboard />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<Shield size={24} color="#007AFF" />}
              title="Biometric Authentication"
              subtitle="Use fingerprint or face ID for quick access"
              showToggle
              toggleValue={biometricEnabled}
              onToggle={setBiometricEnabled}
            />
            <SettingItem
              icon={<Activity size={24} color="#00C851" />}
              title="Machine Learning"
              subtitle="AI-powered behavioral analysis"
              showToggle
              toggleValue={mlEnabled}
              onToggle={handleMLToggle}
            />
            <SettingItem
              icon={<Activity size={24} color="#00C851" />}
              title="Behavior Tracking"
              subtitle="Monitor typing patterns and gestures"
              showToggle
              toggleValue={behaviorTrackingEnabled}
              onToggle={setBehaviorTrackingEnabled}
            />
            <SettingItem
              icon={<Eye size={24} color="#FF8800" />}
              title="Security Analytics"
              subtitle="View comprehensive security dashboard"
              onPress={() => setShowAnalytics(!showAnalytics)}
            />
            <SettingItem
              icon={<Eye size={24} color="#FF8800" />}
              title="Security Analysis"
              subtitle="View detailed risk analysis"
              onPress={handleSecurityAnalysis}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Behavior Profile</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<Smartphone size={24} color="#007AFF" />}
              title="Enhanced Biometrics"
              subtitle="Test advanced biometric authentication"
              onPress={handleBiometricTest}
            />
            <SettingItem
              icon={<Smartphone size={24} color="#007AFF" />}
              title="View Behavior Profile"
              subtitle="See your learned patterns"
              onPress={handleViewBehaviorProfile}
            />
            <SettingItem
              icon={<Bell size={24} color="#FF8800" />}
              title="Security Notifications"
              subtitle="Get alerts for unusual activity"
              showToggle
              toggleValue={notificationsEnabled}
              onToggle={setNotificationsEnabled}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<Zap size={24} color="#00D4FF" />}
              title="Performance Mode"
              subtitle={`Currently: ${performanceMode}`}
              showToggle
              toggleValue={performanceMode === 'optimized'}
              onToggle={(enabled) => setPerformanceMode(enabled ? 'optimized' : 'normal')}
            />
            <SettingItem
              icon={<Activity size={24} color="#FFB800" />}
              title="Performance Report"
              subtitle="View detailed performance metrics"
              onPress={handlePerformanceReport}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sensor Monitoring</Text>
          <SensorMonitor userId="demo-user" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<Lock size={24} color="#888888" />}
              title="Data Protection"
              subtitle="All data is processed on-device"
            />
            <SettingItem
              icon={<Shield size={24} color="#888888" />}
              title="Privacy Policy"
              subtitle="Review our privacy practices"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<LogOut size={24} color="#FF4444" />}
              title="Logout"
              subtitle="Sign out of your account"
              onPress={handleLogout}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            SecureFlow v1.0.0
          </Text>
          <Text style={styles.footerSubtext}>
            Powered by on-device behavioral AI
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  headerRight: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  sectionContent: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  settingSubtitle: {
    color: '#CCCCCC',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 100,
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  footerSubtext: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
  analyticsContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
});