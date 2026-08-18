import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GET_ACHIEVEMENTS } from '~/Graphql/Queries';
import { useColorScheme } from '~/hooks/useColorScheme';
import { hud, brand, TYPE, Num, RADIUS } from '~/components/hud';
import AnimatedPressable from '~/components/AnimatedPressable';

interface AchievementRow {
  id: string;
  name: string;
  icon?: string;
  earned: boolean;
  progress: number;
  target: number;
}

/**
 * The one achievement the user is closest to, on the screen they open daily.
 *
 * Achievements previously lived behind a tile on the account tab and a
 * two-second toast — a system with forty-three entries that a user could go
 * weeks without seeing. This is deliberately a ROW and not a card: Home's header
 * is already TodayCard + RankCard + the widget offer, and a fourth panel would
 * push the quest log below the fold for a nudge, which is the wrong trade.
 *
 * Renders nothing when there is nothing close — an empty progress bar is worse
 * than no bar, and a brand-new user has forty-three of them.
 */
const NextAchievementRow = ({ isDark: isDarkProp }: { isDark?: boolean }) => {
  const scheme = useColorScheme();
  const isDark = isDarkProp ?? scheme === 'dark';
  const c = hud(isDark);

  // cache-and-network: progress moves on every completed task, and a stale
  // "5 / 7" on the screen that caused the change is the whole failure mode this
  // row exists to fix. Shares a cache entry with the achievements screen.
  const { data } = useQuery(GET_ACHIEVEMENTS, { fetchPolicy: 'cache-and-network' });

  const next = useMemo<AchievementRow | null>(() => {
    const all: AchievementRow[] = data?.getAchievements?.achievements ?? [];
    const locked = all.filter((a) => !a.earned && a.target > 0 && a.progress > 0);
    if (locked.length === 0) return null;

    // Closest by fraction; ties go to the smaller target so "1 more task" wins
    // over "500 more XP".
    return locked.sort((a, b) => {
      const ra = a.progress / a.target;
      const rb = b.progress / b.target;
      if (rb !== ra) return rb - ra;
      return a.target - b.target;
    })[0];
  }, [data]);

  if (!next) return null;

  const remaining = Math.max(next.target - next.progress, 0);
  const pct = Math.min(next.progress / next.target, 1);

  return (
    <AnimatedPressable
      onPress={() => router.push('/(screens)/achievements')}
      accessibilityLabel={`${next.name}, ${next.progress} of ${next.target}. View achievements`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: RADIUS.md,
        backgroundColor: c.panel,
        borderWidth: 1,
        borderColor: c.panelBorder,
      }}>
      <Text style={{ fontSize: 18 }}>{next.icon || '🏆'}</Text>

      <View style={{ flex: 1, gap: 5 }}>
        <Text style={[TYPE.label(13), { color: c.text }]} numberOfLines={1}>
          {remaining} to go — {next.name}
        </Text>
        <View
          style={{
            height: 4,
            borderRadius: RADIUS.pill,
            backgroundColor: c.track,
            overflow: 'hidden',
          }}>
          <View
            style={{
              height: '100%',
              width: `${Math.round(pct * 100)}%`,
              borderRadius: RADIUS.pill,
              backgroundColor: brand.violet,
            }}
          />
        </View>
      </View>

      <Num size={11} color={c.textFaint}>
        {next.progress}/{next.target}
      </Num>
      <Ionicons name="chevron-forward" size={14} color={c.textFaint} />
    </AnimatedPressable>
  );
};

export default NextAchievementRow;
