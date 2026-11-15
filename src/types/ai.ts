import type { VerseRef, SearchResult } from './bible';

export interface ChatMessage {
  id: string;
  sessionId: string;
  /**
   * 'assistant' is used only for real model output. 'notice' is an app-generated
   * message (for example, retrieved verses shown because no model is downloaded)
   * and must never be presented as a model answer.
   */
  role: 'user' | 'assistant' | 'notice';
  content: string;
  citedVerses: VerseRef[];    // Parsed verse references in response
  versionId: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;             // Auto-generated from first message
  messageCount: number;
  lastMessageAt: string;
  versionId: string;
}

export interface AIModel {
  id: string;                // 'bible-smollm2-135m-q4' (SmolLM2 135M), 'whisper-base-en'
  modelType: 'llm' | 'whisper' | 'embeddings';
  displayName: string;       // 'Bible SmolLM2 135M'
  description: string;
  fileSizeMb: number;        // 105
  ramRequiredMb: number;     // 200
  downloadUrl: string;       // HuggingFace URL
  filePath: string | null;   // Local path after download
  isDownloaded: boolean;
  downloadDate: string | null;
  version: string;           // '1.0.0'
}

export interface ModelDownloadProgress {
  modelId: string;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;        // 0-100
  status: 'idle' | 'downloading' | 'verifying' | 'ready' | 'error';
  error: string | null;
}

export interface RAGResult {
  answer: string;
  citedVerses: VerseRef[];
  sourceVerses: SearchResult[];  // The verses that were fed as context
  tokensGenerated: number;
  inferenceTimeMs: number;
}

/** Chunk emitted during streaming RAG response */
export interface RAGStreamChunk {
  type: 'token' | 'citation' | 'done' | 'error' | 'model_missing';
  token?: string;            // Next generated token
  citation?: VerseRef;       // Detected verse reference
  fullText?: string;         // Complete text so far
  error?: string;
  /** For 'model_missing': the retrieved verses (no model output) */
  citedVerses?: VerseRef[];
}

/** Device capability assessment */
export interface DeviceCapability {
  totalRamMb: number;
  availableRamMb: number;
  recommendedTier: 'full' | 'lite' | 'none';
  canRunLlm: boolean;
  canRunWhisper: boolean;
}
