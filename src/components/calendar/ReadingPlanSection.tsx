import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Switch, TextInput, ScrollView } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Ionicons } from '@expo/vector-icons';
import {
  READING_PLAN_DEFINITIONS,
  PlanType,
  ReadingPlan,
  ReadingPlanDay,
} from '../../services/readingPlanService';

interface ReadingPlanSectionProps {
  plan: ReadingPlan | null;
  todayReading: ReadingPlanDay | null;
  onStartPlan: (
    type: PlanType,
    reminderTime: string,
    reminderEnabled: boolean,
    customConfig?: {
      title?: string;
      durationDays?: number;
      scope?: 'whole' | 'nt' | 'ot' | 'gospels' | 'wisdom';
      startDate?: string;
    }
  ) => Promise<void>;
  onCompleteDay: (dayNumber: number) => Promise<void>;
  onCancelPlan: () => void | Promise<void>;
  onUpdateReminder: (enabled: boolean, time: string) => Promise<void>;
  onNavigateToReading: (bookNumber: number, chapter: number) => void;
}

const REMINDER_TIMES = ['06:00', '07:00', '08:00', '09:00', '19:00', '20:00', '21:00'];

const SCOPE_OPTIONS: { id: 'whole' | 'nt' | 'ot' | 'gospels' | 'wisdom'; label: string }[] = [
  { id: 'whole', label: '📖 Complete Bible (66 Books)' },
  { id: 'nt', label: '✝️ New Testament (27 Books)' },
  { id: 'ot', label: '📜 Old Testament (39 Books)' },
  { id: 'gospels', label: '🕊️ Gospels & Acts' },
  { id: 'wisdom', label: '💎 Psalms & Wisdom' },
];

