import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { IconButton } from '../ui/IconButton';
import { useSettingsStore } from '../../stores/settingsStore';
import { useReaderStore } from '../../stores/readerStore';

interface HeaderProps {
  title?: string;
  /** Shown after the title and never truncated (e.g. the chapter number) */
  titleSuffix?: string;
  /** Lines the title may wrap to before it is truncated */
  titleLines?: number;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  /** Controls shown on a second row under the title, so they never cover it */
  toolbar?: React.ReactNode;
  showLogo?: boolean;
  showThemeToggle?: boolean;
  showStreak?: boolean;
  borderBottom?: boolean;
  style?: any;
}

export function Header({
  title,
  titleSuffix,
  titleLines = 1,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  toolbar,
  showLogo,
  showThemeToggle = true,
  showStreak = true,
  borderBottom = false,
  style,
}: HeaderProps) {
  const { colors, spacing, borderRadius, isDark } = useTheme();
  const { setThemeMode } = useSettingsStore();
  const streak = useReaderStore((s) => s.streak);
  const refreshStreak = useReaderStore((s) => s.refreshStreak);

  const displayLogo = showLogo !== undefined ? showLogo : !showBack;

  useEffect(() => {
    refreshStreak();
  }, [refreshStreak]);

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
        {
          backgroundColor: colors.background,
          borderBottomColor: borderBottom ? colors.border : 'transparent',
          borderBottomWidth: borderBottom ? 1 : 0,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.sm,
        },
        style,
      ]}
    >
      <View style={styles.container}>
        <View style={styles.leftContainer}>
          {showBack && (
            <IconButton
              onPress={handleBack}
              size={36}
              backgroundColor="transparent"
              icon={
                <Ionicons name="arrow-back" size={22} color={colors.primary} />
              }
              style={styles.backButton}
            />
          )}

          {displayLogo && (
            <Image
              source={require('../../../assets/icon.png')}
              style={[
                styles.logoImage,
                { borderColor: colors.border }
              ]}
              resizeMode="cover"
            />
          )}

          <View style={styles.titleWrapper}>
            {title && titleSuffix ? (
              <View style={styles.titleRow} accessible accessibilityRole="header" accessibilityLabel={`${title} ${titleSuffix}`}>
                <Text variant="h2" numberOfLines={titleLines} ellipsizeMode="tail" style={[styles.title, styles.titleShrink]}>
                  {title}
                </Text>
                <Text variant="h2" numberOfLines={1} style={[styles.title, styles.titleSuffix]}>
                  {titleSuffix}
                </Text>
              </View>
            ) : title ? (
              <Text variant="h2" numberOfLines={titleLines} ellipsizeMode="tail" style={styles.title}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ marginTop: 1 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightContainer}>
          {rightAction}

          {showThemeToggle && (
            <TouchableOpacity
              onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: borderRadius.full,
                },
              ]}
              activeOpacity={0.7}
              accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={18}
                color={isDark ? '#F7C844' : '#E5A93C'}
              />
            </TouchableOpacity>
          )}

          {showStreak && (
            <View
              style={[
                styles.streakContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: borderRadius.full,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                },
              ]}
            >
              <Text style={styles.flame}>🔥</Text>
              <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>
                {streak}
              </Text>
            </View>
          )}
        </View>
      </View>

      {toolbar ? <View style={[styles.toolbar, { marginTop: spacing.xs }]}>{toolbar}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  backButton: {
    marginRight: 6,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    marginRight: 8,
  },
  titleWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    fontSize: 19,
    letterSpacing: -0.2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleShrink: {
    flexShrink: 1,
  },
  titleSuffix: {
    flexShrink: 0,
    marginLeft: 6,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  rightContainer: {
    flexShrink: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  flame: {
    fontSize: 16,
    marginRight: 4,
  },
});
