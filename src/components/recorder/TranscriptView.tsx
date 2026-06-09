import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';

interface TranscriptViewProps {
  status: 'pending' | 'processing' | 'done' | 'failed';
  transcript: string | null;
}

export function TranscriptView({ status, transcript }: TranscriptViewProps) {
  const { colors, spacing } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text variant="h3" style={styles.title}>
          Voice Transcript
        </Text>
        <View style={styles.statusRow}>
          {status === 'processing' && <ActivityIndicator color={colors.primary} size="small" style={{ marginRight: 6 }} />}
          <Text
            variant="caption"
            color={
              status === 'done'
                ? 'success'
                : status === 'failed'
                ? 'error'
                : 'textSecondary'
            }
            style={styles.statusText}
          >
            {status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={[styles.content, { marginTop: spacing.sm }]}>
        {status === 'pending' && (
          <Text variant="bodySmall" color="textSecondary">
            Waiting in queue for speech-to-text processing...
          </Text>
        )}
        {status === 'processing' && (
          <Text variant="bodySmall" color="textSecondary">
            Whisper is transcribing voice reflection locally...
          </Text>
        )}
        {status === 'failed' && (
          <Text variant="bodySmall" color="error">
            Transcription failed. Please try recording again.
          </Text>
        )}
        {status === 'done' && (
          <Text variant="body" color="textPrimary" style={styles.transcriptText}>
            {transcript || 'No words detected.'}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 6,
  },
  title: {
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  transcriptText: {
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
