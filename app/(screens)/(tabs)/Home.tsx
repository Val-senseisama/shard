import AnimatedCrystal from '@/components/AnimatedCrystal';
import React, { useRef, useState, useCallback } from 'react';
import {
  FlatList,
  Image,
  Text,
  View,
  useColorScheme,
  ScrollView,
  RefreshControl,
} from 'react-native';
import AnimatedPressable from '@/components/AnimatedPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import { LinearGradient } from 'expo-linear-gradient';
import ShardCard from '@/components/ShardCard';
import ShardCardSkeleton from '@/components/ShardCardSkeleton';
import HeaderSkeleton from '@/components/HeaderSkeleton';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useUserStore } from '~/store/user.store';
import { useShardStore } from '~/store/shard.store';
import { useAppStore } from '~/store/app.store';
import { useQuery } from '@apollo/client';
import { CURRENT_USER, MY_SHARDS, MY_CHATS } from '~/Graphql/Queries';
import { avatarUri } from '~/helpers/avatarUri';
import { ACCENT } from '~/components/shard/constants';
import { hud, FONT, HudLabel, Mono, ShardBar } from '~/components/hud';
import * as syncService from '~/services/syncService';

const AVATAR_ANIMATION_RANGE = 120;

// Quest-log section header — reads like an RPG log, not a centered logo.
const QuestLogHeader = ({ count, isDark }: { count: number; isDark: boolean }) => {
  const c = hud(isDark);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: c.violet, fontSize: 13 }}>◇</Text>
        <HudLabel color={c.textDim} size={11}>Active Quests</HudLabel>
      </View>
      <Mono color={c.textFaint} size={11}>{String(count).padStart(2, '0')}</Mono>
    </View>
  );
};

