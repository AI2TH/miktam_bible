import { useState, useCallback, useEffect, useRef } from 'react';
import { searchFTS } from '../services/searchService';
import type { SearchResult } from '../types/bible';
import { correctQuery, initDictionary } from '../utils/spellChecker';

const PAGE_SIZE = 20;

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const lastQueryRef = useRef<string>('');
  const lastVersionIdRef = useRef<string>('kjv');
  const searchTokenRef = useRef<number>(0);

  useEffect(() => {
    initDictionary().catch(console.error);
  }, []);

  const runSearch = useCallback(async (
    query: string,
    versionId: string,
    nextPage: number,
    token: number,
    isLoadMore: boolean
  ): Promise<boolean> => {
    if (!isLoadMore) {
      setLoading(true);
      setError(null);
      setCorrectedQuery(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = nextPage * PAGE_SIZE;
      let data = await searchFTS(query, versionId, PAGE_SIZE, false, offset);

      // Spell-check only on the first page; it is itself a DB call.
      if (nextPage === 0) {
        const { corrected, hasChanges } = await correctQuery(query);
        if (hasChanges) {
          if (data.length === 0) {
            // If 0 results, auto-search the corrected query from page 0
            data = await searchFTS(corrected, versionId, PAGE_SIZE, false, 0);
          }
          if (token === searchTokenRef.current) {
            setCorrectedQuery(corrected);
          }
        }
      }

      // Ignore stale results if a newer search has started.
      if (token !== searchTokenRef.current) {
        return false;
      }

      if (isLoadMore) {
        setResults(prev => [...prev, ...data]);
      } else {
        setResults(data);
      }
      setPage(nextPage);
      setHasMore(data.length === PAGE_SIZE);
      return true;
    } catch (e) {
      if (token === searchTokenRef.current) {
        setError(e instanceof Error ? e.message : 'Search failed');
        if (!isLoadMore) {
          setResults([]);
          setHasMore(false);
        }
      }
      return false;
    } finally {
      if (token === searchTokenRef.current) {
        if (isLoadMore) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    }
  }, []);

  const search = useCallback(async (query: string, versionId: string = 'kjv') => {
    if (!query.trim()) {
      setResults([]);
      setCorrectedQuery(null);
      setHasMore(false);
      setError(null);
      return;
    }

    lastQueryRef.current = query.trim();
    lastVersionIdRef.current = versionId;

    const token = ++searchTokenRef.current;
    await runSearch(query.trim(), versionId, 0, token, false);
  }, [runSearch]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastQueryRef.current) return;

    const token = searchTokenRef.current;
    await runSearch(lastQueryRef.current, lastVersionIdRef.current, page + 1, token, true);
  }, [loadingMore, hasMore, page, runSearch]);

  const clear = useCallback(() => {
    searchTokenRef.current += 1;
    setResults([]);
    setError(null);
    setCorrectedQuery(null);
    setHasMore(false);
    setPage(0);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  return {
    results,
    loading,
    loadingMore,
    error,
    correctedQuery,
    hasMore,
    search,
    loadMore,
    clear,
  };
}
