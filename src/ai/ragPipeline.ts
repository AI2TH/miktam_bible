import { generateResponse, isModelLoaded, loadModel } from './llamaEngine';
import { hybridSearch, searchFTS } from '../services/searchService';
import { buildRAGPrompt, BIBLE_SYSTEM_PROMPT } from './prompts';
import { getDatabase } from '../services/database';
import type { RAGStreamChunk } from '../types/ai';
import type { VerseRef, SearchResult } from '../types/bible';
import { BOOK_NAMES } from '../utils/constants';

/**
 * THE MAIN RAG PIPELINE — Ask a Bible question, get a streamed answer.
 *
 * Full flow (all on-device, zero network):
 * 1. Embed user query (placeholder: use FTS for now until embedding model integrated)
 * 2. Hybrid search: FTS5 + sqlite-vec → RRF merge → top-10 verses
 * 3. Build prompt: system prompt + retrieved verses + user query
 * 4. Stream tokens from BibleSLM (on-device LLM)
 * 5. Parse verse citations from response
 *
 * @param query - User's question (e.g., "What does Jesus say about forgiveness?")
 * @param versionId - Bible version to search (e.g., "kjv")
 * @param onChunk - Callback for each streamed chunk (token, citation, done, error)
 */
export async function askBible(
  query: string,
  versionId: string,
  onChunk: (chunk: RAGStreamChunk) => void
): Promise<void> {
  console.log('[RAG] askBible initiated. Query:', query, 'Version:', versionId);
  try {
    // Step 1: Check database for any downloaded LLM model path
    let modelPath = '';
    try {
      const db = getDatabase();
      const rows = await db.getAllAsync<{ file_path: string }>(
        "SELECT file_path FROM ai_models WHERE model_type = 'llm' AND is_downloaded = 1 LIMIT 1"
      );
      if (rows && rows.length > 0) {
        modelPath = rows[0].file_path;
      }
      console.log('[RAG] Found LLM model path in database:', modelPath);
    } catch (e) {
      console.warn('[RAG] Failed to query downloaded LLM model path:', e);
    }

    // Ensure LLM engine is initialized
    if (!isModelLoaded()) {
      console.log('[RAG] Model not loaded, loading from path:', modelPath);
      await loadModel(modelPath);
    } else {
      console.log('[RAG] Model is already loaded.');
    }

    // Step 2: Hybrid search for relevant verses
    // Note: For now, use empty embedding array. When MiniLM is integrated,
    // pass real query embeddings here.
    const queryEmbedding: number[] = [];
    let searchResults: SearchResult[];

    console.log('[RAG] Initiating hybrid search/FTS fallback...');
    if (queryEmbedding.length > 0) {
      searchResults = await hybridSearch(query, queryEmbedding, versionId, 10);
    } else {
      // Fallback: FTS-only search with synonym expansion and stop word filter enabled
      searchResults = await searchFTS(query, versionId, 10, true);
    }
    console.log('[RAG] Search results found:', searchResults.length);

    const HF_BOOK_CODES: Record<number, string> = {
      1: "GEN", 2: "EXO", 3: "LEV", 4: "NUM", 5: "DEU",
      6: "JOS", 7: "JDG", 8: "RUT", 9: "1SA", 10: "2SA",
      11: "1KI", 12: "2KI", 13: "1CH", 14: "2CH", 15: "EZR",
      16: "NEH", 17: "EST", 18: "JOB", 19: "PSA", 20: "PRO",
      21: "ECC", 22: "SON", 23: "ISA", 24: "JER", 25: "LAM",
      26: "EZE", 27: "DAN", 28: "HOS", 29: "JOE", 30: "AMO",
      31: "OBA", 32: "JON", 33: "MIC", 34: "NAH", 35: "HAB",
      36: "ZEP", 37: "HAG", 38: "ZEC", 39: "MAL",
      40: "MAT", 41: "MAR", 42: "LUK", 43: "JOH", 44: "ACT",
      45: "ROM", 46: "1CO", 47: "2CO", 48: "GAL", 49: "EPH",
      50: "PHI", 51: "COL", 52: "1TH", 53: "2TH", 54: "1TI",
      55: "2TI", 56: "TIT", 57: "PHM", 58: "HEB", 59: "JAM",
      60: "1PE", 61: "2PE", 62: "1JO", 63: "2JO", 64: "3JO",
      65: "JUD", 66: "REV"
    };

    // Format exactly like bible_offline.py: "JOH 3:16: For God so loved the world..."
    const versesContext = searchResults.length > 0
      ? searchResults.map((r) => {
          const code = HF_BOOK_CODES[r.verse.bookNumber] || 'GEN';
          return `${code} ${r.verse.chapter}:${r.verse.verseNumber}: ${r.verse.text}`;
        }).join('\n')
      : "";

    const prompt = buildRAGPrompt(BIBLE_SYSTEM_PROMPT, versesContext, query);
    console.log('[RAG] Built RAG prompt, length:', prompt.length);

    // Step 4: Stream response from BibleSLM
    let fullText = '';
    console.log('[RAG] Calling generateResponse...');
    await generateResponse(
      prompt,
      (token) => {
        fullText += token;
        onChunk({ type: 'token', token, fullText });
      },
      512
    );
    console.log('[RAG] Finished calling generateResponse. Text length:', fullText.length);

    // Step 5: Parse verse citations from response
    const citations = parseVerseCitations(fullText);
    console.log('[RAG] Parsed citations:', citations);
    for (const citation of citations) {
      onChunk({ type: 'citation', citation });
    }

    onChunk({ type: 'done', fullText });

  } catch (error) {
    console.error('[RAG] Error occurred in askBible:', error);
    onChunk({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error during AI generation',
    });
  }
}

/**
 * Parse verse citations from AI response text.
 * Finds patterns like "John 3:16", "Genesis 1:1-3", "Romans 8:28"
 */
function parseVerseCitations(text: string): VerseRef[] {
  const BOOK_PATTERNS = Object.entries(BOOK_NAMES)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([num, name]) => ({
      bookNumber: parseInt(num, 10),
      pattern: new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(\\d+):(\\d+)(?:-(\\d+))?\\b`, 'gi'),
    }));

  const citations: VerseRef[] = [];
  const seen = new Set<string>();

  for (const { bookNumber, pattern } of BOOK_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const chapter = parseInt(match[1]);
      const verse = parseInt(match[2]);
      const key = `${bookNumber}:${chapter}:${verse}`;
      if (!seen.has(key)) {
        seen.add(key);
        citations.push({ bookNumber, chapter, verseNumber: verse });
      }
    }
  }

  return citations;
}
