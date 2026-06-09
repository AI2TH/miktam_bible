import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../../../src/theme';
import { Header } from '../../../../src/components/shared/Header';
import { ChapterView } from '../../../../src/components/scripture/ChapterView';
import { BottomSheet } from '../../../../src/components/ui/BottomSheet';
import { HighlightColorPicker } from '../../../../src/components/scripture/HighlightColorPicker';
import { InterlinearView } from '../../../../src/components/scripture/InterlinearView';
import { StrongsPopover } from '../../../../src/components/scripture/StrongsPopover';
import { CrossRefPanel } from '../../../../src/components/scripture/CrossRefPanel';
import { ParallelView } from '../../../../src/components/scripture/ParallelView';
import { VersionPicker } from '../../../../src/components/scripture/VersionPicker';
import { Button } from '../../../../src/components/ui/Button';
import { Text } from '../../../../src/components/ui/Text';
import { Divider } from '../../../../src/components/ui/Divider';
import { IconButton } from '../../../../src/components/ui/IconButton';
import { useBibleReader } from '../../../../src/hooks/useBibleReader';
import { useBookmarks } from '../../../../src/hooks/useBookmarks';
import { useNotes } from '../../../../src/hooks/useNotes';
import { useConcordance } from '../../../../src/hooks/useConcordance';
import { useCrossReferences } from '../../../../src/hooks/useCrossReferences';
import { useReaderStore } from '../../../../src/stores/readerStore';
import { markChapterAsRead } from '../../../../src/services/readingProgressService';
import { BOOK_NAMES } from '../../../../src/utils/constants';
import { getBookName } from '../../../../src/utils/bookTranslations';
import { getAllVersions } from '../../../../src/services/bibleService';
import type { BibleVersion } from '../../../../src/types/bible';
import type { Bookmark } from '../../../../src/types/user';
import { Ionicons } from '@expo/vector-icons';

