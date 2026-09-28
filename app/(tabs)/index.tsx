import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { getStreakCount, getReadingStats } from '../../src/services/readingProgressService';
import { useReaderStore } from '../../src/stores/readerStore';
import { getVerse } from '../../src/services/bibleService';
import { BOOK_NAMES } from '../../src/utils/constants';
import { cleanVerseText, formatScriptureRef } from '../../src/utils/bibleUtils';
import { getBookName } from '../../src/utils/bookTranslations';
import { Ionicons } from '@expo/vector-icons';
import { isDatabaseInitialized } from '../../src/services/database';

export default function HomeScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { currentBookNumber, currentChapter, currentVersionId, navigateTo } = useReaderStore();
  
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ totalChaptersRead: 0, totalReadingTimeSecs: 0, chaptersReadThisWeek: 0 });
  const [votd, setVotd] = useState({ ref: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', book: 43, chapter: 3, verse: 16 });

  useEffect(() => {
    let active = true;
    async function loadHomeData() {
      try {
        let retries = 0;
        while (!isDatabaseInitialized() && retries < 15) {
          if (!active) return;
          await new Promise((resolve) => setTimeout(resolve, 300));
          retries++;
        }

        if (!isDatabaseInitialized()) {
          console.warn('[Home] Database was not initialized after retries. Aborting load.');
          return;
        }

        const streakCount = await getStreakCount();
        if (active) setStreak(streakCount);

        const progressStats = await getReadingStats();
        if (active) setStats(progressStats);

        // Fetch John 3:16 as default VOTD. If downloaded, get actual translation text.
        const dbVerse = await getVerse(currentVersionId, 43, 3, 16);
        if (dbVerse && active) {
          const johnName = getBookName(43, currentVersionId);
          setVotd({
            ref: `${johnName} 3:16`,
            text: cleanVerseText(dbVerse.text),
            book: 43,
            chapter: 3,
            verse: 16
          });
        }
      } catch (e) {
        console.warn('[Home] Failed to load statistics or VOTD from database:', e);
      }
    }
    loadHomeData();
    return () => {
      active = false;
    };
  }, [currentVersionId]);

  const handleContinueReading = () => {
    router.push({
      pathname: '/(tabs)/read/[book]/[chapter]',
      params: { book: currentBookNumber.toString(), chapter: currentChapter.toString() }
    });
  };

  const handleReadVotd = () => {
    navigateTo(votd.book, votd.chapter);
    router.push({
      pathname: '/(tabs)/read/[book]/[chapter]',
      params: { book: votd.book.toString(), chapter: votd.chapter.toString() }
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { padding: spacing.base }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { marginBottom: spacing.lg }]}>
          <View>
            <Text variant="h1" style={styles.title}>
              Miktam Bible
            </Text>
            <Text variant="bodySmall" color="textSecondary">
              Your offline study companion
            </Text>
          </View>
          <View style={[styles.streakContainer, { backgroundColor: colors.surface, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}>
            <Text style={styles.flame}>🔥</Text>
            <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{streak}</Text>
          </View>
        </View>

        {/* Continue Reading Card */}
        <Card style={[styles.continueCard, { marginBottom: spacing.md }]} bordered>
          <View style={styles.cardHeader}>
            <Ionicons name="bookmark-outline" color={colors.primary} size={22} />
            <Text variant="h3" style={[styles.cardTitle, { marginLeft: spacing.xs }]}>
              Continue Study
            </Text>
          </View>
          <Text variant="body" style={[styles.continueText, { marginVertical: spacing.sm }]}>
            {getBookName(currentBookNumber, currentVersionId)} {currentChapter}
          </Text>
          <Button label="Resume Reading" onPress={handleContinueReading} variant="primary" />
        </Card>

        {/* Verse of the Day Card */}
        <Card style={[styles.votdCard, { marginBottom: spacing.md }]} bordered>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles-outline" color={colors.primary} size={22} />
            <Text variant="h3" style={[styles.cardTitle, { marginLeft: spacing.xs, flex: 1 }]}>
              Verse of the Day
            </Text>
          </View>
          <Text variant="scripture" style={[styles.votdText, { marginVertical: spacing.md }]}>
            "{votd.text}"
          </Text>
          <View style={styles.votdFooter}>
            <Text variant="bodySmall" color="primary" style={{ fontWeight: 'bold' }}>
              — {formatScriptureRef({ bookNumber: votd.book, chapter: votd.chapter, verseNumber: votd.verse }, currentVersionId)}
            </Text>
            <TouchableOpacity onPress={handleReadVotd}>
              <Text variant="caption" color="secondary" style={styles.readContextText}>
                Read Context →
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* AI Study Assistant Card */}
        <Card style={[styles.aiCard, { marginBottom: spacing.lg }]} bordered>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles" color={colors.primary} size={22} />
            <Text variant="h3" style={[styles.cardTitle, { marginLeft: spacing.xs, flex: 1 }]}>
              AI Study Assistant
            </Text>
            <View style={[styles.offlineBadge, { backgroundColor: colors.primaryMuted }]}>
              <Text variant="caption" color="primary" style={{ fontWeight: 'bold', fontSize: 10 }}>
                100% OFFLINE
              </Text>
            </View>
          </View>
          <Text variant="bodySmall" color="textSecondary" style={{ marginVertical: spacing.md, lineHeight: 18 }}>
            Ask theological questions, explore deep historical contexts, and unpack biblical definitions—fully computed right here on your device.
          </Text>
          <Button
            label="Chat with Assistant"
            onPress={() => router.push('/chat')}
            variant="primary"
            icon={<Ionicons name="chatbubble-ellipses-outline" size={18} color="white" />}
          />
        </Card>

        {/* Quick Action Grid */}
        <Text variant="h3" style={[styles.gridTitle, { marginBottom: spacing.sm }]}>
          Study Tools
        </Text>
        <View style={styles.grid}>


          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            style={[styles.gridItem, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="settings-outline" color={colors.primary} size={24} />
            </View>
            <Text variant="bodySmall" style={styles.gridText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/recordings')}
            style={[styles.gridItem, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="mic-outline" color={colors.primary} size={24} />
            </View>
            <Text variant="bodySmall" style={styles.gridText}>Voice Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/bookmarks')}
            style={[styles.gridItem, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="star-outline" color={colors.primary} size={24} />
            </View>
            <Text variant="bodySmall" style={styles.gridText}>Highlights</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/calendar')}
            style={[styles.gridItem, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="calendar-outline" color={colors.primary} size={24} />
            </View>
            <Text variant="bodySmall" style={styles.gridText}>Calendar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flame: {
    fontSize: 16,
    marginRight: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontWeight: 'bold',
  },
  continueCard: {
    width: '100%',
  },
  continueText: {
    fontWeight: '700',
    fontSize: 20,
  },
  votdCard: {
    width: '100%',
  },
  aiCard: {
    width: '100%',
  },
  offlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  votdText: {
    fontStyle: 'italic',
    lineHeight: 28,
  },
  votdFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readContextText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  gridTitle: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  gridItem: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridText: {
    fontWeight: 'bold',
  },
});
