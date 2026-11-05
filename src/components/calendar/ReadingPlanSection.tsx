import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  TextInput,
  ScrollView,
  FlatList,
} from 'react-native';
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
  getSchedulePreview,
  getAllPlanDays,
} from '../../services/readingPlanService';

interface ReadingPlanSectionProps {
  plan: ReadingPlan | null;
  todayReading: ReadingPlanDay | null;
  nextReading?: ReadingPlanDay | null;
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

const SCOPE_OPTIONS: { id: 'whole' | 'nt' | 'ot' | 'gospels' | 'wisdom'; label: string }[] = [
  { id: 'whole', label: '📖 Complete Bible (66 Books)' },
  { id: 'nt', label: '✝️ New Testament (27 Books)' },
  { id: 'ot', label: '📜 Old Testament (39 Books)' },
  { id: 'gospels', label: '🕊️ Gospels & Acts' },
  { id: 'wisdom', label: '💎 Psalms & Wisdom' },
];

/** Convert 24-hour "HH:mm" string to formatted 12-hour AM/PM string */
function formatTo12Hour(time24: string): string {
  if (!time24) return '08:00 AM';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr || '8', 10);
  let m = parseInt(mStr || '0', 10);
  if (isNaN(h)) h = 8;
  if (isNaN(m)) m = 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  const displayM = m.toString().padStart(2, '0');
  return `${displayH}:${displayM} ${period}`;
}

/**
 * Custom Time Selector Component
 * Allows user to set ANY hour and minute (with steppers, AM/PM, and quick presets)
 */
function CustomTimeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (time24: string) => void;
}) {
  const { colors, spacing, borderRadius } = useTheme();

  const [hStr, mStr] = (value || '08:00').split(':');
  let rawH = parseInt(hStr || '8', 10);
  let rawM = parseInt(mStr || '0', 10);
  if (isNaN(rawH)) rawH = 8;
  if (isNaN(rawM)) rawM = 0;

  const isPM = rawH >= 12;
  const hour12 = rawH % 12 || 12;
  const minute = rawM;

  const updateTime = (h12: number, m: number, pm: boolean) => {
    let finalH = h12;
    if (pm && finalH < 12) finalH += 12;
    if (!pm && finalH === 12) finalH = 0;
    const time24 = `${finalH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    onChange(time24);
  };

  const handleHourStep = (delta: number) => {
    let newH = hour12 + delta;
    if (newH < 1) newH = 12;
    if (newH > 12) newH = 1;
    updateTime(newH, minute, isPM);
  };

  const handleMinuteStep = (delta: number) => {
    let newM = minute + delta;
    if (newM < 0) newM = 55;
    if (newM >= 60) newM = 0;
    updateTime(hour12, newM, isPM);
  };

  const togglePeriod = (targetPM: boolean) => {
    if (targetPM !== isPM) {
      updateTime(hour12, minute, targetPM);
    }
  };

  const presets = [
    { label: '06:00 AM', time24: '06:00' },
    { label: '07:30 AM', time24: '07:30' },
    { label: '08:00 AM', time24: '08:00' },
    { label: '12:00 PM', time24: '12:00' },
    { label: '08:00 PM', time24: '20:00' },
    { label: '09:30 PM', time24: '21:30' },
  ];

  return (
    <View style={styles.timeSelectorWrap}>
      {/* Visual Clock Stepper Box */}
      <View
        style={[
          styles.timeStepperBox,
          { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md },
        ]}
      >
        {/* Hour Control */}
        <View style={styles.timeUnitCol}>
          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => handleHourStep(1)}
          >
            <Ionicons name="chevron-up" size={18} color={colors.primary} />
          </TouchableOpacity>
          <Text variant="h1" style={{ fontWeight: '700', minWidth: 44, textAlign: 'center' }}>
            {hour12.toString().padStart(2, '0')}
          </Text>
          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => handleHourStep(-1)}
          >
            <Ionicons name="chevron-down" size={18} color={colors.primary} />
          </TouchableOpacity>
          <Text variant="caption" color="textTertiary" style={{ marginTop: 2, fontSize: 10 }}>
            HOUR
          </Text>
        </View>

        <Text variant="h1" style={{ fontWeight: '700', marginBottom: 14 }}>
          :
        </Text>

        {/* Minute Control */}
        <View style={styles.timeUnitCol}>
          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => handleMinuteStep(5)}
          >
            <Ionicons name="chevron-up" size={18} color={colors.primary} />
          </TouchableOpacity>
          <Text variant="h1" style={{ fontWeight: '700', minWidth: 44, textAlign: 'center' }}>
            {minute.toString().padStart(2, '0')}
          </Text>
          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => handleMinuteStep(-5)}
          >
            <Ionicons name="chevron-down" size={18} color={colors.primary} />
          </TouchableOpacity>
          <Text variant="caption" color="textTertiary" style={{ marginTop: 2, fontSize: 10 }}>
            MIN
          </Text>
        </View>

        {/* AM / PM Toggle */}
        <View style={styles.ampmCol}>
          <TouchableOpacity
            style={[
              styles.ampmBtn,
              !isPM ? { backgroundColor: colors.primary } : { backgroundColor: colors.surfaceElevated },
            ]}
            onPress={() => togglePeriod(false)}
          >
            <Text
              variant="caption"
              style={{ fontWeight: 'bold' }}
              color={!isPM ? 'inverse' : 'textPrimary'}
            >
              AM
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.ampmBtn,
              isPM ? { backgroundColor: colors.primary } : { backgroundColor: colors.surfaceElevated },
            ]}
            onPress={() => togglePeriod(true)}
          >
            <Text
              variant="caption"
              style={{ fontWeight: 'bold' }}
              color={isPM ? 'inverse' : 'textPrimary'}
            >
              PM
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Select Presets */}
      <View style={styles.presetChipsRow}>
        {presets.map((p) => {
          const isSelected = value === p.time24;
          return (
            <TouchableOpacity
              key={p.time24}
              onPress={() => onChange(p.time24)}
              style={[
                styles.presetChip,
                {
                  backgroundColor: isSelected ? colors.primary + '25' : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{ fontSize: 11, fontWeight: isSelected ? '700' : '500' }}
                color={isSelected ? 'primary' : 'textSecondary'}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function ReadingPlanSection({
  plan,
  todayReading,
  nextReading,
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

  // Edit Time Modal for active plan
  const [editTimeModalVisible, setEditTimeModalVisible] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState(plan?.reminderTime || '08:00');

  // Full Schedule Explorer Modal
  const [scheduleExplorerVisible, setScheduleExplorerVisible] = useState(false);
  const [allDays, setAllDays] = useState<ReadingPlanDay[]>([]);
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchDayText, setSearchDayText] = useState('');

  // Custom Plan Generator State
  const [customTitle, setCustomTitle] = useState('My Bible Plan');
  const [customDaysStr, setCustomDaysStr] = useState('90');
  const [customScope, setCustomScope] = useState<'whole' | 'nt' | 'ot' | 'gospels' | 'wisdom'>('whole');

  // Load all days when schedule explorer opens
  const handleOpenScheduleExplorer = async () => {
    if (!plan) return;
    const days = await getAllPlanDays(plan.id);
    setAllDays(days);
    setScheduleExplorerVisible(true);
  };

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

  const handleSaveActiveReminderTime = async () => {
    if (!plan) return;
    await onUpdateReminder(plan.reminderEnabled, editTimeValue);
    setEditTimeModalVisible(false);
  };

  const planTypes: PlanType[] = [
    '1_year',
    'navigators_4track',
    'csb_90',
    '6_months',
    '3_months',
    '2_months',
    'custom',
  ];

  // Schedule preview for currently selected plan type in modal
  const previewSchedule = getSchedulePreview(
    selectedPlanType,
    5,
    selectedPlanType === 'custom' ? parseInt(customDaysStr, 10) || 30 : undefined,
    selectedPlanType === 'custom' ? customScope : undefined
  );

  // Filtered days in Schedule Explorer
  const filteredDays = allDays.filter((d) => {
    if (scheduleFilter === 'pending' && d.isCompleted) return false;
    if (scheduleFilter === 'completed' && !d.isCompleted) return false;
    if (searchDayText.trim()) {
      const q = searchDayText.trim().toLowerCase();
      const matchesDay = d.dayNumber.toString().includes(q);
      const matchesLabel = (d.readingLabel || '').toLowerCase().includes(q);
      return matchesDay || matchesLabel;
    }
    return true;
  });

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
            Stay disciplined with structured plans (Navigators 4-Track, CSB 90-Day, 1 Year) or build a custom plan with daily notifications.
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

          {/* TODAY'S READING SECTION */}
          {todayReading && (
            <View
              style={[
                styles.todayReadingBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: todayReading.isCompleted ? '#4E9F3D50' : colors.border,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <View style={styles.todayHeader}>
                  <Ionicons
                    name={todayReading.isCompleted ? 'checkmark-circle' : 'book'}
                    size={18}
                    color={todayReading.isCompleted ? '#4E9F3D' : colors.primary}
                  />
                  <Text
                    variant="bodySmall"
                    style={{
                      fontWeight: 'bold',
                      color: todayReading.isCompleted ? '#4E9F3D' : colors.primary,
                    }}
                  >
                    {todayReading.isCompleted
                      ? `DAY ${todayReading.dayNumber}: COMPLETED ✓`
                      : `TODAY'S READING • DAY ${todayReading.dayNumber}`}
                  </Text>
                </View>

                {/* Status Badge */}
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
                {todayReading.readingLabel || `${todayReading.bookName} ${todayReading.startChapter}`}
              </Text>

              {/* Actions for Today */}
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
                  label={todayReading.isCompleted ? 'Done ✓' : 'Mark Done ✓'}
                  onPress={() => onCompleteDay(todayReading.dayNumber)}
                  variant={todayReading.isCompleted ? 'secondary' : 'outline'}
                  disabled={todayReading.isCompleted}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          {/* If today is completed, show Next Upcoming Reading */}
          {todayReading?.isCompleted && nextReading && nextReading.dayNumber !== todayReading.dayNumber && (
            <View
              style={[
                styles.nextReadingBox,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  marginBottom: 12,
                },
              ]}
            >
              <View style={styles.todayHeader}>
                <Ionicons name="arrow-forward-circle" size={18} color={colors.primary} />
                <Text variant="bodySmall" color="primary" style={{ fontWeight: 'bold' }}>
                  UP NEXT • DAY {nextReading.dayNumber}:
                </Text>
              </View>

              <Text variant="h3" style={{ fontWeight: '700', marginVertical: 4 }}>
                {nextReading.readingLabel}
              </Text>

              <View style={styles.actionRow}>
                <Button
                  label="Read Ahead 📖"
                  onPress={() =>
                    onNavigateToReading(nextReading.bookNumber, nextReading.startChapter)
                  }
                  variant="primary"
                  style={{ flex: 1 }}
                />
                <Button
                  label="Mark Done ✓"
                  onPress={() => onCompleteDay(nextReading.dayNumber)}
                  variant="outline"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          {/* Schedule Explorer Button */}
          <TouchableOpacity
            style={[
              styles.explorerBtn,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            ]}
            onPress={handleOpenScheduleExplorer}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text variant="bodySmall" style={{ fontWeight: '600', flex: 1 }} color="textPrimary">
              View Full Schedule ({plan.durationDays} Days)
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Reminder Setting & Edit Time Button */}
          <View style={[styles.reminderBar, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={styles.reminderInfo}
              activeOpacity={0.7}
              onPress={() => {
                setEditTimeValue(plan.reminderTime || '08:00');
                setEditTimeModalVisible(true);
              }}
            >
              <Ionicons
                name={plan.reminderEnabled ? 'notifications' : 'notifications-off-outline'}
                size={18}
                color={plan.reminderEnabled ? colors.primary : colors.textTertiary}
              />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text variant="caption" color="textPrimary" style={{ fontWeight: '700' }}>
                    Daily Reminder: {formatTo12Hour(plan.reminderTime)}
                  </Text>
                  <Ionicons name="pencil" size={12} color={colors.primary} />
                </View>
                <Text variant="caption" color="textTertiary" style={{ fontSize: 10 }}>
                  Tap to customize notification time
                </Text>
              </View>
            </TouchableOpacity>
            <Switch
              value={plan.reminderEnabled}
              onValueChange={(val) => onUpdateReminder(val, plan.reminderTime)}
              trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
            />
          </View>
        </Card>
      )}

      {/* MODAL 1: Start Plan Configuration Modal */}
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

            {/* Curriculum Preview (First 5 Days) */}
            <View
              style={[
                styles.previewContainer,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <View style={styles.previewHeader}>
                <Ionicons name="list-outline" size={15} color={colors.primary} />
                <Text variant="caption" color="primary" style={{ fontWeight: '700' }}>
                  CURRICULUM PREVIEW (FIRST 5 DAYS):
                </Text>
              </View>
              {previewSchedule.map((p) => (
                <View key={p.dayNumber} style={styles.previewRow}>
                  <Text variant="caption" style={{ fontWeight: '700', width: 48 }} color="textSecondary">
                    Day {p.dayNumber}:
                  </Text>
                  <Text variant="caption" color="textPrimary" style={{ flex: 1, fontWeight: '600' }}>
                    {p.readingLabel}
                  </Text>
                </View>
              ))}
            </View>

            {/* Custom Generator Form */}
            {selectedPlanType === 'custom' && (
              <View
                style={[
                  styles.customForm,
                  { borderColor: colors.border, backgroundColor: colors.surface + '60' },
                ]}
              >
                <Text variant="bodySmall" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  Planner Name:
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder="e.g. My 40-Day Gospel Journey"
                  placeholderTextColor={colors.textTertiary}
                />

                <Text variant="bodySmall" style={{ fontWeight: 'bold', marginTop: 8, marginBottom: 4 }}>
                  Total Duration (Days):
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
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
                          backgroundColor:
                            customScope === sc.id ? colors.primary + '20' : colors.surface,
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
                  Delivers daily notification with current day's reading
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
              />
            </View>

            {/* Custom Notification Time Picker */}
            {reminderEnabled && (
              <View style={{ marginVertical: spacing.sm }}>
                <Text variant="bodySmall" style={{ fontWeight: 'bold', marginBottom: 6 }}>
                  Choose Notification Time:
                </Text>
                <CustomTimeSelector value={reminderTime} onChange={setReminderTime} />
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

      {/* MODAL 2: Change Reminder Time for Active Plan */}
      <Modal
        visible={editTimeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.editTimeModalContent,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text variant="h3" style={{ fontWeight: '700' }}>
                Set Notification Time
              </Text>
              <TouchableOpacity onPress={() => setEditTimeModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text variant="caption" color="textSecondary" style={{ marginVertical: 6 }}>
              Select the exact time of day when you want your daily Bible reading reminder to fire.
            </Text>

            <CustomTimeSelector value={editTimeValue} onChange={setEditTimeValue} />

            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                onPress={() => setEditTimeModalVisible(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                label="Save Time"
                onPress={handleSaveActiveReminderTime}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Full Schedule Explorer */}
      <Modal
        visible={scheduleExplorerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setScheduleExplorerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.explorerModalContent,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text variant="h2">{plan?.title || 'Reading Plan'}</Text>
                <Text variant="caption" color="textSecondary">
                  Full Schedule • {allDays.length} Days
                </Text>
              </View>
              <TouchableOpacity onPress={() => setScheduleExplorerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Filter Tabs & Search */}
            <View style={styles.filterBar}>
              <View style={styles.filterTabs}>
                {(['all', 'pending', 'completed'] as const).map((tab) => {
                  const isSelected = scheduleFilter === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setScheduleFilter(tab)}
                      style={[
                        styles.filterTabBtn,
                        isSelected && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{ fontWeight: 'bold' }}
                        color={isSelected ? 'inverse' : 'textSecondary'}
                      >
                        {tab === 'all'
                          ? `All (${allDays.length})`
                          : tab === 'pending'
                          ? `Pending (${allDays.filter((d) => !d.isCompleted).length})`
                          : `Done (${allDays.filter((d) => d.isCompleted).length})`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={[
                  styles.searchDayInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={searchDayText}
                onChangeText={setSearchDayText}
                placeholder="Search day or book (e.g. 4, Matthew)..."
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            {/* Schedule List */}
            <FlatList
              data={filteredDays}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.scheduleItemCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: item.isCompleted ? '#4E9F3D50' : colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        variant="caption"
                        style={{
                          fontWeight: 'bold',
                          color: item.isCompleted ? '#4E9F3D' : colors.primary,
                        }}
                      >
                        Day {item.dayNumber}
                      </Text>
                      {item.scheduledDate && (
                        <Text variant="caption" color="textTertiary">
                          • {item.scheduledDate}
                        </Text>
                      )}
                    </View>
                    <Text variant="body" style={{ fontWeight: '600', marginTop: 2 }}>
                      {item.readingLabel}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.smallActionBtn, { backgroundColor: colors.primary + '20' }]}
                      onPress={() => {
                        setScheduleExplorerVisible(false);
                        onNavigateToReading(item.bookNumber, item.startChapter);
                      }}
                    >
                      <Ionicons name="book-outline" size={14} color={colors.primary} />
                      <Text variant="caption" color="primary" style={{ fontWeight: 'bold' }}>
                        Read
                      </Text>
                    </TouchableOpacity>

                    {!item.isCompleted ? (
                      <TouchableOpacity
                        style={[styles.smallActionBtn, { backgroundColor: colors.surfaceElevated }]}
                        onPress={async () => {
                          await onCompleteDay(item.dayNumber);
                          const updated = await getAllPlanDays(plan!.id);
                          setAllDays(updated);
                        }}
                      >
                        <Ionicons name="checkmark-outline" size={14} color={colors.textSecondary} />
                        <Text variant="caption" color="textSecondary" style={{ fontWeight: '600' }}>
                          Done
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.doneCheck}>
                        <Ionicons name="checkmark-circle" size={18} color="#4E9F3D" />
                      </View>
                    )}
                  </View>
                </View>
              )}
            />
          </View>
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
  nextReadingBox: {
    borderWidth: 1,
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
  explorerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
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
    gap: 8,
  },
  timeSelectorWrap: {
    gap: 8,
  },
  timeStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  timeUnitCol: {
    alignItems: 'center',
  },
  stepperBtn: {
    padding: 6,
    borderRadius: 6,
  },
  ampmCol: {
    gap: 6,
    marginLeft: 8,
  },
  ampmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  previewContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderWidth: 1,
    padding: 20,
    borderRadius: 16,
    maxHeight: '90%',
  },
  editTimeModalContent: {
    borderWidth: 1,
    padding: 20,
    borderRadius: 16,
  },
  explorerModalContent: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 16,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    marginVertical: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  filterBar: {
    gap: 8,
    marginVertical: 10,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  filterTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchDayInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  scheduleItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  doneCheck: {
    paddingHorizontal: 6,
  },
});
