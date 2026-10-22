import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme';
import { Header } from '../src/components/shared/Header';
import { VerseCard } from '../src/components/scripture/VerseCard';
import { EmptyState } from '../src/components/shared/EmptyState';
import { useBookmarks } from '../src/hooks/useBookmarks';
import { useReaderStore } from '../src/stores/readerStore';
import { getBookName } from '../src/utils/bookTranslations';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../src/components/ui/Text';

export default function BookmarksScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { bookmarks, remove, removeByVerse, refetch, loading } = useBookmarks();
  const { navigateTo, currentVersionId } = useReaderStore();

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleSelectVerse = (bookNumber: number, chapter: number, verseNumber: number) => {
    navigateTo(bookNumber, chapter);
    router.replace({
      pathname: '/(tabs)/read/[book]/[chapter]',
      params: { book: bookNumber.toString(), chapter: chapter.toString() },
    });
  };

  const handleDelete = (item: any) => {
    Alert.alert('Remove Highlight', 'Are you sure you want to delete this highlight?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (item.id) await remove(item.id);
          await removeByVerse(item.bookNumber, item.chapter, item.verseNumber);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Bookmarks & Highlights" showBack={true} />

      {/* Switcher Tab between Highlights and Studies */}
      <View style={[styles.tabBar, { paddingHorizontal: spacing.base, marginBottom: spacing.sm }]}>
        <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderColor: colors.border, borderWidth: 1 }]}>
          <TouchableOpacity
            style={[styles.tabBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.md }]}
          >
            <Ionicons name="star" size={15} color={colors.textInverse} style={{ marginRight: 6 }} />
            <Text variant="button" color="inverse" style={{ fontWeight: '700' }}>
              Highlights ({bookmarks.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace('/studies' as any)}
            style={[styles.tabBtn, { borderRadius: borderRadius.md }]}
          >
            <Ionicons name="journal-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text variant="button" color="textSecondary">
              Study Notes
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {bookmarks.length === 0 ? (
        <EmptyState
          title="No Highlights Yet"
          description="Long-press a verse in the reading pane to select a highlight color and bookmark it."
          icon={<Ionicons name="star" size={48} color={colors.textTertiary} />}
        />
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.base, gap: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <View style={{ flex: 1 }}>
                <VerseCard
                  bookName={getBookName(item.bookNumber, currentVersionId || item.versionId)}
                  chapter={item.chapter}
                  verseNumber={item.verseNumber}
                  text={item.text}
                  onPress={() => handleSelectVerse(item.bookNumber, item.chapter, item.verseNumber)}
                  style={[{ borderLeftColor: item.highlightColor, borderLeftWidth: 4 }]}
                />
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                style={[styles.deleteBtn, { backgroundColor: colors.surfaceElevated }]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
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
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  verseCard: {
    flex: 1,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
