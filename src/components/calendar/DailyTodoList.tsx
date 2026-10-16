import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Ionicons } from '@expo/vector-icons';
import type { CalendarTodo } from '../../services/calendarPlannerService';

interface DailyTodoListProps {
  date: string;
  formattedDate: string;
  todos: CalendarTodo[];
  onAddTodo: (title: string) => Promise<void>;
  onToggleTodo: (id: string, completed: boolean) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
}

const PRESET_TASKS = [
  '🙏 Morning Prayer',
  '📖 Read 3 Chapters',
  '🕊️ Family Devotion',
  '✝️ Fast until Noon',
  '📝 Memorize Scripture',
  '🤝 Visit Sick / Fellowship',
];

export function DailyTodoList({
  date,
  formattedDate,
  todos,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}: DailyTodoListProps) {
  const { colors, spacing, borderRadius } = useTheme();
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (titleToAdd?: string) => {
    const text = (titleToAdd || newTitle).trim();
    if (!text) return;
    await onAddTodo(text);
    setNewTitle('');
    setIsAdding(false);
  };

  const completedCount = todos.filter((t) => t.isCompleted).length;

  return (
    <Card style={styles.container} bordered>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="checkbox-outline" size={20} color={colors.primary} />
          <Text variant="h3" style={{ fontWeight: '700' }}>
            Daily To-Do List
          </Text>
        </View>
        <Text variant="caption" color="textSecondary">
          {completedCount}/{todos.length} done
        </Text>
      </View>

      <Text variant="caption" color="textTertiary" style={{ marginBottom: spacing.sm }}>
        Tasks for {formattedDate}
      </Text>

      {/* Preset Quick Chips */}
      {todos.length === 0 && !isAdding && (
        <View style={styles.presetsWrap}>
          <Text variant="caption" color="textSecondary" style={{ width: '100%', marginBottom: 4 }}>
            Quick suggestions:
          </Text>
          {PRESET_TASKS.map((preset, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleAdd(preset)}
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
                + {preset}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* List of Tasks */}
      <View style={{ gap: spacing.xs, marginVertical: spacing.xs }}>
        {todos.map((item) => (
          <View
            key={item.id}
            style={[
              styles.todoItem,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onToggleTodo(item.id, !item.isCompleted)}
              style={styles.checkboxTouch}
            >
              <Ionicons
                name={item.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={item.isCompleted ? '#4E9F3D' : colors.textTertiary}
              />
              <Text
                variant="body"
                style={[
                  styles.todoText,
                  item.isCompleted && {
                    textDecorationLine: 'line-through',
                    color: colors.textTertiary,
                  },
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={[
                  styles.statusBadge,
                  item.isCompleted
                    ? { backgroundColor: '#4E9F3D20', borderColor: '#4E9F3D' }
                    : { backgroundColor: '#E5A93C20', borderColor: '#E5A93C' },
                ]}
              >
                <Text
                  variant="caption"
                  style={{
                    color: item.isCompleted ? '#4E9F3D' : '#E5A93C',
                    fontWeight: 'bold',
                    fontSize: 10,
                  }}
                >
                  {item.isCompleted ? 'Done ✓' : 'Pending ⏳'}
                </Text>
              </View>

              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => onDeleteTodo(item.id)}
              >
                <Ionicons name="trash-outline" size={17} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Add New Task Form / Button */}
      {isAdding ? (
        <View style={[styles.inputRow, { marginTop: spacing.sm }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.textPrimary,
                borderRadius: borderRadius.md,
                paddingHorizontal: spacing.md,
              },
            ]}
            placeholder="e.g. Read Psalm 91, Call prayer partner"
            placeholderTextColor={colors.textTertiary}
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
            onSubmitEditing={() => handleAdd()}
          />
          <Button label="Add" onPress={() => handleAdd()} variant="primary" />
          <TouchableOpacity onPress={() => setIsAdding(false)} style={{ padding: 4 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setIsAdding(true)}
          style={[
            styles.addBtn,
            {
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface + '60',
              marginTop: spacing.sm,
            },
          ]}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
            Add Daily Task
          </Text>
        </TouchableOpacity>
      )}
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
  presetsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  presetChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  checkboxTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  todoText: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 42,
    borderWidth: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
});
