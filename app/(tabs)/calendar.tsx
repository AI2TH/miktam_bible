import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { Header } from '../../src/components/shared/Header';
import { StreakBadge } from '../../src/components/calendar/StreakBadge';
import { CalendarGrid } from '../../src/components/calendar/CalendarGrid';
import { ReadingStats } from '../../src/components/calendar/ReadingStats';
import { getStreakCount, getReadingStats, getReadDatesInRange } from '../../src/services/readingProgressService';
import { getPromiseVerse, savePromiseVerse, deletePromiseVerse, SUGGESTED_PROMISE_VERSES, PromiseVerseInfo } from '../../src/services/calendarService';
import { getVerse } from '../../src/services/bibleService';
import { useReaderStore } from '../../src/stores/readerStore';
import { BOOK_NAMES } from '../../src/utils/constants';
import { cleanVerseText } from '../../src/utils/bibleUtils';
import { getBookName } from '../../src/utils/bookTranslations';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { isDatabaseInitialized } from '../../src/services/database';

const CHAPTERS_PER_BOOK: Record<number, number> = {
  1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4, 9: 31, 10: 24,
  11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13, 17: 10, 18: 42, 19: 150, 20: 31,
  21: 12, 22: 8, 23: 66, 24: 52, 25: 5, 26: 48, 27: 12, 28: 14, 29: 3, 30: 9,
  31: 1, 32: 4, 33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14, 39: 4,
  40: 28, 41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13, 48: 6, 49: 6,
  50: 4, 51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3, 57: 1, 58: 13, 59: 5,
  60: 5, 61: 3, 62: 5, 63: 1, 64: 1, 65: 1, 66: 22
};

