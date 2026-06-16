import type { VerseRef, SearchResult } from './bible';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
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
  id: string;                // 'bibleslm-1.5b-q4', 'bibleslm-0.5b-q4', 'whisper-base-en'
  modelType: 'llm' | 'whisper' | 'embeddings';
  displayName: string;       // 'BibleSLM 1.5B (Full)'
  description: string;       // 'Best quality Bible study assistant'
  fileSizeMb: number;        // 986
  ramRequiredMb: number;     // 1200
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
  type: 'token' | 'citation' | 'done' | 'error';
  token?: string;            // Next generated token
  citation?: VerseRef;       // Detected verse reference
  fullText?: string;         // Complete text so far
  error?: string;
}

/** Device capability assessment */
export interface DeviceCapability {
  totalRamMb: number;
  availableRamMb: number;
  recommendedTier: 'full' | 'lite' | 'none';
  canRunLlm: boolean;
  canRunWhisper: boolean;
}