export default function ChapterReaderScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { book, chapter } = useLocalSearchParams<{ book: string; chapter: string }>();
  const bookNumber = parseInt(book || '1');
  const chapterNumber = parseInt(chapter || '1');

  // Zustand Store sync
  const { navigateTo, currentVersionId, fontSize, setFontSize, setVersion, currentBookNumber, currentChapter } = useReaderStore();
  
  // Update state store with current position
  useEffect(() => {
    navigateTo(bookNumber, chapterNumber);
    // Mark progress
    markChapterAsRead(currentVersionId, bookNumber, chapterNumber, 10).catch(() => {});
  }, [bookNumber, chapterNumber, navigateTo, currentVersionId]);

  // Hook layers
  const { verses, loading } = useBibleReader();
  const { add: addBookmark, remove: removeBookmark, bookmarks, refetch: refetchBookmarks } = useBookmarks();
  const { getNote, save: saveNote, remove: removeNote } = useNotes();
  const { originalWords, loadOriginalWords } = useConcordance();
  const { refs: crossRefs, loadRefs } = useCrossReferences();

  // Local component states
  const [downloadedVersions, setDownloadedVersions] = useState<BibleVersion[]>([]);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  
  // Note state
  const [noteContent, setNoteContent] = useState('');
  
  // Detail sheet states
  const [concordanceVisible, setConcordanceVisible] = useState(false);
  const [crossRefsVisible, setCrossRefsVisible] = useState(false);
  const [parallelVisible, setParallelVisible] = useState(false);
  const [strongsNumber, setStrongsNumber] = useState<string | null>(null);
  const [strongsVisible, setStrongsVisible] = useState(false);
  const [versionSheetVisible, setVersionSheetVisible] = useState(false);

  // Load active versions list
  useEffect(() => {
    async function loadVersions() {
      const all = await getAllVersions();
      setDownloadedVersions(all.filter((v: BibleVersion) => v.isDownloaded));
    }
    loadVersions();
  }, []);

  // Filter bookmarks for current chapter
  const chapterBookmarks = React.useMemo(() => {
    return bookmarks.filter(
      (b: Bookmark) => b.bookNumber === currentBookNumber && b.chapter === currentChapter && b.versionId === currentVersionId
    );
  }, [bookmarks, currentBookNumber, currentChapter, currentVersionId]);

  // Handle actions
  const handleVerseTap = (verseNumber: number) => {
    setSelectedVerse(selectedVerse === verseNumber ? null : verseNumber);
  };

  const handleVerseLongPress = async (verseNumber: number) => {
    setSelectedVerse(verseNumber);
    setActionSheetVisible(true);

    // Fetch existing note for this verse
    const existingNote = await getNote(currentVersionId, currentBookNumber, currentChapter, verseNumber);
    setNoteContent(existingNote ? existingNote.content : '');
  };

  const handleApplyHighlight = async (color: string) => {
    if (selectedVerse === null) return;
    try {
      await addBookmark(currentVersionId, currentBookNumber, currentChapter, selectedVerse, color);
      refetchBookmarks();
      setActionSheetVisible(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveHighlight = async () => {
    if (selectedVerse === null) return;
    const existing = chapterBookmarks.find((b: Bookmark) => b.verseNumber === selectedVerse);
    if (existing) {
      await removeBookmark(existing.id);
      refetchBookmarks();
    }
    setActionSheetVisible(false);
  };

  const handleSaveNote = async () => {
    if (selectedVerse === null) return;
    await saveNote(currentVersionId, currentBookNumber, currentChapter, selectedVerse, noteContent);
    setActionSheetVisible(false);
  };

  const handleOpenOriginalStudy = () => {
    if (selectedVerse === null) return;
    setActionSheetVisible(false);
    loadOriginalWords(currentBookNumber, currentChapter, selectedVerse);
    setConcordanceVisible(true);
  };

  const handleOpenCrossRefs = () => {
    if (selectedVerse === null) return;
    setActionSheetVisible(false);
    loadRefs(currentBookNumber, currentChapter, selectedVerse, currentVersionId);
    setCrossRefsVisible(true);
  };

  const handleOpenParallel = () => {
    if (selectedVerse === null) return;
    setActionSheetVisible(false);
    setParallelVisible(true);
  };

  const handleSelectStrongs = (num: string) => {
    setStrongsNumber(num);
    setConcordanceVisible(false);
    setStrongsVisible(true);
  };

  const handleNavigateFromCrossRef = (b: number, c: number, v: number) => {
    setCrossRefsVisible(false);
    setSelectedVerse(v);
    router.replace({
      pathname: '/(tabs)/read/[book]/[chapter]',
      params: { book: b.toString(), chapter: c.toString() },
    });
  };

  const handleViewAllVersesStrongs = (num: string) => {
    setStrongsVisible(false);
    router.push(`/concordance/${num}`);
  };

  const title = `${getBookName(currentBookNumber, currentVersionId)} ${currentChapter}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Header
        title={title}
        showBack={true}
        rightAction={
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={() => setVersionSheetVisible(true)}
              style={{ marginRight: spacing.sm, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.surface, borderRadius: 4, borderWidth: 1, borderColor: colors.border }}
            >
              <Text variant="caption" color="primary" style={{ fontWeight: 'bold' }}>
                {downloadedVersions.find(v => v.id === currentVersionId)?.language.toUpperCase() || 'EN'} • {(currentVersionId || 'KJV').toUpperCase()}
              </Text>
            </TouchableOpacity>
            <IconButton
              onPress={() => setFontSize(fontSize - 2)}
              size={32}
              backgroundColor="transparent"
              icon={<Ionicons name="remove" size={18} color={colors.primary} />}
            />
            <Text variant="caption" color="textSecondary" style={styles.fontSizeText}>
              A
            </Text>
            <IconButton
              onPress={() => setFontSize(fontSize + 2)}
              size={32}
              backgroundColor="transparent"
              icon={<Ionicons name="add" size={18} color={colors.primary} />}
            />
          </View>
        }
      />

      {/* Scripture View */}
      <ChapterView
        verses={verses}
        bookmarks={chapterBookmarks}
        selectedVerseNumber={selectedVerse}
        onVerseTap={handleVerseTap}
        onVerseLongPress={handleVerseLongPress}
        fontSize={fontSize}
      />

      {/* Main Long Press Verse Actions BottomSheet */}
      <BottomSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        title={selectedVerse !== null ? `Verse ${selectedVerse} Study` : 'Verse Study'}
      >
        <View style={styles.sheetSection}>
          <Text variant="h3" style={styles.sheetLabel}>
            Highlight Color
          </Text>
          <HighlightColorPicker
            selectedColor={
              chapterBookmarks.find((b: Bookmark) => b.verseNumber === selectedVerse)?.highlightColor || ''
            }
            onSelectColor={handleApplyHighlight}
          />
          {chapterBookmarks.some((b: Bookmark) => b.verseNumber === selectedVerse) && (
            <Button
              label="Remove Highlight"
              onPress={handleRemoveHighlight}
              variant="outline"
              style={{ marginTop: spacing.xs }}
            />
          )}
        </View>

        <Divider style={{ marginVertical: spacing.md }} />

        {/* Study tools quick links */}
        <View style={[styles.toolRow, { gap: spacing.sm }]}>
          <Button
            label="Original Language"
            onPress={handleOpenOriginalStudy}
            variant="secondary"
            style={styles.toolBtn}
            icon={<Ionicons name="language" size={16} color={colors.primary} />}
          />
          <Button
            label="Cross References"
            onPress={handleOpenCrossRefs}
            variant="secondary"
            style={styles.toolBtn}
            icon={<Ionicons name="git-branch-outline" size={16} color={colors.primary} />}
          />
        </View>
        <Button
          label="Compare Translations"
          onPress={handleOpenParallel}
          variant="secondary"
          style={{ marginTop: spacing.sm }}
          icon={<Ionicons name="layers-outline" size={16} color={colors.primary} />}
        />

        <Divider style={{ marginVertical: spacing.md }} />

        {/* Notes editor */}
        <View style={styles.sheetSection}>
          <Text variant="h3" style={styles.sheetLabel}>
            Study Reflection Note
          </Text>
          <TextInput
            value={noteContent}
            onChangeText={setNoteContent}
            placeholder="Write note/reflection on this verse..."
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[
              styles.noteInput,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.background,
                borderRadius: borderRadius.md,
                padding: spacing.md,
              },
            ]}
          />
          <Button
            label="Save Note"
            onPress={handleSaveNote}
            variant="primary"
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </BottomSheet>

      {/* Interlinear Concordance View */}
      <BottomSheet
        visible={concordanceVisible}
        onClose={() => setConcordanceVisible(false)}
        title="Word Study Interlinear"
      >
        <InterlinearView originalWords={originalWords} onSelectStrongs={handleSelectStrongs} />
      </BottomSheet>

      {/* Strong's dictionary detail modal */}
      <BottomSheet
        visible={strongsVisible}
        onClose={() => setStrongsVisible(false)}
        title="Strong's Dictionary"
      >
        {strongsNumber && (
          <StrongsPopover
            strongsNumber={strongsNumber}
            onClose={() => setStrongsVisible(false)}
            onViewAllVerses={handleViewAllVersesStrongs}
          />
        )}
      </BottomSheet>

      {/* Cross-references list */}
      <BottomSheet
        visible={crossRefsVisible}
        onClose={() => setCrossRefsVisible(false)}
        title="Cross References"
      >
        <CrossRefPanel refs={crossRefs} onNavigate={handleNavigateFromCrossRef} />
      </BottomSheet>

      {/* Translations Comparison Panel */}
      <BottomSheet
        visible={parallelVisible}
        onClose={() => setParallelVisible(false)}
        title="Compare Translations"
      >
        {selectedVerse !== null && (
          <ParallelView
            bookNumber={currentBookNumber}
            chapter={currentChapter}
            verseNumber={selectedVerse}
            downloadedVersions={downloadedVersions}
            fontSize={fontSize}
          />
        )}
      </BottomSheet>

      {/* Version Selector */}
      <BottomSheet
        visible={versionSheetVisible}
        onClose={() => setVersionSheetVisible(false)}
        title="Select Translation"
      >
        <View style={{ paddingVertical: spacing.md, flexWrap: 'wrap', flexDirection: 'row' }}>
          <VersionPicker
            versions={downloadedVersions}
            selectedVersionId={currentVersionId || 'kjv'}
            onSelectVersion={(v) => {
              setVersion(v);
              setVersionSheetVisible(false);
            }}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fontSizeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  sheetSection: {
    width: '100%',
  },
  sheetLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  toolBtn: {
    flex: 1,
  },
  noteInput: {
    minHeight: 80,
    maxHeight: 150,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: 'Outfit',
    textAlignVertical: 'top',
  },
});
