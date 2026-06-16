import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from './Text';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: any;
}

export function Button({
  onPress,
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const { colors, spacing, borderRadius } = useTheme();

  const handlePress = () => {
    if (loading || disabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e) {
      // Ignore haptics errors on emulator/unsupported devices
    }
    onPress();
  };

  const isDarkButton = variant === 'primary' || variant === 'secondary';

  let backgroundColor = 'transparent';
  let borderColor = 'transparent';
  let textColor: any = 'textPrimary';

  if (variant === 'primary') {
    backgroundColor = colors.primary;
    textColor = 'inverse';
  } else if (variant === 'secondary') {
    backgroundColor = colors.surfaceElevated;
    textColor = 'primary';
  } else if (variant === 'outline') {
    borderColor = colors.border;
    textColor = 'textPrimary';
  } else if (variant === 'ghost') {
    textColor = 'primary';
  }

  if (disabled) {
    backgroundColor = variant === 'ghost' || variant === 'outline' ? 'transparent' : colors.surfaceMuted;
    borderColor = variant === 'outline' ? colors.borderMuted : 'transparent';
    textColor = 'textTertiary';
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.base,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isDarkButton ? colors.background : colors.primary} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text variant="button" color={textColor} style={styles.labelText}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  labelText: {
    textAlign: 'center',
  },
});
