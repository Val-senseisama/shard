import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '~/helpers/motion';
import AnimatedPressable from '../AnimatedPressable';
import AnimatedCrystal from '../AnimatedCrystal';

// ─── Floating orb ─────────────────────────────────────────────────────────────

const Orb = ({
  x,
  y,
  size,
  color,
  delay,
}: {
  x: any;
  y: any;
  size: number;
  color: string;
  delay: number;
}) => {
  const opacity = useSharedValue(0.15);
  const scale = useSharedValue(1);

  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Decorative loop — hold still when the user asked for less motion.
    if (reducedMotion) return;
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 2500 + delay }),
        withTiming(0.15, { duration: 2500 + delay })
      ),
      -1,
      true
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 3000 + delay }),
        withTiming(1, { duration: 3000 + delay })
      ),
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
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Full-bleed gradient */}
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

      {/* Content */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 28,
          paddingTop: insets.top + 36,
          paddingBottom: insets.bottom + 32,
        }}>
        {/* Logo */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Animated.View entering={FadeIn.duration(600)}>
            <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: 5, color: '#fff' }}>
              SH<Text style={{ color: '#7c3aed' }}>▲</Text>RD
            </Text>
          </Animated.View>
        </View>

        {/* Crystal + tagline */}
        <View
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 40,
          }}>
          <Animated.View entering={FadeIn.duration(400).delay(80)} style={{ marginBottom: 32 }}>
            <AnimatedCrystal />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(600).delay(150)}
            style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 34,
                fontWeight: '900',
                color: '#fff',
                textAlign: 'center',
                letterSpacing: -0.5,
                lineHeight: 40,
                marginBottom: 12,
              }}>
              Goals become{'\n'}
              <Text style={{ color: '#7c3aed' }}>quests.</Text>
            </Text>
            <Text style={{ fontSize: 16, color: '#9ca3af', textAlign: 'center', lineHeight: 24 }}>
              Track progress. Earn XP.{'\n'}Achieve with friends.
            </Text>
          </Animated.View>
        </View>

        {/* Buttons */}
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View entering={FadeInUp.duration(600).delay(150)} style={{ gap: 14 }}>
          <AnimatedPressable
            onPress={() => router.push('/(auth)/register')}
            scaleDown={0.97}
            style={{ borderRadius: 18, overflow: 'hidden' }}>
            <LinearGradient
              colors={['#7c3aed', '#6d28d9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 18,
              }}>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 }}>
                Create Account
              </Text>
            </LinearGradient>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => router.push('/(auth)/login')}
            scaleDown={0.97}
            style={{
              height: 56,
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: 'rgba(124,58,237,0.4)',
              backgroundColor: 'rgba(124,58,237,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#7c3aed' }}>Log In</Text>
          </AnimatedPressable>
        </Animated.View>
        </View>
      </View>
    </View>
  );
}