export function ReadingPlanSection({
  plan,
  todayReading,
  onStartPlan,
  onCompleteDay,
  onCancelPlan,
  onUpdateReminder,
  onNavigateToReading,
}: ReadingPlanSectionProps) {
  const { colors, spacing, borderRadius } = useTheme();

  // Selector modal state
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState<PlanType>('1_year');
  const [reminderTime, setReminderTime] = useState('08:00');
  const [reminderEnabled, setReminderEnabled] = useState(true);

  // Custom Plan Generator State
  const [customTitle, setCustomTitle] = useState('My Bible Plan');
  const [customDaysStr, setCustomDaysStr] = useState('90');
  const [customScope, setCustomScope] = useState<'whole' | 'nt' | 'ot' | 'gospels' | 'wisdom'>('whole');

  const handleStart = async () => {
    let customConfig;
    if (selectedPlanType === 'custom') {
      const parsedDays = parseInt(customDaysStr, 10) || 30;
      customConfig = {
        title: customTitle.trim() || 'Custom Reading Planner',
        durationDays: parsedDays,
        scope: customScope,
      };
    }
    await onStartPlan(selectedPlanType, reminderTime, reminderEnabled, customConfig);
    setSelectorVisible(false);
  };

  const planTypes: PlanType[] = [
    '1_year',
    '6_months',
    'csb_90',
    'navigators_4track',
    '3_months',
    '2_months',
    'custom',
  ];

  return (
    <View style={styles.container}>
      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
          <Text variant="h2" style={{ fontWeight: '700' }}>
            Bible Reading Planner
          </Text>
        </View>
        {plan && (
          <TouchableOpacity onPress={onCancelPlan}>
            <Text variant="caption" color="textTertiary">
              Switch Planner
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* No active plan: prompt user to choose one */}
      {!plan ? (
        <Card style={styles.noPlanCard} bordered>
          <Text variant="h3" style={{ fontWeight: '700', marginBottom: 4 }}>
            Start a Reading Planner Journey
          </Text>
          <Text variant="bodySmall" color="textSecondary" style={{ marginBottom: spacing.md }}>
            Stay disciplined with structured plans (including Navigators & CSB 90-Day) or build a custom plan with daily notifications.
          </Text>

          <View style={{ gap: spacing.sm }}>
            {planTypes.map((type) => {
              const def = READING_PLAN_DEFINITIONS[type];
              return (
                <TouchableOpacity
                  key={type}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedPlanType(type);
                    setSelectorVisible(true);
                  }}
                  style={[
                    styles.planOptionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: type === 'custom' ? colors.primary : colors.border,
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.planBadgeRow}>
                      <Text variant="h3" style={{ fontWeight: '700', color: colors.primary }}>
                        {def.title}
                      </Text>
                      <View style={[styles.durationBadge, { backgroundColor: colors.surfaceElevated }]}>
                        <Text variant="caption" color="primary" style={{ fontWeight: 'bold' }}>
                          {def.durationDays} Days
                        </Text>
                      </View>
                    </View>
                    <Text variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>
                      {def.description}
                    </Text>
                    <View style={styles.metaBadgeRow}>
                      <Text variant="caption" color="textTertiary">
                        Scope: {def.scope}
                      </Text>
                      <Text variant="caption" color="gold" style={{ fontWeight: '600' }}>
                        {def.dailyPace}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      ) : (
        /* Active Plan Progress Card */
        <Card style={styles.activePlanCard} bordered>
          {/* Header */}
          <View style={styles.activePlanHeader}>
            <View>
              <Text variant="h3" style={{ fontWeight: '700', color: colors.primary }}>
                {plan.title}
              </Text>
              <Text variant="caption" color="textSecondary">
                Day {plan.currentDay} of {plan.durationDays} • {plan.completedDaysCount} days completed
              </Text>
            </View>
            <View style={[styles.percentBadge, { backgroundColor: colors.primary }]}>
              <Text variant="caption" color="inverse" style={{ fontWeight: 'bold' }}>
                {plan.progressPercentage}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceElevated }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.max(4, Math.min(100, plan.progressPercentage))}%`,
                },
              ]}
            />
          </View>

          {/* Today's Reading Target */}
          {todayReading && (
            <View
              style={[
                styles.todayReadingBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <View style={styles.todayHeader}>
                  <Ionicons name="book" size={18} color={colors.primary} />
                  <Text variant="bodySmall" color="primary" style={{ fontWeight: 'bold' }}>
                    TODAY'S SCRIPTURE READING:
                  </Text>
                </View>

                {/* Status Badge: Pending vs Completed */}
                <View
                  style={[
                    styles.statusBadge,
                    todayReading.isCompleted
                      ? { backgroundColor: '#4E9F3D20', borderColor: '#4E9F3D' }
                      : { backgroundColor: '#E5A93C20', borderColor: '#E5A93C' },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: todayReading.isCompleted ? '#4E9F3D' : '#E5A93C',
                      fontWeight: 'bold',
                      fontSize: 11,
                    }}
                  >
                    {todayReading.isCompleted ? '✓ Completed' : '⏳ Pending'}
                  </Text>
                </View>
              </View>

              <Text variant="h2" style={{ fontWeight: '700', marginVertical: 4 }}>
                {todayReading.readingLabel || `${todayReading.bookName} ${todayReading.startChapter === todayReading.endChapter ? todayReading.startChapter : `${todayReading.startChapter} - ${todayReading.endChapter}`}`}
              </Text>

              <View style={styles.actionRow}>
                <Button
                  label="Read Now 📖"
                  onPress={() =>
                    onNavigateToReading(todayReading.bookNumber, todayReading.startChapter)
                  }
                  variant="primary"
                  style={{ flex: 1 }}
                />

                <Button
                  label={todayReading.isCompleted ? 'Completed ✓' : 'Mark Done ✓'}
                  onPress={() => onCompleteDay(todayReading.dayNumber)}
                  variant={todayReading.isCompleted ? 'secondary' : 'outline'}
                  disabled={todayReading.isCompleted}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          {/* Reminder Setting */}
          <View style={[styles.reminderBar, { borderTopColor: colors.border }]}>
            <View style={styles.reminderInfo}>
              <Ionicons
                name={plan.reminderEnabled ? 'notifications' : 'notifications-off-outline'}
                size={16}
                color={plan.reminderEnabled ? colors.primary : colors.textTertiary}
              />
              <Text variant="caption" color="textSecondary">
                Daily reminder at {plan.reminderTime} (notifies if pending)
              </Text>
            </View>
            <Switch
              value={plan.reminderEnabled}
              onValueChange={(val) => onUpdateReminder(val, plan.reminderTime)}
              trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
            />
          </View>
        </Card>
      )}

      {/* Start Plan Configuration Modal */}
      <Modal
        visible={selectorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text variant="h2">Configure Reading Planner</Text>
              <TouchableOpacity onPress={() => setSelectorVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text variant="h3" color="primary" style={{ marginTop: 8, fontWeight: '700' }}>
              {READING_PLAN_DEFINITIONS[selectedPlanType]?.title}
            </Text>
            <Text variant="bodySmall" color="textSecondary" style={{ marginBottom: spacing.sm }}>
              {READING_PLAN_DEFINITIONS[selectedPlanType]?.description}
            </Text>

            {/* Custom Generator Form */}
            {selectedPlanType === 'custom' && (
              <View style={[styles.customForm, { borderColor: colors.border, backgroundColor: colors.surface + '60' }]}>
                <Text variant="bodySmall" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  Planner Name:
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder="e.g. My 40-Day Gospel Journey"
                  placeholderTextColor={colors.textTertiary}
                />

                <Text variant="bodySmall" style={{ fontWeight: 'bold', marginTop: 8, marginBottom: 4 }}>
                  Total Duration (Days):
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  value={customDaysStr}
                  onChangeText={setCustomDaysStr}
                  keyboardType="numeric"
                  placeholder="e.g. 30, 45, 90, 180"
                  placeholderTextColor={colors.textTertiary}
                />

                <Text variant="bodySmall" style={{ fontWeight: 'bold', marginTop: 8, marginBottom: 4 }}>
                  Scripture Scope:
                </Text>
                <View style={{ gap: 4 }}>
                  {SCOPE_OPTIONS.map((sc) => (
                    <TouchableOpacity
                      key={sc.id}
                      onPress={() => setCustomScope(sc.id)}
                      style={[
                        styles.scopeOption,
                        {
                          backgroundColor: customScope === sc.id ? colors.primary + '20' : colors.surface,
                          borderColor: customScope === sc.id ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={customScope === sc.id ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={customScope === sc.id ? colors.primary : colors.textTertiary}
                      />
                      <Text
                        variant="caption"
                        style={{ fontWeight: customScope === sc.id ? 'bold' : 'normal' }}
                        color={customScope === sc.id ? 'primary' : 'textPrimary'}
                      >
                        {sc.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Notification Reminder Switch */}
            <View style={styles.modalSwitchRow}>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  Daily Scripture Reminder
                </Text>
                <Text variant="caption" color="textSecondary">
                  Sends notification with today's reading status (Pending/Done)
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
              />
            </View>

            {/* Reminder Time Picker */}
            {reminderEnabled && (
              <View style={{ marginVertical: spacing.sm }}>
                <Text variant="bodySmall" style={{ fontWeight: 'bold', marginBottom: 8 }}>
                  Notification Time:
                </Text>
                <View style={styles.timePillsWrap}>
                  {REMINDER_TIMES.map((timeStr) => {
                    const isSelected = reminderTime === timeStr;
                    return (
                      <TouchableOpacity
                        key={timeStr}
                        onPress={() => setReminderTime(timeStr)}
                        style={[
                          styles.timePill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                            borderColor: colors.border,
                            borderRadius: borderRadius.md,
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          style={{ fontWeight: 'bold' }}
                          color={isSelected ? 'inverse' : 'textPrimary'}
                        >
                          {timeStr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                onPress={() => setSelectorVisible(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                label="Start Plan"
                onPress={handleStart}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noPlanCard: {
    padding: 16,
  },
  planOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  planBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 8,
  },
  durationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingRight: 8,
  },
  activePlanCard: {
    padding: 16,
  },
  activePlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  todayReadingBox: {
    borderWidth: 1,
    marginBottom: 12,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  reminderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderWidth: 1,
    padding: 20,
    borderRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customForm: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  scopeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  timePillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});
