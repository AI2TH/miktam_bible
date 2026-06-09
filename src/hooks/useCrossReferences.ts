import { useState, useCallback } from 'react';
import * as concordanceService from '../services/concordanceService';
import type { CrossReferenceWithText } from '../types/concordance';

export function useCrossReferences() {
  const [refs, setRefs] = useState<CrossReferenceWithText[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRefs = useCallback(async (
    bookNumber: number,
    chapter: number,
    verseNumber: number,
    versionId: string = 'kjv'
  ) => {
    setLoading(true);
    try {
      const data = await concordanceService.getCrossReferences(bookNumber, chapter, verseNumber, versionId);
      setRefs(data);
    } catch (e) {
      console.error('[useCrossReferences] Failed to load cross refs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    refs,
    loading,
    loadRefs,
  };
}
