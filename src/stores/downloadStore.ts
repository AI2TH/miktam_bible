import { create } from 'zustand';
import type { ModelDownloadProgress } from '../types/ai';

interface DownloadState {
  progresses: Record<string, ModelDownloadProgress>;
  setProgress: (modelId: string, progress: ModelDownloadProgress) => void;
  clearProgress: (modelId: string) => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  progresses: {},
  setProgress: (modelId, progress) => set((s) => ({
    progresses: { ...s.progresses, [modelId]: progress }
  })),
  clearProgress: (modelId) => set((s) => {
    const next = { ...s.progresses };
    delete next[modelId];
    return { progresses: next };
  })
}));
