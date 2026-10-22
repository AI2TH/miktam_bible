import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import type { Verse } from '../../types/bible';
import { cleanVerseText, isComplexScript } from '../../utils/bibleUtils';

interface VerseTextProps {
  verse: Verse;
  highlightColor?: string | null;
  isSelected?: boolean;
  onTap: () => void;
  onLongPress: () => void;
  fontSize: number;
  secondaryVerse?: Verse | null;
  secondaryVersionAbbr?: string;
  isDualMode?: boolean;
}

export function VerseText({
  verse,
  highlightColor = null,
  isSelected = false,
  onTap,
  onLongPress,
  fontSize,
  secondaryVerse,
  secondaryVersionAbbr,
  isDualMode = false,
}: VerseTextProps) {
  const { colors, spacing, borderRadius } = useTheme();

  const isPrimaryComplex = isComplexScript(verse.text);
  const primaryLineHeight = isPrimaryComplex
    ? Math.round(fontSize * 1.85)
    : Math.round(fontSize * 1.6);
  const primaryFontFamily = isPrimaryComplex
    ? Platform.select({ android: 'sans-serif', default: undefined })
    : undefined;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onTap}
      onLongPress={onLongPress}
      style={[
        styles.container,
        {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          borderRadius: borderRadius.sm,
          backgroundColor: isSelected
            ? 'rgba(201,165,92,0.15)' // Warm gold highlight for selection
            : highlightColor ? highlightColor + '20' : 'transparent', // Subtle background for user highlights
        },
      ]}
    >
      <Text
        variant="scripture"
        style={[
          styles.scriptureText,
          {
            fontSize,
            lineHeight: primaryLineHeight,
            ...(primaryFontFamily ? { fontFamily: primaryFontFamily } : {}),
          },
        ]}
      >
        {/* Gold verse number: rendered as an inline span without fixed lineHeight */}
        <Text
          inline
          color="gold"
          style={[
            styles.verseNumber,
            {
              fontSize: Math.round(fontSize * 0.72),
              fontWeight: 'bold',
              ...(primaryFontFamily ? { fontFamily: primaryFontFamily } : {}),
            },
          ]}
        >
          {verse.verseNumber}{' '}
        </Text>

        {/* Primary verse text */}
        {cleanVerseText(verse.text)}
      </Text>

      {/* Secondary translation text (Dual Language Mode) */}
      {isDualMode && secondaryVersionAbbr && (() => {
        const secText = secondaryVerse ? cleanVerseText(secondaryVerse.text) : 'Verse not available in this translation.';
        const isSecComplex = secondaryVerse ? isComplexScript(secondaryVerse.text) : false;
        const secFontSize = Math.max(12, Math.round(fontSize * 0.92));
        const secLineHeight = isSecComplex
          ? Math.round(secFontSize * 1.85)
          : Math.round(secFontSize * 1.55);
        const secFontFamily = isSecComplex
          ? Platform.select({ android: 'sans-serif', default: undefined })
          : undefined;

        return (
          <View
            style={[
              styles.secondaryBlock,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderLeftColor: colors.primary,
                borderRadius: borderRadius.sm,
                paddingHorizontal: spacing.sm + 2,
                paddingVertical: spacing.sm,
                marginTop: spacing.xs + 4,
              },
            ]}
          >
            <View style={styles.secondaryHeader}>
              <View
                style={[
                  styles.badgePill,
                  {
                    backgroundColor: colors.primary + '25',
                    borderColor: colors.primary + '60',
                    borderWidth: 1,
                    borderRadius: borderRadius.sm,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  color="primary"
                  style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}
                >
                  {secondaryVersionAbbr.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text
              variant="scripture"
              color={secondaryVerse ? 'textPrimary' : 'textTertiary'}
              style={[
                styles.secondaryText,
                {
                  fontSize: secFontSize,
                  lineHeight: secLineHeight,
                  color: secondaryVerse ? colors.textPrimary : colors.textTertiary,
                  fontStyle: secondaryVerse ? 'normal' : 'italic',
                  opacity: secondaryVerse ? 0.96 : 0.7,
                  ...(secFontFamily ? { fontFamily: secFontFamily } : {}),
                },
              ]}
            >
              {secText}
            </Text>
          </View>
        );
      })()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  verseNumber: {
    marginRight: 4,
  },
  scriptureText: {
    // Standard text wraps perfectly on its own
  },
  secondaryBlock: {
    borderLeftWidth: 3,
    borderWidth: 1,
  },
  secondaryHeader: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  badgePill: {
    alignSelf: 'flex-start',
  },
  secondaryText: {
    marginTop: 2,
  },
});

