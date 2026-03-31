import React, { memo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ACCENT, t } from './constants';

interface DonutChartProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  isDark: boolean;
}

export const DonutChart = memo(({ percentage, size = 120, strokeWidth = 10, isDark }: DonutChartProps) => {
  const theme = t(isDark);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.trackBg}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ACCENT}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: theme.text }}>
          {progress}%
        </Text>
        <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: -2 }}>complete</Text>
      </View>
    </View>
  );
});
