import { useState, useCallback, useEffect, useRef } from 'react';
import { searchVersesPage } from '../services/searchService';
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

  const lastQueryRef = useRef<string>('');
  const lastVersionIdRef = useRef<string>('kjv');
  const searchTokenRef = useRef<number>(0);
  // Refs, not state: onEndReached can fire twice before a re-render, and a
  // state-based guard would let both calls fetch the same page.
  const pageRef = useRef<number>(0);
  const hasMoreRef = useRef<boolean>(false);
  const loadMoreInFlightRef = useRef<boolean>(false);

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
      let { results: data, hasMore: more } = await searchVersesPage(query, versionId, PAGE_SIZE, offset);

      // Spell-check only on the first page; it is itself a DB call.
      if (nextPage === 0) {
        const { corrected, hasChanges } = await correctQuery(query);
        if (hasChanges) {
          if (data.length === 0) {
            // If 0 results, auto-search the corrected query from page 0
            ({ results: data, hasMore: more } = await searchVersesPage(corrected, versionId, PAGE_SIZE, 0));
            if (token === searchTokenRef.current) {
              // Later pages continue the query whose results are shown
              lastQueryRef.current = corrected;
            }
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
      pageRef.current = nextPage;
      hasMoreRef.current = more;
      setHasMore(more);
      return true;
    } catch (e) {
      if (token === searchTokenRef.current) {
        setError(e instanceof Error ? e.message : 'Search failed');
        if (!isLoadMore) {
          setResults([]);
          hasMoreRef.current = false;
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
      searchTokenRef.current += 1;
      setResults([]);
      setCorrectedQuery(null);
      hasMoreRef.current = false;
      setHasMore(false);
      setError(null);
      return;
    }

    lastQueryRef.current = query.trim();
    lastVersionIdRef.current = versionId;
    pageRef.current = 0;
    hasMoreRef.current = false;

    const token = ++searchTokenRef.current;
    await runSearch(query.trim(), versionId, 0, token, false);
  }, [runSearch]);

  const loadMore = useCallback(async () => {
    if (loadMoreInFlightRef.current || !hasMoreRef.current || !lastQueryRef.current) return;

    loadMoreInFlightRef.current = true;
    const token = searchTokenRef.current;
    try {
      await runSearch(lastQueryRef.current, lastVersionIdRef.current, pageRef.current + 1, token, true);
    } finally {
      loadMoreInFlightRef.current = false;
    }
  }, [runSearch]);

  const clear = useCallback(() => {
    searchTokenRef.current += 1;
    setResults([]);
    setError(null);
    setCorrectedQuery(null);
    hasMoreRef.current = false;
    setHasMore(false);
    pageRef.current = 0;
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
