import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface BiometricCapabilities {
  isAvailable: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  isEnrolled: boolean;
  securityLevel: 'none' | 'biometric' | 'device_credential' | 'biometric_strong';
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: LocalAuthentication.AuthenticationType;
  warning?: string;
}

export interface BiometricSettings {
  enabled: boolean;
  preferredType: LocalAuthentication.AuthenticationType | null;
  fallbackToDeviceCredential: boolean;
  maxAttempts: number;
  lockoutDuration: number; // minutes
}

export class BiometricService {
  private static instance: BiometricService;
  private capabilities: BiometricCapabilities | null = null;
  private settings: BiometricSettings | null = null;
  private failedAttempts = 0;
  private lockoutUntil: Date | null = null;

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔐 Initializing Biometric Service...');
      
      // Check device capabilities
      this.capabilities = await this.checkCapabilities();
      
      // Load user settings
      this.settings = await this.loadSettings();
      
      console.log('✅ Biometric Service initialized', {
        available: this.capabilities.isAvailable,
        enrolled: this.capabilities.isEnrolled,
        types: this.capabilities.supportedTypes
      });
    } catch (error) {
      console.error('❌ Failed to initialize Biometric Service:', error);
      throw error;
    }
  }

  private async checkCapabilities(): Promise<BiometricCapabilities> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

      return {
        isAvailable,
        supportedTypes,
        isEnrolled,
        securityLevel: this.mapSecurityLevel(securityLevel)
      };
    } catch (error) {
      console.error('❌ Failed to check biometric capabilities:', error);
      return {
        isAvailable: false,
        supportedTypes: [],
        isEnrolled: false,
        securityLevel: 'none'
      };
    }
  }

  private mapSecurityLevel(level: LocalAuthentication.SecurityLevel): BiometricCapabilities['securityLevel'] {
    switch (level) {
      case LocalAuthentication.SecurityLevel.NONE:
        return 'none';
      case LocalAuthentication.SecurityLevel.SECRET:
        return 'device_credential';
      case LocalAuthentication.SecurityLevel.BIOMETRIC:
        return 'biometric';
      case LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG:
        return 'biometric_strong';
      default:
        return 'none';
    }
  }

  async authenticate(options: {
    promptMessage?: string;
    cancelLabel?: string;
    fallbackLabel?: string;
    disableDeviceFallback?: boolean;
    requireConfirmation?: boolean;
  } = {}): Promise<BiometricAuthResult> {
    if (!this.capabilities?.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication not available on this device'
      };
    }

    if (!this.capabilities.isEnrolled) {
      return {
        success: false,
        error: 'No biometric credentials enrolled on this device'
      };
    }

    if (this.isLockedOut()) {
      const remainingTime = Math.ceil((this.lockoutUntil!.getTime() - Date.now()) / (1000 * 60));
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${remainingTime} minutes.`
      };
    }

    try {
      const authOptions: LocalAuthentication.LocalAuthenticationOptions = {
        promptMessage: options.promptMessage || 'Authenticate to continue',
        cancelLabel: options.cancelLabel || 'Cancel',
        fallbackLabel: options.fallbackLabel || 'Use Passcode',
        disableDeviceFallback: options.disableDeviceFallback || false,
        requireConfirmation: options.requireConfirmation || false
      };

      const result = await LocalAuthentication.authenticateAsync(authOptions);

      if (result.success) {
        this.resetFailedAttempts();
        return {
          success: true,
          biometricType: this.getUsedBiometricType()
        };
      } else {
        this.handleFailedAttempt();
        return {
          success: false,
          error: this.mapErrorMessage(result.error)
        };
      }
    } catch (error) {
      console.error('❌ Biometric authentication failed:', error);
      this.handleFailedAttempt();
      return {
        success: false,
        error: 'Authentication failed. Please try again.'
      };
    }
  }

  private getUsedBiometricType(): LocalAuthentication.AuthenticationType {
    // Return the preferred type or the first available type
    if (this.settings?.preferredType && 
        this.capabilities?.supportedTypes.includes(this.settings.preferredType)) {
      return this.settings.preferredType;
    }
    
    return this.capabilities?.supportedTypes[0] || LocalAuthentication.AuthenticationType.FINGERPRINT;
  }

  private mapErrorMessage(error?: string): string {
    if (!error) return 'Authentication failed';
    
    // Map common error messages to user-friendly text
    const errorMap: Record<string, string> = {
      'UserCancel': 'Authentication was cancelled',
      'UserFallback': 'User chose to use device passcode',
      'SystemCancel': 'Authentication was cancelled by the system',
      'PasscodeNotSet': 'Device passcode is not set',
      'BiometryNotAvailable': 'Biometric authentication is not available',
      'BiometryNotEnrolled': 'No biometric credentials are enrolled',
      'BiometryLockout': 'Too many failed attempts. Biometric authentication is locked.',
      'AuthenticationFailed': 'Authentication failed. Please try again.'
    };

    return errorMap[error] || error;
  }

  private handleFailedAttempt(): void {
    this.failedAttempts++;
    
    if (this.failedAttempts >= (this.settings?.maxAttempts || 5)) {
      const lockoutDuration = (this.settings?.lockoutDuration || 15) * 60 * 1000; // Convert to ms
      this.lockoutUntil = new Date(Date.now() + lockoutDuration);
      console.log(`🔒 Biometric authentication locked out until ${this.lockoutUntil}`);
    }
  }

  private resetFailedAttempts(): void {
    this.failedAttempts = 0;
    this.lockoutUntil = null;
  }

  private isLockedOut(): boolean {
    return this.lockoutUntil !== null && Date.now() < this.lockoutUntil.getTime();
  }

  async updateSettings(newSettings: Partial<BiometricSettings>): Promise<void> {
    try {
      this.settings = {
        ...this.getDefaultSettings(),
        ...this.settings,
        ...newSettings
      };

      await SecureStore.setItemAsync('biometric_settings', JSON.stringify(this.settings));
      console.log('✅ Biometric settings updated');
    } catch (error) {
      console.error('❌ Failed to update biometric settings:', error);
      throw error;
    }
  }

  private async loadSettings(): Promise<BiometricSettings> {
    try {
      const stored = await SecureStore.getItemAsync('biometric_settings');
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('❌ Failed to load biometric settings:', error);
    }
    
    return this.getDefaultSettings();
  }

  private getDefaultSettings(): BiometricSettings {
    return {
      enabled: true,
      preferredType: null,
      fallbackToDeviceCredential: true,
      maxAttempts: 5,
      lockoutDuration: 15 // minutes
    };
  }

  async enrollBiometric(): Promise<void> {
    if (Platform.OS === 'ios') {
      // On iOS, direct users to Settings
      throw new Error('Please enroll biometric authentication in device Settings');
    } else if (Platform.OS === 'android') {
      // On Android, we can potentially guide users to enrollment
      throw new Error('Please enroll fingerprint or face unlock in device Settings');
    } else {
      throw new Error('Biometric enrollment not supported on this platform');
    }
  }

  getCapabilities(): BiometricCapabilities | null {
    return this.capabilities;
  }

  getSettings(): BiometricSettings | null {
    return this.settings;
  }

  getBiometricTypeDisplayName(type: LocalAuthentication.AuthenticationType): string {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'Fingerprint';
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'Face ID';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'Iris Scan';
      default:
        return 'Biometric';
    }
  }

  async testBiometricSecurity(): Promise<{
    securityLevel: string;
    recommendations: string[];
    warnings: string[];
  }> {
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (!this.capabilities?.isAvailable) {
      warnings.push('Biometric authentication not available');
      recommendations.push('Use strong device passcode as alternative');
    }

    if (!this.capabilities?.isEnrolled) {
      warnings.push('No biometric credentials enrolled');
      recommendations.push('Enroll fingerprint or face recognition for enhanced security');
    }

    if (this.capabilities?.securityLevel === 'biometric_strong') {
      recommendations.push('Excellent biometric security level');
    } else if (this.capabilities?.securityLevel === 'biometric') {
      recommendations.push('Good biometric security, consider upgrading device for stronger protection');
    } else {
      warnings.push('Weak or no biometric security');
      recommendations.push('Enable biometric authentication for better security');
    }

    if (this.failedAttempts > 0) {
      warnings.push(`${this.failedAttempts} recent failed authentication attempts`);
    }

    return {
      securityLevel: this.capabilities?.securityLevel || 'none',
      recommendations,
      warnings
    };
  }

  dispose(): void {
    this.capabilities = null;
    this.settings = null;
    this.failedAttempts = 0;
    this.lockoutUntil = null;
    console.log('🧹 Biometric Service disposed');
  }
}
