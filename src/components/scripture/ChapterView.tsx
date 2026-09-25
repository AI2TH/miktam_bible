import React from 'react';
import { FlatList, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { VerseText } from './VerseText';
import { Text } from '../ui/Text';
import type { Verse } from '../../types/bible';
import type { Bookmark } from '../../types/user';

interface ChapterViewProps {
  verses: Verse[];
  bookmarks: Bookmark[];
  selectedVerseNumber: number | null;
  onVerseTap: (verseNumber: number) => void;
  onVerseLongPress: (verseNumber: number) => void;
  fontSize: number;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  bookTitle?: string;
  currentChapter?: number;
}

export function ChapterView({
  verses,
  bookmarks,
  selectedVerseNumber,
  onVerseTap,
  onVerseLongPress,
  fontSize,
  onNextChapter,
  onPrevChapter,
  bookTitle,
  currentChapter,
}: ChapterViewProps) {
  const { colors, spacing, borderRadius } = useTheme();

  // Create a map for fast bookmark lookup
  const bookmarkMap = React.useMemo(() => {
    const map = new Map<number, string>();
    bookmarks.forEach((b) => {
      map.set(b.verseNumber, b.highlightColor);
    });
    return map;
  }, [bookmarks]);

  return (
    <FlatList
      data={verses}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing['4xl'] }}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        (onNextChapter || onPrevChapter) ? (
          <View style={[styles.navFooter, { marginTop: spacing.xl, borderTopColor: colors.border, paddingTop: spacing.lg }]}>
            <View style={styles.navRow}>
              {onPrevChapter && (
                <TouchableOpacity
                  onPress={onPrevChapter}
                  style={[
                    styles.navBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                    },
                  ]}
                >
                  <Text variant="bodySmall" color="primary" style={{ fontWeight: '700' }}>
                    ← Previous Chapter
                  </Text>
                </TouchableOpacity>
              )}

              {onNextChapter && (
                <TouchableOpacity
                  onPress={onNextChapter}
                  style={[
                    styles.navBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: borderRadius.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                    },
                  ]}
                >
                  <Text variant="bodySmall" color="inverse" style={{ fontWeight: '700' }}>
                    Next Chapter →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        const highlightColor = bookmarkMap.get(item.verseNumber);
        const isSelected = selectedVerseNumber === item.verseNumber;

        return (
          <VerseText
            verse={item}
            highlightColor={highlightColor}
            isSelected={isSelected}
            fontSize={fontSize}
            onTap={() => onVerseTap(item.verseNumber)}
            onLongPress={() => onVerseLongPress(item.verseNumber)}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  navFooter: {
    borderTopWidth: 1,
    width: '100%',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  navBtn: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
});
