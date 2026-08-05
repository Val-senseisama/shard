import React from 'react';
import { View, useColorScheme } from 'react-native';
import Animated from 'react-native-reanimated';
import { useShimmer } from '~/helpers/motion';

const ScheduleTaskSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  // Shared so reduced-motion is honoured in one place, not eight.
  const shimmerStyle = useShimmer(0.3, 0.6, 750);

  const isDark = colorScheme === 'dark';

  return (
    <View
      className="mb-3 flex-row items-center rounded-xl p-4"
      style={{ backgroundColor: isDark ? '#1f2937' : '#f9fafb' }}>
      {/* Checkbox Skeleton */}
      <Animated.View
        style={[
          shimmerStyle,
          {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
            marginRight: 12,
          },
        ]}
      />

      {/* Content */}
      <View className="flex-1">
        {/* Title Skeleton */}
        <Animated.View
          style={[
            shimmerStyle,
            {
              height: 16,
              borderRadius: 4,
              backgroundColor: isDark ? '#374151' : '#e5e7eb',
              marginBottom: 6,
              width: '85%',
            },
          ]}
        />
        {/* Subtitle Skeleton */}
        <Animated.View
          style={[
            shimmerStyle,
            {
              height: 12,
              borderRadius: 4,
              backgroundColor: isDark ? '#374151' : '#e5e7eb',
              width: '60%',
            },
          ]}
        />
      </View>

      {/* XP Badge Skeleton */}
      <Animated.View
        style={[
          shimmerStyle,
          {
            width: 50,
            height: 24,
            borderRadius: 12,
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
          },
        ]}
      />
    </View>
  );
};

export default ScheduleTaskSkeleton;
