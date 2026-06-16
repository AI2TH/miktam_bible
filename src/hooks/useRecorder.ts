import { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioRecorder, requestRecordingPermissionsAsync, RecordingOptions } from 'expo-audio';
import { Platform } from 'react-native';
import * as recordingService from '../services/recordingService';
import { transcribeAudio, isWhisperLoaded, loadWhisperModel } from '../ai/whisperEngine';
import { getDatabase, isDatabaseInitialized } from '../services/database';

const RECORDING_OPTIONS_16KHZ_MONO: RecordingOptions = {
  isMeteringEnabled: true,
  extension: Platform.OS === 'ios' ? '.wav' : '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    extension: '.m4a',
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
    sampleRate: 16000,
  },
  ios: {
    extension: '.wav',
    outputFormat: 'lpcm',
    audioQuality: 96,
    sampleRate: 16000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [durationSecs, setDurationSecs] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const timerRef = useRef<any>(null);
  const mountedRef = useRef(true); // Guard against state updates after unmount

  const recorder = useAudioRecorder(RECORDING_OPTIONS_16KHZ_MONO);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission not granted');
      }

      await recorder.prepareToRecordAsync();
      recorder.record();

      setIsRecording(true);
      setDurationSecs(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDurationSecs((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('[useRecorder] Failed to start recording:', e);
      throw e;
    }
  }, [recorder]);

  const transcribeInBackground = useCallback(async (
    recordId: string,
    uri: string,
    linkedBook: number | null = null,
    linkedChapter: number | null = null,
    linkedVerse: number | null = null
  ) => {
    if (mountedRef.current) setTranscribing(true);
    try {
      // 1. Check database for any downloaded Whisper model path
      let whisperModelPath = '';
      try {
        // getDatabase() is synchronous — do NOT await it
        if (isDatabaseInitialized()) {
          const db = getDatabase();
          const rows = await db.getAllAsync<{ file_path: string }>(
            "SELECT file_path FROM ai_models WHERE model_type = 'whisper' AND is_downloaded = 1 LIMIT 1"
          );
          if (rows && rows.length > 0) {
            whisperModelPath = rows[0].file_path;
          }
        }
      } catch (e) {
        console.warn('[useRecorder] Failed to query downloaded whisper model path:', e);
      }

      // Ensure Whisper engine is initialized
      if (!isWhisperLoaded()) {
        await loadWhisperModel(whisperModelPath);
      }

      await recordingService.updateRecordingTranscript(recordId, '', 'processing');

      // 2. Perform transcription
      const text = await transcribeAudio(uri, linkedBook, linkedChapter, linkedVerse);

      // 3. Save transcript to SQLite
      await recordingService.updateRecordingTranscript(recordId, text, 'done');
    } catch (err) {
      console.error('[useRecorder] Background transcription failed:', err);
      await recordingService.updateRecordingTranscript(
        recordId,
        err instanceof Error ? err.message : 'Transcription failed',
        'failed'
      );
    } finally {
      // Guard: only update state if component is still mounted
      if (mountedRef.current) setTranscribing(false);
    }
  }, []);

  const stopRecording = useCallback(async (
    title: string,
    linkedBook: number | null = null,
    linkedChapter: number | null = null,
    linkedVerse: number | null = null
  ) => {
    if (!isRecording) return null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      await recorder.stop();
      const uri = recorder.uri || '';
      const finalDuration = durationSecs;

      setIsRecording(false);
      setDurationSecs(0);

      // Log metadata to local SQLite
      const record = await recordingService.addRecording(
        title,
        uri,
        finalDuration,
        linkedBook,
        linkedChapter,
        linkedVerse
      );

      // Trigger asynchronous transcription via Whisper
      transcribeInBackground(record.id, uri, record.linkedBook, record.linkedChapter, record.linkedVerse);

      return record;
    } catch (e) {
      console.error('[useRecorder] Failed to stop recording:', e);
      setIsRecording(false);
      setDurationSecs(0);
      throw e;
    }
  }, [isRecording, durationSecs, recorder, transcribeInBackground]);

  return {
    isRecording,
    durationSecs,
    transcribing,
    start: startRecording,
    stop: stopRecording,
  };
}
