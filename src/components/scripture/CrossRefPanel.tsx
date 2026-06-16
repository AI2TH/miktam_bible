import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { Divider } from '../ui/Divider';
import type { CrossReferenceWithText } from '../../types/concordance';

interface CrossRefPanelProps {
  refs: CrossReferenceWithText[];
  onNavigate: (bookNumber: number, chapter: number, verseNumber: number) => void;
}

export function CrossRefPanel({ refs, onNavigate }: CrossRefPanelProps) {
  const { colors, spacing, borderRadius } = useTheme();

  // Group cross-references by relationship type
  const groupedRefs = React.useMemo(() => {
    const groups: Record<string, CrossReferenceWithText[]> = {
      quotation: [],
      parallel: [],
      allusion: [],
      thematic: [],
    };
    refs.forEach((r) => {
      if (groups[r.relationshipType]) {
        groups[r.relationshipType].push(r);
      } else {
        groups.thematic.push(r);
      }
    });
    return groups;
  }, [refs]);

  if (refs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="caption" color="textTertiary">
          No cross-references found for this verse.
        </Text>
      </View>
    );
  }

  const renderGroup = (
    title: string,
    icon: string,
    items: CrossReferenceWithText[],
    arrow: string
  ) => {
    if (items.length === 0) return null;

    return (
      <View key={title} style={[styles.section, { marginBottom: spacing.md }]}>
        <Text variant="h3" color="primary" style={styles.sectionHeader}>
          {icon} {title} ({items.length})
        </Text>
        <View style={styles.list}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => onNavigate(item.targetBook, item.targetChapter, item.targetVerseStart)}
              style={[
                styles.itemCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: borderRadius.sm,
                  padding: spacing.md,
                  marginTop: spacing.sm,
                },
              ]}
            >
              <View style={styles.itemHeader}>
                <Text variant="bodySmall" color="secondary" style={{ fontWeight: 'bold' }}>
                  {arrow} {item.targetLabel}
                </Text>
                {item.votes > 0 && (
                  <Text variant="caption" color="textTertiary">
                    {item.votes} votes
                  </Text>
                )}
              </View>
              {item.targetText ? (
                <Text variant="scriptureSmall" color="textPrimary" style={styles.targetText}>
                  "{item.targetText}"
                </Text>
              ) : (
                <Text variant="caption" color="textTertiary" style={styles.targetText}>
                  (Verse text not downloaded)
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {renderGroup('Quotations', '📜', groupedRefs.quotation, '→')}
      {renderGroup('Parallels', '‖', groupedRefs.parallel, '↔')}
      {renderGroup('Allusions', '💭', groupedRefs.allusion, '~')}
      {renderGroup('Thematic', '🔗', groupedRefs.thematic, '🔗')}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  section: {
    width: '100%',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    width: '100%',
  },
  itemCard: {
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  targetText: {
    fontStyle: 'italic',
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
});
