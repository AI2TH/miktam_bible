import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme';
import { Header } from '../src/components/shared/Header';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';
import { Text } from '../src/components/ui/Text';
import { Divider } from '../src/components/ui/Divider';
import { RecordButton } from '../src/components/recorder/RecordButton';
import { PlayButton } from '../src/components/recorder/PlayButton';
import { useRecorder } from '../src/hooks/useRecorder';
import { useReaderStore, CHAPTERS_PER_BOOK } from '../src/stores/readerStore';
import * as recordingService from '../src/services/recordingService';
import type { Recording } from '../src/types/user';
import { BOOK_NAMES } from '../src/utils/constants';
import { getBookName } from '../src/utils/bookTranslations';
import { BottomSheet } from '../src/components/ui/BottomSheet';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

export default function RecordingsScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { currentBookNumber, currentChapter, selectedVerseNumber, currentVersionId } = useReaderStore();
  const { isRecording, durationSecs, transcribing, start, stop } = useRecorder();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [title, setTitle] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Selector states
  const [selectedBookNumber, setSelectedBookNumber] = useState<number>(currentBookNumber);
  const [selectedChapter, setSelectedChapter] = useState<number>(currentChapter);
  const [bookSelectorVisible, setBookSelectorVisible] = useState(false);
  const [chapterSelectorVisible, setChapterSelectorVisible] = useState(false);

  // Sync state if store updates (e.g. initial mount)
  useEffect(() => {
    setSelectedBookNumber(currentBookNumber);
    setSelectedChapter(currentChapter);
  }, [currentBookNumber, currentChapter]);

  const fetchList = async () => {
    try {
      const all = await recordingService.getAllRecordings();
      setRecordings(all);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // Poll list status periodically if any recording is transcribing/pending
  const hasUnfinished = recordings.some(
    (r) => r.transcriptionStatus === 'pending' || r.transcriptionStatus === 'processing'
  );

  useEffect(() => {
    if (!hasUnfinished) return;
    const timer = setInterval(() => {
      fetchList();
    }, 3000);

    return () => clearInterval(timer);
  }, [hasUnfinished]);

  const handleStart = async () => {
    try {
      await start();
    } catch (e) {
      Alert.alert('Error', 'Failed to request microphone access.');
    }
  };

  const handleStop = async () => {
    const finalTitle = title.trim() || `Reflection on ${getBookName(selectedBookNumber, currentVersionId)} ${selectedChapter}`;
    try {
      await stop(finalTitle, selectedBookNumber, selectedChapter, null);
      setTitle('');
      fetchList();
    } catch (e) {
      Alert.alert('Error', 'Failed to save recording.');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Memo', 'Are you sure you want to delete this reflection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await recordingService.deleteRecording(id);
          fetchList();
        },
      },
    ]);
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Voice Reflections" showBack={true} />

      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.base, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          /* Recording Panel Card */
          <Card style={[styles.recorderCard, { marginBottom: spacing.base }]} bordered>
            <Text variant="h3" color="primary" style={styles.recorderTitle}>
              Record Study Reflection
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Give this reflection a title (optional)..."
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              editable={!isRecording}
            />

            <Text variant="caption" color="textSecondary" style={{ marginBottom: 4 }}>
              Link this recording to:
            </Text>
            
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.dropdownButton, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
                onPress={() => !isRecording && setBookSelectorVisible(true)}
                disabled={isRecording}
              >
                <Text style={{ color: colors.textPrimary, fontFamily: 'Outfit', fontSize: 14 }}>
                  {getBookName(selectedBookNumber, currentVersionId)}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdownButton, { borderColor: colors.border, backgroundColor: colors.surfaceMuted, width: 100 }]}
                onPress={() => !isRecording && setChapterSelectorVisible(true)}
                disabled={isRecording}
              >
                <Text style={{ color: colors.textPrimary, fontFamily: 'Outfit', fontSize: 14 }}>
                  Ch {selectedChapter}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <RecordButton isRecording={isRecording} onPress={isRecording ? handleStop : handleStart} />

            {isRecording && (
              <Text variant="h2" color="error" align="center" style={styles.timerText}>
                {formatTimer(durationSecs)}
              </Text>
            )}
          </Card>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          const formattedDate = format(new Date(item.createdAt), 'MMM dd, yyyy · h:mm a');
          const bookName = item.linkedBook ? getBookName(item.linkedBook, currentVersionId) : '';
          const scriptureRef = bookName ? `${bookName} ${item.linkedChapter}${item.linkedVerse ? `:${item.linkedVerse}` : ''}` : '';

          return (
            <Card style={styles.memoCard}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setExpandedId(isExpanded ? null : item.id)}>
                <View style={styles.memoHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: 'bold' }}>{item.title}</Text>
                    <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                      {formattedDate} · {formatTimer(item.durationSecs)}
                    </Text>
                    {scriptureRef && (
                      <View style={styles.linkBadge}>
                        <Text variant="caption" color="primary" style={{ fontWeight: '600' }}>
                          🔗 {scriptureRef}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <PlayButton uri={item.localFilePath} />
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 16 }}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={{ marginTop: spacing.md }}>
                  <Divider style={{ marginVertical: spacing.sm }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                    <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                    <Text variant="caption" color="primary" style={{ fontWeight: 'bold', marginLeft: 4 }}>
                      Transcript
                    </Text>
                  </View>
                  
                  {item.transcriptionStatus === 'done' && item.transcript ? (
                    <Text variant="bodySmall" style={{ fontStyle: 'italic', color: colors.textSecondary }}>
                      "{item.transcript}"
                    </Text>
                  ) : item.transcriptionStatus === 'processing' ? (
                    <Text variant="bodySmall" color="textTertiary" style={{ fontStyle: 'italic' }}>
                      Whisper is transcribing your audio locally on-device...
                    </Text>
                  ) : item.transcriptionStatus === 'failed' ? (
                    <Text variant="bodySmall" color="error" style={{ fontStyle: 'italic' }}>
                      Failed to transcribe: {item.transcript || 'Unknown error'}
                    </Text>
                  ) : (
                    <Text variant="bodySmall" color="textTertiary" style={{ fontStyle: 'italic' }}>
                      Transcription pending...
                    </Text>
                  )}
                </View>
              )}
            </Card>
          );
        }}
      />

      <BottomSheet
        visible={bookSelectorVisible}
        onClose={() => setBookSelectorVisible(false)}
        title="Select Bible Book"
      >
        <View style={styles.gridContainer}>
          {Object.entries(BOOK_NAMES).map(([numStr, name]) => {
            const num = parseInt(numStr, 10);
            const isSelected = num === selectedBookNumber;
            return (
              <TouchableOpacity
                key={num}
                style={[
                  styles.gridItem,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surfaceMuted,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setSelectedBookNumber(num);
                  setSelectedChapter(1);
                  setBookSelectorVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.gridItemText,
                    { color: isSelected ? colors.background : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {getBookName(num, currentVersionId)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={chapterSelectorVisible}
        onClose={() => setChapterSelectorVisible(false)}
        title="Select Chapter"
      >
        <View style={styles.gridContainer}>
          {Array.from({ length: CHAPTERS_PER_BOOK[selectedBookNumber] || 50 }, (_, i) => i + 1).map((ch) => {
            const isSelected = ch === selectedChapter;
            return (
              <TouchableOpacity
                key={ch}
                style={[
                  styles.gridItemChapter,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surfaceMuted,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setSelectedChapter(ch);
                  setChapterSelectorVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.gridItemText,
                    { color: isSelected ? colors.background : colors.textPrimary },
                  ]}
                >
                  {ch}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  recorderCard: {
    width: '100%',
  },
  recorderTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Outfit',
    marginBottom: 12,
  },
  timerText: {
    fontWeight: 'bold',
    marginTop: 12,
  },
  memoCard: {
    width: '100%',
  },
  memoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  gridItem: {
    width: '31%',
    aspectRatio: 2.2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  gridItemChapter: {
    width: '18%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  gridItemText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Outfit',
  },
});
