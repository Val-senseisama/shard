import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import Animated, {
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '~/helpers/motion';
import { Ionicons } from '@expo/vector-icons';

interface RescheduledBadgeProps {
  originalDate: Date;
  onPress?: () => void;
}

export default function RescheduledBadge({ originalDate, onPress }: RescheduledBadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Glow animation
  const glowOpacity = useSharedValue(0.3);
  const scale = useSharedValue(1);

  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    // Decorative loop — hold still when the user asked for less motion.
    if (reducedMotion) return;
    // Pulsing glow effect
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [reducedMotion]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handlePress = () => {
    // Shake animation on press
    scale.value = withSequence(
      withTiming(1.1, { duration: 100 }),
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    onPress?.();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} className="relative">
      {/* Glow effect */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            borderRadius: 12,
            backgroundColor: '#F59E0B',
          },
        ]}
      />

      {/* Badge */}
      <Animated.View
        style={[
          scaleStyle,
          {
            backgroundColor: isDark ? '#92400E' : '#FEF3C7',
            borderRadius: 10,
            paddingVertical: 6,
            paddingHorizontal: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderWidth: 1,
            borderColor: '#F59E0B',
          },
        ]}>
        <Ionicons name="time-outline" size={14} color="#F59E0B" />
        <Text className="text-xs font-semibold" style={{ color: '#F59E0B' }}>
          Moved from {formatDate(originalDate)}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}
