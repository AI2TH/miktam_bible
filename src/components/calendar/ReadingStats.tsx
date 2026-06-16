import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';

interface ReadingStatsProps {
  stats: {
    totalChaptersRead: number;
    totalReadingTimeSecs: number;
    chaptersReadThisWeek: number;
  };
}

export function ReadingStats({ stats }: ReadingStatsProps) {
  const { spacing } = useTheme();

  const totalMinutes = Math.round(stats.totalReadingTimeSecs / 60);

  return (
    <View style={[styles.container, { gap: spacing.md }]}>
      <Card style={styles.statCard}>
        <Text variant="caption" color="textSecondary">
          Chapters Read
        </Text>
        <Text variant="h1" color="primary" style={styles.value}>
          {stats.totalChaptersRead}
        </Text>
      </Card>

      <Card style={styles.statCard}>
        <Text variant="caption" color="textSecondary">
          Time Spent
        </Text>
        <Text variant="h1" color="primary" style={styles.value}>
          {totalMinutes} {totalMinutes === 1 ? 'min' : 'mins'}
        </Text>
      </Card>

      <Card style={styles.statCard}>
        <Text variant="caption" color="textSecondary">
          This Week
        </Text>
        <Text variant="h1" color="primary" style={styles.value}>
          {stats.chaptersReadThisWeek}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontWeight: 'bold',
    marginTop: 4,
  },
});
