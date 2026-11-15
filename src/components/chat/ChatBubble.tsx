import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { BOOK_NAMES } from '../../utils/constants';
import type { ChatMessage } from '../../types/ai';
import type { VerseRef } from '../../types/bible';

interface ChatBubbleProps {
  message: ChatMessage;
  onTapCitation: (ref: VerseRef) => void;
  isStreaming?: boolean;
  /** Shown on 'notice' messages that were produced because no model is downloaded */
  onDownloadModel?: () => void;
}

export function ChatBubble({
  message,
  onTapCitation,
  isStreaming = false,
  onDownloadModel,
}: ChatBubbleProps) {
  const { colors, spacing, borderRadius } = useTheme();
  const isUser = message.role === 'user';
  const isNotice = message.role === 'notice';

  return (
    <View
      style={[
        styles.row,
        {
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginVertical: spacing.sm,
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? colors.primary : isNotice ? colors.surfaceMuted : colors.surface,
            borderWidth: isNotice ? 1 : 0,
            borderColor: colors.border,
            borderBottomRightRadius: isUser ? 2 : borderRadius.md,
            borderBottomLeftRadius: isUser ? borderRadius.md : 2,
            borderTopLeftRadius: borderRadius.md,
            borderTopRightRadius: borderRadius.md,
            padding: spacing.md,
            maxWidth: '85%',
          },
        ]}
      >
        {isNotice && (
          <View style={[styles.noticeHeader, { marginBottom: spacing.sm }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text variant="caption" color="textSecondary" style={styles.noticeLabel}>
              Search results (not an AI answer)
            </Text>
          </View>
        )}

        {/* Message Text */}
        <Text
          variant="body"
          color={isUser ? 'inverse' : 'textPrimary'}
          style={styles.text}
        >
          {message.content}
        </Text>

        {/* Citations at bottom of assistant bubbles */}
        {!isUser && message.citedVerses && message.citedVerses.length > 0 && (
          <View style={[styles.citationsContainer, { marginTop: spacing.md }]}>
            <Text variant="caption" color="textSecondary" style={styles.citationLabel}>
              Passages:
            </Text>
            <View style={styles.citationsList}>
              {message.citedVerses.map((ref, idx) => {
                const bookName = BOOK_NAMES[ref.bookNumber] || `Book ${ref.bookNumber}`;
                const label = `${bookName} ${ref.chapter}:${ref.verseNumber}`;
                return (
                  <TouchableOpacity key={idx} onPress={() => onTapCitation(ref)}>
                    <Badge variant="secondary" label={label} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {isNotice && onDownloadModel && (
          <TouchableOpacity
            onPress={onDownloadModel}
            style={[
              styles.downloadBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: borderRadius.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                marginTop: spacing.md,
              },
            ]}
          >
            <Ionicons name="download-outline" size={14} color={colors.textInverse} />
            <Text variant="caption" color="inverse" style={{ fontWeight: 'bold', marginLeft: 4 }}>
              Download model
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  bubble: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  text: {
    lineHeight: 22,
  },
  citationsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
  },
  citationLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeLabel: {
    fontWeight: 'bold',
    marginLeft: 4,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  citationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
