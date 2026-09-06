import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import type { BibleVersion } from '../../types/bible';
import {
  GLOBAL_LANGUAGES,
  GLOBAL_BIBLE_VERSIONS,
  GlobalLanguage,
  GlobalVersionCatalogItem,
} from '../../database/globalBibleCatalog';
import {
  downloadBibleVersion,
  subscribeDownloadProgress,
  DownloadProgress,
  isVersionDownloadable,
} from '../../services/bibleDownloadService';

interface VersionPickerProps {
  versions?: BibleVersion[];
  selectedVersionId: string;
  onSelectVersion: (versionId: string) => void;
  onClose?: () => void;
}

const TOP_LANGUAGES = [
  { code: 'all', label: 'All' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'uk', label: 'Ukrainian' },
];

export function VersionPicker({
  versions = [],
  selectedVersionId,
  onSelectVersion,
  onClose,
}: VersionPickerProps) {
  const { colors, spacing, borderRadius } = useTheme();

  const [activeTab, setActiveTab] = useState<'versions' | 'languages'>('versions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('all');
  const [activeDownloads, setActiveDownloads] = useState<Record<string, DownloadProgress>>({});
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(
    () => new Set(versions.filter((v) => v.isDownloaded).map((v) => v.id.toLowerCase()))
  );

  // Keep downloadedSet in sync with props
  useEffect(() => {
    const nextSet = new Set(downloadedSet);
    for (const v of versions) {
      if (v.isDownloaded) {
        nextSet.add(v.id.toLowerCase());
      }
    }
    setDownloadedSet(nextSet);
  }, [versions]);

  // Subscribe to live download events
  useEffect(() => {
    const unsubscribe = subscribeDownloadProgress((progress) => {
      const vId = progress.versionId.toLowerCase();
      setActiveDownloads((prev) => ({ ...prev, [vId]: progress }));

      if (progress.stage === 'completed') {
        setDownloadedSet((prev) => new Set(prev).add(vId));
        // Auto remove from activeDownloads after 2 seconds
        setTimeout(() => {
          setActiveDownloads((prev) => {
            const next = { ...prev };
            delete next[vId];
            return next;
          });
        }, 2000);
      } else if (progress.stage === 'error') {
        setTimeout(() => {
          setActiveDownloads((prev) => {
            const next = { ...prev };
            delete next[vId];
            return next;
          });
        }, 4000);
      }
    });

    return unsubscribe;
  }, []);

  // Handle Download trigger
  const handleDownload = useCallback(async (versionId: string) => {
    try {
      await downloadBibleVersion(versionId);
    } catch (e) {
      console.error('[VersionPicker] Download error:', e);
    }
  }, []);

  // Filtered versions based on search and language
  const filteredVersions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const langFilter = selectedLanguageCode;

    return GLOBAL_BIBLE_VERSIONS.filter((v) => {
      // Language filter
      if (langFilter !== 'all' && v.language.toLowerCase() !== langFilter.toLowerCase()) {
        return false;
      }
      // Search query filter
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.abbreviation.toLowerCase().includes(q) ||
        v.languageName.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedLanguageCode]);

  // Filtered languages based on search
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return GLOBAL_LANGUAGES;
    return GLOBAL_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.localName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const renderVersionItem = useCallback(
    ({ item }: { item: GlobalVersionCatalogItem }) => {
      const isSelected = selectedVersionId.toLowerCase() === item.id.toLowerCase();
      const isDownloaded = downloadedSet.has(item.id.toLowerCase()) || item.id.toLowerCase() === 'kjv';
      const downloadState = activeDownloads[item.id.toLowerCase()];
      const isDownloading = downloadState && downloadState.stage !== 'completed' && downloadState.stage !== 'error';

      return (
        <View
          style={[
            styles.versionCard,
            {
              backgroundColor: isSelected ? colors.primary + '14' : colors.surface,
              borderColor: isSelected ? colors.primary : colors.border,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              marginBottom: spacing.sm,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.versionMainTouchable}
            activeOpacity={0.7}
            onPress={() => {
              if (isDownloaded) {
                onSelectVersion(item.id);
                onClose?.();
              } else {
                handleDownload(item.id);
              }
            }}
          >
            <View style={styles.versionHeaderRow}>
              <View style={styles.badgeContainer}>
                <View
                  style={[
                    styles.langBadge,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderRadius: borderRadius.xs,
                      paddingHorizontal: spacing.xs + 2,
                      paddingVertical: 2,
                    },
                  ]}
                >
                  <Text variant="caption" color="textSecondary" style={styles.badgeText}>
                    {item.language.toUpperCase()}
                  </Text>
                </View>
                {item.hasAudio && (
                  <Text variant="caption" color="primary" style={styles.audioIcon}>
                    🔊 Audio
                  </Text>
                )}
              </View>

              {isDownloaded ? (
                <View style={[styles.statusPill, { backgroundColor: '#10B98120' }]}>
                  <Text variant="caption" style={{ color: '#10B981', fontWeight: 'bold' }}>
                    ✓ Ready Offline
                  </Text>
                </View>
              ) : isDownloading ? (
                <View style={styles.downloadingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text variant="caption" color="primary" style={{ marginLeft: 6, fontWeight: '600' }}>
                    {downloadState?.percent ?? 0}%
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.downloadBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: borderRadius.md,
                      paddingHorizontal: spacing.sm + 4,
                      paddingVertical: 4,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleDownload(item.id)}
                >
                  <Text variant="caption" color="inverse" style={{ fontWeight: 'bold' }}>
                    ⬇ Download
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ marginTop: 6 }}>
              <Text
                variant="body"
                color={isSelected ? 'primary' : 'textPrimary'}
                style={[styles.versionTitle, isSelected && { fontWeight: 'bold' }]}
                numberOfLines={2}
              >
                {item.name} ({item.abbreviation})
              </Text>
              <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                Language: {item.languageName} • Public Domain / Open Access
              </Text>
            </View>

            {/* Live Progress Bar */}
            {isDownloading && (
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBarTrack,
                    { backgroundColor: colors.border, borderRadius: borderRadius.xs },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${downloadState?.percent ?? 0}%`,
                        borderRadius: borderRadius.xs,
                      },
                    ]}
                  />
                </View>
                <Text variant="caption" color="textSecondary" style={{ marginTop: 4, fontSize: 11 }}>
                  {downloadState?.message}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [
      selectedVersionId,
      downloadedSet,
      activeDownloads,
      colors,
      spacing,
      borderRadius,
      onSelectVersion,
      onClose,
      handleDownload,
    ]
  );

  const renderLanguageItem = useCallback(
    ({ item }: { item: GlobalLanguage }) => {
      const isSelected = selectedLanguageCode.toLowerCase() === item.code.toLowerCase();

      return (
        <TouchableOpacity
          style={[
            styles.languageRow,
            {
              backgroundColor: isSelected ? colors.primary + '18' : colors.surface,
              borderColor: isSelected ? colors.primary : colors.border,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              marginBottom: spacing.xs,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => {
            setSelectedLanguageCode(item.code);
            setActiveTab('versions');
          }}
        >
          <View style={{ flex: 1 }}>
            <Text variant="body" color={isSelected ? 'primary' : 'textPrimary'} style={{ fontWeight: '600' }}>
              {item.name}
            </Text>
            {item.localName && item.localName !== item.name && (
              <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                {item.localName}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.countPill,
              {
                backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                borderRadius: borderRadius.full,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              },
            ]}
          >
            <Text
              variant="caption"
              color={isSelected ? 'inverse' : 'textSecondary'}
              style={{ fontWeight: 'bold' }}
            >
              {item.versionCount} {item.versionCount === 1 ? 'version' : 'versions'}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [selectedLanguageCode, colors, spacing, borderRadius]
  );

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={
            activeTab === 'versions'
              ? 'Search 3,844 Bible versions & translations...'
              : 'Search 2,459 world languages...'
          }
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: colors.textTertiary, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs: Translations vs Languages */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'versions' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('versions')}
        >
          <Text
            variant="button"
            color={activeTab === 'versions' ? 'primary' : 'textSecondary'}
            style={{ fontWeight: activeTab === 'versions' ? 'bold' : 'normal' }}
          >
            Translations ({filteredVersions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'languages' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('languages')}
        >
          <Text
            variant="button"
            color={activeTab === 'languages' ? 'primary' : 'textSecondary'}
            style={{ fontWeight: activeTab === 'languages' ? 'bold' : 'normal' }}
          >
            2,459 Languages
          </Text>
        </TouchableOpacity>
      </View>

      {/* Language Quick Pills (Shown when in Versions Tab) */}
      {activeTab === 'versions' && (
        <View style={styles.quickPillsWrapper}>
          <FlatList
            horizontal
            data={TOP_LANGUAGES}
            keyExtractor={(item) => item.code}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
            renderItem={({ item }) => {
              const isPillActive = selectedLanguageCode.toLowerCase() === item.code.toLowerCase();
              return (
                <TouchableOpacity
                  style={[
                    styles.langPill,
                    {
                      backgroundColor: isPillActive ? colors.primary : colors.surface,
                      borderColor: isPillActive ? colors.primary : colors.border,
                      borderRadius: borderRadius.full,
                      marginRight: spacing.xs,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                    },
                  ]}
                  onPress={() => setSelectedLanguageCode(item.code)}
                >
                  <Text
                    variant="caption"
                    color={isPillActive ? 'inverse' : 'textSecondary'}
                    style={{ fontWeight: isPillActive ? 'bold' : 'normal' }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Main Virtualized List */}
      <View style={styles.listContainer}>
        {activeTab === 'versions' ? (
          <FlatList
            data={filteredVersions}
            keyExtractor={(item) => item.id}
            renderItem={renderVersionItem}
            initialNumToRender={15}
            maxToRenderPerBatch={20}
            windowSize={7}
            removeClippedSubviews={true}
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="body" color="textSecondary">
                  No Bible translation found matching "{searchQuery}"
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={filteredLanguages}
            keyExtractor={(item) => item.code}
            renderItem={renderLanguageItem}
            initialNumToRender={20}
            maxToRenderPerBatch={25}
            windowSize={7}
            removeClippedSubviews={true}
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="body" color="textSecondary">
                  No language found matching "{searchQuery}"
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxHeight: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  quickPillsWrapper: {
    marginBottom: 8,
  },
  langPill: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    flex: 1,
    minHeight: 280,
  },
  versionCard: {
    borderWidth: 1,
  },
  versionMainTouchable: {
    width: '100%',
  },
  versionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#9994',
  },
  badgeText: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  audioIcon: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  downloadBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarTrack: {
    height: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  countPill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
