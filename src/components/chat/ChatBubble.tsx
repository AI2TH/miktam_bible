import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { BOOK_NAMES } from '../../utils/constants';
import type { ChatMessage } from '../../types/ai';
import type { VerseRef } from '../../types/bible';

interface ChatBubbleProps {
  message: ChatMessage;
  onTapCitation: (ref: VerseRef) => void;
  isStreaming?: boolean;
}

export function ChatBubble({
  message,
  onTapCitation,
  isStreaming = false,
}: ChatBubbleProps) {
  const { colors, spacing, borderRadius } = useTheme();
  const isUser = message.role === 'user';

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
            backgroundColor: isUser ? colors.primary : colors.surface,
            borderBottomRightRadius: isUser ? 2 : borderRadius.md,
            borderBottomLeftRadius: isUser ? borderRadius.md : 2,
            borderTopLeftRadius: borderRadius.md,
            borderTopRightRadius: borderRadius.md,
            padding: spacing.md,
            maxWidth: '85%',
          },
        ]}
      >
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
  citationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
