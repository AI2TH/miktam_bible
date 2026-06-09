import { useState, useEffect, useCallback } from 'react';
import * as noteService from '../services/noteService';
import type { Note } from '../types/user';

export function useNotes() {
  const [notes, setNotes] = useState<(Note & { bookName: string })[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await noteService.getAllNotes();
      setNotes(data);
    } catch (e) {
      console.error('[useNotes] Failed to fetch notes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (
    versionId: string,
    bookNumber: number,
    chapter: number,
    verseNumber: number | null,
    content: string
  ) => {
    try {
      const newNote = await noteService.addNote(versionId, bookNumber, chapter, verseNumber, content);
      await fetchNotes();
      return newNote;
    } catch (e) {
      console.error('[useNotes] Failed to save note:', e);
      throw e;
    }
  }, [fetchNotes]);

  const edit = useCallback(async (id: string, content: string) => {
    try {
      await noteService.updateNote(id, content);
      await fetchNotes();
    } catch (e) {
      console.error('[useNotes] Failed to edit note:', e);
      throw e;
    }
  }, [fetchNotes]);

  const remove = useCallback(async (id: string) => {
    try {
      await noteService.deleteNote(id);
      await fetchNotes();
    } catch (e) {
      console.error('[useNotes] Failed to remove note:', e);
      throw e;
    }
  }, [fetchNotes]);

  const getNote = useCallback(async (
    versionId: string,
    bookNumber: number,
    chapter: number,
    verseNumber: number | null
  ) => {
    try {
      return await noteService.getNoteForVerse(versionId, bookNumber, chapter, verseNumber);
    } catch (e) {
      console.error('[useNotes] Failed to load note:', e);
      return null;
    }
  }, []);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      await fetchNotes();
      return;
    }
    setLoading(true);
    try {
      const data = await noteService.searchNotes(query);
      setNotes(data);
    } catch (e) {
      console.error('[useNotes] Failed to search notes:', e);
    } finally {
      setLoading(false);
    }
  }, [fetchNotes]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    loading,
    save,
    edit,
    remove,
    getNote,
    search,
    refetch: fetchNotes,
  };
}
