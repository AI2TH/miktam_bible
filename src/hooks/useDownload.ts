import { useCallback } from 'react';
import { useDownloadStore } from '../stores/downloadStore';
import { downloadModel, deleteModel as deleteModelFromFileSystem } from '../ai/modelManager';

export function useDownload() {
  const progresses = useDownloadStore(s => s.progresses);
  const setProgress = useDownloadStore(s => s.setProgress);
  const clearProgress = useDownloadStore(s => s.clearProgress);

  const download = useCallback(async (modelId: string) => {
    // If already downloading, ignore
    if (progresses[modelId]?.status === 'downloading') return;

    try {
      setProgress(modelId, {
        modelId,
        bytesDownloaded: 0,
        totalBytes: 0,
        percentage: 0,
        status: 'downloading',
        error: null,
      });

      await downloadModel(modelId, (p) => {
        setProgress(modelId, p);
      });
    } catch (e) {
      console.error(`[useDownload] Failed to download model ${modelId}:`, e);
      setProgress(modelId, {
        modelId,
        bytesDownloaded: 0,
        totalBytes: 0,
        percentage: 0,
        status: 'error',
        error: e instanceof Error ? e.message : 'Download failed',
      });
    }
  }, [progresses, setProgress]);

  const remove = useCallback(async (modelId: string) => {
    try {
      await deleteModelFromFileSystem(modelId);
      clearProgress(modelId);
    } catch (e) {
      console.error(`[useDownload] Failed to delete model ${modelId}:`, e);
    }
  }, [clearProgress]);

  return {
    progresses,
    download,
    remove,
  };
}
