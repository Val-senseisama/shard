import React, { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const HeaderSkeleton: React.FC = () => {
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
    <View className="flex flex-row items-center gap-2 pt-2">
      {/* Avatar skeleton */}
      <Animated.View
        style={[
          shimmerStyle,
          {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
            borderWidth: 1,
            borderColor: isDark ? '#4b5563' : '#d1d5db',
          },
        ]}
      />

      {/* Username skeleton */}
      <Animated.View
        style={[
          shimmerStyle,
          {
            height: 18,
            width: 140,
            borderRadius: 4,
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
          },
        ]}
      />
    </View>
  );
};

export default HeaderSkeleton;
