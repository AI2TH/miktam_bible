import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../../src/theme';
import { Header } from '../../../src/components/shared/Header';
import { BookGrid } from '../../../src/components/scripture/BookGrid';
import { VersionPicker } from '../../../src/components/scripture/VersionPicker';
import { useReaderStore } from '../../../src/stores/readerStore';
import { getAllVersions } from '../../../src/services/bibleService';
import type { BibleVersion } from '../../../src/types/bible';

export default function BookPickerScreen() {
  const { colors, spacing } = useTheme();
  const { currentVersionId, setVersion } = useReaderStore();
  const [versions, setVersions] = useState<BibleVersion[]>([]);

  useEffect(() => {
    async function loadVersions() {
      try {
        const all = await getAllVersions();
        setVersions(all.filter((v: BibleVersion) => v.isDownloaded));
      } catch (e) {
        console.error(e);
      }
    }
    loadVersions();
  }, []);

  const handleSelectBook = (bookNumber: number) => {
    router.push({
      pathname: '/(tabs)/read/[book]',
      params: { book: bookNumber.toString() },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Holy Bible" />
      <View style={[styles.content, { padding: spacing.base }]}>
        {versions.length > 0 && (
          <View style={{ paddingBottom: spacing.base }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <VersionPicker
                versions={versions}
                selectedVersionId={currentVersionId || 'kjv'}
                onSelectVersion={setVersion}
              />
            </ScrollView>
          </View>
        )}
        <BookGrid onSelectBook={handleSelectBook} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
