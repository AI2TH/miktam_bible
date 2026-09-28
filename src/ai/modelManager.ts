import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase } from '../services/database';
import * as Device from 'expo-device';
import type { AIModel, DeviceCapability, ModelDownloadProgress } from '../types/ai';

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;

/** Ensure models directory exists */
async function ensureModelsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MODELS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
  }
}

/** Get all registered AI models with their download status */
export async function getAvailableModels(): Promise<AIModel[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM ai_models ORDER BY file_size_mb');
  
  const models: AIModel[] = [];
  for (const r of rows) {
    const ext = r.model_type === 'whisper' ? '.bin' : '.gguf';
    const expectedPath = `${MODELS_DIR}${r.id}${ext}`;
    const info = await FileSystem.getInfoAsync(expectedPath);
    const exists = info.exists;
    
    const dbDownloaded = r.is_downloaded === 1;
    if (exists !== dbDownloaded) {
      console.log(`[ModelManager] Syncing DB state for ${r.id}: disk exists = ${exists}, DB downloaded = ${dbDownloaded}`);
      await db.runAsync(
        'UPDATE ai_models SET is_downloaded = ?, file_path = ? WHERE id = ?',
        [exists ? 1 : 0, exists ? expectedPath : null, r.id]
      );
    }

    models.push({
      id: r.id,
      modelType: r.model_type,
      displayName: r.display_name,
      description: r.description || '',
      fileSizeMb: r.file_size_mb,
      ramRequiredMb: r.ram_required_mb,
      downloadUrl: r.download_url,
      filePath: exists ? expectedPath : null,
      isDownloaded: exists,
      downloadDate: exists ? r.download_date : null,
      version: r.version,
    });
  }
  return models;
}

/**
 * Download an AI model from HuggingFace.
 * Saves to FileSystem.documentDirectory/models/
 * Calls onProgress with download percentage.
 */
export async function downloadModel(
  modelId: string,
  onProgress?: (progress: ModelDownloadProgress) => void
): Promise<string> {
  await ensureModelsDir();
  const db = getDatabase();

  // Get model info
  const model = await db.getFirstAsync<any>(
    'SELECT * FROM ai_models WHERE id = ?', [modelId]
  );
  if (!model) throw new Error(`Model not found: ${modelId}`);

  const ext = model.model_type === 'whisper' ? '.bin' : '.gguf';
  const filePath = `${MODELS_DIR}${modelId}${ext}`;

  // Start download with progress tracking
  const downloadResumable = FileSystem.createDownloadResumable(
    model.download_url,
    filePath,
    {},
    (downloadProgress) => {
      const percentage = Math.round(
        (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
      );
      onProgress?.({
        modelId,
        bytesDownloaded: downloadProgress.totalBytesWritten,
        totalBytes: downloadProgress.totalBytesExpectedToWrite,
        percentage,
        status: 'downloading',
        error: null,
      });
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) throw new Error('Download failed');

  // Update database
  await db.runAsync(
    `UPDATE ai_models SET is_downloaded = 1, file_path = ?, download_date = datetime('now')
     WHERE id = ?`,
    [filePath, modelId]
  );

  onProgress?.({
    modelId,
    bytesDownloaded: 0,
    totalBytes: 0,
    percentage: 100,
    status: 'ready',
    error: null,
  });

  return filePath;
}

/** Delete a downloaded model to free space */
export async function deleteModel(modelId: string): Promise<void> {
  const db = getDatabase();
  const model = await db.getFirstAsync<any>(
    'SELECT file_path FROM ai_models WHERE id = ?', [modelId]
  );
  if (model?.file_path) {
    await FileSystem.deleteAsync(model.file_path, { idempotent: true });
  }
  await db.runAsync(
    'UPDATE ai_models SET is_downloaded = 0, file_path = NULL, download_date = NULL WHERE id = ?',
    [modelId]
  );
}

/** Detect device capability and recommend model tier */
export async function getDeviceCapability(): Promise<DeviceCapability> {
  const totalRamMb = (Device.totalMemory || 0) / (1024 * 1024);

  let recommendedTier: 'full' | 'lite' | 'none';
  if (totalRamMb >= 3000) {
    recommendedTier = 'full';  // BibleSLM-1.5B
  } else if (totalRamMb >= 2000) {
    recommendedTier = 'lite';  // BibleSLM-0.5B
  } else {
    recommendedTier = 'none';  // FTS-only search
  }

  return {
    totalRamMb: Math.round(totalRamMb),
    availableRamMb: Math.round(totalRamMb * 0.5), // Rough estimate
    recommendedTier,
    canRunLlm: totalRamMb >= 2000,
    canRunWhisper: totalRamMb >= 1500,
  };
}
