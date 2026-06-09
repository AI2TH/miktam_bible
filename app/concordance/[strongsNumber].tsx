import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Header } from '../../src/components/shared/Header';
import { Card } from '../../src/components/ui/Card';
import { Text } from '../../src/components/ui/Text';
import { Divider } from '../../src/components/ui/Divider';
import { VerseCard } from '../../src/components/scripture/VerseCard';
import { useConcordance } from '../../src/hooks/useConcordance';
import { useReaderStore } from '../../src/stores/readerStore';
import { getBookName } from '../../src/utils/bookTranslations';
import { Ionicons } from '@expo/vector-icons';

export default function StrongsDetailScreen() {
  const { colors, spacing } = useTheme();
  const { strongsNumber } = useLocalSearchParams<{ strongsNumber: string }>();
  const { navigateTo, currentVersionId } = useReaderStore();
  const { strongsEntry, versesWithStrongs, loading, lookupStrongs, loadVersesWithStrongs } = useConcordance();

  useEffect(() => {
    if (strongsNumber) {
      lookupStrongs(strongsNumber);
      loadVersesWithStrongs(strongsNumber);
    }
  }, [strongsNumber, lookupStrongs, loadVersesWithStrongs]);

  const handleSelectVerse = (bookNumber: number, chapter: number, verseNumber: number) => {
    navigateTo(bookNumber, chapter);
    router.replace({
      pathname: '/(tabs)/read/[book]/[chapter]',
      params: { book: bookNumber.toString(), chapter: chapter.toString() },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={`Concordance Study: ${strongsNumber}`} showBack={true} />

      {loading && !strongsEntry ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !strongsEntry ? (
        <View style={styles.center}>
          <Text variant="body" color="textSecondary">
            Strong's entry not found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={versesWithStrongs}
          keyExtractor={(item, idx) => `${item.bookNumber}:${item.chapter}:${item.verseNumber}:${idx}`}
          contentContainerStyle={{ padding: spacing.base, gap: spacing.md }}
          ListHeaderComponent={
            /* Word definitions summary card */
            <Card style={[styles.definitionCard, { marginBottom: spacing.base }]} bordered>
              <View style={styles.wordHeader}>
                <Text variant="h2" color="primary">
                  {strongsEntry.originalWord} ({strongsEntry.transliteration})
                </Text>
                <Text variant="caption" color="textSecondary">
                  {strongsEntry.language.toUpperCase()}
                </Text>
              </View>

              <Text variant="transliteration" color="textSecondary" style={{ marginTop: 4 }}>
                Pronunciation: "{strongsEntry.pronunciation}"
              </Text>

              <Divider style={{ marginVertical: spacing.md }} />

              <View style={styles.detailSection}>
                <Text variant="h3" style={styles.sectionTitle}>
                  Definition
                </Text>
                <Text variant="body" style={styles.definitionText}>
                  {strongsEntry.definition}
                </Text>
              </View>

              {strongsEntry.kjvTranslations && strongsEntry.kjvTranslations.length > 0 && (
                <View style={[styles.detailSection, { marginTop: spacing.md }]}>
                  <Text variant="h3" style={styles.sectionTitle}>
                    KJV Translations
                  </Text>
                  <Text variant="bodySmall" color="textSecondary">
                    {strongsEntry.kjvTranslations.join(', ')}
                  </Text>
                </View>
              )}

              <Divider style={{ marginVertical: spacing.md }} />

              <Text variant="bodySmall" color="textSecondary" style={{ fontWeight: 'bold' }}>
                Occurrences list ({versesWithStrongs.length} verses):
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <VerseCard
              bookName={getBookName(item.bookNumber, currentVersionId)}
              chapter={item.chapter}
              verseNumber={item.verseNumber}
              text={item.text}
              onPress={() => handleSelectVerse(item.bookNumber, item.chapter, item.verseNumber)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  definitionCard: {
    width: '100%',
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailSection: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  definitionText: {
    lineHeight: 22,
  },
});
