import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useQuery } from '@apollo/client';
import { router } from 'expo-router';
import { GET_ACHIEVEMENTS } from '~/Graphql/Queries';
import { useUserStore } from '~/store/user.store';
import { useColorScheme } from '~/hooks/useColorScheme';
import { hud, RADIUS, Num } from '~/components/hud';
import AnimatedPressable from '~/components/AnimatedPressable';

/** How many badges fit under the XP line without crowding the avatar row. */
const MAX_BADGES = 5;
const DOT = 22;

/**
 * The user's most recent badges, under their level on Home.
 *
 * Earned achievements were previously visible only on their own screen — the
 * trophies were being won and then filed away where nobody looks. This puts the
 * last few where the user already looks every session.
 *
 * Order comes from `User.achievements`, which the server `$push`es in unlock
 * order, so the tail of that array IS "most recent". The registry order that
 * `getAchievements` returns is not — it's the catalogue, sorted by threshold.
 *
 * The container keeps its height whether or not the icons have loaded: Home
 * measures its header exactly once and then drives that height, so an element
 * that appears late would be clipped rather than make room for itself.
 */
const EarnedBadgeStrip = ({ isDark: isDarkProp }: { isDark?: boolean }) => {
  const scheme = useColorScheme();
  const isDark = isDarkProp ?? scheme === 'dark';
  const c = hud(isDark);

  const earnedIds = useUserStore((s) => s.user?.achievements);

  // cache-first: NextAchievementRow already keeps this query warm, and these
  // icons never change. Nothing here is worth a second network round-trip.
  const { data } = useQuery(GET_ACHIEVEMENTS, { fetchPolicy: 'cache-first' });

  const { badges, overflow } = useMemo(() => {
    const ids = earnedIds ?? [];
    if (ids.length === 0) return { badges: [], overflow: 0 };

    const iconById = new Map<string, string>();
    for (const a of data?.getAchievements?.achievements ?? []) {
      iconById.set(a.id, a.icon);
    }

    // Newest first. `slice(-n)` then reverse, so the badge they just earned is
    // the one nearest their name.
    const recent = ids.slice(-MAX_BADGES).reverse();
    return {
      badges: recent.map((id: string) => ({ id, icon: iconById.get(id) })),
      overflow: Math.max(ids.length - MAX_BADGES, 0),
    };
  }, [earnedIds, data]);

  if (badges.length === 0) return null;

  return (
    <AnimatedPressable
      onPress={() => router.push('/(screens)/achievements')}
      accessibilityLabel={`${earnedIds?.length ?? 0} achievements earned. View all`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
        height: DOT,
      }}>
      {badges.map((b) => (
        <View
          key={b.id}
          style={{
            width: DOT,
            height: DOT,
            borderRadius: RADIUS.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.panel,
            borderWidth: 1,
            borderColor: c.panelBorder,
          }}>
          {/* Empty until the catalogue resolves — the circle holds the space so
              the header's one-shot measurement is right either way. */}
          <Text style={{ fontSize: 11 }}>{b.icon ?? ''}</Text>
        </View>
      ))}
      {overflow > 0 && (
        <Num size={10} color={c.textFaint} style={{ marginLeft: 2 }}>
          +{overflow}
        </Num>
      )}
    </AnimatedPressable>
  );
};

export default EarnedBadgeStrip;
