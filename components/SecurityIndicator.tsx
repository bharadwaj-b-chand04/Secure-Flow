import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield, ShieldAlert, ShieldX } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';

interface SecurityIndicatorProps {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  onPress?: () => void;
  showDetails?: boolean;
}

export function SecurityIndicator({
  riskLevel,
  riskScore,
  onPress,
  showDetails = false,
}: SecurityIndicatorProps) {
  const pulseAnimation = useSharedValue(0);

  useEffect(() => {
    if (riskLevel === 'high') {
      pulseAnimation.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseAnimation);
      pulseAnimation.value = withTiming(0, { duration: 300 });
    }
    return () => cancelAnimation(pulseAnimation);
  }, [riskLevel]);

  const getIndicatorColor = useCallback(() => {
    switch (riskLevel) {
      case 'low':
        return '#00D4AA';
      case 'medium':
        return '#FFB800';
      case 'high':
        return '#FF4444';
      default:
        return '#6C757D';
    }
  }, [riskLevel]);

  const getRiskMessage = useCallback(() => {
    switch (riskLevel) {
      case 'low':
        return 'Secure Session';
      case 'medium':
        return 'Monitoring Activity';
      case 'high':
        return 'High Risk Detected';
      default:
        return 'Analyzing...';
    }
  }, [riskLevel]);

  const getIndicatorIcon = useCallback(() => {
    const color = getIndicatorColor();
    switch (riskLevel) {
      case 'low':
        return <Shield size={18} color={color} strokeWidth={2} />;
      case 'medium':
        return <ShieldAlert size={18} color={color} strokeWidth={2} />;
      case 'high':
        return <ShieldX size={18} color={color} strokeWidth={2} />;
      default:
        return <Shield size={18} color={color} strokeWidth={2} />;
    }
  }, [riskLevel, getIndicatorColor]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnimation.value, [0, 1], [1, 0.6]),
  }));

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.container, { borderColor: `${getIndicatorColor()}20` }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <Animated.View style={[styles.content, riskLevel === 'high' && animatedStyle]}>
        <View style={styles.indicator}>
          <View style={[styles.iconContainer, { backgroundColor: `${getIndicatorColor()}15` }]}>
            {getIndicatorIcon()}
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.riskText, { color: getIndicatorColor() }]}>
              {getRiskMessage()}
            </Text>
            {showDetails && (
              <Text style={styles.detailText}>
                Risk Score: {Math.min(100, Math.max(0, Math.round(riskScore * 100)))}%
              </Text>
            )}
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <View style={styles.scoreBar}>
            <Animated.View
              style={[
                styles.scoreProgress,
                {
                  width: `${Math.min(100, Math.max(0, riskScore * 100))}%`,
                  backgroundColor: getIndicatorColor(),
                },
              ]}
            />
          </View>
          <Text style={[styles.scoreText, { color: getIndicatorColor() }]}>
            {Math.min(100, Math.max(0, Math.round(riskScore * 100)))}%
          </Text>
        </View>
      </Animated.View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  riskText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'Inter-Regular',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreBar: {
    width: 80,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 3,
  },
  scoreText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    minWidth: 35,
    textAlign: 'right',
  },
});
