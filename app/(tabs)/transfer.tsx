import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, User, DollarSign, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SecurityIndicator } from '@/components/SecurityIndicator';
import { BiometricPrompt } from '@/components/BiometricPrompt';
import { BehaviorTracker } from '@/services/BehaviorTracker';
import { SecurityService } from '@/services/SecurityService';

export default function TransferScreen() {
  const router = useRouter();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showBiometric, setShowBiometric] = useState(false);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [riskScore, setRiskScore] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const behaviorTracker = BehaviorTracker.getInstance();
  const securityService = SecurityService.getInstance();

  useEffect(() => {
    // Record navigation
    behaviorTracker.recordNavigation('transfer');
    updateRiskScore();
  }, []);

  const updateRiskScore = () => {
    const score = behaviorTracker.calculateRiskScore();
    const level = behaviorTracker.getRiskLevel();
    setRiskScore(score);
    setRiskLevel(level);
  };

  const handleInputChange = (field: string, value: string) => {
    // Record keystroke behavior
    behaviorTracker.recordKeystroke(field, Date.now());
    
    switch (field) {
      case 'recipient':
        setRecipient(value);
        break;
      case 'amount':
        setAmount(value);
        break;
      case 'note':
        setNote(value);
        break;
    }
    
    updateRiskScore();
  };

  const handleTransfer = async () => {
    if (!recipient || !amount) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    // Check security authorization
    const authResult = await securityService.authenticateAction('transfer', {
      userId: 'demo-user',
      recipient,
      amount: transferAmount,
      note,
      timestamp: Date.now(),
    });

    if (authResult.response === 'block') {
      Alert.alert(
        'Transfer Blocked',
        'This transfer has been blocked due to security concerns. Please contact support.'
      );
      return;
    }

    if (authResult.challengeRequired) {
      setShowBiometric(true);
      return;
    }

    processTransfer();
  };

  const processTransfer = () => {
    setIsProcessing(true);
    
    // Simulate transfer processing
    setTimeout(() => {
      setIsProcessing(false);
      Alert.alert(
        'Transfer Successful',
        `$${amount} has been sent to ${recipient}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 2000);
  };

  const handleBiometricSuccess = () => {
    setShowBiometric(false);
    processTransfer();
  };

  const handleBiometricCancel = () => {
    setShowBiometric(false);
  };

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numValue);
  };

  return (
    <LinearGradient
      colors={['#000000', '#1A1A1A']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer Money</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        <SecurityIndicator riskLevel={riskLevel} riskScore={riskScore} />

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Recipient</Text>
            <View style={styles.inputContainer}>
              <User size={20} color="#888888" />
              <TextInput
                style={styles.input}
                placeholder="Enter recipient name or account"
                placeholderTextColor="#888888"
                value={recipient}
                onChangeText={(value) => handleInputChange('recipient', value)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.inputContainer}>
              <DollarSign size={20} color="#888888" />
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#888888"
                value={amount}
                onChangeText={(value) => handleInputChange('amount', value)}
                keyboardType="decimal-pad"
              />
            </View>
            {amount && (
              <Text style={styles.amountDisplay}>
                {formatCurrency(amount)}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Note (Optional)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { paddingLeft: 12 }]}
                placeholder="What's this for?"
                placeholderTextColor="#888888"
                value={note}
                onChangeText={(value) => handleInputChange('note', value)}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.quickAmounts}>
            <Text style={styles.label}>Quick Amounts</Text>
            <View style={styles.quickAmountButtons}>
              {['25', '50', '100', '200'].map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={[
                    styles.quickAmountButton,
                    amount === quickAmount && styles.quickAmountButtonSelected
                  ]}
                  onPress={() => handleInputChange('amount', quickAmount)}
                >
                  <Text style={[
                    styles.quickAmountText,
                    amount === quickAmount && styles.quickAmountTextSelected
                  ]}>
                    ${quickAmount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.transferButton,
            (!recipient || !amount || isProcessing) && styles.transferButtonDisabled
          ]}
          onPress={handleTransfer}
          disabled={!recipient || !amount || isProcessing}
        >
          <Send size={20} color="#FFFFFF" />
          <Text style={styles.transferButtonText}>
            {isProcessing ? 'Processing...' : 'Send Transfer'}
          </Text>
        </TouchableOpacity>

        <View style={styles.securityNotice}>
          <Shield size={16} color="#007AFF" />
          <Text style={styles.securityNoticeText}>
            This transfer is protected by SecureFlow's behavioral authentication
          </Text>
        </View>
      </ScrollView>

      <BiometricPrompt
        visible={showBiometric}
        onSuccess={handleBiometricSuccess}
        onCancel={handleBiometricCancel}
        title="Verify Transfer"
        subtitle={`Sending ${formatCurrency(amount)} to ${recipient}`}
        riskLevel={riskLevel}
      />
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
  form: {
    gap: 24,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  amountDisplay: {
    color: '#007AFF',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginTop: 8,
  },
  quickAmounts: {
    gap: 8,
  },
  quickAmountButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 12,
    alignItems: 'center',
  },
  quickAmountButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  quickAmountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  quickAmountTextSelected: {
    color: '#FFFFFF',
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  transferButtonDisabled: {
    backgroundColor: '#333333',
  },
  transferButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 100,
    gap: 8,
  },
  securityNoticeText: {
    color: '#007AFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
});