import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity, Switch, Share } from 'react-native';
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
import { useReaderStore, CHAPTERS_PER_BOOK } from '../../../../src/stores/readerStore';
import { markChapterAsRead } from '../../../../src/services/readingProgressService';
import { BOOK_NAMES } from '../../../../src/utils/constants';
import { getBookName } from '../../../../src/utils/bookTranslations';
import { getVersionAbbreviation, formatMultiVerseRef, cleanVerseText } from '../../../../src/utils/bibleUtils';
import { getAllVersions } from '../../../../src/services/bibleService';
import type { BibleVersion } from '../../../../src/types/bible';
import type { Bookmark } from '../../../../src/types/user';
import { Ionicons } from '@expo/vector-icons';

export default function ChapterReaderScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { book, chapter } = useLocalSearchParams<{ book: string; chapter: string }>();
  const parsedBook = parseInt(Array.isArray(book) ? book[0] : (book || '1'));
  const bookNumber = isNaN(parsedBook) ? 1 : Math.max(1, Math.min(66, parsedBook));
  const maxChapters = CHAPTERS_PER_BOOK[bookNumber] || 50;
  const parsedChapter = parseInt(Array.isArray(chapter) ? chapter[0] : (chapter || '1'));
  const chapterNumber = isNaN(parsedChapter) ? 1 : Math.max(1, Math.min(maxChapters, parsedChapter));

  // Zustand Store sync
  const {
    navigateTo,
    currentVersionId,
    fontSize,
    setFontSize,
    setVersion,
    currentBookNumber,
    currentChapter,
    dualLanguageEnabled,
    secondaryVersionId,
    setDualLanguageEnabled,
    setSecondaryVersion,
    swapLanguages,
  } = useReaderStore();
  
  // Update state store with current position
  useEffect(() => {
    if (bookNumber !== currentBookNumber || chapterNumber !== currentChapter) {
      navigateTo(bookNumber, chapterNumber);
    }
    // Mark progress
    markChapterAsRead(currentVersionId, currentBookNumber, currentChapter, 10).catch(() => {});
  }, [bookNumber, chapterNumber, currentBookNumber, currentChapter, navigateTo, currentVersionId]);

  // Synchronize URL route when store auto-navigates (e.g. NT-only translations)
  useEffect(() => {
    if (currentBookNumber !== bookNumber || currentChapter !== chapterNumber) {
      router.replace({
        pathname: '/(tabs)/read/[book]/[chapter]',
        params: { book: currentBookNumber.toString(), chapter: currentChapter.toString() },
      });
    }
  }, [currentBookNumber, currentChapter, bookNumber, chapterNumber]);

  // Hook layers
  const { verses, secondaryVerseMap, loading } = useBibleReader();
  const { add: addBookmark, remove: removeBookmark, removeByVerse: removeBookmarkByVerse, bookmarks, refetch: refetchBookmarks } = useBookmarks();
  const { getNote, save: saveNote, remove: removeNote } = useNotes();
  const { originalWords, loadOriginalWords } = useConcordance();
  const { refs: crossRefs, loadRefs } = useCrossReferences();

  // Local component states
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [downloadedVersions, setDownloadedVersions] = useState<BibleVersion[]>([]);
  type StudySheetMode = 'none' | 'actions' | 'concordance' | 'strongs' | 'cross_refs' | 'parallel';
  const [studySheetMode, setStudySheetMode] = useState<StudySheetMode>('none');
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [highlightSheetVisible, setHighlightSheetVisible] = useState(false);
  
  // Note state
  const [noteContent, setNoteContent] = useState('');
  
  // Detail sheet states
  const [strongsNumber, setStrongsNumber] = useState<string | null>(null);
  const [versionSheetVisible, setVersionSheetVisible] = useState(false);
  const [dualSheetVisible, setDualSheetVisible] = useState(false);

  // Load active versions list
  useEffect(() => {
    async function loadVersions() {
      try {
        const all = await getAllVersions();
        setVersions(all);
        setDownloadedVersions(all.filter((v: BibleVersion) => v.isDownloaded));
      } catch (e) {
        console.error('[ChapterScreen] Error loading versions:', e);
      }
    }
    loadVersions();
  }, [currentVersionId]);

  // Filter bookmarks for current chapter (per verse, across all translations)
  const chapterBookmarks = React.useMemo(() => {
    return bookmarks.filter(
      (b: Bookmark) => b.bookNumber === currentBookNumber && b.chapter === currentChapter
    );
  }, [bookmarks, currentBookNumber, currentChapter]);

  // Handle multi-verse selection on tap
  const handleVerseTap = (verseNumber: number) => {
    setSelectedVerses((prev) => {
      let next: number[];
      if (prev.includes(verseNumber)) {
        next = prev.filter((v) => v !== verseNumber);
      } else {
        next = [...prev, verseNumber].sort((a, b) => a - b);
      }
      setSelectedVerse(next.length > 0 ? next[0] : null);
      return next;
    });
  };

  const handleVerseLongPress = async (verseNumber: number) => {
    setSelectedVerses((prev) => {
      if (prev.includes(verseNumber)) return prev;
      return [...prev, verseNumber].sort((a, b) => a - b);
    });
    setSelectedVerse(verseNumber);
    setStudySheetMode('actions');

    // Fetch existing note for this verse
    const existingNote = await getNote(currentVersionId, currentBookNumber, currentChapter, verseNumber);
    setNoteContent(existingNote ? existingNote.content : '');
  };

  const handleShareSelected = async () => {
    if (selectedVerses.length === 0) return;
    const bookName = getBookName(currentBookNumber, currentVersionId);
    const refStr = formatMultiVerseRef(bookName, currentChapter, selectedVerses);
    const versionAbbr = getVersionAbbreviation(currentVersionId);

    const verseTexts = selectedVerses.map((vNum) => {
      const vObj = verses.find((v) => v.verseNumber === vNum);
      const text = vObj ? cleanVerseText(vObj.text) : '';
      return `${vNum} ${text}`;
    });

    const fullMessage = `"${verseTexts.join('\n\n')}"\n\n— ${refStr} (${versionAbbr})\nShared via Miktam Bible`;

    try {
      await Share.share({
        message: fullMessage,
        title: refStr,
      });
    } catch (e) {
      console.error('[Share] Error sharing verses:', e);
    }
  };

  const handleApplyHighlightToAll = async (color: string) => {
    if (selectedVerses.length === 0) return;
    try {
      for (const vNum of selectedVerses) {
        await addBookmark(currentVersionId, currentBookNumber, currentChapter, vNum, color);
      }
      refetchBookmarks();
      setHighlightSheetVisible(false);
      setSelectedVerses([]);
      setSelectedVerse(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearSelection = () => {
    setSelectedVerses([]);
    setSelectedVerse(null);
  };

  const handleApplyHighlight = async (color: string) => {
    if (selectedVerse === null) return;
    try {
      await addBookmark(currentVersionId, currentBookNumber, currentChapter, selectedVerse, color);
      refetchBookmarks();
      setStudySheetMode('none');
      setSelectedVerses([]);
      setSelectedVerse(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveHighlight = async () => {
    if (selectedVerse === null) return;
    try {
      await removeBookmarkByVerse(currentBookNumber, currentChapter, selectedVerse);
      refetchBookmarks();
    } catch (e) {
      console.error(e);
    }
    setStudySheetMode('none');
    setSelectedVerses([]);
    setSelectedVerse(null);
  };

  const handleSaveNote = async () => {
    if (selectedVerse === null) return;
    await saveNote(currentVersionId, currentBookNumber, currentChapter, selectedVerse, noteContent);
    setStudySheetMode('none');
  };

  const handleOpenOriginalStudy = () => {
    if (selectedVerse === null) return;
    loadOriginalWords(currentBookNumber, currentChapter, selectedVerse);
    setStudySheetMode('concordance');
  };

  const handleOpenCrossRefs = () => {
    if (selectedVerse === null) return;
    loadRefs(currentBookNumber, currentChapter, selectedVerse, currentVersionId);
    setStudySheetMode('cross_refs');
  };

  const handleOpenParallel = () => {
    if (selectedVerse === null) return;
    setStudySheetMode('parallel');
  };

  const handleSelectStrongs = (num: string) => {
    setStrongsNumber(num);
    setStudySheetMode('strongs');
  };

  const handleNavigateFromCrossRef = (b: number, c: number, v: number) => {
    setStudySheetMode('none');
    setSelectedVerse(v);
    router.replace({
      pathname: '/(tabs)/read/[book]/[chapter]',
      params: { book: b.toString(), chapter: c.toString() },
    });
  };

  const handleViewAllVersesStrongs = (num: string) => {
    setStudySheetMode('none');
    router.push(`/concordance/${num}`);
  };

  const handleBack = () => {
    router.replace({
      pathname: '/(tabs)/read/[book]',
      params: { book: currentBookNumber.toString() },
    });
  };

  const title = `${getBookName(currentBookNumber, currentVersionId)} ${currentChapter}`;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Header
        title={title}
        showBack={true}
        onBack={handleBack}
        showStreak={false}
        rightAction={
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={() => setVersionSheetVisible(true)}
              style={[
                styles.versionBadge,
                { backgroundColor: colors.surface, borderColor: colors.border }
              ]}
            >
              <Text variant="caption" color="primary" style={styles.versionBadgeText}>
                {getVersionAbbreviation(currentVersionId)}
              </Text>
            </TouchableOpacity>

            {/* Dual Language Badge */}
            <TouchableOpacity
              onPress={() => setDualSheetVisible(true)}
              style={[
                styles.dualBadge,
                dualLanguageEnabled
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.border }
              ]}
            >
              <Ionicons
                name="globe-outline"
                size={12}
                color={dualLanguageEnabled ? colors.textInverse : colors.primary}
                style={{ marginRight: 3 }}
              />
              <Text
                variant="caption"
                style={[
                  styles.dualBadgeText,
                  { color: dualLanguageEnabled ? colors.textInverse : colors.primary }
                ]}
              >
                {dualLanguageEnabled && secondaryVersionId
                  ? getVersionAbbreviation(secondaryVersionId)
                  : '+ Dual'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.fontControlGroup, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <TouchableOpacity
                onPress={() => setFontSize(Math.max(12, fontSize - 2))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                style={styles.fontBtn}
              >
                <Ionicons name="remove" size={16} color={colors.primary} />
              </TouchableOpacity>
              <Text variant="caption" color="textSecondary" style={styles.fontSizeText}>
                A
              </Text>
              <TouchableOpacity
                onPress={() => setFontSize(Math.min(32, fontSize + 2))}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                style={styles.fontBtn}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      {/* Scripture View */}
      <ChapterView
        verses={verses}
        bookmarks={chapterBookmarks}
        selectedVerseNumber={selectedVerse}
        selectedVerseNumbers={selectedVerses}
        onVerseTap={handleVerseTap}
        onVerseLongPress={handleVerseLongPress}
        fontSize={fontSize}
        secondaryVerseMap={secondaryVerseMap}
        secondaryVersionAbbr={secondaryVersionId ? getVersionAbbreviation(secondaryVersionId) : undefined}
        isDualMode={dualLanguageEnabled}
        onNextChapter={() => {
          const maxChapters = CHAPTERS_PER_BOOK[currentBookNumber] || 50;
          if (currentChapter < maxChapters) {
            router.replace({
              pathname: '/(tabs)/read/[book]/[chapter]',
              params: { book: currentBookNumber.toString(), chapter: (currentChapter + 1).toString() },
            });
          } else if (currentBookNumber < 66) {
            router.replace({
              pathname: '/(tabs)/read/[book]/[chapter]',
              params: { book: (currentBookNumber + 1).toString(), chapter: '1' },
            });
          }
        }}
        onPrevChapter={() => {
          if (currentChapter > 1) {
            router.replace({
              pathname: '/(tabs)/read/[book]/[chapter]',
              params: { book: currentBookNumber.toString(), chapter: (currentChapter - 1).toString() },
            });
          } else if (currentBookNumber > 1) {
            const prevBookChapters = CHAPTERS_PER_BOOK[currentBookNumber - 1] || 1;
            router.replace({
              pathname: '/(tabs)/read/[book]/[chapter]',
              params: { book: (currentBookNumber - 1).toString(), chapter: prevBookChapters.toString() },
            });
          }
        }}
      />

      {/* Floating Multi-Verse Selection Action Bar */}
      {selectedVerses.length > 0 && (
        <View
          style={[
            styles.floatingActionBar,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.primary,
              borderRadius: borderRadius.lg,
            },
          ]}
        >
          <View style={styles.floatingRefInfo}>
            <Text variant="bodySmall" color="primary" style={{ fontWeight: 'bold' }}>
              {formatMultiVerseRef(getBookName(currentBookNumber, currentVersionId), currentChapter, selectedVerses)}
            </Text>
            <Text variant="caption" color="textSecondary">
              {selectedVerses.length} {selectedVerses.length === 1 ? 'verse' : 'verses'} selected • {getVersionAbbreviation(currentVersionId)}
            </Text>
          </View>

          <View style={styles.floatingButtonsRow}>
            {/* Share Button */}
            <TouchableOpacity
              onPress={handleShareSelected}
              style={[styles.floatingActionBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="share-social" size={16} color={colors.textInverse} />
              <Text variant="caption" color="inverse" style={{ fontWeight: 'bold' }}>
                Share
              </Text>
            </TouchableOpacity>

            {/* Highlight Button */}
            <TouchableOpacity
              onPress={() => setHighlightSheetVisible(true)}
              style={[
                styles.floatingActionBtn,
                { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Ionicons name="color-palette-outline" size={16} color={colors.primary} />
            </TouchableOpacity>

            {/* Study Button (available when 1 verse selected) */}
            {selectedVerses.length === 1 && (
              <TouchableOpacity
                onPress={() => setStudySheetMode('actions')}
                style={[
                  styles.floatingActionBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <Ionicons name="book-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}

            {/* Close / Deselect */}
            <TouchableOpacity
              onPress={handleClearSelection}
              style={[styles.floatingCloseBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="close" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Multi-verse Highlight Picker Sheet */}
      <BottomSheet
        visible={highlightSheetVisible}
        onClose={() => setHighlightSheetVisible(false)}
        title={`Highlight ${selectedVerses.length} Verses`}
      >
        <View style={{ paddingVertical: spacing.md, gap: spacing.md }}>
          <Text variant="bodySmall" color="textSecondary">
            Choose a highlight color for all {selectedVerses.length} selected verses:
          </Text>
          <HighlightColorPicker
            selectedColor=""
            onSelectColor={handleApplyHighlightToAll}
          />
        </View>
      </BottomSheet>

      {/* Unified Study BottomSheet */}
      <BottomSheet
        visible={studySheetMode !== 'none'}
        onClose={() => setStudySheetMode('none')}
        onBack={
          studySheetMode === 'strongs'
            ? () => setStudySheetMode('concordance')
            : studySheetMode !== 'actions'
            ? () => setStudySheetMode('actions')
            : undefined
        }
        title={
          studySheetMode === 'actions'
            ? selectedVerse !== null ? `Verse ${selectedVerse} Study` : 'Verse Study'
            : studySheetMode === 'concordance'
            ? `Word Study: ${getBookName(currentBookNumber, currentVersionId)} ${currentChapter}:${selectedVerse}`
            : studySheetMode === 'strongs'
            ? `Strong's Dictionary: ${strongsNumber}`
            : studySheetMode === 'cross_refs'
            ? `Cross References: ${getBookName(currentBookNumber, currentVersionId)} ${currentChapter}:${selectedVerse}`
            : studySheetMode === 'parallel'
            ? `Compare Translations: ${getBookName(currentBookNumber, currentVersionId)} ${currentChapter}:${selectedVerse}`
            : undefined
        }
        scrollable={studySheetMode !== 'parallel'}
      >
        {studySheetMode === 'actions' && (
          <>
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
              <Button
                label="View All Study Notes →"
                onPress={() => {
                  setStudySheetMode('none');
                  router.push('/studies' as any);
                }}
                variant="ghost"
                style={{ marginTop: spacing.xs }}
              />
            </View>
          </>
        )}

        {studySheetMode === 'concordance' && (
          <InterlinearView originalWords={originalWords} onSelectStrongs={handleSelectStrongs} />
        )}

        {studySheetMode === 'strongs' && strongsNumber && (
          <StrongsPopover
            strongsNumber={strongsNumber}
            onClose={() => setStudySheetMode('none')}
            onViewAllVerses={handleViewAllVersesStrongs}
          />
        )}

        {studySheetMode === 'cross_refs' && (
          <CrossRefPanel refs={crossRefs} onNavigate={handleNavigateFromCrossRef} />
        )}

        {studySheetMode === 'parallel' && selectedVerse !== null && (
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

      {/* Dual Language Sheet */}
      <BottomSheet
        visible={dualSheetVisible}
        onClose={() => setDualSheetVisible(false)}
        title="Dual Language (Bilingual)"
        maxHeight="85%"
        scrollable={true}
      >
        <View style={styles.sheetSection}>
          {/* Enable / Disable Toggle Row */}
          <View style={styles.dualToggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text variant="h3" style={{ fontSize: 16, fontWeight: '700', marginBottom: 2 }}>
                Dual Language Mode
              </Text>
              <Text variant="bodySmall" color="textSecondary">
                Display two translations together verse-by-verse
              </Text>
            </View>
            <Switch
              value={dualLanguageEnabled}
              onValueChange={setDualLanguageEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Primary & Secondary Language Indicator with Swap */}
          <View
            style={[
              styles.dualStatusBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                marginTop: spacing.md,
              },
            ]}
          >
            <View style={styles.dualStatusRow}>
              <View style={styles.dualStatusCol}>
                <Text variant="caption" color="textTertiary" style={{ textTransform: 'uppercase', fontWeight: '600', fontSize: 11 }}>
                  Primary
                </Text>
                <Text variant="body" color="primary" style={{ fontWeight: '700', marginTop: 2 }}>
                  {getVersionAbbreviation(currentVersionId)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => swapLanguages()}
                style={[
                  styles.swapButton,
                  {
                    backgroundColor: colors.primary + '15',
                    borderColor: colors.primary,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
                <Text variant="caption" color="primary" style={{ fontWeight: '700', marginLeft: 4 }}>
                  Swap
                </Text>
              </TouchableOpacity>

              <View style={[styles.dualStatusCol, { alignItems: 'flex-end' }]}>
                <Text variant="caption" color="textTertiary" style={{ textTransform: 'uppercase', fontWeight: '600', fontSize: 11 }}>
                  Secondary
                </Text>
                <Text variant="body" color="primary" style={{ fontWeight: '700', marginTop: 2 }}>
                  {secondaryVersionId ? getVersionAbbreviation(secondaryVersionId) : 'None'}
                </Text>
              </View>
            </View>
          </View>

          <Divider style={{ marginVertical: spacing.lg }} />

          {/* Secondary Version Picker */}
          <Text variant="h3" style={[styles.sheetLabel, { marginBottom: spacing.xs }]}>
            Select Secondary Translation
          </Text>
          <Text variant="bodySmall" color="textSecondary" style={{ marginBottom: spacing.md }}>
            Choose a downloaded translation to display alongside your primary Bible:
          </Text>

          <View style={{ gap: spacing.sm, paddingBottom: spacing.xl }}>
            {downloadedVersions.length === 0 ? (
              <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                <Text variant="bodySmall" color="textTertiary">
                  No downloaded translations found.
                </Text>
              </View>
            ) : (
              downloadedVersions.map((v) => {
                const isSelected = secondaryVersionId?.toLowerCase() === v.id.toLowerCase();
                const isPrimary = currentVersionId?.toLowerCase() === v.id.toLowerCase();

                return (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => {
                      if (isPrimary) {
                        swapLanguages();
                      } else {
                        setSecondaryVersion(v.id);
                        if (!dualLanguageEnabled) {
                          setDualLanguageEnabled(true);
                        }
                      }
                    }}
                    style={[
                      styles.versionOption,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary + '12' : colors.surface,
                        borderRadius: borderRadius.md,
                        padding: spacing.md,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          variant="body"
                          style={{
                            fontWeight: '700',
                            color: isSelected ? colors.primary : colors.textPrimary,
                          }}
                        >
                          {v.name} ({getVersionAbbreviation(v.id)})
                        </Text>
                        {isPrimary && (
                          <View style={[styles.primaryTag, { backgroundColor: colors.border }]}>
                            <Text variant="caption" style={{ fontSize: 10, fontWeight: '600' }}>
                              Primary
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                        {v.language.toUpperCase()} • {v.id.toUpperCase()}
                      </Text>
                    </View>

                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
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
    gap: 6,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  versionBadgeText: {
    fontWeight: '700',
    fontSize: 12,
  },
  dualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  dualBadgeText: {
    fontWeight: '700',
    fontSize: 12,
  },
  fontControlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  fontBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeText: {
    fontSize: 13,
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
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
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
  dualToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dualStatusBox: {
    borderWidth: 1,
  },
  dualStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dualStatusCol: {
    flex: 1,
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 8,
  },
  versionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  floatingActionBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  floatingRefInfo: {
    flex: 1,
    marginRight: 8,
  },
  floatingButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  floatingCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
