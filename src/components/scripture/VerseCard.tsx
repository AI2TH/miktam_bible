import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { cleanVerseText, parseHighlightedText } from '../../utils/bibleUtils';

interface VerseCardProps {
  bookName: string;
  chapter: number;
  verseNumber: number;
  text: string;
  onPress: () => void;
  snippet?: string;
  style?: any;
}

export function VerseCard({
  bookName,
  chapter,
  verseNumber,
  text,
  onPress,
  snippet,
  style,
}: VerseCardProps) {
  const { colors, spacing } = useTheme();
  const segments = parseHighlightedText(snippet ? snippet : text);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Card style={[styles.card, style]}>
        <View style={styles.header}>
          <Text variant="h3" color="primary" style={styles.title}>
            {bookName} {chapter}:{verseNumber}
          </Text>
        </View>
        <Text variant="scriptureSmall" color="textPrimary" style={{ marginTop: spacing.xs }}>
          {segments.map((seg, i) => (
            <Text
              key={i}
              style={seg.isHighlighted ? { fontWeight: '700', color: colors.primary } : undefined}
            >
              {seg.text}
            </Text>
          ))}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: '700',
  },
});
