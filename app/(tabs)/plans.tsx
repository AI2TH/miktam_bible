import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { Header } from '../../src/components/shared/Header';
import { StreakBadge } from '../../src/components/calendar/StreakBadge';
import { ReadingPlanSection } from '../../src/components/calendar/ReadingPlanSection';
import {
  getActiveReadingPlan,
  getTodayReading,
  startReadingPlan,
  completeDayReading,
  cancelReadingPlan,
  updatePlanReminder,
  PlanType,
  ReadingPlan,
  ReadingPlanDay,
} from '../../src/services/readingPlanService';
import { getStreakCount } from '../../src/services/readingProgressService';
import { useReaderStore } from '../../src/stores/readerStore';
import { router, useNavigation } from 'expo-router';
import { isDatabaseInitialized } from '../../src/services/database';

export default function PlansScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();
  const { navigateTo } = useReaderStore();

  const [readingPlan, setReadingPlan] = useState<ReadingPlan | null>(null);
  const [todayReading, setTodayReading] = useState<ReadingPlanDay | null>(null);
  const [streak, setStreak] = useState(0);

  const loadPlanData = async () => {
    try {
      if (!isDatabaseInitialized()) return;
      const plan = await getActiveReadingPlan();
      setReadingPlan(plan);
      if (plan) {
        const reading = await getTodayReading(plan.id);
        setTodayReading(reading);
      } else {
        setTodayReading(null);
      }
      const streakCount = await getStreakCount();
      setStreak(streakCount);
    } catch (e) {
      console.error('[PlansScreen] Failed to load reading plan data:', e);
    }
  };

  useEffect(() => {
    let active = true;
    async function init() {
      let retries = 0;
      while (!isDatabaseInitialized() && retries < 15) {
        if (!active) return;
        await new Promise((resolve) => setTimeout(resolve, 300));
        retries++;
      }
      if (active) loadPlanData();
    }
    init();
    const unsubscribe = navigation.addListener('focus', () => {
      loadPlanData();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigation]);

  const handleStartPlan = async (
    type: PlanType,
    reminderTime: string,
    reminderEnabled: boolean,
    customConfig?: {
      title?: string;
      durationDays?: number;
      scope?: 'whole' | 'nt' | 'ot' | 'gospels' | 'wisdom';
      startDate?: string;
    }
  ) => {
    const newPlan = await startReadingPlan(type, reminderTime, reminderEnabled, customConfig);
    setReadingPlan(newPlan);
    loadPlanData();
    Alert.alert('Reading Plan Started', `Your ${newPlan.title} has begun! Daily reading has been set on your calendar.`);
  };

  const handleCompletePlanDay = async (dayNumber: number) => {
    if (!readingPlan) return;
    await completeDayReading(readingPlan.id, dayNumber);
    loadPlanData();
    Alert.alert('Congratulations! 🎉', "Today's Bible reading marked as complete! Keep it up.");
  };

  const handleCancelPlan = () => {
    if (!readingPlan) return;
    Alert.alert(
      'Switch / Cancel Reading Plan',
      'Are you sure you want to stop your current reading plan?',
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Stop Plan',
          style: 'destructive',
          onPress: async () => {
            await cancelReadingPlan(readingPlan.id);
            setReadingPlan(null);
            setTodayReading(null);
          },
        },
      ]
    );
  };

  const handleUpdatePlanReminder = async (enabled: boolean, timeStr: string) => {
    if (!readingPlan) return;
    await updatePlanReminder(readingPlan.id, enabled, timeStr);
    loadPlanData();
  };

  const handleNavigateToReading = (bookNum: number, chapNum: number) => {
    navigateTo(bookNum, chapNum);
    router.push({
      pathname: '/(tabs)/read/[book]/[chapter]',
      params: { book: bookNum.toString(), chapter: chapNum.toString() },
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Bible Reading Planner" />
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.base, gap: spacing.lg, paddingBottom: spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Dedicated Reading Plan Section & Custom Generator */}
        <ReadingPlanSection
          plan={readingPlan}
          todayReading={todayReading}
          onStartPlan={handleStartPlan}
          onCompleteDay={handleCompletePlanDay}
          onCancelPlan={handleCancelPlan}
          onUpdateReminder={handleUpdatePlanReminder}
          onNavigateToReading={handleNavigateToReading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
