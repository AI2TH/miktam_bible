import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const SUGGESTIONS = [
  'What does Jesus say about worry?',
  'Explain the fruit of the Spirit',
  'Tell me about the Armor of God',
  'Summarize Psalm 23'
];

export function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="caption" color="textSecondary" align="center" style={styles.label}>
        Select a suggested topic to start studying:
      </Text>
      <View style={[styles.grid, { gap: spacing.sm }]}>
        {SUGGESTIONS.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            onPress={() => onSelectPrompt(prompt)}
            activeOpacity={0.8}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                padding: spacing.md,
              },
            ]}
          >
            <Text variant="bodySmall" color="primary" style={styles.text}>
              {prompt} →
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    width: '100%',
  },
  label: {
    marginBottom: 12,
  },
  grid: {
    width: '100%',
  },
  card: {
    width: '100%',
    borderWidth: 1,
  },
  text: {
    fontWeight: '500',
  },
});
