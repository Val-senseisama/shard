import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from '~/components/AnimatedPressable';
import TaskCheck, { TaskTitle } from '~/components/TaskCheck';
import { t, getCardShadow } from './constants';

interface ScheduleTaskCardProps {
  task: any;
  color: string;
  isDark: boolean;
  // Takes the task as argument so the parent can pass a single stable callback
  onToggle: (task: any) => void;
}

const formatDate = (dateStr: string) => {
  try {
    return new Date(parseInt(dateStr) || dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

export const ScheduleTaskCard = memo(({ task, color, isDark, onToggle }: ScheduleTaskCardProps) => {
  const theme = t(isDark);
  const shadow = getCardShadow(isDark);
  return (
    <View style={{ backgroundColor: theme.card, borderRadius: 16, overflow: 'hidden', ...(shadow as any) }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 4, backgroundColor: color, borderRadius: 2 }} />
        <View style={{ flex: 1, padding: 16 }}>
          {task.miniGoalTitle && (
            <Text style={{ fontSize: 12, fontWeight: '600', color, marginBottom: 4 }}>
              {task.miniGoalTitle}
            </Text>
          )}
          {task.dueDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
              <View
                style={{
                  backgroundColor: `${color}15`,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color }}>
                  {formatDate(task.dueDate)}
                </Text>
              </View>
            </View>
          )}
          <AnimatedPressable
            onPress={() => onToggle(task)}
            scaleDown={0.98}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!task.completed }}
            accessibilityLabel={task.title}
            accessibilityHint={task.completed ? undefined : 'Double tap to mark complete'}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TaskCheck done={!!task.completed} isDark={isDark} tint={color} />
            <View style={{ flex: 1 }}>
              <TaskTitle done={!!task.completed} isDark={isDark} size={14}>
                {task.title}
              </TaskTitle>
            </View>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
});
