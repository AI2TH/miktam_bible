import { useEffect, useState, useCallback } from 'react';
import { useReaderStore } from '../stores/readerStore';
import { getChapterVerses } from '../services/bibleService';
import type { Verse } from '../types/bible';

export function useBibleReader() {
  const { currentVersionId, currentBookNumber, currentChapter, nextChapter, prevChapter, navigateTo } = useReaderStore();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCurrentChapter = useCallback(async () => {
    const reqBook = currentBookNumber;
    const reqChapter = currentChapter;
    const reqVersion = currentVersionId;

    setLoading(true);
    setError(null);
    try {
      const data = await getChapterVerses(reqVersion, reqBook, reqChapter);
      const latest = useReaderStore.getState();
      if (
        latest.currentBookNumber === reqBook &&
        latest.currentChapter === reqChapter &&
        latest.currentVersionId === reqVersion
      ) {
        setVerses(data);
      }
    } catch (e) {
      const latest = useReaderStore.getState();
      if (
        latest.currentBookNumber === reqBook &&
        latest.currentChapter === reqChapter &&
        latest.currentVersionId === reqVersion
      ) {
        setError(e instanceof Error ? e.message : 'Failed to load chapter');
      }
    } finally {
      const latest = useReaderStore.getState();
      if (
        latest.currentBookNumber === reqBook &&
        latest.currentChapter === reqChapter &&
        latest.currentVersionId === reqVersion
      ) {
        setLoading(false);
      }
    }
  }, [currentVersionId, currentBookNumber, currentChapter]);

  useEffect(() => {
    loadCurrentChapter();
  }, [loadCurrentChapter]);

  return {
    verses,
    loading,
    error,
    currentBookNumber,
    currentChapter,
    currentVersionId,
    goNext: nextChapter,
    goPrev: prevChapter,
    navigateTo,
    reload: loadCurrentChapter
  };
}
