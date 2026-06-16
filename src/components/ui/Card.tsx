import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '../../theme';

interface CardProps extends ViewProps {
  elevation?: 'sm' | 'md' | 'lg';
  bordered?: boolean;
}

export function Card({
  elevation = 'sm',
  bordered = false,
  style,
  children,
  ...props
}: CardProps) {
  const { colors, borderRadius, shadows, spacing } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          padding: spacing.base,
          borderColor: bordered ? colors.border : 'transparent',
          borderWidth: bordered ? 1 : 0,
        },
        shadows[elevation],
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
