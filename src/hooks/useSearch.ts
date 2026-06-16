import { useState, useCallback, useEffect } from 'react';
import { searchFTS } from '../services/searchService';
import type { SearchResult } from '../types/bible';
import { correctQuery, initDictionary } from '../utils/spellChecker';

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);

  useEffect(() => {
    initDictionary().catch(console.error);
  }, []);

  const search = useCallback(async (query: string, versionId: string = 'kjv') => {
    if (!query.trim()) {
      setResults([]);
      setCorrectedQuery(null);
      return;
    }
    setLoading(true);
    setError(null);
    setCorrectedQuery(null);
    try {
      let data = await searchFTS(query, versionId);
      
      const { corrected, hasChanges } = await correctQuery(query);
      if (hasChanges) {
        if (data.length === 0) {
          // If 0 results, auto-search the corrected query
          data = await searchFTS(corrected, versionId);
        }
        setCorrectedQuery(corrected);
      }

      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    setCorrectedQuery(null);
  }, []);

  return {
    results,
    loading,
    error,
    correctedQuery,
    search,
    clear,
  };
}
