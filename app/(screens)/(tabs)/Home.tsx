import AnimatedCrystal from '@/components/AnimatedCrystal';
import React, { useRef, useState, useCallback } from 'react';
import {
  FlatList,
  Image,
  Text,
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
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
import { useQuery, useApolloClient } from '@apollo/client';
import { CURRENT_USER, MY_SHARDS, MY_CHATS } from '~/Graphql/Queries';
import { avatarUri } from '~/helpers/avatarUri';
import { ACCENT } from '~/components/shard/constants';
import { hud, FONT, HudLabel, Mono, ShardBar, RADIUS } from '~/components/hud';
import TodayCard from '~/components/home/TodayCard';
import RankCard from '~/components/home/RankCard';
import WidgetPromptCard from '~/components/home/WidgetPromptCard';
import * as syncService from '~/services/syncService';
import { useUnlocks } from '~/helpers/unlocks';

const AVATAR_ANIMATION_RANGE = 120;

// Quest-log section header — reads like an RPG log, not a centered logo.
const QuestLogHeader = ({ count, isDark }: { count: number; isDark: boolean }) => {
  const c = hud(isDark);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: c.violet, fontSize: 13 }}>◇</Text>
        <HudLabel color={c.textDim} size={13}>Active quests</HudLabel>
      </View>
      <Mono color={c.textFaint} size={13}>{count}</Mono>
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

  const client = useApolloClient();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetch(),
      refetchUser(),
      refetchChats(),
      // Home isn't just shards any more — pull-to-refresh has to refresh the
      // Today and Rank cards too, which own their own queries.
      client.refetchQueries({ include: ['GetMySchedule', 'GetLeaderboard'] }),
    ]);
    setRefreshing(false);
  }, [refetch, refetchUser, refetchChats, client]);

  // The fade leads the collapse. If they finished together the box would still
  // be closing after the content had gone, which is the empty dark bar this
  // used to leave behind; if the collapse led, opaque content would be clipped
  // mid-squeeze. Content is gone by ~66px, the box finishes closing at 120.
  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, AVATAR_ANIMATION_RANGE * 0.55],
      [1, 0],
      Extrapolate.CLAMP
    ),
  }));

  /**
   * The header collapses as you scroll.
   *
   * This used to interpolate `paddingTop`/`paddingBottom`, which are layout
   * properties — every scroll frame forced a Yoga re-layout of the header
   * subtree rather than a compositor-only update. `height` still costs layout,
   * but only of this one measured box, and it's the property that actually has
   * to change for the list to move up; the visual travel rides on `translateY`,
   * which is free.
   *
   * `headerHeight` is measured rather than assumed because the header is an
   * intrinsic-height flex row — its height depends on the username, the XP
   * strip and the user's text-size setting, so no constant would be right.
   */
  const [headerHeight, setHeaderHeight] = useState(0);

  const paddingAnimatedStyle = useAnimatedStyle(() => {
    if (!headerHeight) return {};
    // Collapse the whole header, not just its padding. Shrinking by only the
    // 28px of padding while fading the contents to zero left a full-height
    // block of `outerBg` sitting at the top of the screen — the header
    // appearing to "go dark" rather than get out of the way.
    return {
      height: interpolate(
        scrollY.value,
        [0, AVATAR_ANIMATION_RANGE],
        [headerHeight, 0],
        Extrapolate.CLAMP
      ),
    };
  }, [headerHeight]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Only where floating UI actually overlaps content — at rest there is no
  // overlap, so there should be no effect.
  const scrollEdgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 24], [0, 1], Extrapolate.CLAMP),
  }));

  const c = hud(isDark);
  const outerBg = c.bg;
  const panelBg = c.bgElev;
  const textColor = c.text;
  const subColor = c.textDim;
  const unlocks = useUnlocks();
  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const xpNeeded = level * 1000;
  const xpProgress = Math.min(xp / xpNeeded, 1);
  const xpToGo = Math.max(xpNeeded - xp, 0);

  // Memoized: TodayCard owns mutation + celebration state, so passing a fresh
  // element here would remount it on every Home re-render (refetch, refresh,
  // chat poll) and blow away the celebration mid-animation.
  const ListHeader = React.useMemo(
    () => (
      <>
        <TodayCard isDark={isDark} />
        {/* Revealed once there's someone to compete with, or something to show
            off. Before that it's a dead end taking attention from the first
            quest — see helpers/unlocks.ts. */}
        {unlocks.leaderboard && <RankCard isDark={isDark} />}
        {/* Below the two cards that earn their place daily, not above them —
            this one is an offer, and an offer that displaces the thing the user
            came for is an ad. It renders nothing unless the device can pin a
            widget, hasn't already, and the user hasn't waved it away. */}
        {unlocks.widgetPrompt && <WidgetPromptCard isDark={isDark} />}
        <QuestLogHeader count={shards.length} isDark={isDark} />
      </>
    ),
    [isDark, shards.length, unlocks.leaderboard, unlocks.widgetPrompt]
  );

  return (
    <View style={{ flex: 1, backgroundColor: outerBg }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: outerBg }}>
        {/* Header */}
        <Animated.View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            // Only take the first, uncollapsed measurement — re-measuring while
            // the header is mid-collapse would feed its own output back in.
            //
            // `h` already includes paddingTop + paddingBottom, so it is the
            // natural height as-is; the previous `h + 28` double-counted that
            // padding and left the header 28px too tall at rest. Wait for
            // `user` so we measure the real row rather than HeaderSkeleton,
            // which is a different height.
            if (h > 0 && headerHeight === 0 && user) setHeaderHeight(h);
          }}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 12,
              overflow: 'hidden',
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
                    <HudLabel color={subColor} size={12}>Welcome back</HudLabel>
                    {(user?.subscriptionTier === 'pro' || user?.isInTrial) && (
                      <View style={{ borderWidth: 1, borderColor: c.ember, paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: RADIUS.pill }}>
                        <Text style={{ fontSize: 9, fontFamily: FONT.bold, letterSpacing: 0.3, color: c.ember }}>
                          {user?.subscriptionTier === 'pro' ? 'PRO' : 'TRIAL'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 17, fontFamily: FONT.extrabold, color: textColor, letterSpacing: -0.3, marginTop: 1 }}>
                    {user.username}
                  </Text>
                  {/* XP strip — the raw xp was already fetched and thrown away */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 }}>
                    <Mono color={c.violet} size={10}>Lv {level}</Mono>
                    <ShardBar progress={xpProgress} isDark={isDark} height={4} style={{ width: 72 }} />
                  </View>
                  <Text style={{ fontSize: 10, fontFamily: FONT.regular, color: c.textFaint, marginTop: 3 }}>
                    <Mono color={c.textFaint} size={10}>{xp.toLocaleString()}</Mono>
                    {' / '}
                    <Mono color={c.textFaint} size={10}>{xpNeeded.toLocaleString()}</Mono>
                    {' XP · '}
                    <Mono color={c.textFaint} size={10}>{xpToGo.toLocaleString()}</Mono>
                    {` to Lv ${level + 1}`}
                  </Text>
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

        {/* Quests scroll directly on the page bg — cards float, no muddy tray */}
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          {/*
            Scroll edge effect. The header isn't floating chrome — it's a flex
            sibling, so content doesn't pass beneath it and translucency would
            have nothing to reveal. What it does have is a hard cut where rows
            disappear at its bottom edge. This is a short gradient that fades
            them out into the header instead, and it only appears once there's
            actually something scrolling under it.
          */}
          <Animated.View pointerEvents="none" style={[styles.scrollEdge, scrollEdgeStyle]}>
            <LinearGradient
              colors={[c.bg, `${c.bg}00`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
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
                // Matches the quest list. The tab bar now floats over the scene,
                // so every scroll view has to reserve its height (~94px here).
                paddingBottom: 100,
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
                  colors={[c.violet, c.violetDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: RADIUS.md,
                    paddingHorizontal: 28,
                    paddingVertical: 15,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 9,
                  }}>
                  <AntDesign name="plus" size={17} color="#fff" />
                  <Text style={{ fontSize: 15, fontFamily: FONT.bold, color: '#fff' }}>
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
              ListHeaderComponent={ListHeader}
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
              // NOT removeClippedSubviews: on Android it mis-tracks row positions
              // under a tall ListHeaderComponent — rows still paint, but their
              // touch targets detach and taps do nothing. The list is short
              // (active quests only), so we lose nothing by dropping it.
              onRefresh={onRefresh}
              refreshing={refreshing}
            />
          )}
        </View>

        {/* No FAB here. It pushed `/new-shard`, in the same violet, ~40px from
            the tab bar's centre Forge button, which pushes `/new-shard`. Two
            controls for one action, competing for the same corner. The tab bar
            is the canonical one: it's on every tab, the FAB was on this one. */}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    zIndex: 1,
  },
});

export default Home;
