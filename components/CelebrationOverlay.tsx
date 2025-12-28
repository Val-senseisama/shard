import React, { useEffect } from 'react';
import { View, Text, useWindowDimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  runOnJS,
  Easing,
  withRepeat,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface CelebrationOverlayProps {
  visible: boolean;
  xpEarned: number;
  leveledUp?: boolean;
  newLevel?: number;
  onClose: () => void;
}

const PARTICLE_COUNT = 30;

const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  visible,
  xpEarned,
  leveledUp,
  newLevel,
  onClose,
}) => {
  const { width, height } = useWindowDimensions();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1);

      // Auto close after animation
      const timeout = setTimeout(() => {
        handleClose();
      }, 3500);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(onClose)();
    });
    scale.value = withTiming(0.5, { duration: 300 });
  };

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      pointerEvents="none" // Allow touches to pass through if needed, or 'auto' to block
    >
      {/* Confetti Particles */}
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <ConfettiParticle key={i} index={i} width={width} height={height} />
      ))}

      <Animated.View style={[styles.content, contentStyle]}>
        <View style={styles.card}>
          <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
          <Text style={styles.title}>Task Completed!</Text>

          <View style={styles.rewardContainer}>
            <Text style={styles.xpText}>+{xpEarned} XP</Text>
          </View>

          {leveledUp && (
            <Animated.View style={styles.levelUpContainer}>
              <Text style={styles.levelUpText}>LEVEL UP!</Text>
              <Text style={styles.newLevelText}>Level {newLevel}</Text>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const ConfettiParticle = ({
  index,
  width,
  height,
}: {
  index: number;
  width: number;
  height: number;
}) => {
  const x = useSharedValue(width / 2);
  const y = useSharedValue(height / 2);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const angle = (Math.PI * 2 * index) / PARTICLE_COUNT;
    const velocity = 100 + Math.random() * 200;
    const targetX = width / 2 + Math.cos(angle) * width * 0.8;
    const targetY = height / 2 + Math.sin(angle) * height * 0.8;

    x.value = width / 2;
    y.value = height / 2;
    scale.value = 0;

    scale.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(2000, withTiming(0, { duration: 300 }))
    );

    x.value = withTiming(targetX, {
      duration: 1500 + Math.random() * 1000,
      easing: Easing.out(Easing.cubic),
    });

    y.value = withTiming(targetY, {
      duration: 1500 + Math.random() * 1000,
      easing: Easing.out(Easing.cubic),
    });

    rotation.value = withRepeat(withTiming(360, { duration: 1000 + Math.random() * 1000 }), -1);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#ec4899'];
  const color = colors[index % colors.length];

  return <Animated.View style={[styles.particle, style, { backgroundColor: color }]} />;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  rewardContainer: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  xpText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  levelUpContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  levelUpText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#eab308',
    letterSpacing: 1,
  },
  newLevelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 0,
    left: 0,
  },
});

export default CelebrationOverlay;
