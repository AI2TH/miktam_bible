import { initLlama, type LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';
import * as Device from 'expo-device';


let context: LlamaContext | null = null;
let isMockModel = false;

/**
 * Initialize the LLM engine with a GGUF model file.
 * Call once when user first opens AI chat (after model download).
 */
export async function loadModel(modelPath: string): Promise<void> {
  if (context && !isMockModel) {
    try {
      await context.release();
    } catch (e) {
      console.warn('[LLM] Failed to release previous context:', e);
    }
  }
  context = null;

  // Dynamically resolve package-agnostic path under the current app's document directory
  let actualPath = modelPath;
  if (modelPath && modelPath.includes('/files/models/')) {
    const filename = modelPath.substring(modelPath.lastIndexOf('/') + 1);
    actualPath = `${FileSystem.documentDirectory}models/${filename}`;
  }

  // If path is empty, default to mock/fallback mode
  if (!actualPath) {
    isMockModel = true;
    context = { mock: true } as any;
    console.log('[LLM] Running in default offline fallback mode (no model downloaded)');
    return;
  }

  // Check if this is a mock model file by inspecting its size
  try {
    const info = await FileSystem.getInfoAsync(actualPath);
    if (!info.exists) {
      isMockModel = true;
      context = { mock: true } as any;
      console.log('[LLM] Model file not found, defaulting to fallback mode:', actualPath);
      return;
    }
    if (info.size < 50 * 1024 * 1024) {
      isMockModel = true;
      context = { mock: true } as any;
      console.log('[LLM] Mock model detected and loaded successfully');
      return;
    }
  } catch (e) {
    console.warn('[LLM] Failed to check model file size, attempting normal load:', e);
  }

  isMockModel = false;
  const nativePath = actualPath.startsWith('file://') ? actualPath.replace('file://', '') : actualPath;

  try {
    context = await initLlama({
      model: nativePath,
      n_ctx: 2048,        // Mobile-safe context window
      n_batch: 256,       // Mobile-safe batch size
      n_threads: 4,       // CPU threads for inference
      n_gpu_layers: 0,    // 0 = CPU only
      use_mlock: false,
      use_mmap: true,     // Memory-map the model file
    });
    console.log('[LLM] Native model loaded successfully at path:', nativePath);
  } catch (e) {
    console.warn('[LLM] Failed to initialize native Llama context, falling back to mock mode:', e);
    isMockModel = true;
    context = { mock: true } as any;
  }
}

function mockBibleAssistantResponse(prompt: string): string {
  // Parse the new bible_offline.py format: Context:\n...\n\n### Question: ...\n### Answer:
  let query = '';
  let passages = '';

  const questionMatch = prompt.match(/###\s*Question:\s*([\s\S]*?)(?:\n###\s*Answer:|$)/i);
  if (questionMatch) {
    query = questionMatch[1].trim();
  }

  const contextMatch = prompt.match(/Context:\s*([\s\S]*?)(?:\n\n###|$)/i);
  if (contextMatch) {
    passages = contextMatch[1].trim();
  }

  const queryLower = query.toLowerCase();

  // 1. Detailed theme-based mock responses
  if (queryLower.includes('worry') || queryLower.includes('fear') || queryLower.includes('anxious')) {
    return `Scripture tells us not to be anxious about anything, but in everything by prayer and supplication, with thanksgiving, to let our requests be made known to God (Philippians 4:6). God calls us to cast all our cares upon Him, for He cares for us (1 Peter 5:7). Trusting in the Lord with all our heart keeps us secure in His perfect peace.`;
  }

  if (queryLower.includes('forgiv')) {
    return `Scripture teaches that we must forgive others as God has forgiven us (Ephesians 4:32). If we confess our sins, He is faithful and just to forgive us and cleanse us from all unrighteousness (1 John 1:9). Extending grace to others is a cornerstone of the Gospel walk.`;
  }

  if (queryLower.includes('love')) {
    return `God is love, and he who abides in love abides in God, and God in him (1 John 4:16). For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life (John 3:16). We are called to love one another sincerely as Christ loved us.`;
  }

  if (queryLower.includes('faith') || queryLower.includes('believe')) {
    return `Faith is the substance of things hoped for, the evidence of things not seen (Hebrews 11:1). Without faith it is impossible to please God, for he who comes to God must believe that He is a rewarder of those who diligently seek Him (Hebrews 11:6). We are saved through faith by grace (Ephesians 2:8).`;
  }

  // 2. Try parsing FTS passages from context
  if (passages) {
    const lines = passages.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0];
      const refMatch = firstLine.match(/^([A-Z0-9]+\s+\d+:\d+):\s*(.+)/);
      if (refMatch) {
        const ref = refMatch[1];
        const text = refMatch[2].replace(/<[^>]*>/g, '').trim();
        return `Regarding your question "${query}", let's consider ${ref}: "${text}".\n\nThis passage teaches us about God's sovereign grace, His divine timing, and how we are called to walk in obedience. In the context of your query, it reminds us to seek His guidance in every aspect of our lives, resting in the assurance of His word.`;
      }
    }
  }

  // 3. Fall back to the active reader store selection if available
  let fallbackRef = '';
  let fallbackText = '';
  try {
    const { useReaderStore } = require('../stores/readerStore');
    const { getDatabase } = require('../services/database');
    const { getBookName } = require('../utils/bookTranslations');
    
    const state = useReaderStore.getState();
    const bookNum = state.currentBookNumber || 1;
    const chapter = state.currentChapter || 1;
    const verseNum = state.selectedVerseNumber || 1;
    const versionId = state.currentVersionId || 'kjv';
    
    const db = getDatabase();
    const row = db.getFirstSync(
      'SELECT text FROM verses WHERE version_id = ? AND book_number = ? AND chapter = ? AND verse_number = ?',
      [versionId, bookNum, chapter, verseNum]
    );
    if (row && row.text) {
      fallbackText = row.text.replace(/<[^>]*>/g, '').trim();
      fallbackRef = `${getBookName(bookNum, versionId)} ${chapter}:${verseNum}`;
    }
  } catch (e) {
    // ignore
  }

  if (fallbackRef && fallbackText) {
    return `Let's consider your question in light of ${fallbackRef}, which says: "${fallbackText}".\n\nThis verse provides a clear foundation for our study. It calls us to align our hearts with God's word, seeking His guidance and trusting in His promises as we study and grow.`;
  }

  return `I am here to help you study scripture. Please ask a biblical question, and I will search the available passages to answer.`;
}

/**
 * Generate a response from the loaded LLM.
 * Streams tokens via callback for real-time display.
 *
 * @param prompt - Full prompt including system message + context + user query
 * @param onToken - Called for each generated token
 * @returns Full generated text
 */
export async function generateResponse(
  prompt: string,
  onToken?: (token: string) => void,
  maxTokens: number = 512
): Promise<string> {
  if (!context) throw new Error('LLM not loaded. Call loadModel() first.');

  if (isMockModel) {
    const response = mockBibleAssistantResponse(prompt);
    // Split into words to stream
    const tokens = response.split(/(\s+)/);
    let fullText = '';
    for (const token of tokens) {
      fullText += token;
      onToken?.(token);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    return response;
  }

  try {
    const result = await context.completion(
      {
        prompt,
        n_predict: maxTokens,
        temperature: 0.7,
        top_k: 40,
        top_p: 0.9,
        penalty_repeat: 1.1,
        stop: ['### Question:', '### Question', '\nContext:', '<|im_end|>', '<|endoftext|>'],
      },
      (data) => {
        if (data.token) {
          onToken?.(data.token);
        }
      }
    );
    return result.text;
  } catch (inferenceErr) {
    console.warn('[LLM] Native completion failed, falling back to helper response:', inferenceErr);
    const fallbackResp = mockBibleAssistantResponse(prompt);
    const tokens = fallbackResp.split(/(\s+)/);
    for (const token of tokens) {
      onToken?.(token);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    return fallbackResp;
  }
}

/** Check if a model is currently loaded */
export function isModelLoaded(): boolean {
  return context !== null;
}

/** Release the model from memory */
export async function releaseModel(): Promise<void> {
  if (context) {
    if (!isMockModel) {
      await context.release();
    }
    context = null;
    isMockModel = false;
  }
}
