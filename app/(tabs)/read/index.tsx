import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../../src/theme';
import { Header } from '../../../src/components/shared/Header';
import { Text } from '../../../src/components/ui/Text';
import { BookGrid } from '../../../src/components/scripture/BookGrid';
import { VersionPicker } from '../../../src/components/scripture/VersionPicker';
import { BottomSheet } from '../../../src/components/ui/BottomSheet';
import { useReaderStore } from '../../../src/stores/readerStore';
import { getAllVersions } from '../../../src/services/bibleService';
import type { BibleVersion } from '../../../src/types/bible';

export default function BookPickerScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { currentVersionId, setVersion } = useReaderStore();
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [versionSheetVisible, setVersionSheetVisible] = useState(false);

  useEffect(() => {
    async function loadVersions() {
      try {
        const all = await getAllVersions();
        setVersions(all);
      } catch (e) {
        console.error('[BookPickerScreen] Error loading versions:', e);
      }
    }
    loadVersions();
  }, [currentVersionId]);

  const handleSelectBook = (bookNumber: number) => {
    router.push({
      pathname: '/(tabs)/read/[book]',
      params: { book: bookNumber.toString() },
    });
  };

  const downloadedVersions = versions.filter((v) => v.isDownloaded);
  const activeVersion = versions.find((v) => v.id.toLowerCase() === (currentVersionId || 'kjv').toLowerCase());
  const activeVersionTitle = activeVersion ? `${activeVersion.name} (${activeVersion.id.toUpperCase()})` : (currentVersionId || 'KJV').toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Holy Bible" />

      <View style={[styles.content, { paddingHorizontal: spacing.base }]}>
        {/* Global Translation Selector Banner */}
        <View style={styles.bannerContainer}>
          <TouchableOpacity
            style={[
              styles.versionSelectorBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 2,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => setVersionSheetVisible(true)}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>📖</Text>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="textSecondary">
                  Current Translation
                </Text>
                <Text variant="body" color="primary" style={{ fontWeight: 'bold' }} numberOfLines={1}>
                  {activeVersionTitle}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.browsePill,
                {
                  backgroundColor: colors.primary + '18',
                  borderRadius: borderRadius.full,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 4,
                },
              ]}
            >
              <Text variant="caption" color="primary" style={{ fontWeight: 'bold' }}>
                🌐 2,459 Langs ▾
              </Text>
            </View>
          </TouchableOpacity>

          {/* Quick Offline Chips Row */}
          {downloadedVersions.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {downloadedVersions.map((v) => {
                  const isSel = v.id.toLowerCase() === (currentVersionId || 'kjv').toLowerCase();
                  return (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => setVersion(v.id)}
                      style={[
                        styles.quickChip,
                        {
                          backgroundColor: isSel ? colors.primary : colors.surfaceVariant,
                          borderRadius: borderRadius.full,
                          paddingHorizontal: spacing.sm + 2,
                          paddingVertical: 3,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        color={isSel ? 'inverse' : 'textSecondary'}
                        style={{ fontWeight: isSel ? 'bold' : 'normal', fontSize: 11 }}
                      >
                        {v.id.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        {/* 66 Canonical Books Grid */}
        <BookGrid onSelectBook={handleSelectBook} />
      </View>

      {/* Global 2,459 Languages & 3,844 Versions Picker Modal */}
      <BottomSheet
        visible={versionSheetVisible}
        onClose={() => setVersionSheetVisible(false)}
        title="Select Translation"
        maxHeight="88%"
        scrollable={false}
      >
        <VersionPicker
          versions={versions}
          selectedVersionId={currentVersionId || 'kjv'}
          onSelectVersion={(v) => {
            setVersion(v);
            setVersionSheetVisible(false);
          }}
          onClose={() => setVersionSheetVisible(false)}
        />
      </BottomSheet>
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
  bannerContainer: {
    marginVertical: 10,
  },
  versionSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  browsePill: {
    marginLeft: 8,
  },
  quickChip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
