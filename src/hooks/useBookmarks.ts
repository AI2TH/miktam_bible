import { useState, useEffect, useCallback } from 'react';
import * as bookmarkService from '../services/bookmarkService';
import type { Bookmark } from '../types/user';
import { isDatabaseInitialized } from '../services/database';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<(Bookmark & { bookName: string; text: string })[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      let retries = 0;
      while (!isDatabaseInitialized() && retries < 15) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        retries++;
      }
      if (!isDatabaseInitialized()) {
        console.warn('[useBookmarks] Database not initialized, aborting fetch.');
        return;
      }
      const data = await bookmarkService.getAllBookmarks();
      setBookmarks(data);
    } catch (e) {
      console.error('[useBookmarks] Failed to fetch bookmarks:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(async (
    versionId: string,
    bookNumber: number,
    chapter: number,
    verseNumber: number,
    color?: string
  ) => {
    try {
      const newBookmark = await bookmarkService.addBookmark(versionId, bookNumber, chapter, verseNumber, color);
      await fetchBookmarks();
      return newBookmark;
    } catch (e) {
      console.error('[useBookmarks] Failed to add bookmark:', e);
      throw e;
    }
  }, [fetchBookmarks]);

  const remove = useCallback(async (id: string) => {
    try {
      await bookmarkService.removeBookmark(id);
      await fetchBookmarks();
    } catch (e) {
      console.error('[useBookmarks] Failed to remove bookmark:', e);
      throw e;
    }
  }, [fetchBookmarks]);

  const checkIsBookmarked = useCallback(async (
    versionId: string,
    bookNumber: number,
    chapter: number,
    verseNumber: number
  ) => {
    try {
      return await bookmarkService.isVerseBookmarked(versionId, bookNumber, chapter, verseNumber);
    } catch (e) {
      console.error('[useBookmarks] Failed to check status:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  return {
    bookmarks,
    loading,
    add,
    remove,
    checkIsBookmarked,
    refetch: fetchBookmarks,
  };
}
