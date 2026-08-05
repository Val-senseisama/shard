import React, { useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hud, FONT, Num, SHARD_GRADIENT } from './hud';
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
import { useReducedMotion, haptic } from '~/helpers/motion';
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
  const c = hud(useColorScheme() === 'dark');
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    if (visible) {
      // The milestone moment had no haptic at all — a full-screen celebration
      // that the hand can't feel is a strange omission when the OS gives you a
      // success pattern for free.
      haptic.celebrate();
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
    // Blocks the screen behind it — a tap used to fall straight through the
    // overlay and hit whatever was underneath.
    <Animated.View style={[styles.container, containerStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

      {/* Confetti Particles */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <ConfettiParticle key={i} index={i} width={width} height={height} />
        ))}
      </View>

      <Animated.View style={[styles.content, contentStyle]} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: c.panel, borderColor: c.panelBorderStrong }]}>
          {/* The shard mark, not a generic green tick */}
          <View style={styles.crystalWrap}>
            <LinearGradient
              colors={SHARD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.crystal}>
              <View style={{ transform: [{ rotate: '-45deg' }] }}>
                <Ionicons name="checkmark" size={30} color="#fff" />
              </View>
            </LinearGradient>
          </View>

          <Text style={[styles.title, { color: c.text, fontFamily: FONT.extrabold }]}>
            {leveledUp ? 'Level up!' : 'Task complete'}
          </Text>

          <View style={[styles.rewardContainer, { backgroundColor: 'rgba(245,165,36,0.12)', borderColor: 'rgba(245,165,36,0.30)' }]}>
            <Num color={c.ember} size={18}>
              +{xpEarned} XP
            </Num>
          </View>

          {leveledUp && (
            <View style={styles.levelUpContainer}>
              <Text style={{ fontSize: 14, fontFamily: FONT.regular, color: c.textDim }}>
                You reached{' '}
                <Num color={c.violet} size={14}>
                  Level {newLevel}
                </Num>
              </Text>
            </View>
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

  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Decorative loop — hold still when the user asked for less motion.
    if (reducedMotion) return;
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
  }, [reducedMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  // The app's palette — violet / cyan refraction / ember — not generic rainbow.
  const colors = ['#8B5CF6', '#A78BFA', '#48E0EE', '#F5A524', '#6D28D9', '#FFFFFF'];
  const color = colors[index % colors.length];

  return <Animated.View style={[styles.particle, style, { backgroundColor: color }]} />;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    paddingHorizontal: 36,
    paddingVertical: 32,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  crystalWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  crystal: {
    width: 60,
    height: 60,
    borderRadius: 20,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.3,
    marginTop: 20,
    marginBottom: 12,
  },
  rewardContainer: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  levelUpContainer: {
    marginTop: 14,
    alignItems: 'center',
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
