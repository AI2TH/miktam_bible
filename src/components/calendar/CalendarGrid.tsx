import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
} from 'date-fns';

interface CalendarGridProps {
  readDates: string[];
}

export function CalendarGrid({ readDates }: CalendarGridProps) {
  const { colors, spacing, borderRadius } = useTheme();

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const readDatesSet = new Set(readDates);

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <View style={styles.container}>
      <Text variant="h3" style={[styles.monthLabel, { marginBottom: spacing.md }]}>
        {format(today, 'MMMM yyyy')}
      </Text>

      {/* Week day abbreviations */}
      <View style={styles.weekHeader}>
        {weekDays.map((wd) => (
          <Text key={wd} variant="caption" color="textSecondary" style={styles.weekDayText}>
            {wd}
          </Text>
        ))}
      </View>

      {/* Grid of days */}
      <View style={styles.grid}>
        {days.map((day, idx) => {
          const inMonth = isSameMonth(day, today);
          const dayStr = format(day, 'yyyy-MM-dd');
          const isRead = readDatesSet.has(dayStr);
          const current = isToday(day);

          return (
            <View key={idx} style={styles.dayCell}>
              {inMonth ? (
                <View
                  style={[
                    styles.circle,
                    {
                      borderRadius: borderRadius.full,
                      backgroundColor: isRead
                        ? colors.primary
                        : current
                        ? colors.surfaceElevated
                        : 'transparent',
                      borderColor: current ? colors.primary : 'transparent',
                      borderWidth: current ? 1 : 0,
                    },
                  ]}
                >
                  <Text
                    variant="bodySmall"
                    color={isRead ? 'inverse' : 'textPrimary'}
                    style={styles.dayText}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
              ) : (
                <View />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 12,
  },
  monthLabel: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    rowGap: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontWeight: '600',
  },
});
