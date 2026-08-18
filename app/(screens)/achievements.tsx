import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { brand, hud, FONT, TYPE, RADIUS } from '~/components/hud';
import { useColorScheme } from '~/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client';
import { GET_ACHIEVEMENTS } from '~/Graphql/Queries';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedPressable from '~/components/AnimatedPressable';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const H_PADDING = 16;
const GRID_GAP = 12;
/**
 * Derived from the padding and gap the grid actually uses, not a magic 48.
 *
 * The old constant subtracted only the horizontal padding, so three cards plus
 * their two gaps came to 8px more than the row could hold and the last one
 * wrapped — a three-column grid that has always rendered two. `floor` keeps a
 * fractional device width from re-creating the same overflow.
 */
const ITEM_SIZE = Math.floor(
  (width - H_PADDING * 2 - GRID_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT
);

/** How many "closest to unlocking" rows sit at the top. */
const NEXT_UP_COUNT = 3;

interface AchievementRow {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  rarity: string;
  earned: boolean;
  progress: number;
  target: number;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#eab308',
};

const CATEGORY_LABELS: Record<string, string> = {
  xp: 'Experience',
  streak: 'Streaks',
  social: 'Friends',
  shard: 'Quests',
  quest: 'Tasks',
  special: 'Special',
};

const RarityBadge = ({ rarity }: { rarity: string }) => (
  <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[rarity] || RARITY_COLORS.common }]}>
    <Text style={styles.rarityText}>{rarity.charAt(0).toUpperCase() + rarity.slice(1)}</Text>
  </View>
);

/**
 * A locked achievement, told properly.
 *
 * The old card showed an emoji, a name and a padlock — the description was
 * fetched and thrown away, so "Getting Started" gave a user no way to know what
 * it wanted. A goal you can't read isn't a goal. This row is the description
 * plus the arithmetic: what you've done, out of what it takes.
 */
