import React, { useCallback, useEffect } from 'react';
import { View, Text, AppState } from 'react-native';
import { useQuery } from '@apollo/client';
import { router, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Notifications from 'expo-notifications';
import { GET_UNREAD_NOTIFICATION_COUNT } from '~/Graphql/Queries';
import { useColorScheme } from '~/hooks/useColorScheme';
import { hud, FONT, RADIUS } from '~/components/hud';
import AnimatedPressable from '~/components/AnimatedPressable';
import notificationService from '~/services/notificationService';

/** Past this the exact number stops being information and starts being noise. */
const MAX_SHOWN = 9;

/**
 * The bell, with the count on it.
 *
 * `getUnreadNotificationCount` already existed and was queried in exactly one
 * place: inside the notifications screen — the screen you reach by tapping the
 * bell, at the moment the count is about to become zero. So nothing ever told a
 * user there was something to read, and the badge only existed on the OS app
 * icon.
 *
 * The count is fetched here rather than in Home so the refresh triggers live
 * next to the thing they refresh. Apollo stores this query under one root-query
 * field, so the notifications screen marking everything read updates this badge
 * through the shared cache without either component knowing about the other.
 */
const NotificationBell = ({ color }: { color: string }) => {
  const isDark = useColorScheme() === 'dark';
  const c = hud(isDark);

  const { data, refetch } = useQuery(GET_UNREAD_NOTIFICATION_COUNT, {
    fetchPolicy: 'cache-and-network',
  });

  const count: number = data?.getUnreadNotificationCount?.count ?? 0;

  const refresh = useCallback(() => {
    refetch().catch(() => {
      // Offline. The cached count stays on screen, which is the honest answer
      // until we can ask again.
    });
  }, [refetch]);

  // Returning to Home — most often from the notifications screen, having just
  // read them.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    // A push that lands while the app is open. The service's own listener only
    // logs; this is the first thing that actually reacts to one.
    const received = Notifications.addNotificationReceivedListener(() => refresh());

    // A push that landed while the app was backgrounded never fires the
    // listener above, so the count is stale the moment they come back.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      received.remove();
      appState.remove();
    };
  }, [refresh]);

  // Keep the OS app-icon badge honest too. It was only ever written from the
  // notifications screen, so it kept counting things the user had already read
  // everywhere else.
  useEffect(() => {
    notificationService.setBadgeCount(count).catch(() => {});
  }, [count]);

  return (
    <AnimatedPressable
      onPress={() => router.push('/notifications')}
      hitSlop={20}
      scaleDown={0.9}
      accessibilityLabel={
        count > 0 ? `Notifications, ${count} unread` : 'Notifications'
      }>
      <View>
        <FontAwesome name={count > 0 ? 'bell' : 'bell-o'} size={20} color={color} />

        {count > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -5,
              right: -7,
              minWidth: 16,
              height: 16,
              paddingHorizontal: 4,
              borderRadius: RADIUS.pill,
              backgroundColor: c.danger,
              alignItems: 'center',
              justifyContent: 'center',
              // Cuts the badge away from the bell's own strokes so the number
              // stays readable against a busy glyph.
              borderWidth: 1.5,
              borderColor: c.bg,
            }}>
            <Text
              style={{
                // Numerals — mono, per the rule in components/hud. Not the Num
                // primitive: this needs a fixed white on the danger fill and a
                // line height tuned to a 16px pill.
                fontFamily: FONT.mono,
                fontSize: 9,
                lineHeight: 11,
                color: '#fff',
              }}>
              {count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}
            </Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
};

export default NotificationBell;
