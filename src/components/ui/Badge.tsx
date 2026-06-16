import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from './Text';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  style?: any;
}

export function Badge({
  label,
  variant = 'primary',
  style,
}: BadgeProps) {
  const { colors, borderRadius, spacing } = useTheme();

  let backgroundColor: string = colors.primaryMuted;
  let textColor: any = 'primary';

  switch (variant) {
    case 'primary':
      backgroundColor = colors.primaryMuted;
      textColor = 'primary';
      break;
    case 'secondary':
      backgroundColor = colors.secondaryMuted;
      textColor = 'secondary';
      break;
    case 'success':
      backgroundColor = 'rgba(92,184,92,0.15)';
      textColor = 'textPrimary';
      break;
    case 'warning':
      backgroundColor = 'rgba(240,173,78,0.15)';
      textColor = 'textPrimary';
      break;
    case 'error':
      backgroundColor = 'rgba(217,83,79,0.15)';
      textColor = 'textPrimary';
      break;
    case 'info':
      backgroundColor = 'rgba(91,192,222,0.15)';
      textColor = 'textPrimary';
      break;
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor,
          borderRadius: borderRadius.sm,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
        },
        style,
      ]}
    >
      <Text variant="caption" color={textColor} style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
  },
});
