import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Tabs, router } from 'expo-router';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import AnimatedPressable from '~/components/AnimatedPressable';
import { hud, FONT, RADIUS, SHARD_GRADIENT } from '~/components/hud';
import { haptic, useReduceTransparency } from '~/helpers/motion';

const LABELS: Record<string, string> = { Home: 'Home', schedule: 'Log', friends: 'Party', account: 'You' };

const renderIcon = (name: string, color: string, focused: boolean) => {
  switch (name) {
    case 'Home':
      return <AntDesign name="home" size={21} color={color} />;
    case 'schedule':
      return <AntDesign name="calendar" size={20} color={color} />;
    case 'friends':
      return <Ionicons name={focused ? 'people' : 'people-outline'} size={21} color={color} />;
    case 'account':
      return <AntDesign name="user" size={21} color={color} />;
    default:
      return null;
  }
};

// The core "Forge a quest" action — a crystalline shard, centered in the bar.
const CenterForge = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <Pressable onPress={() => router.push('/new-shard')} style={{ alignItems: 'center', justifyContent: 'center' }} hitSlop={10} accessibilityRole="button" accessibilityLabel="New quest">
      <View style={styles.forgeGlow} />
      <LinearGradient colors={SHARD_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.forge}>
        <LinearGradient
          colors={['rgba(255,255,255,0.4)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0.6 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ transform: [{ rotate: '-45deg' }] }}>
          <Ionicons name="add" size={24} color="#fff" />
        </View>
      </LinearGradient>
    </Pressable>
  </View>
);

/**
 * A tab item.
 *
 * Was a bare `Pressable` with no press feedback of any kind — the one control
 * present on every screen was the only one in the app that didn't respond to
 * being touched. The selected state also arrived as an instant layout jump
 * (padding 8→12 plus a label mounting); it springs now.
 */
const TabItem = ({
  route,
  focused,
  onPress,
  c,
}: {
  route: any;
  focused: boolean;
  onPress: () => void;
  c: ReturnType<typeof hud>;
}) => {
  const color = focused ? c.violet : c.textFaint;

  return (
    // `flex: 1` goes on the container, not `style` — `style` lands on the inner
    // animated view, leaving the Pressable content-sized, and then CenterForge is
    // the only child of the row still flexing, so it absorbs all the slack and
    // opens a gap around the middle button.
    <AnimatedPressable
      onPress={onPress}
      scaleDown={0.92}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={LABELS[route.name]}
      containerStyle={{ flex: 1 }}
      style={{ alignItems: 'center', justifyContent: 'center', height: 46 }}>
      <Animated.View
        layout={LinearTransition.springify().damping(22).stiffness(260)}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: focused ? 12 : 8,
            borderRadius: RADIUS.lg,
          },
          focused && { backgroundColor: `${c.violet}29` },
        ]}>
        {renderIcon(route.name, color, focused)}
        {focused && (
          // Deliberately a plain Text, not Animated.Text with `entering`.
          // A Reanimated entering animation on a child that changes its
          // parent's size races the parent's own `LinearTransition`: for the
          // first frame or two the label is placed against the pill's old,
          // narrower frame and lands on top of the icon. That's the
          // intermittent overlap. The pill still springs open — that motion is
          // the parent's and is untouched — the label just appears with it
          // instead of animating its own way in.
          <Text
            numberOfLines={1}
            style={{ marginLeft: 7, fontFamily: FONT.semibold, fontSize: 11, color: c.violet }}>
            {LABELS[route.name]}
          </Text>
        )}
      </Animated.View>
    </AnimatedPressable>
  );
};

function FloatingTabBar({ state, navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const c = hud(isDark);
  const insets = useSafeAreaInsets();
  const solid = useReduceTransparency();

  return (
    <View
      style={{
        // Absolute so the bar genuinely floats *over* the scene.
        //
        // React Navigation measures a custom tabBar and insets the scene by its
        // height, which meant content was clipped at the capsule's top edge and
        // the blur had nothing behind it to blur — a translucent bar with a solid
        // background behind it is just an opaque bar that costs more. Taking the
        // bar out of flow measures it as zero height, so the scene fills the
        // screen and content passes underneath.
        //
        // `tabBarStyle: { position: 'absolute' }` does NOT do this: that option
        // only styles the built-in bar, and is ignored when `tabBar` is supplied.
        //
        // Screens are responsible for their own bottom padding — Home's list
        // already carries `paddingBottom: 100` for exactly this.
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 10),
        backgroundColor: 'transparent',
      }}>
      {/* A floating capsule is exactly the shape that wants to be a material:
          content should pass *under* it, not vanish behind it. `overflow: hidden`
          is what clips the blur to the rounded corners. */}
      <View style={[styles.capsule, { borderColor: c.panelBorder }]}>
        <View pointerEvents="none" style={styles.material}>
          {solid ? (
            // Reduce Transparency is on: go solid rather than frosty. Legibility
            // beats the effect for the people who asked for this.
            <View style={[StyleSheet.absoluteFill, { backgroundColor: c.panel }]} />
          ) : (
            <>
              <BlurView
                intensity={isDark ? 40 : 60}
                tint={isDark ? 'dark' : 'light'}
                // Android has no native backdrop blur; this is the opt-in
                // implementation. Without it the BlurView renders as a plain view.
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
              />
              {/* The tint that makes it read as *this* app's glass rather than
                  generic frosting. Kept translucent so content still shows. */}
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: isDark ? 'rgba(30,30,30,0.55)' : 'rgba(255,255,255,0.55)' },
                ]}
              />
            </>
          )}
        </View>

        {/* Bright top edge — light catching the lip of the material. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.8)',
          }}
        />

        {state.routes.map((route: any, index: number) => {
          if (route.name === 'new-shard-tab') return <CenterForge key={route.key} />;

          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              // Selection weight, not impact — changing tabs is a choice, not an
              // achievement, and impact here would cheapen the completion buzz.
              haptic.undo();
              navigation.navigate(route.name);
            }
          };

          return <TabItem key={route.key} route={route} focused={focused} onPress={onPress} c={c} />;
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Home" />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="new-shard-tab" />
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}

const CAPSULE_RADIUS = 26;

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: CAPSULE_RADIUS,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    // Deliberately NOT `overflow: 'hidden'` — that would clip the shadow away on
    // iOS. The material layers do their own clipping in `material` below.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 14,
  },
  /** Clipping container for the blur, so the material follows the capsule's corners. */
  material: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CAPSULE_RADIUS,
    overflow: 'hidden',
  },
  forgeGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(139,92,246,0.30)',
    transform: [{ rotate: '45deg' }],
  },
  // A rotated *rounded* square reads as a cut crystal; a rotated *hard* square
  // reads as a warning sign. Same motif, softer cut.
  forge: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
});