export default function CalendarScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { currentVersionId, navigateTo } = useReaderStore();

  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ totalChaptersRead: 0, totalReadingTimeSecs: 0, chaptersReadThisWeek: 0 });
  const [readDates, setReadDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Promise Verses State
  const [yearlyPromise, setYearlyPromise] = useState<PromiseVerseInfo | null>(null);
  const [monthlyPromise, setMonthlyPromise] = useState<PromiseVerseInfo | null>(null);

  // Selector Modal State
  const [showSelector, setShowSelector] = useState(false);
  const [selectorType, setSelectorType] = useState<'monthly' | 'yearly'>('yearly');
  const [selectorMode, setSelectorMode] = useState<'suggested' | 'custom'>('suggested');

  // Custom Selection State
  const [customBookNum, setCustomBookNum] = useState<number>(43); // Default John
  const [customChapter, setCustomChapter] = useState<string>('3');
  const [customVerse, setCustomVerse] = useState<string>('16');
  const [savingCustom, setSavingCustom] = useState(false);

  const currentYear = format(new Date(), 'yyyy');
  const currentMonthStr = format(new Date(), 'yyyy-MM');

  const loadProgressAndPromises = async (active: boolean = true) => {
    try {
      let retries = 0;
      while (!isDatabaseInitialized() && retries < 15) {
        if (!active) return;
        await new Promise((resolve) => setTimeout(resolve, 300));
        retries++;
      }

      if (!isDatabaseInitialized()) {
        console.warn('[Calendar] Database was not initialized after retries. Aborting load.');
        return;
      }

      // Load streak and stats
      const streakCount = await getStreakCount();
      if (active) setStreak(streakCount);

      const currentStats = await getReadingStats();
      if (active) setStats(currentStats);

      const today = new Date();
      const start = format(startOfMonth(today), 'yyyy-MM-dd');
      const end = format(endOfMonth(today), 'yyyy-MM-dd');
      const dates = await getReadDatesInRange(start, end);
      if (active) setReadDates(dates);

      // Load Promise Verses
      const yrPromise = await getPromiseVerse('yearly', currentYear, currentVersionId);
      if (active) setYearlyPromise(yrPromise);

      const mthPromise = await getPromiseVerse('monthly', currentMonthStr, currentVersionId);
      if (active) setMonthlyPromise(mthPromise);
    } catch (e) {
      console.error('[Calendar] Failed to load progress or promise data:', e);
    } finally {
      if (active) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadProgressAndPromises(active);
    return () => {
      active = false;
    };
  }, [currentVersionId]);

  const handleOpenSelector = (type: 'monthly' | 'yearly') => {
    setSelectorType(type);
    setSelectorMode('suggested');
    setShowSelector(true);
  };

  const handleSelectSuggested = async (suggested: typeof SUGGESTED_PROMISE_VERSES[0]) => {
    try {
      const targetDate = selectorType === 'yearly' ? currentYear : currentMonthStr;
      
      // Save promise verse
      await savePromiseVerse(
        selectorType,
        targetDate,
        suggested.versionId,
        suggested.bookNumber,
        suggested.chapter,
        suggested.verseNumber,
        'suggested'
      );

      setShowSelector(false);
      loadProgressAndPromises();
      Alert.alert('Success', `Promise verse of the ${selectorType === 'yearly' ? 'Year' : 'Month'} set successfully!`);
    } catch (e) {
      console.error('[Calendar] Failed to save suggested promise:', e);
      Alert.alert('Error', 'Failed to save promise verse. Please try again.');
    }
  };

  const handleSaveCustom = async () => {
    const chapNum = parseInt(customChapter);
    const vNum = parseInt(customVerse);

    if (!chapNum || chapNum <= 0) {
      Alert.alert('Invalid Chapter', 'Please enter a valid chapter number.');
      return;
    }
    if (!vNum || vNum <= 0) {
      Alert.alert('Invalid Verse', 'Please enter a valid verse number.');
      return;
    }

    const maxChapters = CHAPTERS_PER_BOOK[customBookNum] || 50;
    if (chapNum > maxChapters) {
      Alert.alert('Invalid Chapter', `The book of ${getBookName(customBookNum, currentVersionId)} only has ${maxChapters} chapters.`);
      return;
    }

    setSavingCustom(true);
    try {
      // 1. Fetch verse text to verify offline availability
      const dbVerse = await getVerse(currentVersionId, customBookNum, chapNum, vNum);
      if (!dbVerse) {
        // Fallback to KJV lookup in case the preferred version has partial text
        const fallbackVerse = await getVerse('kjv', customBookNum, chapNum, vNum);
        if (!fallbackVerse) {
          Alert.alert(
            'Verse Not Found',
            `Could not find ${getBookName(customBookNum, currentVersionId)} ${chapNum}:${vNum} in your downloaded versions. Make sure you select a valid verse.`
          );
          setSavingCustom(false);
          return;
        }
      }

      // 2. Save custom promise verse
      const targetDate = selectorType === 'yearly' ? currentYear : currentMonthStr;
      await savePromiseVerse(
        selectorType,
        targetDate,
        currentVersionId,
        customBookNum,
        chapNum,
        vNum,
        'custom'
      );

      setShowSelector(false);
      loadProgressAndPromises();
      Alert.alert('Success', `Custom promise verse of the ${selectorType === 'yearly' ? 'Year' : 'Month'} set successfully!`);
    } catch (e) {
      console.error('[Calendar] Failed to save custom promise:', e);
      Alert.alert('Error', 'Failed to save custom promise verse.');
    } finally {
      setSavingCustom(false);
    }
  };

  const handleNavigateToPromise = (promise: PromiseVerseInfo) => {
    navigateTo(promise.bookNumber, promise.chapter);
    router.push({
      pathname: '/(tabs)/read/[book]/[chapter]',
      params: { book: promise.bookNumber.toString(), chapter: promise.chapter.toString() }
    });
  };

  const handleRemovePromise = (type: 'monthly' | 'yearly') => {
    Alert.alert(
      'Remove Promise Verse',
      `Are you sure you want to remove your promise verse of the ${type === 'yearly' ? 'Year' : 'Month'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const targetDate = type === 'yearly' ? currentYear : currentMonthStr;
              await deletePromiseVerse(type, targetDate);
              loadProgressAndPromises();
            } catch (err) {
              console.error('[Calendar] Failed to delete promise:', err);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Study Progress & Promises" />
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.base, gap: spacing.lg }]} showsVerticalScrollIndicator={false}>
        
        {/* Streak Flame Badge */}
        <StreakBadge streakCount={streak} />

        {/* ─── PROMISE VERSES SECTION (Gold Premium Aesthetic) ─── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <Text variant="h2" style={styles.sectionTitle}>
            My Promise Scriptures
          </Text>
        </View>

        {/* Promise of the Year */}
        <Card style={[styles.promiseCard, { borderColor: colors.primary, borderWidth: 1 }]} elevation="md">
          <View style={styles.promiseHeader}>
            <View style={[styles.goldBadge, { backgroundColor: colors.primaryMuted }]}>
              <Text variant="caption" color="primary" style={{ fontWeight: 'bold' }}>
                PROMISE OF THE YEAR {currentYear}
              </Text>
            </View>
            {yearlyPromise && (
              <TouchableOpacity onPress={() => handleRemovePromise('yearly')}>
                <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {yearlyPromise ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="scripture" style={styles.promiseText}>
                "{cleanVerseText(yearlyPromise.verseText || 'No text found')}"
              </Text>
              <View style={styles.promiseFooter}>
                <Text variant="bodySmall" color="primary" style={{ fontWeight: 'bold' }}>
                  — {getBookName(yearlyPromise.bookNumber, currentVersionId)} {yearlyPromise.chapter}:{yearlyPromise.verseNumber} ({yearlyPromise.versionId.toUpperCase()})
                </Text>
                <TouchableOpacity onPress={() => handleNavigateToPromise(yearlyPromise)}>
                  <Text variant="caption" color="secondary" style={styles.readLink}>
                    Read Chapter →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyPromiseContainer}>
              <Text variant="bodySmall" color="textSecondary" style={{ fontStyle: 'italic', marginBottom: spacing.sm }}>
                Set a scripture to anchor your study and walk this year.
              </Text>
              <Button
                label="Choose Promise of the Year"
                variant="outline"
                onPress={() => handleOpenSelector('yearly')}
                icon={<Ionicons name="add-circle-outline" size={16} color={colors.textPrimary} />}
              />
            </View>
          )}
        </Card>

        {/* Promise of the Month */}
        <Card style={[styles.promiseCard, { borderColor: colors.border, borderWidth: 1 }]} elevation="sm">
          <View style={styles.promiseHeader}>
            <View style={[styles.silverBadge, { backgroundColor: colors.surfaceMuted }]}>
              <Text variant="caption" color="textSecondary" style={{ fontWeight: 'bold' }}>
                PROMISE OF THE MONTH ({format(new Date(), 'MMMM')})
              </Text>
            </View>
            {monthlyPromise && (
              <TouchableOpacity onPress={() => handleRemovePromise('monthly')}>
                <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {monthlyPromise ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="scripture" style={styles.promiseText}>
                "{cleanVerseText(monthlyPromise.verseText || 'No text found')}"
              </Text>
              <View style={styles.promiseFooter}>
                <Text variant="bodySmall" color="primary" style={{ fontWeight: 'bold' }}>
                  — {getBookName(monthlyPromise.bookNumber, currentVersionId)} {monthlyPromise.chapter}:{monthlyPromise.verseNumber} ({monthlyPromise.versionId.toUpperCase()})
                </Text>
                <TouchableOpacity onPress={() => handleNavigateToPromise(monthlyPromise)}>
                  <Text variant="caption" color="secondary" style={styles.readLink}>
                    Read Chapter →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyPromiseContainer}>
              <Text variant="bodySmall" color="textSecondary" style={{ fontStyle: 'italic', marginBottom: spacing.sm }}>
                Keep a dedicated scripture promise for this month.
              </Text>
              <Button
                label="Choose Promise of the Month"
                variant="outline"
                onPress={() => handleOpenSelector('monthly')}
                icon={<Ionicons name="add-circle-outline" size={16} color={colors.textPrimary} />}
              />
            </View>
          )}
        </Card>

        {/* Calendar Grid View */}
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text variant="h2" style={styles.sectionTitle}>
            Daily Attendance
          </Text>
        </View>
        <CalendarGrid readDates={readDates} />

        {/* Statistics Panels */}
        <View style={styles.sectionHeader}>
          <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
          <Text variant="h2" style={styles.sectionTitle}>
            Reading Metrics
          </Text>
        </View>
        <ReadingStats stats={stats} />
      </ScrollView>

      {/* ─── PROMISE SELECTOR BOTTOM SHEET ─── */}
      <BottomSheet
        visible={showSelector}
        onClose={() => setShowSelector(false)}
        title={`Set Promise of the ${selectorType === 'yearly' ? 'Year' : 'Month'}`}
        maxHeight="85%"
      >
        <ScrollView contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.sm }} showsVerticalScrollIndicator={false}>
          
          {/* Tabs for Suggested vs Custom */}
          <View style={[styles.tabBar, { backgroundColor: colors.surface, borderRadius: borderRadius.md }]}>
            <TouchableOpacity
              style={[
                styles.tabItem,
                selectorMode === 'suggested' && { backgroundColor: colors.primary, borderRadius: borderRadius.md }
              ]}
              onPress={() => setSelectorMode('suggested')}
            >
              <Text
                variant="bodySmall"
                style={{ fontWeight: 'bold' }}
                color={selectorMode === 'suggested' ? 'inverse' : 'textSecondary'}
              >
                Suggested Promises
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabItem,
                selectorMode === 'custom' && { backgroundColor: colors.primary, borderRadius: borderRadius.md }
              ]}
              onPress={() => setSelectorMode('custom')}
            >
              <Text
                variant="bodySmall"
                style={{ fontWeight: 'bold' }}
                color={selectorMode === 'custom' ? 'inverse' : 'textSecondary'}
              >
                Custom Verse
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode 1: Suggested list */}
          {selectorMode === 'suggested' && (
            <View style={{ gap: spacing.base }}>
              <Text variant="bodySmall" color="textSecondary" style={{ fontStyle: 'italic' }}>
                Select one of these curated encouraging promise verses:
              </Text>
              {SUGGESTED_PROMISE_VERSES.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => handleSelectSuggested(item)}
                >
                  <Card style={styles.suggestedCard} bordered>
                    <Text variant="scripture" style={[styles.suggestedText, { marginBottom: spacing.xs }]}>
                      "{item.text}"
                    </Text>
                    <Text variant="bodySmall" color="primary" style={{ fontWeight: 'bold', textAlign: 'right' }}>
                      — {getBookName(item.bookNumber, currentVersionId)} {item.chapter}:{item.verseNumber}
                    </Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Mode 2: Custom Pickers */}
          {selectorMode === 'custom' && (
            <View style={{ gap: spacing.md }}>
              <Text variant="bodySmall" color="textSecondary">
                Enter coordinates for any verse in the Bible. It will be fetched offline from your current translation ({currentVersionId.toUpperCase()}).
              </Text>

              {/* Book Picker list */}
              <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>
                Select Book:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.xs, paddingBottom: spacing.xs }}
              >
                {Object.entries(BOOK_NAMES).map(([numStr, name]) => {
                  const num = parseInt(numStr);
                  const isSelected = customBookNum === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setCustomBookNum(num)}
                      style={[
                        styles.bookChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: borderRadius.full,
                          paddingHorizontal: spacing.base,
                          paddingVertical: spacing.xs,
                        }
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{ fontWeight: 'bold' }}
                        color={isSelected ? 'inverse' : 'textPrimary'}
                      >
                        {getBookName(num, currentVersionId)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Chapter and Verse Numbers */}
              <View style={styles.numericRow}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>
                    Chapter Number:
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                        borderRadius: borderRadius.md,
                        padding: spacing.sm,
                      }
                    ]}
                    keyboardType="numeric"
                    value={customChapter}
                    onChangeText={setCustomChapter}
                    placeholder="e.g. 3"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>
                    Verse Number:
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                        borderRadius: borderRadius.md,
                        padding: spacing.sm,
                      }
                    ]}
                    keyboardType="numeric"
                    value={customVerse}
                    onChangeText={setCustomVerse}
                    placeholder="e.g. 16"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              <Button
                label="Save Custom Promise Verse"
                onPress={handleSaveCustom}
                loading={savingCustom}
                style={{ marginTop: spacing.md }}
              />
            </View>
          )}

        </ScrollView>
      </BottomSheet>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  promiseCard: {
    width: '100%',
    padding: 16,
  },
  promiseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goldBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  silverBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  promiseText: {
    fontStyle: 'italic',
    lineHeight: 24,
    fontSize: 16,
  },
  promiseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  readLink: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  emptyPromiseContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    width: '100%',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedCard: {
    padding: 12,
    width: '100%',
  },
  suggestedText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  bookChip: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  numericRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
    textAlign: 'center',
  },
});

