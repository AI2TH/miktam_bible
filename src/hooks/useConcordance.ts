import { useState, useCallback, useEffect, useRef } from 'react';
import * as concordanceService from '../services/concordanceService';
import type { OriginalWord, StrongsEntry } from '../types/concordance';
import { correctQuery } from '../utils/spellChecker';
import { isDatabaseInitialized } from '../services/database';
import { createLatestRequest, type LatestRequest } from '../utils/latestRequest';

/** Wait for the database (opened at app start) for up to ~4.5 s. */
async function waitForDatabase(): Promise<boolean> {
  let retries = 0;
  while (!isDatabaseInitialized() && retries < 15) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    retries++;
  }
  return isDatabaseInitialized();
}

/**
 * Each loader has its own request tracker and loading flag: a response from an
 * earlier lookup is dropped once a newer one of the same kind has started, and
 * one loader finishing no longer clears another loader's spinner.
 */
export function useConcordance() {
  const [originalWords, setOriginalWords] = useState<OriginalWord[]>([]);
  const [strongsEntry, setStrongsEntry] = useState<StrongsEntry | null>(null);
  const [versesWithStrongs, setVersesWithStrongs] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<StrongsEntry[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const requests = useRef<Record<'words' | 'entry' | 'verses' | 'search', LatestRequest>>({
    words: createLatestRequest(),
    entry: createLatestRequest(),
    verses: createLatestRequest(),
    search: createLatestRequest(),
  });

  useEffect(() => {
    const all = requests.current;
    return () => {
      Object.values(all).forEach((r) => r.cancel());
    };
  }, []);

  const loadOriginalWords = useCallback(async (bookNumber: number, chapter: number, verseNumber: number) => {
    const req = requests.current.words;
    const id = req.begin();
    setLoadingWords(true);
    try {
      if (!(await waitForDatabase())) {
        console.warn('[useConcordance] Database not initialized, aborting loadOriginalWords.');
        return;
      }
      const data = await concordanceService.getOriginalWords(bookNumber, chapter, verseNumber);
      if (req.isLatest(id)) setOriginalWords(data);
    } catch (e) {
      console.error('[useConcordance] Failed to load words:', e);
    } finally {
      if (req.isLatest(id)) setLoadingWords(false);
    }
  }, []);

  const lookupStrongs = useCallback(async (strongsNumber: string) => {
    const req = requests.current.entry;
    const id = req.begin();
    setLoadingEntry(true);
    try {
      if (!(await waitForDatabase())) {
        console.warn('[useConcordance] Database not initialized, aborting lookupStrongs.');
        return null;
      }
      const data = await concordanceService.getStrongsEntry(strongsNumber);
      if (req.isLatest(id)) setStrongsEntry(data);
      return data;
    } catch (e) {
      console.error('[useConcordance] Failed to lookup Strongs:', e);
      return null;
    } finally {
      if (req.isLatest(id)) setLoadingEntry(false);
    }
  }, []);

  const loadVersesWithStrongs = useCallback(async (strongsNumber: string, versionId: string = 'kjv') => {
    const req = requests.current.verses;
    const id = req.begin();
    setLoadingVerses(true);
    try {
      if (!(await waitForDatabase())) {
        console.warn('[useConcordance] Database not initialized, aborting loadVersesWithStrongs.');
        return;
      }
      const data = await concordanceService.getVersesByStrongs(strongsNumber, versionId);
      if (req.isLatest(id)) setVersesWithStrongs(data);
    } catch (e) {
      console.error('[useConcordance] Failed to load related verses:', e);
    } finally {
      if (req.isLatest(id)) setLoadingVerses(false);
    }
  }, []);

  const searchStrongs = useCallback(async (query: string) => {
    const req = requests.current.search;
    const id = req.begin();
    if (!query.trim()) {
      setSearchResults([]);
      setLoadingSearch(false);
      return [];
    }
    setLoadingSearch(true);
    try {
      if (!(await waitForDatabase())) {
        console.warn('[useConcordance] Database not initialized, aborting searchStrongs.');
        return [];
      }
      let data = await concordanceService.searchStrongs(query);

      const { corrected, hasChanges } = await correctQuery(query);
      if (hasChanges && data.length === 0) {
        data = await concordanceService.searchStrongs(corrected);
      }

      if (req.isLatest(id)) setSearchResults(data);
      return data;
    } catch (e) {
      console.error('[useConcordance] Failed to search Strongs:', e);
      if (req.isLatest(id)) setSearchResults([]);
      return [];
    } finally {
      if (req.isLatest(id)) setLoadingSearch(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    requests.current.search.cancel();
    setSearchResults([]);
    setLoadingSearch(false);
  }, []);

  return {
    originalWords,
    strongsEntry,
    versesWithStrongs,
    searchResults,
    /** True while any lookup runs (kept for existing callers). */
    loading: loadingWords || loadingEntry || loadingVerses || loadingSearch,
    loadingWords,
    loadingEntry,
    loadingVerses,
    loadingSearch,
    loadOriginalWords,
    lookupStrongs,
    loadVersesWithStrongs,
    searchStrongs,
    clearSearch,
  };
}
