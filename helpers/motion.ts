import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

/**
 * Motion vocabulary.
 *
 * Three problems this exists to fix:
 *
 * 1. **Nothing honoured "reduce motion".** ~350 animation call sites, 38 of them
 *    infinite `withRepeat` loops (pulses, sparkles, shimmer), and no code
 *    anywhere checked the OS accessibility setting. Looping motion is the worst
 *    category for vestibular sensitivity and migraine, and the user had already
 *    asked the system to stop it.
 *
 * 2. **Everything used `withTiming`.** 80 timing calls against 36 springs, which
 *    is backwards for a touch app. The rule below is the fix.
 *
 * 3. **Entrance staggers added latency.** `FadeInDown` × 72 with delays up to
 *    400ms — on `new-shard`, 400ms of cascade before the screen a user opened
 *    specifically to type in was finished assembling.
 *
 * ── THE RULE ──
 * **Spring for anything a finger caused. Timing for anything the system caused.**
 * A spring reads as physical response to touch; a timing curve reads as the app
 * telling you something. Getting these the wrong way round is most of why an
 * interface feels either sluggish or twitchy.
 */

/** Finger-caused: presses, toggles, drags settling. */
export const SPRING: WithSpringConfig = {
  damping: 18,
  stiffness: 220,
  mass: 0.6,
  overshootClamping: false,
};

/** Finger-caused, but must not overshoot (progress bars, widths). */
export const SPRING_TIGHT: WithSpringConfig = {
  damping: 22,
  stiffness: 160,
  mass: 0.8,
  overshootClamping: true,
};

/** System-caused: appear/disappear, colour and opacity crossfades. */
export const TIMING: WithTimingConfig = { duration: 180 };

/**
 * ── The entrance budget ──
 * Delays ≤150ms, entrance durations ≤260ms, stagger steps 30ms capped around
 * five items. Enforced at each call site rather than through a wrapper, so
 * there's one mechanism rather than two. Beyond this, animation stops being
 * polish and becomes latency: a delayed element is one the user cannot touch yet.
 */

/**
 * Whether the user has asked the OS to reduce motion.
 *
 * Reanimated ships its own `useReducedMotion`, but it reads the value once at
 * module init on some versions; this listens, so toggling the setting takes effect
 * without a restart.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted) setReduced(!!v);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      setReduced(!!v)
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}

/**
 * Shared shimmer for skeleton placeholders.
 *
 * Eight skeleton components each hand-rolled the same
 * `withRepeat(withSequence(...), -1, true)` pulse, and none of them checked
 * whether the user had asked for reduced motion — an infinite loop is the worst
 * category of animation for vestibular sensitivity, and a loading screen full of
 * them is the worst place to have one.
 *
 * Note we do NOT pass `0` reps to `withRepeat` to disable it: Reanimated has
 * treated non-positive rep counts as *infinite* in some versions, which would do
 * exactly the opposite of what's intended. Reduced motion holds a static opacity
 * instead.
 */
export function useShimmer(from = 0.4, to = 0.85, halfCycleMs = 750) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(from);

  useEffect(() => {
    if (reduced) {
      // A steady, clearly-placeholder tone. Legible, and it doesn't move.
      opacity.value = withTiming((from + to) / 2, { duration: 120 });
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(to, { duration: halfCycleMs }),
        withTiming(from, { duration: halfCycleMs })
      ),
      -1,
      true
    );
    return () => cancelAnimation(opacity);
  }, [reduced, from, to, halfCycleMs]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

// ─── Haptics ──────────────────────────────────────────────────────────────────

/**
 * Haptics for the moments that matter, wrapped so a failure can never surface
 * and so intensity stays consistent across the app.
 *
 * Task completion had none at all, which is a strange omission for the single
 * most-repeated action in a product built around completing things — the tick was
 * a silent instant swap.
 */
export const haptic = {
  /** A task/step got done. The workhorse. */
  complete: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Undo, or a toggle going back off. Softer than completing. */
  undo: () => {
    Haptics.selectionAsync().catch(() => {});
  },
  /** A milestone: quest finished, level up, streak saved. */
  celebrate: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** Something failed or was refused. */
  reject: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
