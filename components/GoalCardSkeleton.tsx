import React from 'react';
import { View } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import Animated from 'react-native-reanimated';
import { useShimmer } from '~/helpers/motion';

const GoalCardSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  // Shared so reduced-motion is honoured in one place, not eight.
  const shimmerStyle = useShimmer(0.3, 0.6, 750);

  const isDark = colorScheme === 'dark';

  return (
    <View className="mb-6">
      {/* Goal Title Skeleton */}
      <Animated.View
        style={[
          shimmerStyle,
          {
            height: 18,
            borderRadius: 4,
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
            marginBottom: 12,
            width: '60%',
          },
        ]}
      />

      {/* Tasks Skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="mb-3 flex-row items-center">
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

          {/* Task Text Skeleton */}
          <Animated.View
            style={[
              shimmerStyle,
              {
                flex: 1,
                height: 14,
                borderRadius: 4,
                backgroundColor: isDark ? '#374151' : '#e5e7eb',
                width: '85%',
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
};

export default GoalCardSkeleton;
