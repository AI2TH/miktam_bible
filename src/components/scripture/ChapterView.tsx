import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';
import { VerseText } from './VerseText';
import type { Verse } from '../../types/bible';
import type { Bookmark } from '../../types/user';

interface ChapterViewProps {
  verses: Verse[];
  bookmarks: Bookmark[];
  selectedVerseNumber: number | null;
  onVerseTap: (verseNumber: number) => void;
  onVerseLongPress: (verseNumber: number) => void;
  fontSize: number;
}

export function ChapterView({
  verses,
  bookmarks,
  selectedVerseNumber,
  onVerseTap,
  onVerseLongPress,
  fontSize,
}: ChapterViewProps) {
  const { spacing } = useTheme();

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
      contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing['5xl'] }}
      showsVerticalScrollIndicator={false}
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
