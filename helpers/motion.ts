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

/**
 * ── Springs, in the two terms that actually describe feel ──
 *
 * Reanimated takes the physics triplet (damping / stiffness / mass), but nobody
 * can feel those. The two parameters that describe a spring's behaviour are:
 *
 *   **damping ratio** ζ = damping / (2·√(stiffness · mass))
 *     1.0 = critically damped, settles with no overshoot. Below 1.0 overshoots
 *     and oscillates; lower is bouncier.
 *
 *   **response** T = 2π·√(mass / stiffness)   — seconds to reach the target.
 *     Not a duration: a spring has no fixed end, the settle emerges from ζ and T.
 *
 * Each constant below records both, so a value can be changed on purpose rather
 * than by nudging numbers until it looks right. `springFrom()` converts the other
 * way when you want to specify feel directly.
 *
 * The house default is a slight underdamp. Reserve real bounce for motion that
 * carried momentum — a flick, a throw, a drag release. Overshoot on something
 * that merely appeared reads as a glitch; overshoot on something you threw reads
 * as physics.
 */

/**
 * Build a spring from the terms you can feel.
 *
 * @param dampingRatio 1.0 = no overshoot, ~0.8 = a little bounce
 * @param response     seconds to reach the target
 */
export function springFrom(dampingRatio: number, response: number): WithSpringConfig {
  const mass = 1;
  const stiffness = mass * Math.pow((2 * Math.PI) / response, 2);
  return {
    mass,
    stiffness,
    damping: dampingRatio * 2 * Math.sqrt(stiffness * mass),
    overshootClamping: false,
  };
}

/** Finger-caused: presses, toggles, drags settling. ζ ≈ 0.78, response ≈ 0.33s. */
export const SPRING: WithSpringConfig = {
  damping: 18,
  stiffness: 220,
  mass: 0.6,
  overshootClamping: false,
};

/**
 * Finger-caused, but must not overshoot (progress bars, widths). ζ ≈ 0.97,
 * response ≈ 0.44s, and clamped besides — a progress bar that sails past 100%
 * and settles back reads as a bug, not as physics.
 */
export const SPRING_TIGHT: WithSpringConfig = {
  damping: 22,
  stiffness: 160,
  mass: 0.8,
  overshootClamping: true,
};

/**
 * Sheets and drawers. ζ = 0.8, response = 0.3s — the values Apple publishes for
 * this exact interaction. A sheet always arrives off a drag, so it has earned its
 * overshoot.
 */
export const SPRING_SHEET: WithSpringConfig = {
  damping: 33.5,
  stiffness: 440,
  mass: 1,
  overshootClamping: false,
};

/** System-caused: appear/disappear, colour and opacity crossfades. */
export const TIMING: WithTimingConfig = { duration: 180 };

// ─── Gesture physics ──────────────────────────────────────────────────────────

/**
 * Where a flick would come to rest if you let it coast.
 *
 * Use this to pick the target of a gesture — the snap point nearest the
 * *projected* endpoint, not the one nearest where the finger happened to lift.
 * That difference is what makes a flick feel like a throw instead of a nudge:
 * a small fast gesture can travel a long way, exactly as it would in the world.
 *
 * This is the exponential-decay form Apple ships in the *Designing Fluid
 * Interfaces* sample code, and it is deliberately NOT the textbook `v²/(2a)`.
 *
 * @param velocity px/s at release
 * @param decelerationRate 0.998 for normal scroll feel, 0.99 for snappier
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary.
 *
 * A hard stop reads as frozen — the user can't tell a limit from a hang. Falling
 * increasingly behind the finger reads as "still responding, but there's nothing
 * more here", which is the honest message and needs no copy.
 *
 * @param overshoot how far past the bound the finger has travelled
 * @param dimension the size of the surface being dragged
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

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
 * Whether the user has asked the OS to reduce transparency.
 *
 * Lives here next to `useReducedMotion` because they're read together and for the
 * same reason: a translucent surface is a system-level accessibility setting, not
 * a style preference. Under this setting, blurred chrome must go frosty or solid
 * — raise the background opacity and drop the blur — or text over it stops being
 * legible for the people who turned it on.
 *
 * iOS-only. Android has no equivalent and resolves `false`, which is correct
 * rather than a gap: there is no setting there to honour.
 */
export function useReduceTransparency(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((v) => {
        if (mounted) setReduced(!!v);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', (v) =>
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
 *
 * ── WHERE TO CALL THESE ──
 *
 * **At the interaction site, on the tap — never inside the view that renders the
 * result.** It is tempting to put the completion haptic inside `TaskCheck` so
 * every tick site gets it for free, and that was the plan until it met the rule
 * it breaks: a haptic must be caused by something the *user* did. `TaskCheck`
 * only knows that `done` changed, not who changed it, so it would also buzz for a
 * refetch that reveals a teammate ticked something, a background sync, or a list
 * re-sort. Feedback with no act behind it is noise, and it trains people to stop
 * noticing the real ones.
 *
 * Fire before awaiting the network, not after. The feedback has to land with the
 * finger; a haptic that arrives 300ms later reads as a glitch rather than a
 * response, and the visual, the sound and the haptic all want the same frame.
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
