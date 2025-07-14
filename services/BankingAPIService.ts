import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Transaction, UserProfile } from '@/types';

export interface BankAccount {
  id: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'credit' | 'investment';
  balance: number;
  currency: string;
  bankName: string;
  nickname?: string;
  isActive: boolean;
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId?: string;
  recipientName?: string;
  recipientAccount?: string;
  amount: number;
  currency: string;
  description: string;
  transferType: 'internal' | 'external' | 'wire' | 'ach';
  scheduledDate?: Date;
}

export interface TransferResponse {
  transactionId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  confirmationCode: string;
  estimatedCompletion: Date;
  fees: number;
}

export interface BillPayment {
  id: string;
  payeeName: string;
  accountNumber: string;
  amount: number;
  dueDate: Date;
  category: string;
  isRecurring: boolean;
  status: 'pending' | 'paid' | 'overdue';
}

export interface InvestmentData {
  portfolioValue: number;
  dayChange: number;
  dayChangePercent: number;
  holdings: {
    symbol: string;
    name: string;
    shares: number;
    currentPrice: number;
    dayChange: number;
    totalValue: number;
  }[];
}

export class BankingAPIService {
  private static instance: BankingAPIService;
  private baseURL = 'https://api.secureflow-demo.com'; // Demo API
  private apiKey: string | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  static getInstance(): BankingAPIService {
    if (!BankingAPIService.instance) {
      BankingAPIService.instance = new BankingAPIService();
    }
    return BankingAPIService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load stored credentials
      this.apiKey = await SecureStore.getItemAsync('banking_api_key');
      this.accessToken = await SecureStore.getItemAsync('access_token');
      this.refreshToken = await SecureStore.getItemAsync('refresh_token');
      
      console.log('🏦 Banking API Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Banking API Service:', error);
    }
  }

  async authenticate(username: string, password: string, mfaCode?: string): Promise<{
    success: boolean;
    requiresMFA: boolean;
    accessToken?: string;
    refreshToken?: string;
    user?: UserProfile;
  }> {
    try {
      // Simulate API call
      const response = await this.mockAPICall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          mfaCode,
          deviceId: await this.getDeviceId()
        })
      });

      if (response.success) {
        this.accessToken = response.accessToken;
        this.refreshToken = response.refreshToken;
        
        // Store tokens securely
        await SecureStore.setItemAsync('access_token', response.accessToken);
        await SecureStore.setItemAsync('refresh_token', response.refreshToken);
        
        return {
          success: true,
          requiresMFA: false,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          user: response.user
        };
      }

      return response;
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      return { success: false, requiresMFA: false };
    }
  }

  async getAccounts(): Promise<BankAccount[]> {
    try {
      const response = await this.authenticatedRequest('/accounts');
      return response.accounts || this.getMockAccounts();
    } catch (error) {
      console.error('❌ Failed to fetch accounts:', error);
      return this.getMockAccounts();
    }
  }

  async getAccountBalance(accountId: string): Promise<number> {
    try {
      const response = await this.authenticatedRequest(`/accounts/${accountId}/balance`);
      return response.balance;
    } catch (error) {
      console.error('❌ Failed to fetch balance:', error);
      return 0;
    }
  }

  async getTransactionHistory(
    accountId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<Transaction[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() })
      });

      const response = await this.authenticatedRequest(
        `/accounts/${accountId}/transactions?${params}`
      );
      
      return response.transactions || this.getMockTransactions();
    } catch (error) {
      console.error('❌ Failed to fetch transactions:', error);
      return this.getMockTransactions();
    }
  }

  async initiateTransfer(transferRequest: TransferRequest): Promise<TransferResponse> {
    try {
      const response = await this.authenticatedRequest('/transfers', {
        method: 'POST',
        body: JSON.stringify(transferRequest)
      });

      return response.transfer || {
        transactionId: `TXN_${Date.now()}`,
        status: 'pending',
        confirmationCode: `CONF_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000),
        fees: transferRequest.transferType === 'wire' ? 25.00 : 0
      };
    } catch (error) {
      console.error('❌ Transfer failed:', error);
      throw new Error('Transfer failed. Please try again.');
    }
  }

  async getBillPayments(): Promise<BillPayment[]> {
    try {
      const response = await this.authenticatedRequest('/bills');
      return response.bills || this.getMockBills();
    } catch (error) {
      console.error('❌ Failed to fetch bills:', error);
      return this.getMockBills();
    }
  }

  async payBill(billId: string, amount: number, accountId: string): Promise<TransferResponse> {
    try {
      const response = await this.authenticatedRequest('/bills/pay', {
        method: 'POST',
        body: JSON.stringify({ billId, amount, accountId })
      });

      return response.payment || {
        transactionId: `BILL_${Date.now()}`,
        status: 'pending',
        confirmationCode: `BILL_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        estimatedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        fees: 0
      };
    } catch (error) {
      console.error('❌ Bill payment failed:', error);
      throw new Error('Bill payment failed. Please try again.');
    }
  }

  async getInvestmentData(): Promise<InvestmentData> {
    try {
      const response = await this.authenticatedRequest('/investments');
      return response.portfolio || this.getMockInvestmentData();
    } catch (error) {
      console.error('❌ Failed to fetch investment data:', error);
      return this.getMockInvestmentData();
    }
  }

  async searchRecipients(query: string): Promise<{
    id: string;
    name: string;
    accountNumber: string;
    bankName: string;
    verified: boolean;
  }[]> {
    try {
      const response = await this.authenticatedRequest(`/recipients/search?q=${encodeURIComponent(query)}`);
      return response.recipients || [];
    } catch (error) {
      console.error('❌ Recipient search failed:', error);
      return [];
    }
  }

  async validateAccount(accountNumber: string, routingNumber: string): Promise<{
    valid: boolean;
    bankName?: string;
    accountType?: string;
  }> {
    try {
      const response = await this.authenticatedRequest('/validate-account', {
        method: 'POST',
        body: JSON.stringify({ accountNumber, routingNumber })
      });
      
      return response.validation || { valid: true, bankName: 'Demo Bank', accountType: 'checking' };
    } catch (error) {
      console.error('❌ Account validation failed:', error);
      return { valid: false };
    }
  }

  private async authenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      'X-API-Key': this.apiKey || '',
      ...options.headers
    };

    try {
      const response = await this.mockAPICall(endpoint, { ...options, headers });
      
      if (response.status === 401) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
        headers.Authorization = `Bearer ${this.accessToken}`;
        return await this.mockAPICall(endpoint, { ...options, headers });
      }

      return response;
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.mockAPICall('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      this.accessToken = response.accessToken;
      await SecureStore.setItemAsync('access_token', response.accessToken);
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      await this.logout();
      throw error;
    }
  }

  private async mockAPICall(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Simulate different responses based on endpoint
    if (endpoint === '/auth/login') {
      return {
        success: true,
        accessToken: `access_${Date.now()}`,
        refreshToken: `refresh_${Date.now()}`,
        user: {
          id: 'user_123',
          name: 'Alex Morgan',
          email: 'alex.morgan@example.com',
          accountNumber: '****1234',
          balance: 24567.89,
          createdAt: new Date()
        }
      };
    }

    if (endpoint === '/accounts') {
      return { accounts: this.getMockAccounts() };
    }

    if (endpoint.includes('/transactions')) {
      return { transactions: this.getMockTransactions() };
    }

    if (endpoint === '/bills') {
      return { bills: this.getMockBills() };
    }

    if (endpoint === '/investments') {
      return { portfolio: this.getMockInvestmentData() };
    }

    // Default success response
    return { success: true, data: {} };
  }

  private getMockAccounts(): BankAccount[] {
    return [
      {
        id: 'acc_1',
        accountNumber: '****1234',
        accountType: 'checking',
        balance: 24567.89,
        currency: 'USD',
        bankName: 'SecureFlow Bank',
        nickname: 'Primary Checking',
        isActive: true
      },
      {
        id: 'acc_2',
        accountNumber: '****5678',
        accountType: 'savings',
        balance: 45230.12,
        currency: 'USD',
        bankName: 'SecureFlow Bank',
        nickname: 'Emergency Fund',
        isActive: true
      },
      {
        id: 'acc_3',
        accountNumber: '****9012',
        accountType: 'credit',
        balance: -1250.00,
        currency: 'USD',
        bankName: 'SecureFlow Bank',
        nickname: 'Rewards Card',
        isActive: true
      }
    ];
  }

  private getMockTransactions(): Transaction[] {
    return [
      {
        id: 'txn_1',
        type: 'debit',
        amount: 156.78,
        recipient: 'Whole Foods Market',
        description: 'Grocery Shopping',
        timestamp: new Date(Date.now() - 3600000),
        category: 'Food & Drink'
      },
      {
        id: 'txn_2',
        type: 'credit',
        amount: 3200.00,
        description: 'Salary Deposit',
        timestamp: new Date(Date.now() - 86400000),
        category: 'Income'
      },
      {
        id: 'txn_3',
        type: 'debit',
        amount: 89.50,
        recipient: 'Shell Gas Station',
        description: 'Fuel Purchase',
        timestamp: new Date(Date.now() - 172800000),
        category: 'Transportation'
      }
    ];
  }

  private getMockBills(): BillPayment[] {
    return [
      {
        id: 'bill_1',
        payeeName: 'Electric Company',
        accountNumber: '****4567',
        amount: 125.50,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        category: 'Utilities',
        isRecurring: true,
        status: 'pending'
      },
      {
        id: 'bill_2',
        payeeName: 'Internet Provider',
        accountNumber: '****8901',
        amount: 79.99,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        category: 'Utilities',
        isRecurring: true,
        status: 'pending'
      }
    ];
  }

  private getMockInvestmentData(): InvestmentData {
    return {
      portfolioValue: 125430.67,
      dayChange: 1250.34,
      dayChangePercent: 1.01,
      holdings: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          shares: 50,
          currentPrice: 175.25,
          dayChange: 2.15,
          totalValue: 8762.50
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          shares: 25,
          currentPrice: 2650.80,
          dayChange: -15.30,
          totalValue: 66270.00
        }
      ]
    };
  }

  private async getDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await this.mockAPICall('/auth/logout', {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('❌ Logout API call failed:', error);
    } finally {
      // Clear stored credentials
      this.accessToken = null;
      this.refreshToken = null;
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      console.log('🚪 Logged out successfully');
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}
