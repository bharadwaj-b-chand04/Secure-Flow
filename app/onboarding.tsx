import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  Eye,
  Brain,
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Welcome to SecureFlow',
    subtitle: 'The Future of Banking Security',
    description:
      'Next-gen protection that adapts to you. Convenience without compromise.',
    icon: <Shield size={64} color="#00D4FF" />,
    image: 'https://images.pexels.com/photos/5473955/pexels-photo-5473955.jpeg',
    features: [
      'Zero-friction authentication',
      'Real-time fraud detection',
      'Privacy-first design',
    ],
  },
  {
    id: '2',
    title: 'Behavioral Authentication',
    subtitle: 'Your Unique Digital Fingerprint',
    description:
      'We learn how you type, swipe, and navigate—creating an invisible shield.',
    icon: <Brain size={64} color="#00D4FF" />,
    image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg',
    features: ['Keystroke dynamics', 'Gesture patterns', 'Navigation habits'],
  },
  {
    id: '3',
    title: 'AI-Powered Protection',
    subtitle: 'Machine Learning Security',
    description:
      'Our AI adapts to threats in real time while keeping things seamless.',
    icon: <Eye size={64} color="#00D4FF" />,
    image: 'https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg',
    features: ['Risk scoring', 'Adaptive challenges', 'Fraud prevention'],
  },
  {
    id: '4',
    title: 'Privacy by Design',
    subtitle: 'Your Data Stays Yours',
    description:
      'All analysis is done on-device. Your patterns never leave your phone.',
    icon: <Lock size={64} color="#00D4FF" />,
    image: 'https://images.pexels.com/photos/5473956/pexels-photo-5473956.jpeg',
    features: ['On-device processing', 'Zero data sharing', 'Complete privacy'],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);

  const handleNext = () => {
    Haptics.selectionAsync();
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    } else {
      router.replace('/login');
    }
  };

  const handlePrevious = () => {
    Haptics.selectionAsync();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollRef.current?.scrollTo({ x: prevIndex * width, animated: true });
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  return (
    <LinearGradient colors={['#0A0A0A', '#1A1A2E']} style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <Slide key={slide.id} slide={slide} index={index} scrollX={scrollX} />
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {slides.map((_, i) => {
          const dotStyle = useAnimatedStyle(() => {
            const active = i === currentIndex;
            return {
              width: withTiming(active ? 24 : 8),
              opacity: withTiming(active ? 1 : 0.4),
            };
          });
          return <Animated.View key={i} style={[styles.dot, dotStyle]} />;
        })}
      </View>

      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navDisabled]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Previous Slide"
        >
          <ArrowLeft size={20} color={currentIndex === 0 ? '#666' : '#FFF'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/login')}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Skip to Login"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          accessible
          accessibilityRole="button"
          accessibilityLabel={
            currentIndex === slides.length - 1 ? 'Get Started' : 'Next Slide'
          }
        >
          <LinearGradient colors={['#00D4FF', '#0099CC']} style={styles.nextGradient}>
            {currentIndex === slides.length - 1 ? (
              <Text style={styles.nextText}>Get Started</Text>
            ) : (
              <ArrowRight size={20} color="#FFF" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

type SlideType = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode; // ✅ FIXED TYPE
  image: string;
  features: string[];
};

type SlideProps = {
  slide: SlideType;
  index: number;
  scrollX: Animated.SharedValue<number>;
};

function Slide({ slide, index, scrollX }: SlideProps) {
  const animation = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    const opacity = interpolate(scrollX.value, input, [0.4, 1, 0.4], Extrapolate.CLAMP);
    const scale = interpolate(scrollX.value, input, [0.9, 1, 0.9], Extrapolate.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View style={[styles.slide, animation]}>
      <View style={styles.slideContent}>
        <View style={styles.imageBox}>
          <Image
            source={{ uri: slide.image }}
            style={styles.image}
            accessible
            accessibilityLabel={`Visual theme for ${slide.title}`}
          />
          <View style={styles.imageOverlay}>
            <View style={styles.iconWrap}>{slide.icon}</View>
          </View>
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
          <Text style={styles.desc}>{slide.description}</Text>

          <View style={styles.featureList}>
            {slide.features.map((f: string, idx: number) => (
              <View key={idx} style={styles.feature}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  slide: { width, paddingTop: 60, paddingHorizontal: 24 },
  slideContent: { flex: 1, alignItems: 'center' },
  imageBox: {
    position: 'relative',
    width: width - 48,
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 40,
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0,212,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,212,255,0.5)',
  },
  textWrap: { paddingHorizontal: 16, alignItems: 'center' },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 34,
  },
  subtitle: {
    color: '#00D4FF',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginBottom: 16,
  },
  desc: {
    color: '#B0B0B0',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featureList: { width: '100%' },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D4FF',
    marginRight: 10,
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
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D4FF',
    marginHorizontal: 4,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
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
  nextGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});
