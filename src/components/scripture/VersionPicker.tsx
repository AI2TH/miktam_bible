import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import type { BibleVersion } from '../../types/bible';

interface VersionPickerProps {
  versions: BibleVersion[];
  selectedVersionId: string;
  onSelectVersion: (versionId: string) => void;
}

export function VersionPicker({
  versions,
  selectedVersionId,
  onSelectVersion,
}: VersionPickerProps) {
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <View style={[styles.container, { gap: spacing.sm }]}>
      {versions.map((version) => {
        const isSelected = selectedVersionId === version.id;
        const isDisabled = !version.isDownloaded;

        return (
          <TouchableOpacity
            key={version.id}
            disabled={isDisabled}
            onPress={() => onSelectVersion(version.id)}
            activeOpacity={0.8}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
                borderRadius: borderRadius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
              isDisabled && styles.disabled,
            ]}
          >
            <Text
              variant="button"
              color={isSelected ? 'inverse' : isDisabled ? 'textTertiary' : 'textPrimary'}
              style={styles.label}
            >
              {version.language.toUpperCase()} • {version.id.toUpperCase()}
            </Text>
            {isDisabled && (
              <Text variant="caption" color="textTertiary" style={styles.downloadIndicator}>
                📥
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minWidth: 64,
  },
  label: {
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.5,
  },
  downloadIndicator: {
    marginLeft: 4,
    fontSize: 10,
  },
});
