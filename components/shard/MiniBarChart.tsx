import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { FONT } from '~/components/hud';
import { t } from './constants';

interface GoalStat {
  title: string;
  pct: number;
  color: string;
}

interface MiniBarChartProps {
  goals: GoalStat[];
  isDark: boolean;
}

const BAR_HEIGHT = 120;

export const MiniBarChart = memo(({ goals, isDark }: MiniBarChartProps) => {
  const theme = t(isDark);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: BAR_HEIGHT + 24,
        paddingTop: 8,
      }}>
      {goals.map((g, i) => (
        <View key={i} style={{ alignItems: 'center', flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 10, fontFamily: FONT.bold, color: g.color }}>{g.pct}%</Text>
          <View
            style={{
              width: 24,
              height: BAR_HEIGHT,
              borderRadius: 12,
              backgroundColor: theme.trackBg,
              justifyContent: 'flex-end',
              overflow: 'hidden',
            }}>
            <View
              style={{
                width: 24,
                height: `${Math.max(g.pct, 4)}%` as any,
                borderRadius: 12,
                backgroundColor: g.color,
              }}
            />
          </View>
          <Text
            style={{ fontSize: 9, color: theme.textSecondary, textAlign: 'center', maxWidth: 56 }}
            numberOfLines={1}>
            {g.title}
          </Text>
        </View>
      ))}
    </View>
  );
});
