import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import type { Verse } from '../../types/bible';
import { cleanVerseText } from '../../utils/bibleUtils';

interface VerseTextProps {
  verse: Verse;
  highlightColor?: string | null;
  isSelected?: boolean;
  onTap: () => void;
  onLongPress: () => void;
  fontSize: number;
}

export function VerseText({
  verse,
  highlightColor = null,
  isSelected = false,
  onTap,
  onLongPress,
  fontSize,
}: VerseTextProps) {
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onTap}
      onLongPress={onLongPress}
      style={[
        styles.container,
        {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          borderRadius: borderRadius.sm,
          backgroundColor: isSelected
            ? 'rgba(201,165,92,0.15)' // Warm gold highlight for selection
            : highlightColor ? highlightColor + '20' : 'transparent', // Subtle background for user highlights
        },
      ]}
    >
      <Text
        variant="scripture"
        style={[
          styles.scriptureText,
          {
            fontSize,
            lineHeight: fontSize * 1.6,
          },
        ]}
      >
        {/* Gold verse number */}
        <Text
          variant="verseNumber"
          color="gold"
          style={[
            styles.verseNumber,
            {
              fontSize: fontSize * 0.75,
              fontWeight: 'bold',
            },
          ]}
        >
          {verse.verseNumber}{' '}
        </Text>

        {/* Verse text */}
        {cleanVerseText(verse.text)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  verseNumber: {
    marginRight: 4,
  },
  scriptureText: {
    // Standard text wraps perfectly on its own
  },
});
