import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Text } from './Text';
import { IconButton } from './IconButton';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: number | string;
  scrollable?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeight = '85%',
  scrollable = true,
}: BottomSheetProps) {
  const { colors, borderRadius, spacing, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderTopLeftRadius: borderRadius.lg,
                  borderTopRightRadius: borderRadius.lg,
                  maxHeight: maxHeight as any,
                  paddingBottom: Math.max(insets.bottom, 16) + spacing.md,
                },
                shadows.lg,
              ]}
            >
              {/* Grab handle indicator */}
              <View style={styles.dragHandleContainer}>
                <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              </View>

              {/* Header */}
              {(title !== undefined || onClose !== undefined) && (
                <View style={[styles.header, { paddingHorizontal: spacing.base, paddingVertical: spacing.md }]}>
                  {title ? (
                    <Text variant="h3" style={styles.title}>
                      {title}
                    </Text>
                  ) : (
                    <View />
                  )}
                  <IconButton
                    onPress={onClose}
                    size={32}
                    backgroundColor={colors.surfaceMuted}
                    icon={
                      <Text variant="caption" color="textSecondary" style={{ fontWeight: 'bold' }}>
                        ✕
                      </Text>
                    }
                  />
                </View>
              )}

              {/* Content area */}
              {scrollable ? (
                <ScrollView
                  style={{ paddingHorizontal: spacing.base }}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={{ flex: 1, paddingHorizontal: spacing.base }}>
                  {children}
                </View>
              )}
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    minHeight: 150,
  },
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  title: {
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
  },
});
