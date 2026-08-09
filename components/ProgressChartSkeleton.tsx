import React from 'react';
import { View } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import Animated from 'react-native-reanimated';
import { useShimmer } from '~/helpers/motion';

const ProgressChartSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  // Shared so reduced-motion is honoured in one place, not eight.
  const shimmerStyle = useShimmer(0.3, 0.6, 750);

  const isDark = colorScheme === 'dark';

  return (
    <View className="pb-6">
      {/* Productivity Card Skeleton */}
      <View
        className="mb-6 rounded-3xl p-8"
        style={{ backgroundColor: isDark ? '#1f2937' : '#f9fafb' }}>
        {/* Title Skeleton */}
        <Animated.View
          style={[
            shimmerStyle,
            {
              height: 16,
              borderRadius: 4,
              backgroundColor: isDark ? '#374151' : '#e5e7eb',
              marginBottom: 32,
              width: 120,
              alignSelf: 'center',
            },
          ]}
        />

        {/* Circular Progress Skeleton */}
        <View className="mb-6 items-center justify-center">
          <Animated.View
            style={[
              shimmerStyle,
              {
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: isDark ? '#374151' : '#e5e7eb',
              },
            ]}
          />
        </View>

        {/* Message Skeleton */}
        <Animated.View
          style={[
            shimmerStyle,
            {
              height: 14,
              borderRadius: 4,
              backgroundColor: isDark ? '#374151' : '#e5e7eb',
              width: '80%',
              alignSelf: 'center',
            },
          ]}
        />
      </View>

      {/* Weekly Bar Chart Skeleton */}
      <View className="rounded-3xl p-6" style={{ backgroundColor: isDark ? '#1f2937' : '#f9fafb' }}>
        <View className="flex-row items-end justify-between" style={{ height: 200 }}>
          {[40, 20, 60, 35, 25, 75, 45].map((height, index) => (
            <View key={index} className="flex-1 items-center">
              {/* Bar Skeleton */}
              <Animated.View
                style={[
                  shimmerStyle,
                  {
                    width: 40,
                    height: `${height}%`,
                    borderRadius: 20,
                    backgroundColor: isDark ? '#374151' : '#e5e7eb',
                    marginBottom: 8,
                  },
                ]}
              />
              {/* Day Label Skeleton */}
              <Animated.View
                style={[
                  shimmerStyle,
                  {
                    height: 12,
                    width: 30,
                    borderRadius: 4,
                    backgroundColor: isDark ? '#374151' : '#e5e7eb',
                  },
                ]}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default ProgressChartSkeleton;
