import { initLlama, type LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';

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

  // If path is empty, default to mock/fallback mode immediately
  if (!actualPath) {
    isMockModel = true;
    context = { mock: true } as any;
    console.log('[LLM] Running in default offline fallback mode.');
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
      n_ctx: 4096,        // Context window (tokens)
      n_batch: 512,       // Batch size for prompt processing
      n_threads: 4,       // CPU threads for inference
      n_gpu_layers: 0,    // 0 = CPU only (GPU layers for supported devices)
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

  if (queryLower.includes('worry') || queryLower.includes('fear') || queryLower.includes('anxious')) {
    return `Scripture tells us not to be anxious about anything (Philippians 4:6). God calls us to cast all our cares upon Him, for He cares for us (1 Peter 5:7). Trust in the Lord and do not lean on your own understanding (Proverbs 3:5).`;
  }

  if (queryLower.includes('forgiv')) {
    return `Scripture teaches that we must forgive others as God has forgiven us (Ephesians 4:32). If we confess our sins, He is faithful and just to forgive us (1 John 1:9). Forgiveness is a central theme of the Gospel.`;
  }

  if (queryLower.includes('love')) {
    return `God is love, and love comes from God (1 John 4:7-8). For God so loved the world that He gave His only begotten Son (John 3:16). We are called to love one another as Christ loved us.`;
  }

  if (queryLower.includes('faith') || queryLower.includes('believe')) {
    return `Faith is the substance of things hoped for, the evidence of things not seen (Hebrews 11:1). Without faith it is impossible to please God (Hebrews 11:6). We are saved through faith, not by works (Ephesians 2:8-9).`;
  }

  // Use the first passage from context if available
  if (passages) {
    const firstLine = passages.split('\n')[0] || '';
    const refMatch = firstLine.match(/^([A-Z0-9]+\s+\d+:\d+):\s*(.+)/);
    if (refMatch) {
      return `Based on ${refMatch[1]}, the scripture says: "${refMatch[2].trim()}". This teaches us about God's truth and guidance in our lives.`;
    }
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

  const result = await context.completion(
    {
      prompt,
      n_predict: maxTokens,
      temperature: 0.7,        // Matches bible_offline.py: temperature=0.7
      top_k: 40,
      top_p: 0.9,
      penalty_repeat: 1.1,    // Matches bible_offline.py: repetition_penalty=1.1
      stop: ['### Question:', '### Question', '\nContext:', '<|im_end|>', '<|endoftext|>'],
    },
    (data) => {
      // Called for each token during streaming
      if (data.token) {
        onToken?.(data.token);
      }
    }
  );

  return result.text;
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
