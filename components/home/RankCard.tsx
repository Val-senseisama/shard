import React, { useMemo } from 'react';
import { View, Text, Image } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GET_LEADERBOARD } from '~/Graphql/Queries';
import { avatarUri } from '~/helpers/avatarUri';
import AnimatedPressable from '~/components/AnimatedPressable';
import { hud, FONT, HudLabel, Num, HudSkeleton, RADIUS } from '~/components/hud';

const MEDALS = ['🥇', '🥈', '🥉'];

interface Entry {
  id: string;
  username: string;
  profilePic?: string | null;
  xp: number;
  level: number;
  rank: number;
  isMe: boolean;
}

/**
 * Rank, in front of the user every session. Social comparison is the strongest
 * retention lever after streaks, and the leaderboard was previously reachable
 * only via an unlabelled trophy icon buried in the Friends header.
 */
const RankCard = ({ isDark: isDarkProp }: { isDark?: boolean }) => {
  const scheme = useColorScheme();
  const isDark = isDarkProp ?? scheme === 'dark';
  const c = hud(isDark);

  // limit:50, NOT 3. The server computes friends-scope `myRank` by finding
  // yourself inside the already-limited slice (Leaderboard.ts), so asking for a
  // top-3 preview returns myRank:null for anyone outside the top 3. 50 also
  // matches what /leaderboard requests, so they share one cache entry and the
  // tap-through is instant.
  const { data, loading } = useQuery(GET_LEADERBOARD, {
    variables: { scope: 'friends', limit: 50 },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  // Only the very first fetch (no cached data at all) should show a skeleton —
  // background refetches (pull-to-refresh, post-task-complete) must not blank the card.
  const initialLoading = loading && data === undefined;

  const board = data?.getLeaderboard;
  const entries: Entry[] = useMemo(() => board?.entries ?? [], [board?.entries]);

  const me = entries.find((e) => e.isMe);
  const top3 = entries.slice(0, 3);

  // The person directly above you — the gap is what creates the urge.
  const ahead = me ? entries.find((e) => e.rank === me.rank - 1) : undefined;
  const gap = me && ahead ? ahead.xp - me.xp : 0;

  // Solo: you're the only entry (no accepted friends). A dead end here is a
  // wasted slot, so send them to add friends.
  const isSolo = entries.length <= 1;

  if (initialLoading) {
    return (
      <View
        style={{
          backgroundColor: c.panel,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: c.panelBorder,
          padding: 16,
          marginTop: 12,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <HudLabel color={c.text} size={15}>
            Rank
          </HudLabel>
          <HudSkeleton isDark={isDark} width={70} height={12} radius={4} />
        </View>
        <View style={{ marginTop: 14, gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <HudSkeleton isDark={isDark} width={14} height={14} radius={4} style={{ marginRight: 8 }} />
              <HudSkeleton isDark={isDark} width={24} height={24} radius={12} style={{ marginRight: 9 }} />
              <View style={{ flex: 1, marginRight: 12 }}>
                <HudSkeleton isDark={isDark} width={i === 0 ? '50%' : '35%'} height={13} radius={4} />
              </View>
              <HudSkeleton isDark={isDark} width={44} height={12} radius={4} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (isSolo) {
    return (
      <AnimatedPressable
        scaleDown={0.98}
        onPress={() => router.push('/(screens)/(tabs)/friends')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.panel,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: c.panelBorder,
          padding: 16,
          marginTop: 12,
        }}>
        <Text style={{ fontSize: 20, marginRight: 12 }}>🏆</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: FONT.semibold, color: c.text }}>Leaderboard</Text>
          <Text style={{ fontSize: 13, fontFamily: FONT.regular, color: c.violet, marginTop: 2 }}>
            Add friends to compete
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      scaleDown={0.98}
      onPress={() => router.push('/(screens)/leaderboard')}
      style={{
        backgroundColor: c.panel,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: c.panelBorder,
        padding: 16,
        marginTop: 12,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <HudLabel color={c.text} size={15}>
          Rank
        </HudLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 12, fontFamily: FONT.regular, color: c.textFaint }}>among friends</Text>
          <Ionicons name="chevron-forward" size={15} color={c.textFaint} />
        </View>
      </View>

      <View style={{ marginTop: 12, gap: 8 }}>
        {top3.map((e, i) => (
          <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, width: 22 }}>{MEDALS[i]}</Text>
            <Image
              source={{ uri: avatarUri(e.profilePic ?? undefined, e.username) }}
              style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.violet, marginRight: 9 }}
            />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: 13,
                fontFamily: e.isMe ? FONT.bold : FONT.regular,
                color: e.isMe ? c.violet : c.textDim,
              }}>
              {e.isMe ? 'You' : e.username}
            </Text>
            <Num color={e.isMe ? c.violet : c.textFaint} size={12}>
              {e.xp.toLocaleString()} XP
            </Num>
          </View>
        ))}

        {/* Your own row, when you're not already in the top 3 */}
        {me && me.rank > 3 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 4 }}>
            <Num color={c.violet} size={12} style={{ width: 22 }}>
              #{me.rank}
            </Num>
            <Image
              source={{ uri: avatarUri(me.profilePic ?? undefined, me.username) }}
              style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.violet, marginRight: 9 }}
            />
            <Text style={{ flex: 1, fontSize: 13, fontFamily: FONT.bold, color: c.violet }}>You</Text>
            <Num color={c.violet} size={12}>
              {me.xp.toLocaleString()} XP
            </Num>
          </View>
        )}
      </View>

      {gap > 0 && ahead && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.panelBorder }}>
          <Text style={{ fontSize: 13, fontFamily: FONT.regular, color: c.textDim }}>
            <Num color={c.ember} size={13}>
              {gap.toLocaleString()} XP
            </Num>{' '}
            behind {ahead.username}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
};

export default React.memo(RankCard);
