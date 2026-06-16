import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import type { OriginalWord } from '../../types/concordance';

interface InterlinearViewProps {
  originalWords: OriginalWord[];
  onSelectStrongs: (strongsNumber: string) => void;
}

export function InterlinearView({
  originalWords,
  onSelectStrongs,
}: InterlinearViewProps) {
  const { colors, spacing } = useTheme();

  if (originalWords.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="caption" color="textTertiary">
          No original language data loaded for this verse.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { gap: spacing.base }]}>
      {originalWords.map((word) => (
        <View key={word.id} style={[styles.wordCol, { padding: spacing.xs, borderColor: colors.border }]}>
          {/* Greek / Hebrew text */}
          <Text variant="originalLanguage" color="primary" style={styles.original}>
            {word.originalText}
          </Text>

          {/* Transliteration */}
          <Text variant="transliteration" color="textSecondary">
            {word.transliteration}
          </Text>

          {/* Strong's Number (Tappable link) */}
          {word.strongsNumber ? (
            <TouchableOpacity onPress={() => onSelectStrongs(word.strongsNumber)}>
              <Text variant="strongsNumber" color="secondary" style={styles.strongs}>
                {word.strongsNumber}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text variant="strongsNumber" color="textTertiary">
              -
            </Text>
          )}

          {/* English translation gloss */}
          <Text variant="caption" color="textPrimary" style={styles.gloss}>
            {word.gloss}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  wordCol: {
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  original: {
    fontWeight: 'bold',
  },
  strongs: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  gloss: {
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
});
