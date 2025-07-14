import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  Eye,
  Brain,
  Smartphone,
  Lock,
  Zap,
  Users,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
  features?: string[];
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Welcome to SecureFlow',
    subtitle: 'The Future of Banking Security',
    description: 'Experience next-generation protection that learns your unique patterns and keeps your money safe without compromising convenience.',
    icon: <Shield size={64} color="#00D4FF" />,
    image: 'https://images.pexels.com/photos/5473955/pexels-photo-5473955.jpeg?auto=compress&cs=tinysrgb&w=800',
    features: ['Zero-friction authentication', 'Real-time fraud detection', 'Privacy-first design'],
  },
  {
    id: '2',
    title: 'Behavioral Authentication',
    subtitle: 'Your Unique Digital Fingerprint',
    description: 'SecureFlow learns how you type, swipe, and navigate. This creates an invisible shield that protects against unauthorized access.',
    icon: <Brain size={64} color="#00D4FF" />,
    image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=800',
    features: ['Keystroke dynamics', 'Gesture patterns', 'Navigation habits'],
  },
  {
    id: '3',
    title: 'AI-Powered Protection',
    subtitle: 'Machine Learning Security',
    description: 'Our advanced AI continuously monitors for suspicious activity, adapting to new threats while maintaining seamless user experience.',
    icon: <Eye size={64} color="#00D4FF" />,
    image: 'https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg?auto=compress&cs=tinysrgb&w=800',
    features: ['Real-time risk scoring', 'Adaptive challenges', 'Fraud prevention'],
  },
  {
    id: '4',
    title: 'Privacy by Design',
    subtitle: 'Your Data Stays Yours',
    description: 'All behavioral analysis happens on your device. Your patterns never leave your phone, ensuring complete privacy and security.',
    icon: <Lock size={64} color="#00D4FF" />,
    image: 'https://images.pexels.com/photos/5473956/pexels-photo-5473956.jpeg?auto=compress&cs=tinysrgb&w=800',
    features: ['On-device processing', 'Zero data sharing', 'Complete privacy'],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    } else {
      router.replace('/login');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollViewRef.current?.scrollTo({
        x: prevIndex * width,
        animated: true,
      });
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  return (
    <LinearGradient colors={['#0A0A0A', '#1A1A2E', '#16213E']} style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <SlideComponent key={slide.id} slide={slide} index={index} scrollX={scrollX} />
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const dotStyle = useAnimatedStyle(() => {
            const isActive = index === currentIndex;
            return {
              width: withTiming(isActive ? 24 : 8, { duration: 300 }),
              opacity: withTiming(isActive ? 1 : 0.5, { duration: 300 }),
            };
          });

          return (
            <Animated.View
              key={index}
              style={[styles.paginationDot, dotStyle]}
            />
          );
        })}
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft size={20} color={currentIndex === 0 ? '#666' : '#FFFFFF'} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/login')}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <LinearGradient colors={['#00D4FF', '#0099CC']} style={styles.nextButtonGradient}>
            {currentIndex === slides.length - 1 ? (
              <Text style={styles.nextButtonText}>Get Started</Text>
            ) : (
              <ArrowRight size={20} color="#FFFFFF" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function SlideComponent({
  slide,
  index,
  scrollX,
}: {
  slide: OnboardingSlide;
  index: number;
  scrollX: Animated.SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolate.CLAMP
    );
    
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.slide, animatedStyle]}>
      <View style={styles.slideContent}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: slide.image }} style={styles.slideImage} />
          <View style={styles.imageOverlay}>
            <View style={styles.iconContainer}>
              {slide.icon}
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.textContent}>
          <Text style={styles.slideTitle}>{slide.title}</Text>
          <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
          <Text style={styles.slideDescription}>{slide.description}</Text>

          {/* Features */}
          {slide.features && (
            <View style={styles.featuresContainer}>
              {slide.features.map((feature, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    width: width - 48,
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 40,
  },
  slideImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 212, 255, 0.5)',
  },
  textContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  slideTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 34,
  },
  slideSubtitle: {
    color: '#00D4FF',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDescription: {
    color: '#B0B0B0',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresContainer: {
    alignSelf: 'stretch',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D4FF',
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D4FF',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: '#B0B0B0',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  nextButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});