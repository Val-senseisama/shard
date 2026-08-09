import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import Animated, {
  withSpring,
  withSequence,
  withDelay,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
// Optional haptic feedback
let Haptics: any;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = null;
}

interface CelebrationToastProps {
  visible: boolean;
  message: string;
  bonusXP: number;
  onDismiss: () => void;
}

export default function CelebrationToast({
  visible,
  message,
  bonusXP,
  onDismiss,
}: CelebrationToastProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const confetti = Array.from({ length: 12 }, (_, i) => i);

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Success);

      // Entrance animation
      opacity.value = withSpring(1);
      scale.value = withSequence(withSpring(1.2, { damping: 8 }), withSpring(1));

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        onDismiss();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      opacity.value = withSpring(0);
      scale.value = withSpring(0);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <View className="absolute left-0 right-0 top-20 z-50 items-center px-4">
      <Animated.View
        style={[
          animatedStyle,
          {
            backgroundColor: isDark ? '#10B981' : '#34D399',
            borderRadius: 20,
            padding: 20,
            maxWidth: 320,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          },
        ]}>
        {/* Confetti particles */}
        {confetti.map((i) => (
          <ConfettiParticle key={i} index={i} visible={visible} />
        ))}

        {/* Icon */}
        <View className="mb-3 items-center">
          <View className="rounded-full p-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Ionicons name="trophy" size={32} color="#FFD700" />
          </View>
        </View>

        {/* Message */}
        <Text className="mb-2 text-center text-lg font-bold text-white">{message}</Text>

        {/* Bonus XP */}
        <View className="mb-3 flex-row items-center justify-center gap-2">
          <Ionicons name="star" size={20} color="#FFD700" />
          <Text className="text-xl font-semibold text-white">+{bonusXP} XP Bonus!</Text>
        </View>

        {/* Dismiss button */}
        <TouchableOpacity onPress={onDismiss} className="items-center py-2">
          <Text className="text-sm text-white opacity-70">Tap to dismiss</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// Confetti particle
function ConfettiParticle({ index, visible }: { index: number; visible: boolean }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  const colors = ['#FFD700', '#FF6B35', '#4ECDC4', '#95E1D3', '#F38181'];
  const color = colors[index % colors.length];

  useEffect(() => {
    if (visible) {
      const angle = (index / 12) * Math.PI * 2;
      const distance = 60 + Math.random() * 40;

      opacity.value = withSpring(1);
      translateX.value = withSpring(Math.cos(angle) * distance, { damping: 8 });
      translateY.value = withSpring(Math.sin(angle) * distance, { damping: 8 });
      rotate.value = withSpring(Math.random() * 720, { damping: 10 });
    }
  }, [visible, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 8,
          height: 8,
          borderRadius: 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}
