import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { hud } from '~/components/hud';
import { useReducedMotion, SPRING, TIMING } from '~/helpers/motion';

/**
 * The tick.
 *
 * This is the most-repeated interaction in the product — the thing the entire app
 * exists to make happen — and it used to be `{done && <Ionicons name="checkmark"/>}`:
 * an instant swap plus a border colour change. No spring, no haptic, no transition.
 * Meanwhile a full-screen `CelebrationOverlay` existed for finishing a whole quest,
 * which happens perhaps monthly. The reward feedback was inverted: everything for
 * the rare moment, nothing for the constant one.
 *
 * What happens now when a task completes:
 *  - the box fills, colour crossfading rather than cutting
 *  - the tick springs in with a slight overshoot, which is what makes it feel
 *    *earned* rather than merely rendered
 *  - the whole control gives one quick confirmation pulse
 *
 * Deliberately still cheap: three shared values on the UI thread, no layout work,
 * so a list of thirty of these costs nothing.
 */
/**
 * `#RRGGBB` (or `#RGB`) → the same colour at zero alpha.
 *
 * On an unparseable input it returns the colour unchanged rather than
 * `rgba(0,0,0,0)` — falling back to transparent black would silently reintroduce
 * the exact fade-through-dark artefact this function exists to avoid. An instant
 * cut is a much smaller flaw than a muddy flash.
 */
function fade(color: string): string {
  const hex = color.trim().replace(/^#/, '');
  const full =
    hex.length === 3 ? hex.split('').map((ch) => ch + ch).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return color;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0)`;
}

export default function TaskCheck({
  done,
  isDark,
  size = 22,
  disabled = false,
  tint,
}: {
  done: boolean;
  isDark: boolean;
  size?: number;
  disabled?: boolean;
  /**
   * Fill colour. Defaults to the app accent, but the schedule colour-codes rows
   * by quest — without this every tick there would be violet while the rail and
   * title beside it were three different colours.
   */
  tint?: string;
}) {
  const c = hud(isDark);
  const fillColor = tint ?? c.violet;
  // Resolved here rather than inside the style worklet: `fade` is plain JS, and
  // calling it on the UI thread throws. It also depends only on the tint, so
  // there is nothing to gain from re-parsing the hex on every frame of the fill.
  const fillColorFaded = useMemo(() => fade(fillColor), [fillColor]);
  const reduced = useReducedMotion();

  // 0 = open, 1 = done. Drives fill, border and the tick together so they can't
  // drift out of sync.
  const fill = useSharedValue(done ? 1 : 0);
  const tick = useSharedValue(done ? 1 : 0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      fill.value = withTiming(done ? 1 : 0, TIMING);
      tick.value = withTiming(done ? 1 : 0, TIMING);
      return;
    }

    fill.value = withTiming(done ? 1 : 0, { duration: 160 });

    if (done) {
      // Overshoot on the way in — the tick lands with a bit of weight.
      tick.value = withSpring(1, { damping: 11, stiffness: 320, mass: 0.5 });
      pulse.value = withSequence(
        withTiming(1.12, { duration: 110 }),
        withSpring(1, SPRING)
      );
    } else {
      // Undo is quieter than completing. Taking something back shouldn't feel
      // like an achievement.
      tick.value = withTiming(0, { duration: 120 });
    }
  }, [done, reduced]);

  const boxStyle = useAnimatedStyle(() => ({
    // NOT from 'transparent': that is rgba(0,0,0,0), so interpolating to the
    // accent in RGB space passes through a muddy dark purple at the midpoint —
    // the box appears to darken before it fills. Same hue at zero alpha instead.
    backgroundColor: interpolateColor(fill.value, [0, 1], [fillColorFaded, fillColor]),
    borderColor: interpolateColor(fill.value, [0, 1], [c.panelBorderStrong, fillColor]),
    transform: [{ scale: pulse.value }],
  }));

  const tickStyle = useAnimatedStyle(() => ({
    opacity: tick.value,
    transform: [{ scale: tick.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
        },
        boxStyle,
      ]}>
      <Animated.View style={tickStyle}>
        <Ionicons name="checkmark" size={Math.round(size * 0.6)} color="#fff" />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Title text that strikes through as it completes.
 *
 * The strike is a scaling rule rather than `textDecorationLine`, because RN can't
 * animate the decoration and a decoration that appears instantly undoes the point
 * of animating the tick next to it.
 */
export function TaskTitle({
  children,
  done,
  isDark,
  size = 14,
  style,
}: {
  children: React.ReactNode;
  done: boolean;
  isDark: boolean;
  size?: number;
  style?: any;
}) {
  const c = hud(isDark);
  const reduced = useReducedMotion();
  const struck = useSharedValue(done ? 1 : 0);

  useEffect(() => {
    struck.value = reduced
      ? withTiming(done ? 1 : 0, { duration: 120 })
      : withTiming(done ? 1 : 0, { duration: 220 });
  }, [done, reduced]);

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(struck.value, [0, 1], [c.text, c.textDim]),
  }));

  const ruleStyle = useAnimatedStyle(() => ({
    // Sweeps left to right, so completion reads as an action rather than a state.
    transform: [{ scaleX: struck.value }],
    opacity: struck.value,
  }));

  return (
    <View style={{ justifyContent: 'center' }}>
      <Animated.Text style={[{ fontSize: size }, textStyle, style]} numberOfLines={1}>
        {children}
      </Animated.Text>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            // Explicit vertical centring. Without a `top`, an absolutely
            // positioned child sits at its static flow position — which here is
            // *below* the text, so the "strikethrough" would have drawn a line
            // under the title rather than through it.
            top: '50%',
            height: 1,
            backgroundColor: c.textDim,
            transformOrigin: 'left',
          },
          ruleStyle,
        ]}
      />
    </View>
  );
}
