import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { useReducedMotion } from '~/helpers/motion';
import AnimatedCrystal from './AnimatedCrystal';

const Orb = ({ x, y, size, color, delay }: { x: any; y: any; size: number; color: string; delay: number }) => {
  const opacity = useSharedValue(0.1);
  const scale = useSharedValue(1);

  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Decorative loop — hold still when the user asked for less motion.
    if (reducedMotion) return;
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 2500 + delay }), withTiming(0.1, { duration: 2500 + delay })),
      -1,
      true
    );
    scale.value = withRepeat(
      withSequence(withTiming(1.12, { duration: 3000 + delay }), withTiming(1, { duration: 3000 + delay })),
      -1,
      true
    );
  }, [reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
};

const PulseDot = ({ delay }: { delay: number }) => {
  const opacity = useSharedValue(0.2);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // With motion off the dots hold at full opacity: still legible as a loading
    // indicator, just not pulsing.
    if (reducedMotion) {
      opacity.value = 1;
      return;
    }
    const timer = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 500 }), withTiming(0.2, { duration: 500 })),
        -1,
        false
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#7c3aed', marginHorizontal: 3 }, style]} />
  );
};

export default function AppSplashScreen() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a0a0f' }]}>
      <LinearGradient
        colors={['#0a0a0f', '#0f0a1a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient orbs */}
      <Orb x="-15%" y="5%" size={260} color="#7c3aed" delay={0} />
      <Orb x="60%" y="55%" size={200} color="#6d28d9" delay={800} />
      <Orb x="30%" y="75%" size={150} color="#8b5cf6" delay={400} />

      {/* Center content */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <Animated.View entering={FadeIn.duration(600)}>
          <AnimatedCrystal />
        </Animated.View>

        <Animated.View entering={FadeIn.duration(600).delay(150)} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 32, fontWeight: '900', letterSpacing: 6, color: '#fff' }}>
            SH<Text style={{ color: '#7c3aed' }}>▲</Text>RD
          </Text>
        </Animated.View>
      </View>

      {/* Loading dots */}
      <Animated.View
        entering={FadeIn.duration(400).delay(150)}
        style={{ position: 'absolute', bottom: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        <PulseDot delay={0} />
        <PulseDot delay={200} />
        <PulseDot delay={400} />
      </Animated.View>
    </View>
  );
}
