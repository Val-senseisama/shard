import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Extrapolation,
} from 'react-native-reanimated';
import { hud, RADIUS } from './tokens';
import { useReducedMotion, project, rubberband, SPRING_SHEET, TIMING } from '~/helpers/motion';

/**
 * The app's bottom sheet.
 *
 * Replaces `<Modal animationType="slide">`, which is a fixed-duration OS
 * animation: it cannot be interrupted, carries no velocity, and has no boundary
 * behaviour. `AssignmentSheet` went as far as drawing a drag handle that wasn't
 * draggable — an affordance promising a gesture that didn't exist.
 *
 * What this does instead, and why each part matters:
 *
 *  - **Tracks the finger 1:1**, from wherever it was grabbed. Content and touch
 *    move together or the illusion breaks immediately.
 *  - **Is interruptible.** `onBegin` cancels the running animation and reads the
 *    live on-screen position, so a sheet caught mid-close follows your finger
 *    instead of finishing the close and then reopening. This is the single most
 *    important property here; everything else is refinement.
 *  - **Hands off velocity.** The spring starts at the speed your finger left at,
 *    so there is no seam between dragging and animating.
 *  - **Lands where the gesture was going**, not where it stopped — the target is
 *    the snap point nearest the *projected* resting position. A flick throws the
 *    sheet; a slow drag places it.
 *  - **Resists rather than stops** past the top edge, so a limit reads as a limit
 *    and not as a freeze.
 *  - **Dims continuously with position**, during the drag, not on release.
 *  - **Leaves the way it came in.** Same path, both directions.
 *
 * Gestures do not work inside a React Native `<Modal>` on their own: a Modal
 * renders in a separate native view hierarchy, outside the app's
 * `GestureHandlerRootView`. Hence the nested root below — it is load-bearing.
 */

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isDark: boolean;
  /**
   * Fractions of the sheet's height that count as resting positions, e.g.
   * `[0.5, 1]` for half-open and fully-open. Defaults to fully-open only.
   * Dismissal is always available and doesn't need to be listed.
   */
  detents?: number[];
  /** Hide the drag affordance for sheets that supply their own header. */
  showHandle?: boolean;
  /** Tap-outside-to-dismiss. On by default. */
  dismissOnBackdropPress?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function Sheet({
  visible,
  onClose,
  children,
  isDark,
  detents,
  showHandle = true,
  dismissOnBackdropPress = true,
  style,
}: SheetProps) {
  const c = hud(isDark);
  const reduced = useReducedMotion();
  const { height: screenHeight } = useWindowDimensions();

  // The Modal has to outlive `visible` so the exit animation can play; this is
  // what keeps it mounted until the sheet has actually left.
  const [mounted, setMounted] = useState(visible);

  // Offset from the resting (fully-open) position. 0 = open, `height` = gone.
  const translateY = useSharedValue(screenHeight);
  const sheetHeight = useSharedValue(screenHeight);
  const opacity = useSharedValue(0);
  const grabStart = useSharedValue(0);

  // Read inside a worklet, so it can't be a stale prop capture.
  const reducedSV = useSharedValue(reduced);
  useEffect(() => {
    reducedSV.value = reduced;
  }, [reduced]);

  const detentStops = useSharedValue<number[]>(detents ?? []);
  useEffect(() => {
    detentStops.value = detents ?? [];
  }, [JSON.stringify(detents ?? [])]);

  const handleClosed = useCallback(() => {
    setMounted(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      opacity.value = withTiming(1, { duration: reduced ? 160 : 220 });
      // No travel under reduced motion — it cross-fades into place instead.
      translateY.value = reduced ? 0 : withSpring(0, SPRING_SHEET);
      return;
    }

    if (!mounted) return;

    // Exit along the same path it entered on.
    opacity.value = withTiming(0, { duration: 160 }, (done) => {
      if (done && reducedSV.value) runOnJS(handleClosed)();
    });
    if (!reduced) {
      translateY.value = withSpring(sheetHeight.value, SPRING_SHEET, (done) => {
        if (done) runOnJS(handleClosed)();
      });
    }
    // `mounted` and `handleClosed` are intentionally not deps: this must run on
    // the `visible` edge only, or a re-render mid-animation restarts it.
  }, [visible, reduced]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      // Read the *live* position and kill the in-flight animation. Starting from
      // the target value instead of the presentation value is what produces the
      // visible jump when you grab something mid-motion.
      cancelAnimation(translateY);
      grabStart.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = grabStart.value + e.translationY;
      // Above the open position there is nothing to reveal, so resist instead of
      // following — progressively, the way a real edge behaves.
      translateY.value = next < 0 ? rubberband(next, sheetHeight.value) : next;
    })
    .onEnd((e) => {
      const height = sheetHeight.value;
      // Where this gesture would coast to if left alone. Using the projection
      // rather than the release point is what lets a short fast flick dismiss a
      // sheet that a slow drag of the same distance would not.
      const projected = translateY.value + project(e.velocityY);

      const stops = [0, height];
      for (const d of detentStops.value) stops.push(height * (1 - d));

      let target = stops[0];
      for (const s of stops) {
        if (Math.abs(s - projected) < Math.abs(target - projected)) target = s;
      }

      if (target >= height) {
        // Dismissing: hand the release velocity straight to the spring so there
        // is no seam between the drag and the animation that follows it.
        opacity.value = withTiming(0, { duration: 160 });
        translateY.value = withSpring(
          height,
          { ...SPRING_SHEET, velocity: e.velocityY },
          (done) => {
            if (done) runOnJS(handleClosed)();
          }
        );
      } else {
        translateY.value = withSpring(target, { ...SPRING_SHEET, velocity: e.velocityY });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    // Tied to position, so the dim tracks the drag continuously rather than
    // waiting for release to catch up.
    opacity:
      interpolate(translateY.value, [0, sheetHeight.value], [1, 0], Extrapolation.CLAMP) *
      opacity.value,
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent onRequestClose={onClose} animationType="none" statusBarTranslucent>
      {/* Load-bearing: a Modal renders outside the app's gesture root, so
          without this the pan handler below silently never fires. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View
            pointerEvents={dismissOnBackdropPress ? 'auto' : 'none'}
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
              },
              backdropStyle,
            ]}>
            {dismissOnBackdropPress && (
              <Pressable
                style={{ flex: 1 }}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
              />
            )}
          </Animated.View>

          <GestureDetector gesture={pan}>
            <Animated.View
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (h > 0) sheetHeight.value = h;
              }}
              style={[
                {
                  backgroundColor: c.bg,
                  borderTopLeftRadius: RADIUS.xl,
                  borderTopRightRadius: RADIUS.xl,
                  borderTopWidth: 1,
                  borderColor: c.panelBorder,
                  maxHeight: screenHeight * 0.9,
                  paddingBottom: 34,
                },
                sheetStyle,
                style,
              ]}>
              {showHandle && (
                <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
                  {/* This one is real. */}
                  <View
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: RADIUS.pill,
                      backgroundColor: c.panelBorderStrong,
                    }}
                  />
                </View>
              )}
              {children}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
