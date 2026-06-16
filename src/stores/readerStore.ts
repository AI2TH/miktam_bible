import { create } from 'zustand';

const CHAPTERS_PER_BOOK: Record<number, number> = {
  1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4, 9: 31, 10: 24,
  11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13, 17: 10, 18: 42, 19: 150, 20: 31,
  21: 12, 22: 8, 23: 66, 24: 52, 25: 5, 26: 48, 27: 12, 28: 14, 29: 3, 30: 9,
  31: 1, 32: 4, 33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14, 39: 4,
  40: 28, 41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13, 48: 6, 49: 6,
  50: 4, 51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3, 57: 1, 58: 13, 59: 5,
  60: 5, 61: 3, 62: 5, 63: 1, 64: 1, 65: 1, 66: 22
};

interface ReaderState {
  // Current reading position
  currentVersionId: string;
  currentBookNumber: number;
  currentChapter: number;
  selectedVerseNumber: number | null;

  // Display settings
  fontSize: number;
  showInterlinear: boolean;
  showCrossRefs: boolean;
  showParallelView: boolean;
  parallelVersionId: string | null;

  // Actions
  setVersion: (versionId: string) => void;
  navigateTo: (bookNumber: number, chapter: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  selectVerse: (verseNumber: number | null) => void;
  setFontSize: (size: number) => void;
  toggleInterlinear: () => void;
  toggleCrossRefs: () => void;
  toggleParallelView: (versionId?: string) => void;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  currentVersionId: 'kjv',
  currentBookNumber: 1,    // Genesis
  currentChapter: 1,
  selectedVerseNumber: null,

  fontSize: 18,
  showInterlinear: false,
  showCrossRefs: false,
  showParallelView: false,
  parallelVersionId: null,

  setVersion: (versionId) => set({ currentVersionId: versionId }),

  navigateTo: (bookNumber, chapter) => set({
    currentBookNumber: bookNumber,
    currentChapter: chapter,
    selectedVerseNumber: null,
  }),

  nextChapter: () => {
    const { currentBookNumber, currentChapter } = get();
    const totalChapters = CHAPTERS_PER_BOOK[currentBookNumber] || 50;

    if (currentChapter < totalChapters) {
      set({ currentChapter: currentChapter + 1, selectedVerseNumber: null });
    } else if (currentBookNumber < 66) {
      // Navigate to next book, chapter 1
      set({
        currentBookNumber: currentBookNumber + 1,
        currentChapter: 1,
        selectedVerseNumber: null,
      });
    }
  },

  prevChapter: () => {
    const { currentBookNumber, currentChapter } = get();

    if (currentChapter > 1) {
      set({ currentChapter: currentChapter - 1, selectedVerseNumber: null });
    } else if (currentBookNumber > 1) {
      // Navigate to previous book, last chapter
      const prevBookNumber = currentBookNumber - 1;
      const prevBookTotalChapters = CHAPTERS_PER_BOOK[prevBookNumber] || 1;
      set({
        currentBookNumber: prevBookNumber,
        currentChapter: prevBookTotalChapters,
        selectedVerseNumber: null,
      });
    }
  },

  selectVerse: (verseNumber) => set({ selectedVerseNumber: verseNumber }),
  setFontSize: (size) => set({ fontSize: Math.max(14, Math.min(28, size)) }),
  toggleInterlinear: () => set(s => ({ showInterlinear: !s.showInterlinear })),
  toggleCrossRefs: () => set(s => ({ showCrossRefs: !s.showCrossRefs })),
  toggleParallelView: (versionId) => set(s => ({
    showParallelView: !s.showParallelView,
    parallelVersionId: versionId || s.parallelVersionId,
  })),
}));
