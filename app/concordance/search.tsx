import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { Header } from '../../src/components/shared/Header';
import { Card } from '../../src/components/ui/Card';
import { Text } from '../../src/components/ui/Text';
import { Badge } from '../../src/components/ui/Badge';
import { EmptyState } from '../../src/components/shared/EmptyState';
import { useConcordance } from '../../src/hooks/useConcordance';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ConcordanceSearchScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'greek' | 'hebrew'>('all');
  const { searchResults, loading, searchStrongs, clearSearch } = useConcordance();

  // Premium Live Search on typing with a small 250ms debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        searchStrongs(query.trim());
      } else {
        clearSearch();
        setActiveTab('all');
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, searchStrongs, clearSearch]);

  const handleSearch = () => {
    if (query.trim()) {
      searchStrongs(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    setActiveTab('all');
    clearSearch();
  };

  const handleSelectItem = (strongsNumber: string) => {
    router.push(`/concordance/${strongsNumber}`);
  };

  const filteredResults = React.useMemo(() => {
    if (activeTab === 'all') return searchResults;
    return searchResults.filter(item => item.language.toLowerCase() === activeTab);
  }, [searchResults, activeTab]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Concordance Search" showBack={true} />

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
            placeholder="Search Strong's definition (e.g. love, grace)..."
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

      {/* Tabs / Filters */}
      {searchResults.length > 0 && !loading && (
        <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
          {(['all', 'greek', 'hebrew'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const count = searchResults.filter(r => tab === 'all' || r.language.toLowerCase() === tab).length;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabButton,
                  isActive && { borderBottomColor: colors.primary }
                ]}
              >
                <Text
                  variant="bodySmall"
                  style={[
                    styles.tabText,
                    isActive ? { color: colors.primary, fontWeight: '700' } : { color: colors.textSecondary }
                  ]}
                >
                  {tab.toUpperCase()} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Results List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : searchResults.length === 0 ? (
        <EmptyState
          title={query ? "No Strong's Entries" : "Search Strong's Lexicon"}
          description={query ? "Try searching for a different original word or definition." : "Enter biblical terms in English, Greek, transliterations, or Strong's codes (e.g., G26 or love)."}
          icon={<Ionicons name="library-outline" size={48} color={colors.textTertiary} />}
        />
      ) : filteredResults.length === 0 ? (
        <EmptyState
          title="No Results in this Language"
          description={`There are no ${activeTab} definitions matching "${query}". Try switching tabs.`}
          icon={<Ionicons name="filter-outline" size={48} color={colors.textTertiary} />}
        />
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.strongsNumber}
          contentContainerStyle={{ padding: spacing.base, gap: spacing.md }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleSelectItem(item.strongsNumber)}>
              <Card bordered style={styles.resultCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.wordInfo}>
                    <Text variant="h3" color="primary">
                      {item.originalWord} ({item.transliteration})
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {item.strongsNumber}
                    </Text>
                  </View>
                  <Badge
                    label={item.language.toUpperCase()}
                    variant={item.language === 'greek' ? 'info' : 'warning'}
                  />
                </View>
                <Text variant="bodySmall" color="textSecondary" numberOfLines={2} style={styles.definitionText}>
                  {item.shortDefinition || item.definition}
                </Text>
              </Card>
            </TouchableOpacity>
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
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    paddingVertical: 2,
    marginHorizontal: 8,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    alignItems: 'center',
    flex: 1,
  },
  tabText: {
    fontSize: 13,
  },
  resultCard: {
    width: '100%',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordInfo: {
    flexDirection: 'column',
    gap: 2,
  },
  definitionText: {
    marginTop: 4,
    lineHeight: 18,
  },
});
