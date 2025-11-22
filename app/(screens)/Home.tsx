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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
 import CreateShardButton from '@/components/CreateShardButton';
import CreateShardFAB from '@/components/CreateShardFAB';
import DrawerNavigation from '@/components/DrawerNavigation';
import AppStore from '~/helpers/AppStore';
import ShardCard from '@/components/ShardCard';
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
const Home = () => {
  const user = useUserStore((state) => state.user);
  const { setShards, setSelectedShard } = useShardStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const colorScheme = useColorScheme();
  const scrollY = useSharedValue(0);
  const shardListRef = useRef<FlatList>(null);

  // useEffect(() => {
  //   const fetchUser = async () => {
  //     const userData = await AppStore.get('user');
      
  //     setUser(userData);
  //   };

  //   fetchUser().then(() => {
  //     console.log('User fetched successfully');
  //   });
  // }, []);
  const [shards] = useState([
    {
      id: '1',
      title: 'Personal Growth',
      completionRate: 75,
      image:
        'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=500&auto=format&fit=crop&q=60',
      summary: 'Track daily habits and personal development goals',
    },
    {
      id: '2',
      title: 'Fitness Journey',
      completionRate: 60,
      image:
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&auto=format&fit=crop&q=60',
      summary: 'Workout routines and nutrition planning',
    },
    {
      id: '3',
      title: 'Project Alpha',
      completionRate: 30,
      image:
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60',
      summary: 'Software development milestones and tasks',
    },
    {
      id: '4',
      title: 'Learning Spanish',
      completionRate: 45,
      image:
        'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=500&auto=format&fit=crop&q=60',
      summary: 'Language learning progress and vocabulary',
    },
    {
      id: '5',
      title: 'Home Renovation',
      completionRate: 15,
      image:
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&auto=format&fit=crop&q=60',
      summary: 'Room by room renovation planning and tracking',
    },
    {
      id: '6',
      title: 'Crypto goals: Investor Mind',
      completionRate: 15,
      image:
        'https://images.unsplash.com/photo-1518544801346-3df1c2b6c8a8?w=500&auto=format&fit=crop&q=60',
      summary: 'To build a better Val, follow Idele',
    },
    {
      id: '7',
      title: 'Photography Portfolio',
      completionRate: 80,
      image:
        'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=500&auto=format&fit=crop&q=60',
      summary: 'Showcase your best shots and creative projects',
    },
    {
      id: '8',
      title: 'Travel Bucket List',
      completionRate: 50,
      image:
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=60',
      summary: 'Destinations to visit and experiences to try',
    },
    {
      id: '9',
      title: 'Reading Challenge',
      completionRate: 35,
      image:
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500&auto=format&fit=crop&q=60',
      summary: 'Track your yearly reading goals and favorite books',
    },
    {
      id: '10',
      title: 'Music Practice',
      completionRate: 55,
      image:
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
      summary: 'Daily instrument practice and progress',
    },
    {
      id: '11',
      title: 'Mindfulness & Meditation',
      completionRate: 40,
      image:
        'https://images.unsplash.com/photo-1464983953574-0892a716854b?w=500&auto=format&fit=crop&q=60',
      summary: 'Sessions and techniques for a calmer mind',
    },
    {
      id: '12',
      title: 'Cooking Experiments',
      completionRate: 20,
      image:
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=60',
      summary: 'Try new recipes and track your culinary adventures',
    },
    {
      id: '13',
      title: 'Gardening Journal',
      completionRate: 10,
      image:
        'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?w=500&auto=format&fit=crop&q=60',
      summary: 'Plant care, growth, and garden planning',
    },
  ]);

  // Initialize shard store
  React.useEffect(() => {
    setShards(shards);
  }, []);

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
      <DrawerNavigation isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} user={user} />

      <Animated.View
        className="relative flex flex-row items-center justify-between px-3 bg-background-default dark:bg-background-dark-default" 
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
        <Pressable onPress={() => setIsDrawerOpen(true)}
          hitSlop={20}
          >
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
          <Image
            source={{uri: user?.profilePic}}
            className="h-14 w-14 rounded-full border border-primary-start"
            resizeMode="center"
          />
          {user ? (
            <Text className="font-ibold text-base text-text-primary dark:text-text-dark">
              Welcome {user.username}
            </Text>
          ) : (
            <Text className="font-ibold text-base text-text-primary dark:text-text-dark">
              Loading user data...
            </Text>
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
      className={" bg-background-default px-2 pb-3 dark:bg-background-dark-default"}
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
          className=" flex-1 flex-col items-center bg-background-paper px-4 dark:bg-background-dark-default"
          style={[
            {
              borderRadius: 16,
              height: '100%',
            },
          ]}>
          <Animated.FlatList
            data={shards}
            keyExtractor={(item) => item.title}
            // ListHeaderComponent={() => (
            //   <View
            //     className="w-full"
            //     style={{
            //       minHeight: 75,
            //     }}>
            //     {/* <CreateShardButton /> */}
            //   </View>
            // )}
            renderItem={({ item }) => (
              <ShardCard
                title={item.title}
                summary={item.summary}
                image={item.image}
                completionRate={item.completionRate}
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
          />
        </View>
      </View>
    </SafeAreaView>
    <CreateShardFAB />
    </View>
  );
};

export default Home;
