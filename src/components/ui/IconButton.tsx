import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import * as Haptics from 'expo-haptics';

interface IconButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  size?: number;
  backgroundColor?: string;
  disabled?: boolean;
  style?: any;
}

export function IconButton({
  onPress,
  icon,
  size = 40,
  backgroundColor,
  disabled = false,
  style,
}: IconButtonProps) {
  const { colors, borderRadius } = useTheme();

  const handlePress = () => {
    if (disabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e) {
      // Ignore haptics errors on emulator/unsupported devices
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor || colors.surfaceElevated,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
