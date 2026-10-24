import { useEffect, useState, useCallback } from 'react';
import { useReaderStore } from '../stores/readerStore';
import { getChapterVerses } from '../services/bibleService';
import type { Verse } from '../types/bible';

export function useBibleReader() {
  const {
    currentVersionId,
    currentBookNumber,
    currentChapter,
    nextChapter,
    prevChapter,
    navigateTo,
    dualLanguageEnabled,
    secondaryVersionId,
  } = useReaderStore();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [secondaryVerseMap, setSecondaryVerseMap] = useState<Map<number, Verse>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCurrentChapter = useCallback(async () => {
    const reqBook = currentBookNumber;
    const reqChapter = currentChapter;
    const reqVersion = currentVersionId;
    const reqSecondary = (dualLanguageEnabled && secondaryVersionId) ? secondaryVersionId : null;

    setLoading(true);
    setError(null);
    try {
      const primaryPromise = getChapterVerses(reqVersion, reqBook, reqChapter);
      const secondaryPromise = reqSecondary
        ? getChapterVerses(reqSecondary, reqBook, reqChapter).catch((err) => {
            console.error('[useBibleReader] Failed to load secondary chapter verses:', err);
            return [] as Verse[];
          })
        : Promise.resolve([] as Verse[]);

      let [data, secData] = await Promise.all([primaryPromise, secondaryPromise]);

      if (data.length === 0 && reqVersion !== 'kjv') {
        const { getBooks } = await import('../services/bibleService');
        const availableBooks = await getBooks(reqVersion);
        if (availableBooks.length > 0 && !availableBooks.some(b => b.bookNumber === reqBook)) {
          const firstBook = availableBooks[0];
          console.log(`[useBibleReader] Book ${reqBook} not in ${reqVersion}. Auto-navigating to ${firstBook.name} (${firstBook.bookNumber}):1`);
          useReaderStore.getState().navigateTo(firstBook.bookNumber, 1);
          const { router } = await import('expo-router');
          router.replace({
            pathname: '/(tabs)/read/[book]/[chapter]',
            params: { book: firstBook.bookNumber.toString(), chapter: '1' },
          });
          return;
        }
      }

      const latest = useReaderStore.getState();
      if (
        latest.currentBookNumber === reqBook &&
        latest.currentChapter === reqChapter &&
        latest.currentVersionId === reqVersion
      ) {
        setVerses(data);

        const sMap = new Map<number, Verse>();
        secData.forEach((v) => {
          sMap.set(v.verseNumber, v);
        });
        setSecondaryVerseMap(sMap);
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
  }, [currentVersionId, currentBookNumber, currentChapter, dualLanguageEnabled, secondaryVersionId]);

  useEffect(() => {
    loadCurrentChapter();
  }, [loadCurrentChapter]);

  return {
    verses,
    secondaryVerseMap,
    dualLanguageEnabled,
    secondaryVersionId,
    loading,
    error,
    currentBookNumber,
    currentChapter,
    currentVersionId,
    goNext: nextChapter,
    goPrev: prevChapter,
    navigateTo,
    reload: loadCurrentChapter,
  };
}
