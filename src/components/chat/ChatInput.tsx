import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';

interface ChatInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  placeholder = 'Ask a question about scripture...',
  disabled = false,
}: ChatInputProps) {
  const { colors, spacing, borderRadius } = useTheme();
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    Keyboard.dismiss();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          padding: spacing.base,
        },
      ]}
    >
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
          },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline={true}
          style={[styles.input, { color: colors.textPrimary }]}
          editable={!disabled}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={disabled || !text.trim()}
          style={[
            styles.sendButton,
            {
              backgroundColor: text.trim() && !disabled ? colors.primary : colors.surfaceElevated,
              borderRadius: borderRadius.sm,
            },
          ]}
        >
          {disabled ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              variant="button"
              color={text.trim() ? 'inverse' : 'textTertiary'}
              style={{ fontWeight: 'bold' }}
            >
              Send
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 48,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit',
    paddingVertical: 8,
    marginRight: 8,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
