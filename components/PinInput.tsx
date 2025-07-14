import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { BehaviorTracker } from '@/services/BehaviorTracker';

interface PinInputProps {
  onComplete: (pin: string) => void;
  onKeystroke?: (key: string, timestamp: number) => void;
  length?: number;
  isDecoy?: boolean;
}

const FEEDBACK_DELAY = 150;

export function PinInput({
  onComplete,
  onKeystroke,
  length = 6,
  isDecoy = false,
}: PinInputProps) {
  const [pin, setPin] = useState('');
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const behaviorTracker = BehaviorTracker.getInstance();

  useEffect(() => {
    if (pin.length === length) {
      onComplete(pin);
    }
  }, [pin, length, onComplete]);

  const handleKeyPress = (key: string) => {
    const timestamp = Date.now();
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), FEEDBACK_DELAY);
    Vibration.vibrate(50);

    behaviorTracker.recordKeystroke(key, timestamp);
    onKeystroke?.(key, timestamp);

    switch (key) {
      case 'clear':
        setPin('');
        break;
      case 'delete':
        setPin(prev => prev.slice(0, -1));
        break;
      default:
        if (pin.length < length) {
          setPin(prev => prev + key);
        }
    }
  };

  const keypadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'delete'],
  ];

  return (
    <View style={styles.container}>
      <View style={styles.pinDisplay}>
        {Array.from({ length }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index && styles.pinDotFilled,
              isDecoy && styles.pinDotDecoy,
            ]}
          />
        ))}
      </View>

      <View style={styles.keypad}>
        {keypadNumbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => {
              const isAction = key === 'clear' || key === 'delete';
              const label = key === 'clear' ? 'CLR' : key === 'delete' ? '⌫' : key;

              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleKeyPress(key)}
                  style={[
                    styles.keypadButton,
                    pressedKey === key && styles.keypadButtonPressed,
                    isAction && styles.keypadButtonAction,
                  ]}
                  activeOpacity={0.7}
                  accessibilityLabel={`${label} button`}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.keypadButtonText,
                      isAction && styles.keypadButtonActionText,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 12,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#333333',
    borderWidth: 2,
    borderColor: '#555555',
  },
  pinDotFilled: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pinDotDecoy: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  keypad: {
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  keypadButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#404040',
  },
  keypadButtonPressed: {
    backgroundColor: '#007AFF',
    transform: [{ scale: 0.95 }],
  },
  keypadButtonAction: {
    backgroundColor: '#1A1A1A',
  },
  keypadButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  keypadButtonActionText: {
    color: '#007AFF',
    fontSize: 18,
  },
});
