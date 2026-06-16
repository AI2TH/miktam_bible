import { useCallback, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useReaderStore } from '../stores/readerStore';
import { askBible } from '../ai/ragPipeline';
import type { VerseRef } from '../types/bible';

export function useChat() {
  const { messages, isGenerating, streamingText, sendMessage, appendStreamToken, finishGeneration, cancelGeneration, clearChat } = useChatStore();
  const { currentVersionId } = useReaderStore();
  const [error, setError] = useState<string | null>(null);
  const [citations, setCitations] = useState<VerseRef[]>([]);

  const send = useCallback(async (content: string) => {
    if (!content.trim() || isGenerating) return;

    setError(null);
    setCitations([]);
    
    // Add user message to state
    sendMessage(content, currentVersionId);

    const accumulatedCitations: VerseRef[] = [];

    try {
      // Invoke on-device RAG pipeline
      await askBible(content, currentVersionId, (chunk) => {
        switch (chunk.type) {
          case 'token':
            if (chunk.token) {
              appendStreamToken(chunk.token);
            }
            break;
          case 'citation':
            if (chunk.citation) {
              accumulatedCitations.push(chunk.citation);
              setCitations([...accumulatedCitations]);
            }
            break;
          case 'done':
            finishGeneration(chunk.fullText || '', accumulatedCitations);
            break;
          case 'error':
            setError(chunk.error || 'An error occurred during generation.');
            cancelGeneration();
            break;
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred during generation.');
      cancelGeneration();
    }
  }, [isGenerating, currentVersionId, sendMessage, appendStreamToken, finishGeneration, cancelGeneration]);

  const clear = useCallback(() => {
    setError(null);
    setCitations([]);
    clearChat();
  }, [clearChat]);

  return {
    messages,
    isGenerating,
    streamingText,
    citations,
    error,
    send,
    clear,
    cancel: cancelGeneration,
  };
}
