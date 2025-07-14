import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Fingerprint, Shield, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const SCAN_DELAY = 2000;

const COLORS = {
  success: '#00C851',
  warning: '#FF8800',
  danger: '#FF4444',
  primary: '#007AFF',
  background: '#1A1A1A',
  mutedText: '#CCCCCC',
  white: '#FFFFFF',
};

interface BiometricPromptProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title: string;
  subtitle?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export function BiometricPrompt({
  visible,
  onSuccess,
  onCancel,
  title,
  subtitle,
  riskLevel,
}: BiometricPromptProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'failed' | null>(null);

  useEffect(() => {
    if (visible) {
      setScanResult(null);
      setIsScanning(false);
    }
  }, [visible]);

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'low':
        return COLORS.success;
      case 'medium':
        return COLORS.warning;
      case 'high':
        return COLORS.danger;
      default:
        return COLORS.primary;
    }
  };

  const handleBiometricScan = () => {
    setIsScanning(true);
    Haptics.selectionAsync();

    setTimeout(() => {
      setIsScanning(false);

      const success =
        riskLevel === 'low'
          ? Math.random() > 0.1
          : riskLevel === 'medium'
          ? Math.random() > 0.3
          : Math.random() > 0.6;

      setScanResult(success ? 'success' : 'failed');
      Haptics.notificationAsync(success ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);

      if (success) {
        setTimeout(() => onSuccess(), 500);
      }
    }, SCAN_DELAY);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onCancel}
            accessibilityLabel="Cancel biometric authentication"
            accessibilityRole="button"
          >
            <X size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Shield size={32} color={getRiskColor()} />
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>

          <View style={styles.scanArea}>
            <View style={[styles.scanCircle, { borderColor: getRiskColor() }]}>
              <Fingerprint
                size={64}
                color={
                  scanResult === 'success'
                    ? COLORS.success
                    : scanResult === 'failed'
                    ? COLORS.danger
                    : isScanning
                    ? getRiskColor()
                    : COLORS.white
                }
              />
            </View>
            {isScanning && (
              <View style={[styles.scanPulse, { backgroundColor: getRiskColor() }]} />
            )}
          </View>

          <View style={styles.status}>
            {scanResult === 'success' && (
              <Text style={[styles.statusText, { color: COLORS.success }]}>
                Authentication Successful
              </Text>
            )}
            {scanResult === 'failed' && (
              <Text style={[styles.statusText, { color: COLORS.danger }]}>
                Authentication Failed - Try Again
              </Text>
            )}
            {isScanning && (
              <Text style={[styles.statusText, { color: getRiskColor() }]}>Scanning...</Text>
            )}
            {!isScanning && !scanResult && (
              <Text style={styles.statusText}>
                Touch the fingerprint sensor or tap to scan
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: getRiskColor() }]}
            onPress={handleBiometricScan}
            disabled={isScanning}
            accessibilityLabel="Start biometric scan"
            accessibilityRole="button"
          >
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Scanning...' : 'Scan Fingerprint'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.mutedText,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  scanArea: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  scanCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  scanPulse: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.3,
  },
  status: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.white,
  },
  scanButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  scanButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
