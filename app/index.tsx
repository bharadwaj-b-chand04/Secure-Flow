import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, ArrowRight, Zap, Lock, Brain } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  interpolate,
  Easing
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const pulseAnimation = useSharedValue(0);
  const floatAnimation = useSharedValue(0);

  useEffect(() => {
    // Start animations
    pulseAnimation.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    
    floatAnimation.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Auto-redirect to login after 3 seconds
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 4000);

    return () => clearTimeout(timer);
  }, [router]);

  const animatedShieldStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnimation.value, [0, 1], [1, 1.1]);
    const opacity = interpolate(pulseAnimation.value, [0, 1], [0.8, 1]);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const animatedFloatStyle = useAnimatedStyle(() => {
    const translateY = interpolate(floatAnimation.value, [0, 1], [0, -10]);
    
    return {
      transform: [{ translateY }],
    };
  });

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A2E', '#16213E']}
      style={styles.container}
    >
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        {Array.from({ length: 20 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternDot,
              {
                left: Math.random() * width,
                top: Math.random() * height,
                opacity: Math.random() * 0.3,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, animatedFloatStyle]}>
          <Animated.View style={[styles.shieldContainer, animatedShieldStyle]}>
            <Shield size={64} color="#00D4FF" strokeWidth={1.5} />
            <View style={styles.shieldGlow} />
          </Animated.View>
          
          <Text style={styles.logoText}>SecureFlow</Text>
          <Text style={styles.tagline}>
            Next-Generation Banking Security
          </Text>
        </Animated.View>

        <View style={styles.features}>
          <FeatureCard
            icon={<Lock size={24} color="#00D4FF" />}
            title="Real-time Security"
            description="Continuous behavioral monitoring"
          />
          <FeatureCard
            icon={<Brain size={24} color="#00D4FF" />}
            title="AI-Powered Protection"
            description="Machine learning fraud detection"
          />
          <FeatureCard
            icon={<Zap size={24} color="#00D4FF" />}
            title="Seamless Experience"
            description="Zero-friction authentication"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => router.replace('/onboarding')}
          >
            <LinearGradient
              colors={['#00D4FF', '#0099CC']}
              style={styles.buttonGradient}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.skipText}>Skip to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>
        {icon}
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternDot: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#00D4FF',
    borderRadius: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  shieldContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  shieldGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: '#00D4FF',
    opacity: 0.2,
    borderRadius: 50,
    zIndex: -1,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontFamily: 'Inter-Black',
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    color: '#B0B0B0',
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
    lineHeight: 24,
  },
  features: {
    width: '100%',
    marginBottom: 80,
    gap: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  featureDescription: {
    color: '#B0B0B0',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  getStartedButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  skipText: {
    color: '#B0B0B0',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});