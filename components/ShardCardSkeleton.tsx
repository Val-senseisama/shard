import React, { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const ShardCardSkeleton: React.FC = () => {
  const isDark = useColorScheme() === 'dark';
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 750 }),
        withTiming(0.4, { duration: 750 })
      ),
      -1,
      true
    );
  }, []);

  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
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
      <Animated.View style={[{ width: '100%', height: 180, backgroundColor: bg }, anim]} />

      {/* Content area */}
      <View style={{ padding: 16 }}>
        {/* Title */}
        <Animated.View
          style={[{ height: 18, borderRadius: 6, backgroundColor: bg, width: '65%', marginBottom: 8 }, anim]}
        />
        {/* Description line 1 */}
        <Animated.View
          style={[{ height: 13, borderRadius: 4, backgroundColor: bg, width: '90%', marginBottom: 5 }, anim]}
        />
        {/* Description line 2 */}
        <Animated.View
          style={[{ height: 13, borderRadius: 4, backgroundColor: bg, width: '70%', marginBottom: 14 }, anim]}
        />
        {/* Progress bar */}
        <Animated.View
          style={[{ height: 6, borderRadius: 6, backgroundColor: bg, width: '100%', marginBottom: 8 }, anim]}
        />
        {/* Percentage label */}
        <Animated.View
          style={[{ height: 12, borderRadius: 4, backgroundColor: bg, width: '25%' }, anim]}
        />
      </View>
    </View>
  );
};

export default ShardCardSkeleton;
