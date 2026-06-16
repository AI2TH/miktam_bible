import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useConcordance } from '../../hooks/useConcordance';
import { Text } from '../ui/Text';
import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { useTheme } from '../../theme';
import { Divider } from '../ui/Divider';

interface StrongsPopoverProps {
  strongsNumber: string;
  onClose: () => void;
  onViewAllVerses: (strongsNumber: string) => void;
}

export function StrongsPopover({
  strongsNumber,
  onClose,
  onViewAllVerses,
}: StrongsPopoverProps) {
  const { colors, spacing } = useTheme();
  const { strongsEntry, loading, lookupStrongs } = useConcordance();

  useEffect(() => {
    if (strongsNumber) {
      lookupStrongs(strongsNumber);
    }
  }, [strongsNumber, lookupStrongs]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { gap: spacing.base }]}>
        <Skeleton height={24} width="40%" />
        <Skeleton height={32} width="80%" />
        <Skeleton height={60} width="100%" />
        <Skeleton height={120} width="100%" />
      </View>
    );
  }

  if (!strongsEntry) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="body" color="textSecondary">
          Failed to load Strong's definition.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text variant="h2" color="primary">
          {strongsEntry.strongsNumber} — {strongsEntry.transliteration}
        </Text>
        <Text variant="originalLanguage" color="textPrimary">
          {strongsEntry.originalWord}
        </Text>
      </View>

      <Text variant="transliteration" color="textSecondary" style={styles.pronunciation}>
        Pronunciation: "{strongsEntry.pronunciation}"
      </Text>

      <Divider style={styles.divider} />

      <View style={styles.section}>
        <Text variant="h3" color="textPrimary" style={styles.sectionTitle}>
          Short Definition
        </Text>
        <Text variant="body" color="textPrimary">
          {strongsEntry.shortDefinition}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="h3" color="textPrimary" style={styles.sectionTitle}>
          Usage
        </Text>
        <Text variant="body" color="textSecondary">
          Appears approximately {strongsEntry.usageCount} times in scripture.
        </Text>
      </View>

      {strongsEntry.kjvTranslations && strongsEntry.kjvTranslations.length > 0 && (
        <View style={styles.section}>
          <Text variant="h3" color="textPrimary" style={styles.sectionTitle}>
            KJV Translations
          </Text>
          <Text variant="body" color="textSecondary">
            {strongsEntry.kjvTranslations.join(', ')}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text variant="h3" color="textPrimary" style={styles.sectionTitle}>
          Full Definition
        </Text>
        <Text variant="body" color="textPrimary" style={styles.fullDefinition}>
          {strongsEntry.definition}
        </Text>
      </View>

      <Button
        label={`Find all occurrences of ${strongsEntry.transliteration}`}
        onPress={() => onViewAllVerses(strongsEntry.strongsNumber)}
        style={styles.actionButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 12,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pronunciation: {
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fullDefinition: {
    lineHeight: 22,
  },
  actionButton: {
    marginTop: 8,
  },
});
