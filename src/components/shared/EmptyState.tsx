import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionButton?: React.ReactNode;
  style?: any;
}

export function EmptyState({
  title,
  description,
  icon,
  actionButton,
  style,
}: EmptyStateProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {icon && <View style={[styles.iconContainer, { marginBottom: spacing.md }]}>{icon}</View>}
      <Text variant="h3" color="textPrimary" align="center" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodySmall" color="textSecondary" align="center" style={[styles.description, { marginVertical: spacing.sm }]}>
        {description}
      </Text>
      {actionButton && <View style={[styles.actionContainer, { marginTop: spacing.md }]}>{actionButton}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
  },
  description: {
    maxWidth: 260,
  },
  actionContainer: {
    alignItems: 'center',
  },
});
