import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import * as Haptics from 'expo-haptics';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
}

export function RecordButton({ isRecording, onPress }: RecordButtonProps) {
  const { colors, borderRadius } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1.0, { duration: 600 })
        ),
        -1, // Infinite loop
        true
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(1.0, { duration: 200 });
    }
  }, [isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      // Ignore haptics errors on emulator/unsupported devices
    }
    onPress();
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          styles.button,
          {
            backgroundColor: isRecording ? colors.error : colors.primary,
            borderRadius: borderRadius.full,
          },
        ]}
      >
        <Text style={styles.icon}>
          {isRecording ? '⏹' : '🎤'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
  },
  button: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  icon: {
    fontSize: 32,
    color: '#FFFFFF',
  },
});
