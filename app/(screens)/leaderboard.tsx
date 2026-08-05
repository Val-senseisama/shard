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
import { avatarUri } from '~/helpers/avatarUri';
import { hud, FONT, Num } from '~/components/hud';

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
  const c = hud(isDark);
  const [scope, setScope] = useState<'friends' | 'global'>('friends');

  // Same variables as Home's RankCard for the friends scope — shared cache
  // entry, so arriving here from Home renders instantly.
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
        borderRadius: 16,
        backgroundColor: item.isMe ? 'rgba(139,92,246,0.12)' : c.panel,
        borderWidth: 1,
        borderColor: item.isMe ? c.violet : c.panelBorder,
      }}>
      <View style={{ width: 30, alignItems: 'center' }}>
        {medal(item.rank) ? (
          <Text style={{ fontSize: 20 }}>{medal(item.rank)}</Text>
        ) : (
          <Num color={c.textFaint} size={14}>
            {item.rank}
          </Num>
        )}
      </View>

      <Image
        source={{ uri: avatarUri(item.profilePic, item.username) }}
        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.violet }}
      />

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: FONT.bold, color: item.isMe ? c.violet : c.text }} numberOfLines={1}>
          {item.username}
          {item.isMe ? ' (You)' : ''}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: FONT.regular, color: c.textDim, marginTop: 1 }}>
          Level <Num color={c.textDim} size={12}>{item.level}</Num>
        </Text>
      </View>

      <Num color={item.isMe ? c.violet : c.text} size={15}>
        {item.xp.toLocaleString()} XP
      </Num>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text style={{ fontSize: 22, fontFamily: FONT.extrabold, letterSpacing: -0.4, color: c.text }}>
          Leaderboard
        </Text>
      </View>

      {/* Scope toggle */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: c.bgElev,
          borderRadius: 999,
          padding: 4,
          marginHorizontal: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: c.panelBorder,
        }}>
        {(['friends', 'global'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setScope(s)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 999,
              alignItems: 'center',
              backgroundColor: scope === s ? c.violet : 'transparent',
            }}>
            <Text style={{ fontSize: 14, fontFamily: FONT.semibold, color: scope === s ? '#fff' : c.textDim }}>
              {s === 'friends' ? 'Friends' : 'Global'}
            </Text>
          </Pressable>
        ))}
      </View>

      {board?.myRank != null && (
        <Text
          style={{
            textAlign: 'center',
            color: c.textDim,
            fontSize: 13,
            fontFamily: FONT.regular,
            marginBottom: 8,
          }}>
          You're ranked{' '}
          <Num color={c.violet} size={13}>
            #{board.myRank}
          </Num>
          {scope === 'friends' ? ' among friends' : ' globally'}
        </Text>
      )}

      {loading && entries.length === 0 ? (
        <ActivityIndicator color={c.violet} style={{ marginTop: 40 }} />
      ) : entries.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40 }}>🏆</Text>
          <Text
            style={{
              color: c.textDim,
              textAlign: 'center',
              marginTop: 14,
              fontSize: 15,
              lineHeight: 22,
              fontFamily: FONT.regular,
            }}>
            {scope === 'friends'
              ? 'Add friends to see how you stack up. Earn XP by completing quests.'
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
