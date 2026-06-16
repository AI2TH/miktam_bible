import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';

interface StreakBadgeProps {
  streakCount: number;
}

export function StreakBadge({ streakCount }: StreakBadgeProps) {
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primaryMuted,
          borderColor: colors.primary,
          borderRadius: borderRadius.lg,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      <Text style={styles.flame}>🔥</Text>
      <Text variant="h3" color="primary" style={styles.text}>
        {streakCount} {streakCount === 1 ? 'Day' : 'Days'} Streak
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    alignSelf: 'center',
  },
  flame: {
    fontSize: 20,
    marginRight: 6,
  },
  text: {
    fontWeight: 'bold',
  },
});
