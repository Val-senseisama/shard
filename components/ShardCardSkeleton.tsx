import React, { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const ShardCardSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
    return () => {
      // Cleanup if needed, though reanimated usually handles this
      shimmerValue.value = 0;
    };
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmerValue.value, [0, 0.5, 1], [0.3, 0.6, 0.3]);
    return { opacity };
  });

  const isDark = colorScheme === 'dark';

  return (
    <View
      className="my-2 min-w-full flex-row items-center rounded-2xl bg-white p-4 dark:bg-background-dark-paper"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}>
      {/* Image skeleton */}
      <Animated.View
        style={[
          shimmerStyle,
          {
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
            marginRight: 12,
          },
        ]}
      />

      {/* Content skeleton */}
      <View className="flex-1">
        {/* Title skeleton */}
        <Animated.View
          style={[
            shimmerStyle,
            {
              height: 16,
              borderRadius: 4,
              backgroundColor: isDark ? '#374151' : '#e5e7eb',
              marginBottom: 8,
              width: '70%',
            },
          ]}
        />

        {/* Summary skeleton */}
        <Animated.View
          style={[
            shimmerStyle,
            {
              height: 12,
              borderRadius: 4,
              backgroundColor: isDark ? '#374151' : '#e5e7eb',
              marginBottom: 12,
              width: '90%',
            },
          ]}
        />

        {/* Progress bar skeleton */}
        <View className="flex-row items-center">
          <Animated.View
            style={[
              shimmerStyle,
              {
                flex: 1,
                height: 8,
                borderRadius: 8,
                backgroundColor: isDark ? '#374151' : '#e5e7eb',
              },
            ]}
          />
          <Animated.View
            style={[
              shimmerStyle,
              {
                width: 32,
                height: 12,
                borderRadius: 4,
                backgroundColor: isDark ? '#374151' : '#e5e7eb',
                marginLeft: 8,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

export default ShardCardSkeleton;
