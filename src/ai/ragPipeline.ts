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
  try {
    // Step 1: Check database for any downloaded LLM model path
    let modelPath = '';
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ file_path: string }>(
        "SELECT file_path FROM ai_models WHERE model_type = 'llm' AND is_downloaded = 1 LIMIT 1"
      );
      if (rows && rows.length > 0) {
        modelPath = rows[0].file_path;
      }
    } catch (e) {
      console.warn('[RAG] Failed to query downloaded LLM model path:', e);
    }

    // Ensure LLM engine is initialized
    if (!isModelLoaded()) {
      await loadModel(modelPath);
    }

    // Step 2: Hybrid search for relevant verses
    // Note: For now, use empty embedding array. When MiniLM is integrated,
    // pass real query embeddings here.
    const queryEmbedding: number[] = [];
    let searchResults: SearchResult[];

    if (queryEmbedding.length > 0) {
      searchResults = await hybridSearch(query, queryEmbedding, versionId, 10);
    } else {
      // Fallback: FTS-only search until embedding model is available
      searchResults = await searchFTS(query, versionId, 10);
    }

    const versesContext = searchResults.length > 0
      ? searchResults.map((r, i) => {
          const bookName = BOOK_NAMES[r.verse.bookNumber] || '';
          return `[${i + 1}] ${bookName} ${r.verse.chapter}:${r.verse.verseNumber} — "${r.verse.text}"`;
        }).join('\n')
      : "(No direct scripture matches found. Answer generally as a warm biblical helper.)";

    const prompt = buildRAGPrompt(BIBLE_SYSTEM_PROMPT, versesContext, query);

    // Step 4: Stream response from BibleSLM
    let fullText = '';
    await generateResponse(
      prompt,
      (token) => {
        fullText += token;
        onChunk({ type: 'token', token, fullText });
      },
      512
    );

    // Step 5: Parse verse citations from response
    const citations = parseVerseCitations(fullText);
    for (const citation of citations) {
      onChunk({ type: 'citation', citation });
    }

    onChunk({ type: 'done', fullText });

  } catch (error) {
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
  const BOOK_PATTERNS = Object.entries(BOOK_NAMES).map(([num, name]) => ({
    bookNumber: parseInt(num),
    pattern: new RegExp(`${name}\\s+(\\d+):(\\d+)(?:-(\\d+))?`, 'gi'),
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
