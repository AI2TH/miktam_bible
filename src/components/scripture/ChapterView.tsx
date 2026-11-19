import React from 'react';
import { FlatList, StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';
import { VerseText } from './VerseText';
import { Text } from '../ui/Text';
import { useReaderStore } from '../../stores/readerStore';
import type { Verse } from '../../types/bible';
import type { Bookmark } from '../../types/user';

interface ChapterViewProps {
  verses: Verse[];
  bookmarks: Bookmark[];
  selectedVerseNumber?: number | null;
  selectedVerseNumbers?: number[];
  onVerseTap: (verseNumber: number) => void;
  onVerseLongPress: (verseNumber: number) => void;
  fontSize: number;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  bookTitle?: string;
  currentChapter?: number;
  secondaryVerseMap?: Map<number, Verse>;
  secondaryVersionAbbr?: string;
  isDualMode?: boolean;
  /** True until the chapter query has finished. Shows a spinner, never "not available". */
  loading?: boolean;
  /** Set when the chapter query failed */
  error?: string | null;
  onRetry?: () => void;
}

export function ChapterView({
  verses,
  bookmarks,
  selectedVerseNumber,
  selectedVerseNumbers,
  onVerseTap,
  onVerseLongPress,
  fontSize,
  onNextChapter,
  onPrevChapter,
  bookTitle,
  currentChapter,
  secondaryVerseMap,
  secondaryVersionAbbr,
  isDualMode = false,
  loading = false,
  error = null,
  onRetry,
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

  const listRef = React.useRef<FlatList>(null);
  React.useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [bookTitle, currentChapter]);

  return (
    <FlatList
      ref={listRef}
      data={verses}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing['4xl'] }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        loading ? (
          <View
            style={[styles.emptyBox, { padding: spacing['2xl'], marginVertical: spacing['2xl'] }]}
            accessibilityRole="progressbar"
            accessibilityLabel="Loading chapter"
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="bodySmall" color="textTertiary" style={{ textAlign: 'center', marginTop: spacing.sm }}>
              Loading chapter…
            </Text>
          </View>
        ) : error ? (
          <View style={[styles.emptyBox, { padding: spacing['2xl'], marginVertical: spacing['2xl'] }]}>
            <Text variant="h3" color="textSecondary" style={{ textAlign: 'center', marginBottom: spacing.sm }}>
              Couldn't load this chapter
            </Text>
            <Text variant="bodySmall" color="textTertiary" style={{ textAlign: 'center', marginBottom: spacing.md }}>
              {error}
            </Text>
            {onRetry && (
              <TouchableOpacity
                onPress={onRetry}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.primary,
                  borderWidth: 1,
                  paddingHorizontal: spacing.base,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md,
                }}
              >
                <Text variant="button" color="primary">
                  Try again
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ padding: spacing['2xl'], alignItems: 'center', justifyContent: 'center', marginVertical: spacing['2xl'] }}>
            <Text variant="h3" color="textSecondary" style={{ textAlign: 'center', marginBottom: spacing.sm }}>
              Content Not Available
            </Text>
            <Text variant="bodySmall" color="textTertiary" style={{ textAlign: 'center', marginBottom: spacing.md }}>
              This book or chapter is not included in the selected Bible translation.
            </Text>
            <TouchableOpacity
              onPress={() => useReaderStore.getState().setVersion('kjv')}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                borderWidth: 1,
                paddingHorizontal: spacing.base,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.md,
              }}
            >
              <Text variant="button" color="primary">
                Switch to KJV (Full Bible)
              </Text>
            </TouchableOpacity>
          </View>
        )
      }
      ListFooterComponent={
        !loading && (onNextChapter || onPrevChapter) ? (
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
        const isSelected = selectedVerseNumbers
          ? selectedVerseNumbers.includes(item.verseNumber)
          : selectedVerseNumber === item.verseNumber;
        const secVerse = secondaryVerseMap?.get(item.verseNumber) || null;

        return (
          <VerseText
            verse={item}
            highlightColor={highlightColor}
            isSelected={isSelected}
            fontSize={fontSize}
            onTap={() => onVerseTap(item.verseNumber)}
            onLongPress={() => onVerseLongPress(item.verseNumber)}
            secondaryVerse={secVerse}
            secondaryVersionAbbr={secondaryVersionAbbr}
            isDualMode={isDualMode}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
