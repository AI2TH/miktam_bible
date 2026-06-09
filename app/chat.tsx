import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme';
import { Header } from '../src/components/shared/Header';
import { ChatBubble } from '../src/components/chat/ChatBubble';
import { ChatInput } from '../src/components/chat/ChatInput';
import { SuggestedPrompts } from '../src/components/chat/SuggestedPrompts';
import { useChat } from '../src/hooks/useChat';
import { useReaderStore } from '../src/stores/readerStore';
import { router, useNavigation } from 'expo-router';
import { IconButton } from '../src/components/ui/IconButton';
import { Text } from '../src/components/ui/Text';
import { BottomSheet } from '../src/components/ui/BottomSheet';
import type { VerseRef } from '../src/types/bible';
import { Ionicons } from '@expo/vector-icons';
import { getAvailableModels, downloadModel, deleteModel, getDeviceCapability } from '../src/ai/modelManager';
import type { AIModel, DeviceCapability } from '../src/types/ai';

export default function ChatScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { messages, isGenerating, streamingText, send, clear, error } = useChat();
  const { navigateTo } = useReaderStore();
  const listRef = useRef<FlatList>(null);
  const navigation = useNavigation();

  // Model management state
  const [showModelManager, setShowModelManager] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [capability, setCapability] = useState<DeviceCapability | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const loadModelsAndCapability = async () => {
    try {
      const availModels = await getAvailableModels();
      setModels(availModels);
      const cap = await getDeviceCapability();
      setCapability(cap);
    } catch (e) {
      console.warn('[Chat] Failed to load models and capability:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadModelsAndCapability();
    });
    loadModelsAndCapability();
    return unsubscribe;
  }, [navigation]);

  const handleDownloadModel = async (modelId: string) => {
    try {
      setDownloadProgress((prev) => ({ ...prev, [modelId]: 0 }));
      await downloadModel(modelId, (prog) => {
        setDownloadProgress((prev) => ({
          ...prev,
          [modelId]: prog.percentage,
        }));
      });
      loadModelsAndCapability();
      Alert.alert('Success', 'Model downloaded and integrated successfully!');
    } catch (error: any) {
      console.error('[Chat] Failed to download model:', error);
      Alert.alert('Download Error', `Failed to download model: ${error?.message || 'Unknown error'}`);
    } finally {
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[modelId];
        return next;
      });
    }
  };

  const handleDeleteModel = async (modelId: string, displayName: string) => {
    Alert.alert(
      'Delete AI Model',
      `Are you sure you want to delete ${displayName}? This will free up storage space.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteModel(modelId);
              loadModelsAndCapability();
              Alert.alert('Deleted', 'The model has been removed from your device.');
            } catch (error: any) {
              console.error('[Chat] Failed to delete model:', error);
              Alert.alert('Error', 'Failed to delete the model.');
            }
          }
        }
      ]
    );
  };

  // Auto-scroll list to bottom when messages or stream changes
  useEffect(() => {
    if (messages.length > 0 || streamingText) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, streamingText]);

  const handleSelectPrompt = (prompt: string) => {
    send(prompt);
  };

  const handleTapCitation = (ref: VerseRef) => {
    navigateTo(ref.bookNumber, ref.chapter);
    router.replace({
      pathname: '/(tabs)/read/[book]/[chapter]',
      params: { book: ref.bookNumber.toString(), chapter: ref.chapter.toString() },
    });
  };

  // Check if at least one LLM model is downloaded
  const hasDownloadedLlm = models.some(m => m.modelType === 'llm' && m.isDownloaded);

  // Construct temp message structure for active streaming token text
  const streamingMessage = streamingText
    ? {
        id: 'streaming',
        sessionId: 'current',
        role: 'assistant' as const,
        content: streamingText,
        citedVerses: [],
        versionId: '',
        createdAt: new Date().toISOString(),
      }
    : null;

  const dataList = streamingMessage ? [...messages, streamingMessage] : messages;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="AI Study Assistant"
        showBack={true}
        rightAction={
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <IconButton
              onPress={() => setShowModelManager(true)}
              size={36}
              backgroundColor="transparent"
              icon={
                <Ionicons 
                  name="hardware-chip-outline" 
                  size={20} 
                  color={hasDownloadedLlm ? colors.primary : colors.textTertiary} 
                />
              }
            />
            <IconButton
              onPress={clear}
              size={36}
              backgroundColor="transparent"
              icon={<Ionicons name="trash-outline" size={20} color={colors.primary} />}
            />
          </View>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.chatArea}>
          {dataList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.introContainer}>
                <Ionicons name="sparkles" size={48} color={colors.primary} />
                <Text variant="h2" align="center" style={styles.introTitle}>
                  On-Device Bible Assistant
                </Text>
                
                {!hasDownloadedLlm && (
                  <View style={[styles.warningBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                    <Text variant="caption" color="textSecondary" style={{ flex: 1, marginLeft: 6 }}>
                      No GGUF AI model downloaded yet. The assistant will operate in <Text variant="caption" style={{ fontWeight: 'bold', color: colors.primary }}>mock/fallback offline study mode</Text>. Tap the chip icon in the top right to download a model for offline study!
                    </Text>
                  </View>
                )}

                <Text variant="bodySmall" color="textSecondary" align="center" style={styles.introSubtitle}>
                  Ask queries about scripture. Everything is calculated 100% locally on-device.
                </Text>
              </View>
              <SuggestedPrompts onSelectPrompt={handleSelectPrompt} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={dataList}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: spacing.base }}
              renderItem={({ item }) => (
                <ChatBubble
                  message={item}
                  onTapCitation={handleTapCitation}
                  isStreaming={item.id === 'streaming'}
                />
              )}
            />
          )}

          {error && (
            <View style={[styles.errorBar, { backgroundColor: colors.error }]}>
              <Text variant="caption" color="inverse" style={{ fontWeight: 'bold' }}>
                Error: {error}
              </Text>
            </View>
          )}

          <ChatInput onSend={send} disabled={isGenerating} />
        </View>
      </KeyboardAvoidingView>

      {/* Model Manager BottomSheet Modal */}
      <BottomSheet
        visible={showModelManager}
        onClose={() => setShowModelManager(false)}
        title="Manage On-Device AI"
        maxHeight="85%"
      >
        <ScrollView contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.sm }} showsVerticalScrollIndicator={false}>
          <Text variant="bodySmall" color="textSecondary">
            The app features zero cloud dependencies for AI. Download models directly into app storage to enable offline biblical study chat and speech-to-text.
          </Text>

          {capability && (
            <View style={[styles.capabilityBox, { backgroundColor: colors.surfaceMuted, borderRadius: borderRadius.md, padding: spacing.sm, borderColor: 'rgba(212, 175, 55, 0.2)', borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="speedometer-outline" size={16} color={colors.secondary} />
                <Text variant="bodySmall" style={{ fontWeight: 'bold', color: colors.secondary }}>
                  Device Diagnostics
                </Text>
              </View>
              <Text variant="caption" color="textSecondary">
                Total System RAM: <Text variant="caption" style={{ fontWeight: 'bold' }}>{capability.totalRamMb} MB</Text> {'\n'}
                Recommended Tier: <Text variant="caption" style={{ fontWeight: 'bold', color: colors.primary }}>
                  {capability.recommendedTier === 'full' ? 'BibleSLM 1.5B (Full)' : capability.recommendedTier === 'lite' ? 'SmolLM2 (Lite)' : 'FTS (No LLM)'}
                </Text>
              </Text>
            </View>
          )}

          <View style={{ gap: spacing.md }}>
            {models.map((model) => {
              const isDownloading = downloadProgress[model.id] !== undefined;
              const progress = downloadProgress[model.id] || 0;
              
              return (
                <View 
                  key={model.id}
                  style={[
                    styles.modelItem, 
                    { 
                      borderColor: colors.border, 
                      borderRadius: borderRadius.md, 
                      padding: spacing.sm,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                    }
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>
                        {model.displayName}
                      </Text>
                      <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                        {model.description}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                        <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                          Size: {model.fileSizeMb} MB
                        </Text>
                        <Text variant="caption" style={{ color: colors.secondary, fontWeight: '600' }}>
                          Min RAM: {model.ramRequiredMb} MB
                        </Text>
                      </View>
                    </View>

                    {model.isDownloaded ? (
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={[styles.statusBadge, { backgroundColor: '#13C2C220', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }]}>
                          <Text variant="caption" style={{ color: '#13C2C2', fontWeight: 'bold' }}>
                            READY
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleDeleteModel(model.id, model.displayName)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.error || '#FF4D4F'} />
                          <Text variant="caption" style={{ color: colors.error || '#FF4D4F', fontWeight: '600' }}>
                            Remove
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : isDownloading ? (
                      <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text variant="caption" style={{ color: colors.primary, fontWeight: 'bold', marginTop: 4 }}>
                          {progress}%
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDownloadModel(model.id)}
                        style={[
                          styles.downloadBtn,
                          {
                            backgroundColor: colors.primary,
                            borderRadius: borderRadius.sm,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.xs,
                          }
                        ]}
                      >
                        <Text variant="caption" color="inverse" style={{ fontWeight: 'bold' }}>
                          Download
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {isDownloading && (
                    <View style={[styles.progressBarContainer, { backgroundColor: colors.surfaceMuted, borderRadius: borderRadius.full, marginTop: spacing.xs, height: 6, overflow: 'hidden' }]}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { 
                            backgroundColor: colors.primary, 
                            width: `${progress}%`,
                            borderRadius: borderRadius.full,
                            height: '100%',
                          }
                        ]} 
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 32,
  },
  introContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 32,
  },
  introTitle: {
    fontWeight: 'bold',
    marginTop: 12,
  },
  introSubtitle: {
    marginTop: 8,
    maxWidth: 280,
  },
  errorBar: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 12,
  },
  capabilityBox: {
    padding: 12,
    borderWidth: 1,
  },
  modelItem: {
    borderWidth: 1,
    marginBottom: 10,
  },
  statusBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    alignSelf: 'center',
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
});
