import React from 'react';
import { View } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import Animated from 'react-native-reanimated';
import { useShimmer } from '~/helpers/motion';

const HeaderSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  // Shared so reduced-motion is honoured in one place, not eight.
  const shimmerStyle = useShimmer(0.3, 0.6, 750);

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
