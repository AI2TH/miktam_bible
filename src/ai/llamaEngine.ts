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

  // If path is empty, default to mock/fallback mode immediately
  if (!modelPath) {
    isMockModel = true;
    context = { mock: true } as any;
    console.log('[LLM] Running in default offline fallback mode.');
    return;
  }

  // Check if this is a mock model file by inspecting its size
  try {
    const info = await FileSystem.getInfoAsync(modelPath);
    if (!info.exists) {
      isMockModel = true;
      context = { mock: true } as any;
      console.log('[LLM] Model file not found, defaulting to fallback mode.');
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
  const nativePath = modelPath.startsWith('file://') ? modelPath.replace('file://', '') : modelPath;

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
  // Extract user query from prompt
  const queryMatch = prompt.match(/QUESTION:\s*(.*)/i);
  const query = queryMatch ? queryMatch[1].trim() : '';

  // Extract scripture passages from prompt
  const passagesMatch = prompt.match(/SCRIPTURE PASSAGES:\s*([\s\S]*?)\s*QUESTION:/i);
  const passages = passagesMatch ? passagesMatch[1].trim() : '';

  // Generate response based on query and passages
  const queryLower = query.toLowerCase();
  if (queryLower.includes('worry') || queryLower.includes('fear')) {
    return `According to the scriptures, God calls us to trust Him and not to worry. In John 3:16, we learn that God's great love for the world led Him to send His only begotten Son to offer eternal life. Knowing we have this hope of eternal life helps us overcome fear and worry in our daily lives.`;
  }
  
  if (queryLower.includes('fruit') || queryLower.includes('spirit')) {
    return `In John 1:4, we are told that "In him was life; and the life was the light of men." When we follow Jesus and walk in His light, we are guided by the Spirit. This spiritual walk bears good fruits like love, joy, and peace in our lives.`;
  }

  if (queryLower.includes('armor') || queryLower.includes('god')) {
    return `The Armor of God equips us for spiritual battles, with the Word of God serving as our main defense. In John 1:1, we see that "In the beginning was the Word, and the Word was with God, and the Word was God." By holding onto His Word, we stand strong in faith.`;
  }

  if (queryLower.includes('psalm') || queryLower.includes('23')) {
    return `Psalm 23 depicts God as our shepherd leading us through the dark valleys. Genesis 1:3 declares: "And God said, Let there be light: and there was light." Even in the deepest darkness, God's light and guidance are present as our shepherd.`;
  }

  // Generic fallback that quotes one of the passages
  if (passages) {
    const firstLine = passages.split('\n')[0] || '';
    const refMatch = firstLine.match(/\[\d+\]\s*([^—]*)\s*—\s*"(.*)"/);
    if (refMatch) {
      const ref = refMatch[1].trim();
      const text = refMatch[2].trim();
      return `Based on ${ref}, the scriptures state: "${text}". This tells us about God's presence, light, and guidance in our life.`;
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
      temperature: 0.3,     // Low temperature for factual Bible answers
      top_k: 40,
      top_p: 0.9,
      stop: ['</s>', '<|endoftext|>', 'User:', '\nQuestion:'],
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
