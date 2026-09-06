import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../../src/theme';
import { Header } from '../../../src/components/shared/Header';
import { ChapterGrid } from '../../../src/components/scripture/ChapterGrid';
import { BOOK_NAMES } from '../../../src/utils/constants';
import { useReaderStore } from '../../../src/stores/readerStore';
import { getBookName } from '../../../src/utils/bookTranslations';

const CHAPTERS_PER_BOOK: Record<number, number> = {
  1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4, 9: 31, 10: 24,
  11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13, 17: 10, 18: 42, 19: 150, 20: 31,
  21: 12, 22: 8, 23: 66, 24: 52, 25: 5, 26: 48, 27: 12, 28: 14, 29: 3, 30: 9,
  31: 1, 32: 4, 33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14, 39: 4,
  40: 28, 41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13, 48: 6, 49: 6,
  50: 4, 51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3, 57: 1, 58: 13, 59: 5,
  60: 5, 61: 3, 62: 5, 63: 1, 64: 1, 65: 1, 66: 22
};

export default function BookChaptersScreen() {
  const { colors, spacing } = useTheme();
  const { book } = useLocalSearchParams<{ book: string }>();
  const { currentVersionId } = useReaderStore();

  const parsedBook = parseInt(Array.isArray(book) ? book[0] : (book || '1'));
  const bookNumber = isNaN(parsedBook) ? 1 : Math.max(1, Math.min(66, parsedBook));
  const bookName = getBookName(bookNumber, currentVersionId);
  const totalChapters = CHAPTERS_PER_BOOK[bookNumber] || 1;

  const handleSelectChapter = (chapterNumber: number) => {
    router.push({
      pathname: '/(tabs)/read/[book]/[chapter]',
      params: { book: bookNumber.toString(), chapter: chapterNumber.toString() },
    });
  };

  const handleBack = () => {
    router.replace('/(tabs)/read');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={bookName} showBack={true} onBack={handleBack} />
      <View style={[styles.content, { padding: spacing.base }]}>
        <ChapterGrid totalChapters={totalChapters} onSelectChapter={handleSelectChapter} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
