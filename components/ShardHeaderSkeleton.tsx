import React, { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const ShardHeaderSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmerValue.value, [0, 0.5, 1], [0.3, 0.6, 0.3]);
    return { opacity };
  });

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
