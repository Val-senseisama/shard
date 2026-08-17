import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import AnimatedPressable from '~/components/AnimatedPressable';
import AppStore from '~/helpers/AppStore';
import {
  canPinWidget,
  isWidgetInstalled,
  isWidgetSupported,
  requestPinWidget,
} from '~/modules/shard-widget';
import { hud, FONT, HudButton, RADIUS } from '~/components/hud';

/**
 * Not in APPSTORE_KEYS, so it survives a sign-out.
 *
 * The dismissal is about this phone's home screen, not about the account — a
 * user who said "no thanks" and later signs back in has not changed their mind
 * about their home screen, and asking again would read as the app not listening.
 */
const DISMISSED_KEY = 'widgetPromptDismissed';

/**
 * Offers to put the widget on the home screen.
 *
 * The widget was shipped with no way to discover it: Android buries widgets
 * behind a long-press on the wallpaper, which is a gesture most people never
 * perform, so adoption of an un-promoted widget rounds to zero. That matters
 * more here than for most apps — the widget exists to remove the "open the app,
 * find the thing, tick it" friction on the exact days someone is least likely to
 * open the app at all.
 *
 * Four conditions have to hold before this renders, and they are checked in
 * increasing order of cost:
 *
 *   1. the platform has widgets at all         (isWidgetSupported, sync)
 *   2. the user has a streak worth protecting  (unlocks.widgetPrompt, caller)
 *   3. they haven't dismissed it               (AsyncStorage, async)
 *   4. the launcher can pin, and hasn't        (native calls, sync)
 *
 * Renders nothing until all four resolve, so it never flashes in and then
 * disappears on a device that was always going to fail one of them.
 */
const WidgetPromptCard = ({ isDark }: { isDark: boolean }) => {
  const c = hud(isDark);
  const [visible, setVisible] = useState(false);

  const evaluate = useCallback(async () => {
    if (!isWidgetSupported) return;

    const dismissed = await AppStore.get(DISMISSED_KEY);
    if (dismissed) return;

    // Both native, both cheap — one AppWidgetManager lookup each.
    setVisible(canPinWidget() && !isWidgetInstalled());
  }, []);

  useEffect(() => {
    evaluate();

    // Pinning happens in the launcher's UI, not ours, so the only way to learn
    // that it worked is to look again when we come back. Without this the card
    // sits there congratulating itself until the next cold start.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') evaluate();
    });
    return () => sub.remove();
  }, [evaluate]);

  const onAdd = useCallback(() => {
    // No haptic: the launcher's dialog appearing is the feedback, and the
    // vocabulary in helpers/motion is named for task outcomes — borrowing
    // `complete` for a button tap would misdescribe it at every later read.
    //
    // Deliberately not hidden on success: `requestPinWidget` reports that the
    // dialog was raised, not that the user accepted it, and hiding here would
    // make a cancelled dialog look like it worked. The AppState listener above
    // resolves it a moment later either way.
    requestPinWidget();
  }, []);

  const onDismiss = useCallback(() => {
    setVisible(false);
    AppStore.set(DISMISSED_KEY, true);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={{
        backgroundColor: c.panel,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: c.panelBorder,
        padding: 16,
        marginTop: 16,
        flexDirection: 'row',
        gap: 12,
      }}>
      {/* The wordmark's shard, the same mark the widget itself carries — this
          card is a picture of what the user is about to get. */}
      <Text style={{ fontSize: 20, color: c.violet, lineHeight: 24 }}>▲</Text>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: FONT.bold, color: c.text }}>
          Keep your streak on the home screen
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: FONT.regular,
            color: c.textDim,
            marginTop: 3,
            lineHeight: 19,
          }}>
          One tap to finish today's task without opening Shard.
        </Text>

        {/* Spacing goes on a wrapper, not HudButton's `style`: that prop lands
            on AnimatedPressable's *inner* view, which is the trap documented on
            the component. */}
        <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
          <HudButton label="Add widget" onPress={onAdd} isDark={isDark} size="sm" />
        </View>
      </View>

      <AnimatedPressable
        onPress={onDismiss}
        scaleDown={0.9}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss widget suggestion"
        containerStyle={{ alignSelf: 'flex-start' }}>
        <Ionicons name="close" size={18} color={c.textFaint} />
      </AnimatedPressable>
    </Animated.View>
  );
};

export default WidgetPromptCard;
