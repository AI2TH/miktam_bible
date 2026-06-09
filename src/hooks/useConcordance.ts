import { useState, useCallback } from 'react';
import * as concordanceService from '../services/concordanceService';
import type { OriginalWord, StrongsEntry } from '../types/concordance';
import { correctQuery } from '../utils/spellChecker';
import { isDatabaseInitialized } from '../services/database';

export function useConcordance() {
  const [originalWords, setOriginalWords] = useState<OriginalWord[]>([]);
  const [strongsEntry, setStrongsEntry] = useState<StrongsEntry | null>(null);
  const [versesWithStrongs, setVersesWithStrongs] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<StrongsEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOriginalWords = useCallback(async (bookNumber: number, chapter: number, verseNumber: number) => {
    setLoading(true);
    try {
      let retries = 0;
      while (!isDatabaseInitialized() && retries < 15) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        retries++;
      }
      if (!isDatabaseInitialized()) {
        console.warn('[useConcordance] Database not initialized, aborting loadOriginalWords.');
        return;
      }
      const data = await concordanceService.getOriginalWords(bookNumber, chapter, verseNumber);
      setOriginalWords(data);
    } catch (e) {
      console.error('[useConcordance] Failed to load words:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const lookupStrongs = useCallback(async (strongsNumber: string) => {
    setLoading(true);
    try {
      let retries = 0;
      while (!isDatabaseInitialized() && retries < 15) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        retries++;
      }
      if (!isDatabaseInitialized()) {
        console.warn('[useConcordance] Database not initialized, aborting lookupStrongs.');
        return null;
      }
      const data = await concordanceService.getStrongsEntry(strongsNumber);
      setStrongsEntry(data);
      return data;
    } catch (e) {
      console.error('[useConcordance] Failed to lookup Strongs:', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVersesWithStrongs = useCallback(async (strongsNumber: string, versionId: string = 'kjv') => {
    setLoading(true);
    try {
      let retries = 0;
      while (!isDatabaseInitialized() && retries < 15) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        retries++;
      }
      if (!isDatabaseInitialized()) {
        console.warn('[useConcordance] Database not initialized, aborting loadVersesWithStrongs.');
        return;
      }
      const data = await concordanceService.getVersesByStrongs(strongsNumber, versionId);
      setVersesWithStrongs(data);
    } catch (e) {
      console.error('[useConcordance] Failed to load related verses:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchStrongs = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }
    setLoading(true);
    try {
      let retries = 0;
      while (!isDatabaseInitialized() && retries < 15) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        retries++;
      }
      if (!isDatabaseInitialized()) {
        console.warn('[useConcordance] Database not initialized, aborting searchStrongs.');
        return [];
      }
      let data = await concordanceService.searchStrongs(query);
      
      const { corrected, hasChanges } = await correctQuery(query);
      if (hasChanges && data.length === 0) {
        data = await concordanceService.searchStrongs(corrected);
      }
      
      setSearchResults(data);
      return data;
    } catch (e) {
      console.error('[useConcordance] Failed to search Strongs:', e);
      setSearchResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
  }, []);

  return {
    originalWords,
    strongsEntry,
    versesWithStrongs,
    searchResults,
    loading,
    loadOriginalWords,
    lookupStrongs,
    loadVersesWithStrongs,
    searchStrongs,
    clearSearch,
  };
}