const LockedRow = ({
  item,
  palette,
  delay = 0,
}: {
  item: AchievementRow;
  palette: ReturnType<typeof hud>;
  delay?: number;
}) => {
  const pct = item.target > 0 ? Math.min(item.progress / item.target, 1) : 0;
  const started = item.progress > 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(240).delay(delay)}
      style={[styles.row, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
      <View style={[styles.rowIcon, { backgroundColor: palette.track }]}>
        <Text style={styles.rowIconText}>{item.icon || '🏆'}</Text>
      </View>

      <View style={styles.rowBody}>
        <Text style={[TYPE.title(14), { color: palette.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[TYPE.body(12), { color: palette.textDim }]} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.progressRow}>
          <View style={[styles.track, { backgroundColor: palette.track }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.round(pct * 100)}%`,
                  backgroundColor: started ? brand.violet : 'transparent',
                },
              ]}
            />
          </View>
          {/* Numerals in mono — the one place the mono rule applies. */}
          <Text style={[TYPE.num(11), { color: palette.textFaint }]}>
            {item.progress} / {item.target}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

/** An earned badge. No explanation needed — it's a trophy, not a target. */
const EarnedCard = ({
  item,
  palette,
}: {
  item: AchievementRow;
  palette: ReturnType<typeof hud>;
}) => (
  <Animated.View
    entering={FadeInDown.duration(240)}
    style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
    <View style={[styles.iconContainer, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
      <Text style={styles.iconText}>{item.icon || '🏆'}</Text>
    </View>
    <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
      {item.name}
    </Text>
    <RarityBadge rarity={item.rarity} />
  </Animated.View>
);

const AchievementsScreen = () => {
  const isDark = useColorScheme() === 'dark';
  const palette = hud(isDark);
  const [showAllLocked, setShowAllLocked] = useState(false);

  const { data, loading } = useQuery(GET_ACHIEVEMENTS, {
    fetchPolicy: 'cache-and-network',
  });

  // Memoised so the `|| []` fallback doesn't hand the memos below a fresh array
  // identity on every render.
  const achievements: AchievementRow[] = useMemo(
    () => data?.getAchievements?.achievements ?? [],
    [data]
  );

  const { earned, nextUp, remainingLocked } = useMemo(() => {
    const earnedList = achievements.filter((a) => a.earned);
    const locked = achievements.filter((a) => !a.earned);

    // Closest to done first. Ties break on the smaller target, so "1 more task"
    // outranks "500 more XP" at the same percentage.
    const byCloseness = [...locked].sort((a, b) => {
      const ra = a.target > 0 ? a.progress / a.target : 0;
      const rb = b.target > 0 ? b.progress / b.target : 0;
      if (rb !== ra) return rb - ra;
      return a.target - b.target;
    });

    return {
      earned: earnedList,
      nextUp: byCloseness.slice(0, NEXT_UP_COUNT),
      remainingLocked: byCloseness.slice(NEXT_UP_COUNT),
    };
  }, [achievements]);

  const lockedByCategory = useMemo(() => {
    const groups: Record<string, AchievementRow[]> = {};
    remainingLocked.forEach((a) => {
      (groups[a.category] ||= []).push(a);
    });
    return Object.entries(groups);
  }, [remainingLocked]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} hitSlop={20} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </AnimatedPressable>
        <Text style={[TYPE.title(18), { color: palette.text }]}>Achievements</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient
          colors={[brand.violet, brand.violetDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressCard}>
          <View>
            <Text style={styles.progressLabel}>Your Progress</Text>
            <Text style={styles.progressValue}>
              {earned.length} / {achievements.length}
            </Text>
          </View>
          <View style={styles.trophyIcon}>
            <Ionicons name="trophy" size={40} color="rgba(255,255,255,0.3)" />
          </View>
        </LinearGradient>

        {/* Next up — the whole point of the screen for anyone not yet finished. */}
        {nextUp.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textDim }]}>Next up</Text>
            {nextUp.map((item, i) => (
              <LockedRow key={item.id} item={item} palette={palette} delay={i * 30} />
            ))}
          </View>
        )}

        {earned.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textDim }]}>
              Earned · {earned.length}
            </Text>
            <View style={styles.grid}>
              {earned.map((item) => (
                <EarnedCard key={item.id} item={item} palette={palette} />
              ))}
            </View>
          </View>
        )}

        {/* Everything else stays folded away. Forty padlocks on first open is
            not a goal list, it's a wall. */}
        {remainingLocked.length > 0 && (
          <View style={styles.section}>
            <AnimatedPressable
              onPress={() => setShowAllLocked((v) => !v)}
              style={[
                styles.showAll,
                { backgroundColor: palette.panel, borderColor: palette.panelBorder },
              ]}>
              <Text style={[TYPE.label(13), { color: palette.textDim }]}>
                {showAllLocked ? 'Hide' : 'Show'} {remainingLocked.length} more
              </Text>
              <Ionicons
                name={showAllLocked ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={palette.textDim}
              />
            </AnimatedPressable>

            {showAllLocked &&
              lockedByCategory.map(([category, items]) => (
                <View key={category} style={{ marginTop: 16 }}>
                  <Text style={[styles.sectionTitle, { color: palette.textFaint }]}>
                    {CATEGORY_LABELS[category] || category}
                  </Text>
                  {items.map((item) => (
                    <LockedRow key={item.id} item={item} palette={palette} />
                  ))}
                </View>
              ))}
          </View>
        )}

        {loading && achievements.length === 0 && (
          <View style={styles.center}>
            <Text style={[TYPE.body(14), { color: palette.textDim }]}>
              Loading your achievements...
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressCard: {
    margin: 16,
    padding: 24,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: FONT.semibold,
  },
  progressValue: {
    color: '#fff',
    fontSize: 28,
    fontFamily: FONT.mono,
    marginTop: 4,
  },
  trophyIcon: {
    opacity: 0.8,
  },
  section: {
    marginTop: 8,
    // Shares the constant ITEM_SIZE is derived from — change one and the grid
    // follows, instead of silently losing a column.
    paddingHorizontal: H_PADDING,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    letterSpacing: 0.2,
    marginBottom: 12,
  },

  // ── Locked row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: {
    fontSize: 22,
    // Locked, but still legible — a fully dimmed emoji reads as broken.
    opacity: 0.75,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },

  // ── Earned card ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  card: {
    width: ITEM_SIZE,
    padding: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconText: {
    fontSize: 24,
  },
  name: {
    fontSize: 11,
    fontFamily: FONT.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  rarityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  rarityText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: FONT.bold,
  },

  showAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
});

export default AchievementsScreen;
