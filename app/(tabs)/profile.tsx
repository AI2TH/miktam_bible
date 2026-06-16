import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { Header } from '../../src/components/shared/Header';
import { Card } from '../../src/components/ui/Card';
import { Text } from '../../src/components/ui/Text';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { Ionicons } from '@expo/vector-icons';
import { getAllNotes, deleteNote } from '../../src/services/noteService';
import type { Note } from '../../src/types/user';
import { useNavigation } from 'expo-router';

type NoteWithBookName = Note & { bookName: string };

export default function ProfileScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const navigation = useNavigation();
  
  // Settings sync
  const { themeMode, setThemeMode, preferredVersion, setPreferredVersion } = useSettingsStore();

  const [notes, setNotes] = useState<NoteWithBookName[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const allNotes = await getAllNotes();
      setNotes(allNotes);
    } catch (error) {
      console.warn('[Profile] Failed to load study reflections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadNotes();
    });
    loadNotes(); // Initial load
    return unsubscribe;
  }, [navigation]);

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote(id);
      loadNotes(); // Refresh list
    } catch (error) {
      console.warn('[Profile] Failed to delete reflection:', error);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.base, gap: spacing.md }]} showsVerticalScrollIndicator={false}>
        
        {/* Theme Settings Card */}
        <Card bordered>
          <Text variant="h3" color="primary" style={styles.cardTitle}>App Theme</Text>
          <View style={[styles.segmentedBar, { backgroundColor: colors.surfaceMuted, borderRadius: borderRadius.md }]}>
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const isSelected = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <Text variant="button" color={isSelected ? 'inverse' : 'textSecondary'}>
                    {mode.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Study Reflections History Card */}
        <Card bordered style={styles.historyCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="journal-outline" size={20} color={colors.primary} />
            <Text variant="h3" color="primary" style={[styles.cardTitle, { marginBottom: 0, marginLeft: spacing.xs }]}>
              Study Reflections
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : notes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="body" color="textSecondary" style={styles.emptyText}>
                No reflections saved yet.
              </Text>
              <Text variant="bodySmall" style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                To add notes, long-press any verse in the Bible Reader tab and type a reflection.
              </Text>
            </View>
          ) : (
            <View style={[styles.listContainer, { gap: spacing.sm }]}>
              {notes.map((note) => (
                <View
                  key={note.id}
                  style={[
                    styles.noteItem,
                    {
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      padding: spacing.sm,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <View style={styles.noteHeader}>
                    <Text style={[styles.noteRef, { color: colors.primary }]}>
                      {note.bookName} {note.chapter}:{note.verseNumber ?? 'Chapter'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                      {formatDate(note.createdAt)}
                    </Text>
                  </View>
                  
                  <Text variant="body" style={styles.noteContent}>
                    {note.content}
                  </Text>

                  <View style={styles.noteFooter}>
                    <Text variant="bodySmall" style={{ fontStyle: 'italic', color: colors.textSecondary }}>
                      Version: {note.versionId.toUpperCase()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteNote(note.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error || '#FF4D4F'} />
                      <Text variant="bodySmall" style={{ color: colors.error || '#FF4D4F', fontWeight: '600' }}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  segmentedBar: {
    flexDirection: 'row',
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCard: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: 13,
  },
  listContainer: {
    width: '100%',
  },
  noteItem: {
    borderWidth: 1,
    gap: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteRef: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  noteContent: {
    lineHeight: 20,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capabilityBox: {
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  modelItem: {
    borderWidth: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  downloadBtn: {
    alignSelf: 'flex-start',
  },
  progressBarContainer: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
});
