import React, { memo } from 'react';
import { useColorScheme } from 'react-native';
import Animated from 'react-native-reanimated';

interface SkeletonProps {
  width: number | string;
  height: number;
  style?: any;
  animStyle: any;
}

export const Skeleton = memo(({ width, height, style, animStyle }: SkeletonProps) => {
  const isDark = useColorScheme() === 'dark';
  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: 8,
          backgroundColor: isDark ? '#262626' : '#e5e7eb',
        },
        animStyle,
        style,
      ]}
    />
  );
});
