import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  color?: string;
  style?: any;
}

export function ProgressBar({
  progress,
  height = 6,
  color,
  style,
}: ProgressBarProps) {
  const { colors, borderRadius } = useTheme();

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const activeColor = color || colors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: colors.surfaceMuted,
          borderRadius: borderRadius.full,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress * 100}%`,
            height: '100%',
            backgroundColor: activeColor,
            borderRadius: borderRadius.full,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    width: '0%',
  },
});