const Home = () => {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const cachedShards = useShardStore((state) => state.shards);
  const setShards = useShardStore((state) => state.setShards);
  const isDark = useColorScheme() === 'dark';
  const scrollY = useSharedValue(0);
  const shardListRef = useRef<FlatList>(null);

  const { refetch: refetchUser } = useQuery(CURRENT_USER, {
    onCompleted: (data) => {
      if (data?.currentUser?.user) {
        setUser(data.currentUser.user);
        syncService.saveUser(data.currentUser.user).catch(console.warn);
      }
    },
  });

  const { data, loading, refetch } = useQuery(MY_SHARDS, {
    fetchPolicy: 'cache-and-network',
    onCompleted: (data) => {
      // ONLY update store and sync if the query was truly successful
      if (data?.myShards?.success && data?.myShards?.shards) {
        setShards(data.myShards.shards);
        syncService.saveShards(data.myShards.shards).catch(console.warn);
      }
    },
    onError: (error) => {
      console.error('Error fetching shards:', error);
      useAppStore
        .getState()
        .addAlert({ str: 'Failed to load shards. Please check your connection.', type: 'error' });
    },
  });
  const shards = data?.myShards?.shards ?? cachedShards;

  // Build chatId → unreadCount map from the chats list.
  // MY_CHATS is cheap (cached server-side) so we run it here without a loading gate.
  const { data: chatsData, refetch: refetchChats } = useQuery(MY_CHATS, {
    fetchPolicy: 'cache-and-network',
  });
  const unreadByChat = React.useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const chat of chatsData?.myChats?.chats ?? []) {
      if (chat.unreadCount > 0) map[chat.id] = chat.unreadCount;
    }
    return map;
  }, [chatsData]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchUser(), refetchChats()]);
    setRefreshing(false);
  }, [refetch, refetchUser, refetchChats]);

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [AVATAR_ANIMATION_RANGE * 0.3, AVATAR_ANIMATION_RANGE],
      [1, 0],
      Extrapolate.CLAMP
    ),
  }));

  const paddingAnimatedStyle = useAnimatedStyle(() => ({
    paddingTop: interpolate(scrollY.value, [0, AVATAR_ANIMATION_RANGE], [16, 0], Extrapolate.CLAMP),
    paddingBottom: interpolate(
      scrollY.value,
      [0, AVATAR_ANIMATION_RANGE],
      [12, 0],
      Extrapolate.CLAMP
    ),
  }));

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const c = hud(isDark);
  const outerBg = c.bg;
  const panelBg = c.bgElev;
  const textColor = c.text;
  const subColor = c.textDim;
  const xpNeeded = (user?.level || 1) * 1000;
  const xpProgress = Math.min((user?.xp || 0) / xpNeeded, 1);

  return (
    <View style={{ flex: 1, backgroundColor: outerBg }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: outerBg }}>
        {/* Header */}
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              backgroundColor: outerBg,
            },
            paddingAnimatedStyle,
          ]}>
          <Animated.View
            style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, avatarAnimatedStyle]}>
            {!user ? (
              <HeaderSkeleton />
            ) : (
              <>
                <Image
                  source={{ uri: avatarUri(user?.profilePic, user?.username) }}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT }}
                  resizeMode="cover"
                />
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <HudLabel color={subColor} size={9}>Welcome back</HudLabel>
                    {(user?.subscriptionTier === 'pro' || user?.isInTrial) && (
                      <View style={{ borderWidth: 1, borderColor: c.ember, paddingHorizontal: 4, paddingVertical: 0.5, borderRadius: 3 }}>
                        <Text style={{ fontSize: 8, fontFamily: FONT.mono, letterSpacing: 1, color: c.ember }}>
                          {user?.subscriptionTier === 'pro' ? 'PRO' : 'TRIAL'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 17, fontFamily: FONT.extrabold, color: textColor, letterSpacing: -0.3, marginTop: 1 }}>
                    {user.username}
                  </Text>
                  {/* XP HUD strip */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 }}>
                    <Mono color={c.violet} size={10}>LV {user.level || 1}</Mono>
                    <ShardBar progress={xpProgress} isDark={isDark} height={4} style={{ width: 72 }} />
                  </View>
                </View>
              </>
            )}
          </Animated.View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {(user?.currentStreak ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 13 }}>🔥</Text>
                <Mono color={c.ember} size={12}>{user?.currentStreak}</Mono>
              </View>
            )}
            <AnimatedPressable
              onPress={() => router.push('/notifications')}
              hitSlop={20}
              scaleDown={0.9}>
              <FontAwesome name="bell-o" size={20} color={subColor} />
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* Main panel */}
        <View
          style={{
            flex: 1,
            backgroundColor: panelBg,
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            borderTopWidth: 1,
            borderColor: c.panelBorder,
            overflow: 'hidden',
          }}>
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: c.violet, opacity: 0.3 }} />
          {loading && shards.length === 0 ? (
            <View style={{ paddingHorizontal: 16 }}>
              <QuestLogHeader count={0} isDark={isDark} />
              <ShardCardSkeleton />
              <ShardCardSkeleton />
              <ShardCardSkeleton />
            </View>
          ) : shards.length === 0 ? (
            <ScrollView
              contentContainerStyle={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 24,
                paddingBottom: 80,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={ACCENT}
                  colors={[ACCENT]}
                />
              }>
              <View style={{ marginBottom: 20 }}>
                <AnimatedCrystal />
              </View>
              <HudLabel color={c.violet} style={{ marginBottom: 12 }}>Quest log empty</HudLabel>
              <Text
                style={{
                  fontSize: 26,
                  fontFamily: FONT.extrabold,
                  color: textColor,
                  textAlign: 'center',
                  letterSpacing: -0.5,
                  marginBottom: 10,
                }}>
                Forge your first Shard
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: FONT.regular,
                  color: subColor,
                  textAlign: 'center',
                  lineHeight: 22,
                  marginBottom: 30,
                }}>
                Name a goal and the AI breaks it into quests, tasks and XP. Big dreams, one shard at a time.
              </Text>
              <AnimatedPressable onPress={() => router.push('/new-shard')} scaleDown={0.95}>
                <LinearGradient
                  colors={['#8b5cf6', '#6d28d9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 8,
                    paddingHorizontal: 28,
                    paddingVertical: 15,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 9,
                  }}>
                  <AntDesign name="plus" size={17} color="#fff" />
                  <Text style={{ fontSize: 13, fontFamily: FONT.mono, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fff' }}>
                    Forge first shard
                  </Text>
                </LinearGradient>
              </AnimatedPressable>
            </ScrollView>
          ) : (
            <Animated.FlatList
              ref={shardListRef}
              data={shards}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={<QuestLogHeader count={shards.length} isDark={isDark} />}
              renderItem={({ item }) => (
                <ShardCard
                  title={item.title}
                  summary={item.description || 'No description'}
                  image={
                    item.image ||
                    'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=500&auto=format&fit=crop&q=60'
                  }
                  completionRate={item.progress?.completion || 0}
                  unreadCount={item.chatId ? (unreadByChat[item.chatId] ?? 0) : 0}
                  participantsCount={item.participantsCount ?? 0}
                  onPress={() => {
                    router.push(`/(screens)/shard/${item.id}`);
                  }}
                />
              )}
              onScroll={onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={50}
              windowSize={7}
              removeClippedSubviews
              onRefresh={onRefresh}
              refreshing={refreshing}
            />
          )}
        </View>

        {/* FAB — crisp shard shortcut, only when there are quests */}
        {shards.length > 0 && (
          <AnimatedPressable
            onPress={() => router.push('/new-shard')}
            scaleDown={0.9}
            style={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              shadowColor: '#7c3aed',
              shadowOpacity: 0.4,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}>
            <LinearGradient
              colors={['#8b5cf6', '#6d28d9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <AntDesign name="plus" size={24} color="#fff" />
            </LinearGradient>
          </AnimatedPressable>
        )}
      </SafeAreaView>
    </View>
  );
};

export default Home;
