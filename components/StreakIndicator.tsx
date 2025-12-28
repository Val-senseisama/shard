import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import Animated, {
  withSpring,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface StreakIndicatorProps {
  currentStreak: number;
  longestStreak: number;
  compact?: boolean;
}

export default function StreakIndicator({
  currentStreak,
  longestStreak,
  compact = false,
}: StreakIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Trigger pulse animation when streak updates
  React.useEffect(() => {
    scale.value = withSpring(1.2, { damping: 10 }, () => {
      scale.value = withSpring(1);
    });
    rotation.value = withTiming(360, { duration: 600 }, () => {
      rotation.value = 0;
    });
  }, [currentStreak]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  // Particle effect for flame
  const particles = Array.from({ length: 3 }, (_, i) => i);

  if (compact) {
    return (
      <View className="flex-row items-center gap-1">
        <Animated.View style={animatedStyle}>
          <Ionicons
            name="flame"
            size={20}
            color={currentStreak > 0 ? '#FF6B35' : isDark ? '#666' : '#CCC'}
          />
        </Animated.View>
        <Text className="font-semibold" style={{ color: isDark ? '#FFF' : '#000' }}>
          {currentStreak}
        </Text>
      </View>
    );
  }

  return (
    <View
      className="mb-4 rounded-2xl p-4"
      style={{
        backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
        borderWidth: currentStreak > 0 ? 2 : 0,
        borderColor: currentStreak > 0 ? '#FF6B35' : 'transparent',
      }}>
      <View className="flex-row items-center justify-between">
        {/* Current Streak */}
        <View className="flex-1">
          <Text className="text-sm opacity-60" style={{ color: isDark ? '#FFF' : '#000' }}>
            Current Streak
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Animated.View style={animatedStyle} className="relative">
              <Ionicons
                name="flame"
                size={32}
                color={currentStreak > 0 ? '#FF6B35' : isDark ? '#666' : '#CCC'}
              />
              {/* Particles */}
              {currentStreak > 0 &&
                particles.map((i) => (
                  <ParticleEffect key={i} index={i} active={currentStreak > 0} />
                ))}
            </Animated.View>
            <Text className="text-3xl font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
              {currentStreak}
            </Text>
            <Text className="text-sm opacity-60" style={{ color: isDark ? '#FFF' : '#000' }}>
              {currentStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>

        {/* Longest Streak */}
        <View className="items-end">
          <Text className="text-xs opacity-40" style={{ color: isDark ? '#FFF' : '#000' }}>
            Record
          </Text>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="trophy" size={16} color="#FFD700" />
            <Text className="text-lg font-semibold" style={{ color: isDark ? '#FFF' : '#000' }}>
              {longestStreak}
            </Text>
          </View>
        </View>
      </View>

      {/* Motivational Message */}
      {currentStreak > 0 && (
        <Text
          className="mt-3 text-center text-xs opacity-70"
          style={{ color: isDark ? '#FFF' : '#000' }}>
          {currentStreak >= 7
            ? "🔥 You're on fire!"
            : currentStreak >= 3
              ? '💪 Keep it going!'
              : '✨ Great start!'}
        </Text>
      )}
    </View>
  );
}

// Floating particle effect
function ParticleEffect({ index, active }: { index: number; active: boolean }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (active) {
      const delay = index * 100;
      setTimeout(() => {
        opacity.value = withTiming(1, { duration: 300 });
        translateY.value = withTiming(-20, { duration: 800 }, () => {
          opacity.value = withTiming(0, { duration: 200 });
          translateY.value = 0;
        });
      }, delay);
    }
  }, [active, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          left: index * 8,
          top: -10,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: '#FFA500',
        },
      ]}
    />
  );
}
