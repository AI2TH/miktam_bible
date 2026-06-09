import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { useTheme } from '../../theme';
import type { textStyles } from '../../theme/typography';

interface CustomTextProps extends TextProps {
  variant?: keyof typeof textStyles;
  color?: 'primary' | 'secondary' | 'textPrimary' | 'textSecondary' | 'textTertiary' | 'inverse' | 'jesus' | 'gold' | 'success' | 'error';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function Text({
  variant = 'body',
  color = 'textPrimary',
  align = 'left',
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

  const baseStyle = textStyles[variant];

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
