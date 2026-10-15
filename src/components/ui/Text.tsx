import React from 'react';
import { Text as RNText, TextProps, Platform } from 'react-native';
import { useTheme } from '../../theme';
import type { textStyles } from '../../theme/typography';
import { isComplexScript } from '../../utils/bibleUtils';

interface CustomTextProps extends TextProps {
  variant?: keyof typeof textStyles;
  color?: 'primary' | 'secondary' | 'textPrimary' | 'textSecondary' | 'textTertiary' | 'inverse' | 'jesus' | 'gold' | 'success' | 'error';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  inline?: boolean;
}

export function Text({
  variant = 'body',
  color = 'textPrimary',
  align = 'left',
  inline = false,
  style,
  children,
  ...props
}: CustomTextProps) {
  const { colors, textStyles } = useTheme();

  let resolvedColor = colors.textPrimary;
  switch (color) {
    case 'primary':
      resolvedColor = colors.primary;
      break;
    case 'secondary':
      resolvedColor = colors.secondary;
      break;
    case 'textPrimary':
      resolvedColor = colors.textPrimary;
      break;
    case 'textSecondary':
      resolvedColor = colors.textSecondary;
      break;
    case 'textTertiary':
      resolvedColor = colors.textTertiary;
      break;
    case 'inverse':
      resolvedColor = colors.textInverse;
      break;
    case 'jesus':
      resolvedColor = colors.jesusWords;
      break;
    case 'gold':
      resolvedColor = colors.verseNumber;
      break;
    case 'success':
      resolvedColor = colors.success;
      break;
    case 'error':
      resolvedColor = colors.error;
      break;
  }

  let baseStyle: any = textStyles[variant];

  // If used as an inline span within another <Text>, strip lineHeight
  // so React Native Android does not apply a conflicting LineHeightSpan.
  if (inline) {
    const { lineHeight: _lh, ...rest } = baseStyle;
    baseStyle = rest;
  } else if (
    variant === 'scripture' ||
    variant === 'scriptureSmall' ||
    variant === 'scriptureLarge'
  ) {
    // For scripture text in complex scripts (Tamil, Kannada, etc.),
    // automatically fall back to the system font on Android to avoid Latin font metric clipping.
    let rawText = '';
    if (typeof children === 'string') {
      rawText = children;
    } else if (Array.isArray(children)) {
      rawText = children
        .map((c) => (typeof c === 'string' ? c : ''))
        .join('');
    }

    if (isComplexScript(rawText)) {
      baseStyle = {
        ...baseStyle,
        ...(Platform.OS === 'android' ? { fontFamily: 'sans-serif' } : {}),
        lineHeight: Math.round(baseStyle.fontSize * 1.85),
      };
    }
  }

  return (
    <RNText
      style={[
        baseStyle,
        { color: resolvedColor, textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}
