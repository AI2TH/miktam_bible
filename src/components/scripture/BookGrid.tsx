import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { BOOK_NAMES } from '../../utils/constants';
import { useReaderStore } from '../../stores/readerStore';
import { getBookName, getBookAbbreviation } from '../../utils/bookTranslations';

interface BookGridProps {
  onSelectBook: (bookNumber: number) => void;
}

export function BookGrid({ onSelectBook }: BookGridProps) {
  const { colors, spacing, borderRadius } = useTheme();
  const [activeTab, setActiveTab] = useState<'OT' | 'NT'>('OT');
  const { currentVersionId } = useReaderStore();
  const [availableBookNumbers, setAvailableBookNumbers] = useState<Set<number> | null>(null);

  useEffect(() => {
    let active = true;
    async function loadAvailable() {
      if (!currentVersionId || currentVersionId.toLowerCase() === 'kjv') {
        setAvailableBookNumbers(null);
        return;
      }
      try {
        const { getBooks } = await import('../../services/bibleService');
        const books = await getBooks(currentVersionId);
        if (!active) return;
        if (books.length > 0) {
          const s = new Set(books.map((b) => b.bookNumber));
          setAvailableBookNumbers(s);
          const hasOt = books.some((b) => b.bookNumber <= 39);
          const hasNt = books.some((b) => b.bookNumber >= 40);
          if (!hasOt && hasNt) {
            setActiveTab('NT');
          }
        } else {
          setAvailableBookNumbers(null);
        }
      } catch {
        if (active) setAvailableBookNumbers(null);
      }
    }
    loadAvailable();
    return () => {
      active = false;
    };
  }, [currentVersionId]);

  const otBooks = Object.keys(BOOK_NAMES)
    .map((numStr) => {
      const num = parseInt(numStr);
      return {
        bookNumber: num,
        name: getBookName(num, currentVersionId),
      };
    })
    .filter((b) => b.bookNumber <= 39);

  const ntBooks = Object.keys(BOOK_NAMES)
    .map((numStr) => {
      const num = parseInt(numStr);
      return {
        bookNumber: num,
        name: getBookName(num, currentVersionId),
      };
    })
    .filter((b) => b.bookNumber >= 40);

  const activeBooks = activeTab === 'OT' ? otBooks : ntBooks;

  return (
    <View style={styles.container}>
      {/* Segmented control tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderRadius: borderRadius.md }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('OT')}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'OT' ? colors.primary : 'transparent',
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text variant="button" color={activeTab === 'OT' ? 'inverse' : 'textSecondary'}>
            Old Testament {availableBookNumbers ? `(${otBooks.filter((b) => availableBookNumbers.has(b.bookNumber)).length})` : '(39)'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('NT')}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'NT' ? colors.primary : 'transparent',
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text variant="button" color={activeTab === 'NT' ? 'inverse' : 'textSecondary'}>
            New Testament {availableBookNumbers ? `(${ntBooks.filter((b) => availableBookNumbers.has(b.bookNumber)).length})` : '(27)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Book Grid */}
      <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {activeBooks.map((book) => {
            const isAvailable = availableBookNumbers === null || availableBookNumbers.has(book.bookNumber);
            const abbr = getBookAbbreviation(book.bookNumber, currentVersionId);
            return (
              <TouchableOpacity
                key={book.bookNumber}
                onPress={() => isAvailable && onSelectBook(book.bookNumber)}
                disabled={!isAvailable}
                activeOpacity={0.8}
                style={[
                  styles.bookItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isAvailable ? colors.border : colors.borderMuted,
                    borderRadius: borderRadius.sm,
                    padding: spacing.md,
                    opacity: isAvailable ? 1 : 0.35,
                  },
                ]}
              >
                <Text variant="body" style={styles.bookAbbr}>
                  {abbr}
                </Text>
                <Text variant="caption" color="textSecondary" style={styles.bookName} numberOfLines={1}>
                  {book.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  bookItem: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 70,
  },
  bookAbbr: {
    fontWeight: 'bold',
  },
  bookName: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
});
