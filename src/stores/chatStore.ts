import { create } from 'zustand';
import { generateUUID } from '../utils/uuid';
import type { ChatMessage } from '../types/ai';
import type { VerseRef } from '../types/bible';

interface ChatState {
  messages: ChatMessage[];
  currentSessionId: string;
  isGenerating: boolean;
  streamingText: string;

  sendMessage: (content: string, versionId: string) => void;
  appendStreamToken: (token: string) => void;
  finishGeneration: (fullText: string, citedVerses: VerseRef[]) => void;
  /** Add an app-generated notice (not model output), e.g. retrieved verses when no model is downloaded */
  addNotice: (content: string, citedVerses: VerseRef[], versionId: string) => void;
  cancelGeneration: () => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentSessionId: generateUUID(),
  isGenerating: false,
  streamingText: '',

  sendMessage: (content, versionId) => {
    const userMessage: ChatMessage = {
      id: generateUUID(),
      sessionId: get().currentSessionId,
      role: 'user',
      content,
      citedVerses: [],
      versionId,
      createdAt: new Date().toISOString(),
    };
    set(s => ({
      messages: [...s.messages, userMessage],
      isGenerating: true,
      streamingText: '',
    }));
  },

  appendStreamToken: (token) => {
    set(s => ({ streamingText: s.streamingText + token }));
  },

  finishGeneration: (fullText, citedVerses) => {
    const assistantMessage: ChatMessage = {
      id: generateUUID(),
      sessionId: get().currentSessionId,
      role: 'assistant',
      content: fullText,
      citedVerses,
      versionId: '',
      createdAt: new Date().toISOString(),
    };
    set(s => ({
      messages: [...s.messages, assistantMessage],
      isGenerating: false,
      streamingText: '',
    }));
  },

  addNotice: (content, citedVerses, versionId) => {
    const notice: ChatMessage = {
      id: generateUUID(),
      sessionId: get().currentSessionId,
      role: 'notice',
      content,
      citedVerses,
      versionId,
      createdAt: new Date().toISOString(),
    };
    set(s => ({
      messages: [...s.messages, notice],
      isGenerating: false,
      streamingText: '',
    }));
  },

  cancelGeneration: () => set({ isGenerating: false, streamingText: '' }),
  clearChat: () => set({ messages: [], currentSessionId: generateUUID(), streamingText: '' }),
}));
