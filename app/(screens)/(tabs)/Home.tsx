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
import { useQuery } from '@apollo/client';
import { CURRENT_USER, MY_SHARDS } from '~/Graphql/Queries';
import { avatarUri } from '~/helpers/avatarUri';
import { ACCENT } from '~/components/shard/constants';

const AVATAR_ANIMATION_RANGE = 120;

const ShardLogo = ({ color }: { color: string }) => (
  <Text
    style={{
      fontSize: 26,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: 3,
      color,
      paddingVertical: 16,
    }}>
    SH<Text style={{ color: ACCENT }}>▲</Text>RD
  </Text>
);

const Home = () => {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const isDark = useColorScheme() === 'dark';
  const scrollY = useSharedValue(0);
  const shardListRef = useRef<FlatList>(null);

  const { refetch: refetchUser } = useQuery(CURRENT_USER, {
    onCompleted: (data) => {
      if (data?.currentUser?.user) setUser(data.currentUser.user);
    },
  });

  const { data, loading, refetch } = useQuery(MY_SHARDS, { fetchPolicy: 'cache-and-network' });
  const shards = data?.myShards?.shards || [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchUser()]);
    setRefreshing(false);
  }, [refetch, refetchUser]);

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

  const outerBg = isDark ? '#0f0f0f' : '#eaeaf5';
  const panelBg = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1a1a1a';
  const subColor = isDark ? '#9ca3af' : '#6b7280';

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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 13, color: subColor }}>Welcome,</Text>
                    {user?.subscriptionTier === 'pro' && (
                      <View
                        style={{
                          backgroundColor: '#FFD700',
                          paddingHorizontal: 4,
                          paddingVertical: 1,
                          borderRadius: 4,
                        }}>
                        <Text style={{ fontSize: 8, fontWeight: '900', color: '#000' }}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: textColor }}>
                    {user.username}
                  </Text>
                  {/* XP mini-bar */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                    <View
                      style={{
                        width: 64,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb',
                        overflow: 'hidden',
                      }}>
                      <View
                        style={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: ACCENT,
                          width: `${Math.min(((user.xp || 0) / ((user.level || 1) * 1000)) * 100, 100)}%`,
                        }}
                      />
                    </View>
                    <Text style={{ fontSize: 10, color: ACCENT, fontWeight: '700' }}>
                      Lv {user.level || 1}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </Animated.View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {(user?.currentStreak ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 14 }}>🔥</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#f97316' }}>
                  {user?.currentStreak}
                </Text>
              </View>
            )}
            <AnimatedPressable
              onPress={() => router.push('/notifications')}
              hitSlop={20}
              scaleDown={0.9}>
              <FontAwesome name="bell-o" size={20} color={textColor} />
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* Main panel */}
        <View
          style={{
            flex: 1,
            backgroundColor: panelBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
          }}>
          {loading && shards.length === 0 ? (
            <View style={{ paddingHorizontal: 16 }}>
              <ShardLogo color={textColor} />
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
              <View style={{ marginBottom: 16 }}>
                <AnimatedCrystal />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: textColor,
                  textAlign: 'center',
                  marginBottom: 12,
                }}>
                Start Your Journey
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: subColor,
                  textAlign: 'center',
                  lineHeight: 22,
                  marginBottom: 32,
                }}>
                Create your first Shard to begin tracking your goals and achievements. Break down
                big dreams into actionable steps!
              </Text>
              <AnimatedPressable
                onPress={() => router.push('/new-shard')}
                scaleDown={0.95}
                style={{
                  backgroundColor: ACCENT,
                  borderRadius: 50,
                  paddingHorizontal: 32,
                  paddingVertical: 16,
                  shadowColor: ACCENT,
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}>
                <AntDesign name="plus" size={20} color="#fff" />
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
                  Create Your First Shard
                </Text>
              </AnimatedPressable>
            </ScrollView>
          ) : (
            <Animated.FlatList
              ref={shardListRef}
              data={shards}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={<ShardLogo color={textColor} />}
              renderItem={({ item }) => (
                <ShardCard
                  title={item.title}
                  summary={item.description || 'No description'}
                  image={
                    item.image ||
                    'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=500&auto=format&fit=crop&q=60'
                  }
                  completionRate={item.progress?.completion || 0}
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

        {/* FAB — only when there are shards */}
        {shards.length > 0 && (
          <AnimatedPressable
            onPress={() => router.push('/new-shard')}
            scaleDown={0.9}
            style={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: ACCENT,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: ACCENT,
              shadowOpacity: 0.4,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}>
            <AntDesign name="plus" size={24} color="#fff" />
          </AnimatedPressable>
        )}
      </SafeAreaView>
    </View>
  );
};

export default Home;
