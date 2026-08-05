import React from 'react';
import { View, useColorScheme } from 'react-native';
import Animated from 'react-native-reanimated';
import { useShimmer } from '~/helpers/motion';

const ShardHeaderSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  // Shared so reduced-motion is honoured in one place, not eight.
  const shimmerStyle = useShimmer(0.3, 0.6, 750);

  const isDark = colorScheme === 'dark';

  return (
    <View
      className="mb-6 overflow-hidden rounded-2xl p-4"
      style={{ backgroundColor: isDark ? '#1f2937' : '#f9fafb' }}>
      <View className="flex-row">
        {/* Left Column: Image + Icons */}
        <View className="mr-4">
          {/* Shard Image Skeleton */}
          <Animated.View
            style={[
              shimmerStyle,
              {
                width: 160,
                height: 160,
                borderRadius: 12,
                backgroundColor: isDark ? '#374151' : '#e5e7eb',
                marginBottom: 12,
              },
            ]}
          />

          {/* Action Icons Skeleton */}
          <View className="flex-row items-center justify-center gap-3">
            {[1, 2, 3].map((i) => (
              <Animated.View
                key={i}
                style={[
                  shimmerStyle,
                  {
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDark ? '#374151' : '#e5e7eb',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Right Column: Title and Participants */}
        <View className="flex-1 justify-start">
          {/* Title Skeleton */}
          <Animated.View
            style={[
              shimmerStyle,
              {
                height: 20,
                borderRadius: 4,
                backgroundColor: isDark ? '#374151' : '#e5e7eb',
                marginBottom: 12,
                width: '80%',
              },
            ]}
          />

          {/* Participants Skeleton */}
          <View className="flex-row flex-wrap gap-2">
            {[1, 2].map((i) => (
              <Animated.View
                key={i}
                style={[
                  shimmerStyle,
                  {
                    height: 28,
                    width: 100,
                    borderRadius: 14,
                    backgroundColor: isDark ? '#374151' : '#e5e7eb',
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

export default ShardHeaderSkeleton;
