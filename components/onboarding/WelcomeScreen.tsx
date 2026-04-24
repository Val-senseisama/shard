import { useEffect } from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
import AnimatedPressable from '../AnimatedPressable';
import AnimatedCrystal from '../AnimatedCrystal';

// ─── Floating orb ─────────────────────────────────────────────────────────────

const Orb = ({ x, y, size, color, delay }: { x: string; y: string; size: number; color: string; delay: number }) => {
  const opacity = useSharedValue(0.15);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 2500 + delay }), withTiming(0.15, { duration: 2500 + delay })),
      -1,
      true
    );
    scale.value = withRepeat(
      withSequence(withTiming(1.15, { duration: 3000 + delay }), withTiming(1, { duration: 3000 + delay })),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x as any,
          top: y as any,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          filter: undefined,
        },
        style,
      ]}
    />
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const bg1 = isDark ? '#0a0a0f' : '#f0effe';
  const bg2 = isDark ? '#0f0a1a' : '#e8e4ff';

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[bg1, bg2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}>

        {/* Ambient orbs */}
        <Orb x="-15%" y="5%" size={260} color="#7c3aed" delay={0} />
        <Orb x="60%" y="55%" size={200} color="#6d28d9" delay={800} />
        <Orb x="30%" y="75%" size={150} color="#8b5cf6" delay={400} />

        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 24, paddingBottom: 40 }}>

            {/* Top: logo */}
            <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
              <Text style={{
                fontSize: 30,
                fontWeight: '900',
                letterSpacing: 5,
                color: isDark ? '#fff' : '#1a1a1a',
              }}>
                SH<Text style={{ color: '#7c3aed' }}>▲</Text>RD
              </Text>
            </Animated.View>

            {/* Center: crystal + tagline */}
            <View style={{ alignItems: 'center' }}>
              <Animated.View entering={FadeIn.duration(800).delay(200)} style={{ marginBottom: 32 }}>
                <AnimatedCrystal />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(600).delay(400)} style={{ alignItems: 'center' }}>
                <Text style={{
                  fontSize: 34,
                  fontWeight: '900',
                  color: isDark ? '#fff' : '#1a1a1a',
                  textAlign: 'center',
                  letterSpacing: -0.5,
                  lineHeight: 40,
                  marginBottom: 12,
                }}>
                  Goals become{'\n'}
                  <Text style={{ color: '#7c3aed' }}>quests.</Text>
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: isDark ? '#9ca3af' : '#6b7280',
                  textAlign: 'center',
                  lineHeight: 24,
                }}>
                  Track progress. Earn XP.{'\n'}Achieve with friends.
                </Text>
              </Animated.View>
            </View>

            {/* Bottom: buttons */}
            <Animated.View entering={FadeInUp.duration(600).delay(600)} style={{ gap: 14 }}>
              <AnimatedPressable
                onPress={() => router.push('/(auth)/register')}
                scaleDown={0.97}
                style={{ borderRadius: 18, overflow: 'hidden' }}>
                <LinearGradient
                  colors={['#7c3aed', '#6d28d9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 18 }}>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 }}>
                    Create Account
                  </Text>
                </LinearGradient>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => router.push('/(auth)/login')}
                scaleDown={0.97}
                style={{
                  height: 56, borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.3)',
                  backgroundColor: isDark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.05)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#7c3aed' }}>Log In</Text>
              </AnimatedPressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
