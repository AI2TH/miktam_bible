import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { HIGHLIGHT_COLORS } from '../../theme/colors';

interface HighlightColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

export function HighlightColorPicker({
  selectedColor,
  onSelectColor,
}: HighlightColorPickerProps) {
  const { spacing, borderRadius } = useTheme();

  return (
    <View style={[styles.container, { gap: spacing.md }]}>
      {HIGHLIGHT_COLORS.map((item) => {
        const isSelected = selectedColor === item.value;
        return (
          <TouchableOpacity
            key={item.name}
            onPress={() => onSelectColor(item.value)}
            style={[
              styles.circle,
              {
                backgroundColor: item.value,
                borderRadius: borderRadius.full,
                borderColor: isSelected ? '#FFFFFF' : 'transparent',
                borderWidth: isSelected ? 3 : 0,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  circle: {
    width: 36,
    height: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
