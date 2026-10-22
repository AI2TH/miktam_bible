import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme';
import { Header } from '../src/components/shared/Header';
import { EmptyState } from '../src/components/shared/EmptyState';
import { useNotes } from '../src/hooks/useNotes';
import { useReaderStore } from '../src/stores/readerStore';
import { getBookName } from '../src/utils/bookTranslations';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../src/components/ui/Text';
import { Card } from '../src/components/ui/Card';

export default function StudiesScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { notes, remove, search, loading } = useNotes();
  const { navigateTo, currentVersionId } = useReaderStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectVerse = (bookNumber: number, chapter: number, verseNumber: number | null) => {
    navigateTo(bookNumber, chapter);
    router.replace({
      pathname: '/(tabs)/read/[book]/[chapter]',
      params: { book: bookNumber.toString(), chapter: chapter.toString() },
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Reflection', 'Are you sure you want to delete this study reflection note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(id);
        },
      },
    ]);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    search(q);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Study Reflections & Notes" showBack={true} />

      {/* Quick Search Input */}
      <View style={[styles.searchBox, { paddingHorizontal: spacing.base, paddingVertical: spacing.sm }]}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}>
          <Ionicons name="search" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search study reflections..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.textPrimary }]}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Switcher Tab between Highlights and Studies */}
      <View style={[styles.tabBar, { paddingHorizontal: spacing.base, marginBottom: spacing.sm }]}>
        <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderColor: colors.border, borderWidth: 1 }]}>
          <TouchableOpacity
            onPress={() => router.replace('/bookmarks')}
            style={[styles.tabBtn, { borderRadius: borderRadius.md }]}
          >
            <Ionicons name="star-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text variant="button" color="textSecondary">
              Highlights
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.md }]}
          >
            <Ionicons name="journal" size={15} color={colors.textInverse} style={{ marginRight: 6 }} />
            <Text variant="button" color="inverse" style={{ fontWeight: '700' }}>
              Study Notes ({notes.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {notes.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No Reflections Match Search' : 'No Study Reflections Yet'}
          description={
            searchQuery
              ? 'Try another keyword or clear the search query.'
              : 'Long-press any verse in the Bible reading screen and type a reflection note to save your personal theological insights here.'
          }
          icon={<Ionicons name="journal-outline" size={48} color={colors.textTertiary} />}
        />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.base, gap: spacing.md }}
          renderItem={({ item }) => {
            const bName = getBookName(item.bookNumber, currentVersionId) || item.bookName;
            const refText = `${bName} ${item.chapter}:${item.verseNumber ?? 'Chapter'}`;
            return (
              <Card
                bordered
                style={[styles.noteCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelectVerse(item.bookNumber, item.chapter, item.verseNumber)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.refRow}>
                      <Ionicons name="book-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text variant="h3" color="primary" style={{ fontWeight: '700' }}>
                        {refText}
                      </Text>
                    </View>
                    <Text variant="caption" color="textSecondary">
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>

                  <Text variant="body" color="textPrimary" style={styles.content}>
                    {item.content}
                  </Text>

                  <View style={[styles.cardFooter, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                    <View style={[styles.versionPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
                      <Text variant="caption" color="textSecondary" style={{ fontSize: 11, fontWeight: 'bold' }}>
                        {item.versionId ? item.versionId.toUpperCase() : 'KJV'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDelete(item.id)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                      <Text variant="caption" color="error" style={{ marginLeft: 4, fontWeight: '600' }}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBox: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  tabBar: {
    width: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  noteCard: {
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  versionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});
