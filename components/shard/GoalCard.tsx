import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { FONT, RADIUS } from '~/components/hud';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from '~/components/AnimatedPressable';
import { ACCENT, ACCENT_COLORS, t, getCardShadow } from './constants';

interface GoalCardProps {
  goal: any;
  idx: number;
  isDark: boolean;
  onComplete: (miniGoalId: string, taskIndex: number, completed: boolean) => void;
}

export const GoalCard = memo(({ goal, idx, isDark, onComplete }: GoalCardProps) => {
  const theme = t(isDark);
  const shadow = getCardShadow(isDark);
  const color = ACCENT_COLORS[idx % ACCENT_COLORS.length];
  const totalTasks = goal.tasks?.length || 0;
  const completedCount = goal.tasks?.filter((t: any) => t.completed).length || 0;
  const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <View style={{ backgroundColor: theme.card, borderRadius: RADIUS.md, padding: 16, ...(shadow as any) }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ flex: 1, fontSize: 15, fontFamily: FONT.bold, color: theme.text }}>
          {idx + 1}. {goal.title}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: FONT.bold, color }}>{pct}%</Text>
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.trackBg,
          marginBottom: 14,
          overflow: 'hidden',
        }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${pct}%` }} />
      </View>

      {/* Tasks */}
      <View style={{ gap: 6 }}>
        {goal.tasks?.map((step: any, i: number) => (
          <AnimatedPressable
            key={i}
            onPress={() => onComplete(goal.id, i, step.completed)}
            scaleDown={0.98}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: step.completed ? ACCENT : 'transparent',
                borderWidth: step.completed ? 0 : 2,
                borderColor: theme.border,
              }}>
              {step.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                color: step.completed ? theme.textSecondary : theme.text,
                textDecorationLine: step.completed ? 'line-through' : 'none',
              }}>
              {step.title}
            </Text>
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
});
