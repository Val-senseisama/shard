import images from '@/constants/images';
import Session from '@/helpers/Session';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  Text,
  View,
  useColorScheme,
  Pressable,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import CreateShardButton from '@/components/CreateShardButton';
import CreateShardFAB from '@/components/CreateShardFAB';
import DrawerNavigation from '@/components/DrawerNavigation';
import AppStore from '~/helpers/AppStore';
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
import { useQuery } from '@apollo/client';
import { MY_SHARDS } from '~/Graphql/Queries';

const Home = () => {
  const user = useUserStore((state) => state.user);
  const { setShards, setSelectedShard } = useShardStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const colorScheme = useColorScheme();
  const scrollY = useSharedValue(0);
  const shardListRef = useRef<FlatList>(null);

  // Fetch shards from server
  const { data, loading, error, refetch } = useQuery(MY_SHARDS, {
    fetchPolicy: 'cache-and-network',
  });

  const shards = data?.myShards?.shards || [];
  console.log(shards[0]);

  // Initialize shard store with fetched data
  React.useEffect(() => {
    if (shards.length > 0) {
      setShards(shards);
    }
  }, [shards]);

  const AVATAR_MAX_SIZE = 56;
  const AVATAR_MIN_SIZE = 32;
  const AVATAR_TOP_MAX = 0;
  const AVATAR_TOP_MIN = 0;
  const AVATAR_OPACITY_SCROLL = 24;
  const AVATAR_ANIMATION_RANGE = 120; // px scrolled before fully collapsed

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [AVATAR_ANIMATION_RANGE * 0.3, AVATAR_ANIMATION_RANGE],
      [0, 1],
      Extrapolate.CLAMP
    );
    return { opacity: Math.max(0, Math.min(1, opacity)) };
  });

  const avatarAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [AVATAR_ANIMATION_RANGE * 0.3, AVATAR_ANIMATION_RANGE],
      [1, 0],
      Extrapolate.CLAMP
    );
    return { opacity: Math.max(0, Math.min(1, opacity)) };
  });
  // Animated styles for status bar
  const imageAnimatedOtherStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, AVATAR_ANIMATION_RANGE],
      [0, 50],
      Extrapolate.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [0, AVATAR_ANIMATION_RANGE * 0.3],
      [1, 0],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ translateY }],
      opacity: opacity,
    };
  });

  // Animated style for spacer
  const spacerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, AVATAR_ANIMATION_RANGE],
      [AVATAR_MAX_SIZE - 20, 0],
      Extrapolate.CLAMP
    );
    return { height };
  });

  // Animated style for spacer
  const paddingAnimatedStyle = useAnimatedStyle(() => {
    const paddingBottom = interpolate(
      scrollY.value,
      [0, AVATAR_ANIMATION_RANGE],
      [12, 0],
      Extrapolate.CLAMP
    );
    const paddingTop = interpolate(
      scrollY.value,
      [0, AVATAR_ANIMATION_RANGE],
      [24, 0],
      Extrapolate.CLAMP
    );
    return { paddingTop, paddingBottom };
  });

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1 bg-background-paper p-0 dark:bg-background-dark-default">
        <DrawerNavigation
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          user={user}
        />

        <Animated.View
          className="relative flex flex-row items-center justify-between bg-background-default px-3 dark:bg-background-dark-default"
          style={[
            // {
            //   paddingBottom: 24,
            //   paddingTop: 16,
            // },
            paddingAnimatedStyle,
          ]}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 30,
                pointerEvents: 'none',
              },
              imageAnimatedStyle,
            ]}>
            <Image
              source={colorScheme === 'dark' ? images.SmallLogoDark : images.SmallLogoLight}
              resizeMode="contain"
              className="mb-2 h-8"
            />
          </Animated.View>
          <Pressable onPress={() => setIsDrawerOpen(true)} hitSlop={20}>
            <AntDesign
              name="menu-unfold"
              size={20}
              color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
              className="text-text-primary dark:text-text-dark"
            />
          </Pressable>
          <Animated.View
            style={[
              {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingTop: 8,
              },
              avatarAnimatedStyle,
            ]}
            className="flex flex-row items-center gap-2 pt-2">
            {!user ? (
              <HeaderSkeleton />
            ) : (
              <>
                <Image
                  source={{ uri: user?.profilePic }}
                  className="h-14 w-14 rounded-full border border-primary-start"
                  resizeMode="cover"
                />
                <Text className="font-ibold text-base text-text-primary dark:text-text-dark">
                  Welcome {user.username}
                </Text>
              </>
            )}
          </Animated.View>
          <TouchableOpacity onPress={() => router.push('/notifications')}>
            <FontAwesome
              name="bell-o"
              size={20}
              color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
              className="ms-auto text-text-primary dark:text-text-dark"
            />
          </TouchableOpacity>
        </Animated.View>
        <Animated.View
          className={' bg-background-default px-2 pb-3 dark:bg-background-dark-default'}
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: Platform.OS === 'ios' ? 130 : 110,
              zIndex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            },
            imageAnimatedOtherStyle,
          ]}
          pointerEvents="box-none">
          <Image
            source={colorScheme === 'dark' ? images.SmallLogoDark : images.SmallLogoLight}
            resizeMode="contain"
            className="my-2 h-8"
          />
        </Animated.View>
        <Animated.View
          style={[
            {
              height: spacerAnimatedStyle.height,
            },
            spacerAnimatedStyle,
          ]}
          className="bg-background-default dark:bg-background-dark-default"
        />
        <View className="flex-1 flex-col items-center  bg-background-default px-2 py-3 dark:bg-background-dark-paper">
          <View
            className=" w-full flex-1 flex-col items-center bg-background-paper px-4 dark:bg-background-dark-default"
            style={[
              {
                borderRadius: 16,
                height: '100%',
              },
            ]}>
            {loading && shards.length === 0 ? (
              <View className="w-full py-4">
                <ShardCardSkeleton />
                <ShardCardSkeleton />
                <ShardCardSkeleton />
                <ShardCardSkeleton />
                <ShardCardSkeleton />
              </View>
            ) : shards.length === 0 ? (
              <View className="flex-1 items-center justify-center px-6 pb-20">
                {/* Icon */}
                <View
                  className="mb-6 items-center justify-center rounded-full"
                  style={{
                    width: 120,
                    height: 120,
                    backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f3f4f6',
                  }}>
                  <Image source={images.FractalShard} className="" resizeMode="center" />
                </View>

                {/* Title */}
                <Text className="mb-3 text-center text-2xl font-bold text-text-primary dark:text-text-dark">
                  Start Your Journey
                </Text>

                {/* Description */}
                <Text className="dark:text-text-dark-secondary mb-8 text-center text-base leading-6 text-text-secondary">
                  Create your first Shard to begin tracking your goals and achievements. Break down
                  big dreams into actionable steps!
                </Text>

                {/* CTA Button */}
                <TouchableOpacity
                  onPress={() => router.push('/new-shard')}
                  className="rounded-full px-8 py-4"
                  style={{ backgroundColor: '#7c3aed' }}>
                  <View className="flex-row items-center gap-2">
                    <AntDesign name="plus" size={20} color="#fff" />
                    <Text className="text-base font-semibold text-white">
                      Create Your First Shard
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <Animated.FlatList
                data={shards}
                keyExtractor={(item) => item.id}
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
                      setSelectedShard(item);
                      router.push({
                        pathname: '/shard-info',
                        params: { shardId: item.id },
                      });
                    }}
                  />
                )}
                onScroll={onScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingBottom: 8, paddingTop: 8 }}
                showsVerticalScrollIndicator={false}
                ref={shardListRef}
                initialNumToRender={10}
                maxToRenderPerBatch={8}
                updateCellsBatchingPeriod={50}
                windowSize={7}
                removeClippedSubviews={true}
                onRefresh={refetch}
                refreshing={loading}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
      {shards.length !== 0 && <CreateShardFAB />}
    </View>
  );
};

export default Home;
