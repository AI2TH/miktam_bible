import { create } from 'zustand';
import { generateUUID } from '../utils/uuid';
import type { ChatMessage } from '../types/ai';

interface ChatState {
  messages: ChatMessage[];
  currentSessionId: string;
  isGenerating: boolean;
  streamingText: string;

  sendMessage: (content: string, versionId: string) => void;
  appendStreamToken: (token: string) => void;
  finishGeneration: (fullText: string, citedVerses: any[]) => void;
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

  cancelGeneration: () => set({ isGenerating: false, streamingText: '' }),
  clearChat: () => set({ messages: [], currentSessionId: generateUUID(), streamingText: '' }),
}));
