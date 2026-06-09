import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';

interface ChapterGridProps {
  totalChapters: number;
  onSelectChapter: (chapterNumber: number) => void;
}

export function ChapterGrid({
  totalChapters,
  onSelectChapter,
}: ChapterGridProps) {
  const { colors, spacing, borderRadius } = useTheme();

  // Create an array of chapter numbers [1, 2, ..., totalChapters]
  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {chapters.map((ch) => (
          <TouchableOpacity
            key={ch}
            onPress={() => onSelectChapter(ch)}
            activeOpacity={0.8}
            style={[
              styles.chapterItem,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: borderRadius.sm,
                padding: spacing.md,
              },
            ]}
          >
            <Text variant="h3" color="primary" style={styles.text}>
              {ch}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  chapterItem: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  text: {
    fontWeight: 'bold',
  },
});
