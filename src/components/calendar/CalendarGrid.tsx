import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
} from 'date-fns';

interface CalendarGridProps {
  readDates: string[];
  selectedDate?: string;
  onSelectDate?: (dateStr: string) => void;
  todoDates?: string[];
  eventDates?: string[];
}

export function CalendarGrid({
  readDates,
  selectedDate,
  onSelectDate,
  todoDates = [],
  eventDates = [],
}: CalendarGridProps) {
  const { colors, spacing, borderRadius } = useTheme();

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const readDatesSet = new Set(readDates);
  const todoDatesSet = new Set(todoDates);
  const eventDatesSet = new Set(eventDates);

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
          const hasTodo = todoDatesSet.has(dayStr);
          const hasEvent = eventDatesSet.has(dayStr);
          const current = isToday(day);
          const isSelected = selectedDate === dayStr;

          if (!inMonth) {
            return <View key={idx} style={styles.dayCell} />;
          }

          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => onSelectDate?.(dayStr)}
              style={styles.dayCell}
            >
              <View
                style={[
                  styles.circle,
                  {
                    borderRadius: borderRadius.full,
                    backgroundColor: isRead
                      ? colors.primary
                      : isSelected
                      ? colors.primary + '30'
                      : current
                      ? colors.surfaceElevated
                      : 'transparent',
                    borderColor: isSelected
                      ? colors.primary
                      : current
                      ? colors.border
                      : 'transparent',
                    borderWidth: isSelected ? 2 : current ? 1 : 0,
                  },
                ]}
              >
                <Text
                  variant="bodySmall"
                  color={isRead ? 'inverse' : isSelected ? 'primary' : 'textPrimary'}
                  style={[styles.dayText, isSelected && { fontWeight: 'bold' }]}
                >
                  {format(day, 'd')}
                </Text>
              </View>

              {/* Event / ToDo Indicators */}
              <View style={styles.indicatorRow}>
                {hasEvent && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isRead ? colors.textInverse : '#E5A93C' },
                    ]}
                  />
                )}
                {hasTodo && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isRead ? colors.textInverse : '#4E9F3D' },
                    ]}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.primary }]} />
          <Text variant="caption" color="textSecondary">Read</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#E5A93C' }]} />
          <Text variant="caption" color="textSecondary">Church Meeting</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#4E9F3D' }]} />
          <Text variant="caption" color="textSecondary">Daily To-Do</Text>
        </View>
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
    rowGap: 4,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontWeight: '600',
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    height: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
