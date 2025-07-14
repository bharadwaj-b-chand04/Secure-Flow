import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Plus, ArrowUpRight, ArrowDownLeft, Shield, Bell, Settings, CreditCard, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SecurityIndicator } from '@/components/SecurityIndicator';
import { BehaviorTracker } from '@/services/BehaviorTracker';
import { SecurityService } from '@/services/SecurityService';
import { UserProfile, Transaction } from '@/types';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  interpolate
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [riskScore, setRiskScore] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const balanceAnimation = useSharedValue(0);
  
  const behaviorTracker = BehaviorTracker.getInstance();
  const securityService = SecurityService.getInstance();

  // Mock user data
  const user: UserProfile = {
    id: 'demo-user',
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    accountNumber: '****1234',
    balance: 24567.89,
    createdAt: new Date(),
  };

  useEffect(() => {
    // Record navigation
    behaviorTracker.recordNavigation('dashboard');
    
    // Load initial data
    loadData();
    
    // Animate balance on mount
    balanceAnimation.value = withSpring(1, { damping: 15, stiffness: 100 });
    
    // Update risk score periodically
    const interval = setInterval(() => {
      updateRiskScore();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    // Mock recent transactions
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: 'debit',
        amount: 156.78,
        recipient: 'Whole Foods Market',
        description: 'Grocery Shopping',
        timestamp: new Date(Date.now() - 3600000),
        category: 'Food & Drink',
      },
      {
        id: '2',
        type: 'credit',
        amount: 3200.00,
        description: 'Salary Deposit',
        timestamp: new Date(Date.now() - 86400000),
        category: 'Income',
      },
      {
        id: '3',
        type: 'debit',
        amount: 89.50,
        recipient: 'Shell Gas Station',
        description: 'Fuel Purchase',
        timestamp: new Date(Date.now() - 172800000),
        category: 'Transportation',
      },
      {
        id: '4',
        type: 'debit',
        amount: 45.99,
        recipient: 'Netflix',
        description: 'Monthly Subscription',
        timestamp: new Date(Date.now() - 259200000),
        category: 'Entertainment',
      },
    ];
    
    setRecentTransactions(mockTransactions);
  };

  const updateRiskScore = () => {
    const score = behaviorTracker.calculateRiskScore();
    const level = behaviorTracker.getRiskLevel();
    setRiskScore(score);
    setRiskLevel(level);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    balanceAnimation.value = withSpring(1.05, { damping: 15, stiffness: 100 });
    setTimeout(() => {
      balanceAnimation.value = withSpring(1, { damping: 15, stiffness: 100 });
    }, 200);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleQuickTransfer = () => {
    // Record gesture
    behaviorTracker.recordGesture('tap', 0.5, 150);
    router.push('/transfer');
  };

  const handleSecurityIndicatorPress = () => {
    router.push('/settings');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const balanceAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: balanceAnimation.value }],
    };
  });

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A2E']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#00D4FF"
            colors={['#00D4FF']}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{user.name}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Bell size={20} color="#FFFFFF" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => router.push('/settings')}
            >
              <Settings size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <SecurityIndicator 
          riskLevel={riskLevel} 
          riskScore={riskScore} 
          onPress={handleSecurityIndicatorPress}
          showDetails
        />

        <LinearGradient
          colors={['#00D4FF', '#0099CC']}
          style={styles.balanceCard}
        >
          <View style={styles.balanceCardContent}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <TouchableOpacity 
                onPress={() => setShowBalance(!showBalance)}
                style={styles.eyeButton}
              >
                {showBalance ? (
                  <EyeOff size={20} color="rgba(255, 255, 255, 0.8)" />
                ) : (
                  <Eye size={20} color="rgba(255, 255, 255, 0.8)" />
                )}
              </TouchableOpacity>
            </View>
            <Animated.View style={balanceAnimatedStyle}>
              <Text style={styles.balanceAmount}>
                {showBalance ? formatCurrency(user.balance) : '••••••'}
              </Text>
            </Animated.View>
            <View style={styles.balanceFooter}>
              <Text style={styles.accountNumber}>Account {user.accountNumber}</Text>
              <View style={styles.balanceChange}>
                <TrendingUp size={14} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.balanceChangeText}>+2.4% this month</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.quickActions}>
          <QuickActionButton
            icon={<Plus size={20} color="#FFFFFF" />}
            title="Transfer"
            onPress={handleQuickTransfer}
          />
          <QuickActionButton
            icon={<ArrowDownLeft size={20} color="#FFFFFF" />}
            title="Request"
            onPress={() => {}}
          />
          <QuickActionButton
            icon={<CreditCard size={20} color="#FFFFFF" />}
            title="Cards"
            onPress={() => {}}
          />
          <QuickActionButton
            icon={<ArrowUpRight size={20} color="#FFFFFF" />}
            title="Pay Bills"
            onPress={() => {}}
          />
        </View>

        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/history')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsList}>
            {recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function QuickActionButton({ 
  icon, 
  title, 
  onPress 
}: { 
  icon: React.ReactNode; 
  title: string; 
  onPress: () => void; 
}) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={styles.actionButtonIcon}>
        {icon}
      </View>
      <Text style={styles.actionButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <TouchableOpacity style={styles.transactionItem}>
      <View style={[
        styles.transactionIcon,
        { backgroundColor: transaction.type === 'credit' ? '#00D4AA20' : '#FF444420' }
      ]}>
        {transaction.type === 'credit' ? (
          <ArrowDownLeft size={18} color="#00D4AA" />
        ) : (
          <ArrowUpRight size={18} color="#FF4444" />
        )}
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDescription}>
          {transaction.description}
        </Text>
        {transaction.recipient && (
          <Text style={styles.transactionRecipient}>
            {transaction.recipient}
          </Text>
        )}
        <Text style={styles.transactionDate}>
          {formatDate(transaction.timestamp)}
        </Text>
      </View>
      <View style={styles.transactionAmountContainer}>
        <Text style={[
          styles.transactionAmount,
          { color: transaction.type === 'credit' ? '#00D4AA' : '#FF4444' }
        ]}>
          {transaction.type === 'credit' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </Text>
        <Text style={styles.transactionCategory}>
          {transaction.category}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  greeting: {
    color: '#B0B0B0',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  balanceCard: {
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  balanceCardContent: {
    padding: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  eyeButton: {
    padding: 4,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
    letterSpacing: -1,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountNumber: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  balanceChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceChangeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  quickActions: {
    flexDirection: 'row', 
    paddingHorizontal: 24,
    marginBottom: 40,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  transactionsSection: {
    paddingHorizontal: 24,
    marginBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
  },
  seeAllText: {
    color: '#00D4FF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  transactionsList: {
    gap: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  transactionRecipient: {
    color: '#B0B0B0',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  transactionDate: {
    color: '#808080',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  transactionCategory: {
    color: '#808080',
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    textAlign: 'right',
  },
});