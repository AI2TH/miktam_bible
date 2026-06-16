import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { getVerse } from '../../services/bibleService';
import type { BibleVersion, Verse } from '../../types/bible';

interface ParallelViewProps {
  bookNumber: number;
  chapter: number;
  verseNumber: number;
  downloadedVersions: BibleVersion[];
  fontSize: number;
}

interface ParallelItem {
  version: BibleVersion;
  verse: Verse | null;
  loading: boolean;
}

export function ParallelView({
  bookNumber,
  chapter,
  verseNumber,
  downloadedVersions,
  fontSize,
}: ParallelViewProps) {
  const { colors, spacing } = useTheme();
  const [items, setItems] = useState<ParallelItem[]>([]);

  useEffect(() => {
    async function loadParallelVerses() {
      // Initialize items as loading
      const initialItems = downloadedVersions.map((v) => ({
        version: v,
        verse: null,
        loading: true,
      }));
      setItems(initialItems);

      const fetchedItems = await Promise.all(
        downloadedVersions.map(async (v) => {
          try {
            const verse = await getVerse(v.id, bookNumber, chapter, verseNumber);
            return { version: v, verse, loading: false };
          } catch (e) {
            console.error('[ParallelView] Failed to fetch verse for version', v.id, e);
            return { version: v, verse: null, loading: false };
          }
        })
      );
      setItems(fetchedItems);
    }

    if (downloadedVersions.length > 0) {
      loadParallelVerses();
    }
  }, [bookNumber, chapter, verseNumber, downloadedVersions]);

  if (downloadedVersions.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="bodySmall" color="textSecondary">
          No other Bible versions downloaded for comparison. Go to Profile to download.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { gap: spacing.md }]}>
      {items.map((item) => (
        <Card key={item.version.id} style={styles.card}>
          <View style={styles.header}>
            <Text variant="h3" color="primary" style={{ fontWeight: 'bold' }}>
              {item.version.name} ({item.version.id.toUpperCase()})
            </Text>
          </View>
          {item.loading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : item.verse ? (
            <Text
              variant="scripture"
              style={[
                styles.verseText,
                { fontSize: fontSize - 1, lineHeight: (fontSize - 1) * 1.6 },
              ]}
            >
              {item.verse.text}
            </Text>
          ) : (
            <Text variant="caption" color="textTertiary">
              Verse not available in this version.
            </Text>
          )}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  card: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  verseText: {
    marginTop: 4,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
});
