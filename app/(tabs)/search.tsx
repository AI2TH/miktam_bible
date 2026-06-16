import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { Header } from '../../src/components/shared/Header';
import { VerseCard } from '../../src/components/scripture/VerseCard';
import { EmptyState } from '../../src/components/shared/EmptyState';
import { Text } from '../../src/components/ui/Text';
import { useSearch } from '../../src/hooks/useSearch';
import { useReaderStore } from '../../src/stores/readerStore';
import { getBookName } from '../../src/utils/bookTranslations';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { currentVersionId, navigateTo } = useReaderStore();
  const [query, setQuery] = useState('');
  const { results, loading, search, clear, correctedQuery } = useSearch();

  // Premium Live Search on typing with a 300ms debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        search(query.trim(), currentVersionId);
      } else {
        clear();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, currentVersionId, search, clear]);

  const handleSearch = () => {
    if (query.trim()) {
      search(query.trim(), currentVersionId);
    }
  };

  const handleClear = () => {
    setQuery('');
    clear();
  };

  const handleSelectVerse = (bookNumber: number, chapter: number, verseNumber: number) => {
    navigateTo(bookNumber, chapter);
    // Push the reader route
    router.push({
      pathname: '/(tabs)/read/[book]/[chapter]',
      params: { book: bookNumber.toString(), chapter: chapter.toString() },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Search Scripture"
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/concordance/search')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="library-outline" size={18} color={colors.primary} />
            <Text variant="caption" color="primary" style={{ fontWeight: '600' }}>
              Concordance
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Search Input Bar */}
      <View style={[styles.searchBar, { paddingHorizontal: spacing.base, paddingVertical: spacing.sm }]}>
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}>
          <TouchableOpacity onPress={handleSearch} activeOpacity={0.7}>
            <Ionicons name="search" size={20} color={colors.primary} style={styles.searchIcon} />
          </TouchableOpacity>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder={`Search in ${currentVersionId.toUpperCase()}...`}
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.textPrimary }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} style={styles.clearIcon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results List */}
      {correctedQuery && (
        <View style={{ paddingHorizontal: spacing.base, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text variant="body" color="textSecondary">
            Did you mean <Text variant="body" color="primary" style={{ fontWeight: 'bold', textDecorationLine: 'underline' }} onPress={() => { setQuery(correctedQuery); search(correctedQuery, currentVersionId); }}>{correctedQuery}</Text>?
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : results.length === 0 ? (
        <EmptyState
          title={query ? "No Results" : "Search the Bible"}
          description={query ? "Try searching for a different word or phrase." : "Enter keywords like 'grace', 'forgive', or 'faith'."}
          icon={<Ionicons name="search" size={48} color={colors.textTertiary} />}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.verse.versionId}:${item.verse.bookNumber}:${item.verse.chapter}:${item.verse.verseNumber}`}
          contentContainerStyle={{ padding: spacing.base, gap: spacing.md }}
          renderItem={({ item }) => (
            <VerseCard
              bookName={getBookName(item.verse.bookNumber, currentVersionId)}
              chapter={item.verse.chapter}
              verseNumber={item.verse.verseNumber}
              text={item.verse.text}
              snippet={item.snippet}
              onPress={() => handleSelectVerse(item.verse.bookNumber, item.verse.chapter, item.verse.verseNumber)}
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
  searchBar: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit',
  },
  clearIcon: {
    marginLeft: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
