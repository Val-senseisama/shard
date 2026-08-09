import React from 'react';
import { View } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import Animated from 'react-native-reanimated';
import { useShimmer } from '~/helpers/motion';

const ShardCardSkeleton: React.FC = () => {
  const isDark = useColorScheme() === 'dark';
  // Shared so reduced-motion is honoured in one place, not eight.
  const shimmer = useShimmer(0.4, 0.85, 750);

  const bg = isDark ? '#2a2a2a' : '#e5e7eb';

  return (
    <View
      style={{
        backgroundColor: isDark ? '#242424' : '#ffffff',
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: isDark ? 0 : 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}>
      {/* Image area */}
      <Animated.View style={[{ width: '100%', height: 180, backgroundColor: bg }, shimmer]} />

      {/* Content area */}
      <View style={{ padding: 16 }}>
        {/* Title */}
        <Animated.View
          style={[{ height: 18, borderRadius: 6, backgroundColor: bg, width: '65%', marginBottom: 8 }, shimmer]}
        />
        {/* Description line 1 */}
        <Animated.View
          style={[{ height: 13, borderRadius: 4, backgroundColor: bg, width: '90%', marginBottom: 5 }, shimmer]}
        />
        {/* Description line 2 */}
        <Animated.View
          style={[{ height: 13, borderRadius: 4, backgroundColor: bg, width: '70%', marginBottom: 14 }, shimmer]}
        />
        {/* Progress bar */}
        <Animated.View
          style={[{ height: 6, borderRadius: 6, backgroundColor: bg, width: '100%', marginBottom: 8 }, shimmer]}
        />
        {/* Percentage label */}
        <Animated.View
          style={[{ height: 12, borderRadius: 4, backgroundColor: bg, width: '25%' }, shimmer]}
        />
      </View>
    </View>
  );
};

export default ShardCardSkeleton;
