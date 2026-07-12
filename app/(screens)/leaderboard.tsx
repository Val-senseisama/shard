import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client';
import { router } from 'expo-router';
import { GET_LEADERBOARD } from '~/Graphql/Queries';
import { t, ACCENT } from '~/components/shard/constants';

type Entry = {
  id: string;
  username: string;
  profilePic?: string;
  xp: number;
  level: number;
  rank: number;
  isMe: boolean;
};

const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);

export default function LeaderboardScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = t(isDark);
  const [scope, setScope] = useState<'friends' | 'global'>('friends');

  const { data, loading } = useQuery(GET_LEADERBOARD, {
    variables: { scope, limit: 50 },
    fetchPolicy: 'cache-and-network',
  });

  const board = data?.getLeaderboard;
  const entries: Entry[] = board?.entries ?? [];

  const renderRow = ({ item }: { item: Entry }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 14,
        backgroundColor: item.isMe ? 'rgba(124,58,237,0.12)' : theme.card,
        borderWidth: item.isMe ? 1.5 : 1,
        borderColor: item.isMe ? ACCENT : theme.border,
      }}>
      <View style={{ width: 30, alignItems: 'center' }}>
        {medal(item.rank) ? (
          <Text style={{ fontSize: 20 }}>{medal(item.rank)}</Text>
        ) : (
          <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textSecondary }}>{item.rank}</Text>
        )}
      </View>
      {item.profilePic ? (
        <Image source={{ uri: item.profilePic }} style={{ width: 40, height: 40, borderRadius: 20 }} />
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.trackBg, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person" size={20} color={theme.textSecondary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }} numberOfLines={1}>
          {item.username}{item.isMe ? ' (You)' : ''}
        </Text>
        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>Level {item.level}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '800', color: ACCENT }}>{item.xp.toLocaleString()} XP</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>Leaderboard</Text>
      </View>

      {/* Scope toggle */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.card, borderRadius: 12, padding: 4, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border }}>
        {(['friends', 'global'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setScope(s)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: scope === s ? ACCENT : 'transparent' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: scope === s ? '#fff' : theme.textSecondary }}>
              {s === 'friends' ? 'Friends' : 'Global'}
            </Text>
          </Pressable>
        ))}
      </View>

      {board?.myRank != null && (
        <Text style={{ textAlign: 'center', color: theme.textSecondary, fontSize: 13, marginBottom: 8 }}>
          You're ranked <Text style={{ color: ACCENT, fontWeight: '800' }}>#{board.myRank}</Text>
          {scope === 'friends' ? ' among friends' : ' globally'}
        </Text>
      )}

      {loading && entries.length === 0 ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
      ) : entries.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
          <Ionicons name="trophy-outline" size={48} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 12, fontSize: 15 }}>
            {scope === 'friends'
              ? 'Add friends to see how you stack up. Earn XP by completing quests!'
              : 'No rankings yet — complete quests to climb the board.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          renderItem={renderRow}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </SafeAreaView>
  );
}
