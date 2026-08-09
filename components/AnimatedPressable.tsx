import React, { useCallback } from 'react';
import {
  Pressable,
  StyleProp,
  ViewStyle,
  type AccessibilityRole,
  type AccessibilityState,
  type AccessibilityValue,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useReducedMotion, SPRING } from '~/helpers/motion';

/**
 * The app's pressable. Scales slightly under the finger.
 *
 * It now **forwards accessibility props**, which is a large part of why the app
 * had zero of them: this component is used ~250 times and simply dropped
 * `accessibilityLabel` / `Role` / `State` on the floor, so a screen reader saw a
 * few hundred unlabelled touch targets and icon-only buttons were unusable.
 *
 * `accessibilityRole` defaults to `button` — that's what these almost always are,
 * and a sensible default fixes the majority of sites without touching them.
 */
interface AnimatedPressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /**
   * Styles the **inner** animated view — backgrounds, padding, borders, radius.
   * Anything that positions this control *within its parent* belongs in
   * `containerStyle` instead; see the note there.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Styles the outer `Pressable`. Use this for `flex`, `alignSelf`, margins —
   * anything about how the control sits in its parent's layout.
   *
   * Passing `flex: 1` via `style` silently does nothing useful: it lands on the
   * inner view, whose parent Pressable is unstyled and therefore sized to its
   * content, so the control doesn't flex and its siblings absorb the slack. That
   * is what opened a gap around the tab bar's centre button, and it's latent at
   * every "row of equal-width buttons" call site.
   */
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  children: React.ReactNode;
  scaleDown?: number;
  hitSlop?: number;

  // ── Accessibility ──
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: AccessibilityValue;
  /** Set false on purely decorative wrappers so they don't clutter the reader. */
  accessible?: boolean;
  testID?: string;
}

const AnimatedPressable = ({
  onPress,
  onLongPress,
  disabled = false,
  style,
  containerStyle,
  className,
  children,
  scaleDown = 0.96,
  hitSlop = 0,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  accessibilityValue,
  accessible,
  testID,
}: AnimatedPressableProps) => {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const opacityVal = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    // With reduced motion, keep the opacity dip — it's the affordance that tells
    // you the press registered — but drop the scale, which is the part that moves.
    if (!reduced) scale.value = withSpring(scaleDown, SPRING);
    opacityVal.value = withSpring(0.85, SPRING);
  }, [scaleDown, reduced]);

  const handlePressOut = useCallback(() => {
    if (!reduced) scale.value = withSpring(1, SPRING);
    opacityVal.value = withSpring(1, SPRING);
  }, [reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacityVal.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      style={containerStyle}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled, ...accessibilityState }}
      accessibilityValue={accessibilityValue}
      testID={testID}>
      <Animated.View style={[animatedStyle, style]} className={className}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default AnimatedPressable;
