import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Filter, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BehaviorTracker } from '@/services/BehaviorTracker';
import { Transaction } from '@/types';

export default function HistoryScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');
  
  const behaviorTracker = BehaviorTracker.getInstance();

  useEffect(() => {
    // Record navigation
    behaviorTracker.recordNavigation('history');
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    // Mock transaction history
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: 'debit',
        amount: 89.99,
        recipient: 'Coffee Shop',
        description: 'Purchase',
        timestamp: new Date(Date.now() - 3600000),
        category: 'Food & Drink',
      },
      {
        id: '2',
        type: 'credit',
        amount: 2500.00,
        description: 'Salary Deposit',
        timestamp: new Date(Date.now() - 86400000),
        category: 'Income',
      },
      {
        id: '3',
        type: 'debit',
        amount: 1200.00,
        recipient: 'Rent Payment',
        description: 'Monthly Rent',
        timestamp: new Date(Date.now() - 172800000),
        category: 'Housing',
      },
      {
        id: '4',
        type: 'debit',
        amount: 45.50,
        recipient: 'Gas Station',
        description: 'Fuel',
        timestamp: new Date(Date.now() - 259200000),
        category: 'Transportation',
      },
      {
        id: '5',
        type: 'credit',
        amount: 150.00,
        description: 'Freelance Payment',
        timestamp: new Date(Date.now() - 345600000),
        category: 'Income',
      },
      {
        id: '6',
        type: 'debit',
        amount: 25.99,
        recipient: 'Streaming Service',
        description: 'Monthly Subscription',
        timestamp: new Date(Date.now() - 432000000),
        category: 'Entertainment',
      },
      {
        id: '7',
        type: 'debit',
        amount: 78.34,
        recipient: 'Grocery Store',
        description: 'Groceries',
        timestamp: new Date(Date.now() - 518400000),
        category: 'Food & Drink',
      },
      {
        id: '8',
        type: 'credit',
        amount: 500.00,
        description: 'Tax Refund',
        timestamp: new Date(Date.now() - 604800000),
        category: 'Income',
      },
    ];
    
    setTransactions(mockTransactions);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.type === filter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const getTransactionsByDate = () => {
    const grouped = filteredTransactions.reduce((acc, transaction) => {
      const dateKey = formatDate(transaction.timestamp);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);

    return Object.entries(grouped).sort((a, b) => {
      const dateA = new Date(a[1][0].timestamp);
      const dateB = new Date(b[1][0].timestamp);
      return dateB.getTime() - dateA.getTime();
    });
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
        <Text style={styles.headerTitle}>Transaction History</Text>
        <TouchableOpacity>
          <Search size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['all', 'credit', 'debit'] as const).map((filterOption) => (
            <TouchableOpacity
              key={filterOption}
              style={[
                styles.filterButton,
                filter === filterOption && styles.filterButtonActive
              ]}
              onPress={() => setFilter(filterOption)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === filterOption && styles.filterButtonTextActive
              ]}>
                {filterOption === 'all' ? 'All' : 
                 filterOption === 'credit' ? 'Income' : 'Expenses'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.transactionsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {getTransactionsByDate().map(([date, dayTransactions]) => (
          <View key={date} style={styles.dateGroup}>
            <Text style={styles.dateHeader}>{date}</Text>
            <View style={styles.transactionsContainer}>
              {dayTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    {transaction.type === 'credit' ? (
                      <ArrowDownLeft size={20} color="#00C851" />
                    ) : (
                      <ArrowUpRight size={20} color="#FF4444" />
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
                    <Text style={styles.transactionCategory}>
                      {transaction.category}
                    </Text>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={[
                      styles.transactionAmountText,
                      { color: transaction.type === 'credit' ? '#00C851' : '#FF4444' }
                    ]}>
                      {transaction.type === 'credit' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </Text>
                    <Text style={styles.transactionTime}>
                      {transaction.timestamp.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
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
  filters: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  transactionsContainer: {
    gap: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  transactionRecipient: {
    color: '#CCCCCC',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  transactionCategory: {
    color: '#888888',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  transactionTime: {
    color: '#888888',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});