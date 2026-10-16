import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Switch, Modal } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Ionicons } from '@expo/vector-icons';
import type { CalendarEvent } from '../../services/calendarPlannerService';

interface ChurchMeetingPlannerProps {
  date: string;
  formattedDate: string;
  events: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

const MEETING_PRESETS = [
  '⛪ Sunday Worship Service',
  '🙏 Church Prayer Meeting',
  '📖 Weekly Bible Study',
  '🔥 Youth Fellowship',
  '🎶 Choir / Worship Practice',
  '🤝 Cell Group / Cottage Meeting',
];

export function ChurchMeetingPlanner({
  date,
  formattedDate,
  events,
  onAddEvent,
  onDeleteEvent,
}: ChurchMeetingPlannerProps) {
  const { colors, spacing, borderRadius } = useTheme();

  // Modal form state
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00 AM');
  const [location, setLocation] = useState('Church Sanctuary');
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState(true);

  const handleOpenAdd = (presetTitle?: string) => {
    if (presetTitle) {
      setTitle(presetTitle);
    } else {
      setTitle('');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    await onAddEvent({
      date,
      title: title.trim(),
      eventTime: time.trim(),
      location: location.trim(),
      notes: notes.trim(),
      reminderEnabled: reminder,
    });
    setModalVisible(false);
    setTitle('');
    setNotes('');
  };

  return (
    <Card style={styles.container} bordered>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text variant="h3" style={{ fontWeight: '700' }}>
            Church Meetings & Plans
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleOpenAdd()}>
          <Ionicons name="add-circle" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Text variant="caption" color="textTertiary" style={{ marginBottom: spacing.sm }}>
        Scheduled for {formattedDate}
      </Text>

      {/* Empty State / Suggestions */}
      {events.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginBottom: 8 }}>
            No meetings scheduled for this day yet.
          </Text>
          <View style={styles.presetsWrap}>
            {MEETING_PRESETS.slice(0, 4).map((p, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleOpenAdd(p)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Text variant="caption" color="primary">
                  + {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ gap: spacing.sm, marginVertical: spacing.xs }}>
          {events.map((event) => (
            <View
              key={event.id}
              style={[
                styles.eventCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                },
              ]}
            >
              <View style={styles.eventTop}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontWeight: '700' }}>
                    {event.title}
                  </Text>
                  {event.eventTime && (
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={14} color="#E5A93C" />
                      <Text variant="caption" style={{ color: '#E5A93C', fontWeight: 'bold' }}>
                        {event.eventTime}
                      </Text>
                    </View>
                  )}
                  {event.location && (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text variant="caption" color="textSecondary">
                        {event.location}
                      </Text>
                    </View>
                  )}
                  {event.notes && (
                    <Text variant="caption" color="textTertiary" style={{ marginTop: 4 }}>
                      {event.notes}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => onDeleteEvent(event.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              {event.reminderEnabled && (
                <View style={[styles.reminderPill, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="notifications-outline" size={12} color={colors.primary} />
                  <Text variant="caption" color="primary" style={{ fontSize: 11 }}>
                    Reminder set
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Schedule Meeting Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text variant="h2">Schedule Church Meeting</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text variant="caption" color="textSecondary" style={{ marginBottom: spacing.md }}>
              Set for {formattedDate}
            </Text>

            {/* Presets */}
            <View style={[styles.presetsWrap, { marginBottom: spacing.md }]}>
              {MEETING_PRESETS.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setTitle(p)}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: title === p ? colors.primary : colors.surface,
                      borderColor: colors.border,
                      borderRadius: borderRadius.full,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    color={title === p ? 'inverse' : 'textPrimary'}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <Text variant="bodySmall" style={{ fontWeight: 'bold', marginBottom: 4 }}>
              Meeting Title
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  borderRadius: borderRadius.md,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Sunday Morning Worship"
              placeholderTextColor={colors.textTertiary}
            />

            {/* Time & Location */}
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  Time
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                  value={time}
                  onChangeText={setTime}
                  placeholder="10:00 AM"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  Location / Venue
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Sanctuary / Room"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            {/* Notes */}
            <Text variant="bodySmall" style={{ fontWeight: 'bold', marginBottom: 4 }}>
              Notes / Agenda
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  borderRadius: borderRadius.md,
                  height: 60,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Bring hymn book, fast and pray..."
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            {/* Reminder Toggle */}
            <View style={styles.switchRow}>
              <View>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  Notification Reminder
                </Text>
                <Text variant="caption" color="textSecondary">
                  Notify me before meeting starts
                </Text>
              </View>
              <Switch
                value={reminder}
                onValueChange={setReminder}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
              />
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                onPress={() => setModalVisible(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                label="Save Meeting"
                onPress={handleSave}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyWrap: {
    paddingVertical: 10,
  },
  presetsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  eventCard: {
    borderWidth: 1,
  },
  eventTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  reminderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 8,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
});
