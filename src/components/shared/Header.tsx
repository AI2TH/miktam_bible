import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { IconButton } from '../ui/IconButton';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: any;
}

export function Header({
  title,
  showBack = false,
  onBack,
  rightAction,
  style,
}: HeaderProps) {
  const { colors, spacing, borderRadius } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          paddingTop: spacing.xl, // Simple padding, safe-area-context handles insets
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.base,
        },
        style,
      ]}
    >
      <View style={styles.leftContainer}>
        {showBack && (
          <IconButton
            onPress={handleBack}
            size={36}
            backgroundColor="transparent"
            icon={
              <Text variant="body" color="primary" style={styles.backIcon}>
                ←
              </Text>
            }
            style={styles.backButton}
          />
        )}
        <Text variant="h2" style={styles.title}>
          {title}
        </Text>
      </View>
      {rightAction && <View style={styles.rightContainer}>{rightAction}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 8,
  },
  backIcon: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  title: {
    fontWeight: '700',
  },
  rightContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
