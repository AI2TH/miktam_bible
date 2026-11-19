import { useEffect, useState, useCallback, useRef } from 'react';
import { useReaderStore } from '../stores/readerStore';
import { getChapterVerses } from '../services/bibleService';
import type { Verse } from '../types/bible';

type LoadStatus = 'loading' | 'ready' | 'error';

interface ChapterState {
  /** The request these results belong to */
  key: string;
  status: LoadStatus;
  verses: Verse[];
  secondaryVerseMap: Map<number, Verse>;
  error: string | null;
}

const EMPTY_MAP = new Map<number, Verse>();
const EMPTY_VERSES: Verse[] = [];

/**
 * Loads the verses of one chapter.
 *
 * Pass the book and chapter from the route when you have them. The store only
 * catches up in an effect after the first render, so reading the position from
 * the store first loaded the previously open chapter and only then the one the
 * user tapped.
 *
 * `loading` is true until the query for the current request has finished, so an
 * empty `verses` with `loading === false` really means "this chapter has no text".
 */
export function useBibleReader(target?: { bookNumber: number; chapter: number }) {
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

  const reqBook = target?.bookNumber ?? currentBookNumber;
  const reqChapter = target?.chapter ?? currentChapter;
  const reqVersion = currentVersionId;
  const reqSecondary = dualLanguageEnabled && secondaryVersionId ? secondaryVersionId : null;
  const requestKey = `${reqVersion}|${reqBook}|${reqChapter}|${reqSecondary ?? ''}`;

  const [state, setState] = useState<ChapterState>({
    key: '',
    status: 'loading',
    verses: EMPTY_VERSES,
    secondaryVerseMap: EMPTY_MAP,
    error: null,
  });

  // The request the screen currently wants; older responses are dropped
  const latestKey = useRef(requestKey);
  latestKey.current = requestKey;

  const loadCurrentChapter = useCallback(async () => {
    const key = requestKey;
    const isStale = () => latestKey.current !== key;

    setState((prev) =>
      prev.key === key && prev.status === 'loading'
        ? prev
        : { key, status: 'loading', verses: EMPTY_VERSES, secondaryVerseMap: EMPTY_MAP, error: null }
    );

    try {
      const primaryPromise = getChapterVerses(reqVersion, reqBook, reqChapter);
      const secondaryPromise = reqSecondary
        ? getChapterVerses(reqSecondary, reqBook, reqChapter).catch((err) => {
            console.error('[useBibleReader] Failed to load secondary chapter verses:', err);
            return [] as Verse[];
          })
        : Promise.resolve([] as Verse[]);

      const [data, secData] = await Promise.all([primaryPromise, secondaryPromise]);
      if (isStale()) return;

      if (data.length === 0 && reqVersion !== 'kjv') {
        const { getBooks } = await import('../services/bibleService');
        const availableBooks = await getBooks(reqVersion);
        if (isStale()) return;
        if (availableBooks.length > 0 && !availableBooks.some(b => b.bookNumber === reqBook)) {
          const firstBook = availableBooks[0];
          console.log(`[useBibleReader] Book ${reqBook} not in ${reqVersion}. Auto-navigating to ${firstBook.name} (${firstBook.bookNumber}):1`);
          // Stay in the loading state; the new route starts its own request
          useReaderStore.getState().navigateTo(firstBook.bookNumber, 1);
          const { router } = await import('expo-router');
          router.replace({
            pathname: '/(tabs)/read/[book]/[chapter]',
            params: { book: firstBook.bookNumber.toString(), chapter: '1' },
          });
          return;
        }
      }

      const sMap = new Map<number, Verse>();
      secData.forEach((v) => {
        sMap.set(v.verseNumber, v);
      });
      setState({ key, status: 'ready', verses: data, secondaryVerseMap: sMap, error: null });
    } catch (e) {
      if (isStale()) return;
      setState({
        key,
        status: 'error',
        verses: EMPTY_VERSES,
        secondaryVerseMap: EMPTY_MAP,
        error: e instanceof Error ? e.message : 'Failed to load chapter',
      });
    }
  }, [requestKey, reqVersion, reqBook, reqChapter, reqSecondary]);

  useEffect(() => {
    loadCurrentChapter();
  }, [loadCurrentChapter]);

  // Results from an earlier request are never shown for the current one
  const isCurrent = state.key === requestKey;

  return {
    verses: isCurrent ? state.verses : EMPTY_VERSES,
    secondaryVerseMap: isCurrent ? state.secondaryVerseMap : EMPTY_MAP,
    dualLanguageEnabled,
    secondaryVersionId,
    loading: !isCurrent || state.status === 'loading',
    error: isCurrent ? state.error : null,
    currentBookNumber,
    currentChapter,
    currentVersionId,
    goNext: nextChapter,
    goPrev: prevChapter,
    navigateTo,
    reload: loadCurrentChapter,
  };
}
