import React, { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const GoalCardSkeleton: React.FC = () => {
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
