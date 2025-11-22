import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

type QuestTabType = 'collaborations' | 'accountability' | 'completed';

interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface SharedQuest {
  id: string;
  title: string;
  image: string;
  completionRate: number;
  role: 'collaborator' | 'accountability_partner';
}

const FriendProfile = () => {
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<QuestTabType>('collaborations');

  // Mock friend data - in real app, fetch based on params.friendId
  const friend = {
    id: params.friendId as string || '1',
    username: 'john_doe',
    displayName: 'John Doe',
    profilePic: 'https://i.pravatar.cc/150?img=11',
    userId: '@johndoe',
  };

  // Mock badges
  const badges: Badge[] = [
    { id: '1', name: 'Early Bird', icon: '🌅', color: '#f59e0b' },
    { id: '2', name: 'Streak Master', icon: '🔥', color: '#ef4444' },
    { id: '3', name: 'Team Player', icon: '🤝', color: '#3b82f6' },
    { id: '4', name: 'Goal Crusher', icon: '💪', color: '#8b5cf6' },
  ];

  // Mock shared quests
  const collaborations: SharedQuest[] = [
    {
      id: '1',
      title: 'Learn React Native',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500',
      completionRate: 65,
      role: 'collaborator',
    },
    {
      id: '2',
      title: 'Fitness Challenge',
      image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500',
      completionRate: 45,
      role: 'collaborator',
    },
  ];

  const accountability: SharedQuest[] = [
    {
      id: '3',
      title: 'Morning Routine',
      image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?w=500',
      completionRate: 80,
      role: 'accountability_partner',
    },
  ];

  const completed: SharedQuest[] = [
    {
      id: '4',
      title: 'Read 10 Books',
      image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500',
      completionRate: 100,
      role: 'collaborator',
    },
  ];

  const getQuestsForTab = () => {
    switch (activeTab) {
      case 'collaborations':
        return collaborations;
      case 'accountability':
        return accountability;
      case 'completed':
        return completed;
      default:
        return [];
    }
  };

  const handleAddToShard = () => {
    // Navigate to new-shard with friend pre-selected
    router.push({
      pathname: '/new-shard',
      params: { preSelectedFriend: friend.id },
    });
  };

  const handleRemoveFriend = () => {
    // TODO: Show confirmation dialog
    console.log('Remove friend:', friend.id);
  };

  const handleMessage = () => {
    // TODO: Navigate to messaging (future feature)
    console.log('Message friend:', friend.id);
  };

  const quests = getQuestsForTab();

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={20}>
          <AntDesign
            name="arrowleft"
            size={24}
            color={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text-primary dark:text-text-dark">
          Profile
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1">
        {/* Profile Header */}
        <Animated.View entering={FadeIn} className="items-center px-4 py-6">
          <Image
            source={{ uri: friend.profilePic }}
            className="h-24 w-24 rounded-full border-4 border-purple-600 bg-gray-200"
          />
          <Text className="mt-4 text-2xl font-bold text-text-primary dark:text-text-dark">
            {friend.displayName}
          </Text>
          <Text className="mt-1 text-sm text-text-secondary dark:text-text-dark-secondary">
            {friend.userId}
          </Text>
        </Animated.View>

        {/* Badges Section */}
        <View className="mb-6 px-4">
          <Text className="mb-3 text-sm font-semibold text-text-primary dark:text-text-dark">
            Badges Earned
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {badges.map((badge) => (
              <Animated.View
                key={badge.id}
                entering={FadeInDown.delay(100)}
                className="items-center rounded-xl bg-background-default p-3 dark:bg-background-dark-paper"
                style={{ width: '22%' }}>
                <Text style={{ fontSize: 32 }}>{badge.icon}</Text>
                <Text
                  className="mt-1 text-center text-xs font-semibold"
                  style={{ color: badge.color }}>
                  {badge.name}
                </Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Shared Quests Section */}
        <View className="mb-6 px-4">
          <Text className="mb-3 text-sm font-semibold text-text-primary dark:text-text-dark">
            Shared Quests
          </Text>

          {/* Quest Tabs */}
          <View className="mb-4 flex-row gap-2">
            <TouchableOpacity
              onPress={() => setActiveTab('collaborations')}
              className="flex-1 items-center rounded-lg py-2"
              style={{
                backgroundColor: activeTab === 'collaborations' ? '#7c3aed' : 'transparent',
                borderWidth: 1,
                borderColor: '#7c3aed',
              }}>
              <Text
                className="text-xs font-semibold"
                style={{ color: activeTab === 'collaborations' ? '#ffffff' : '#7c3aed' }}>
                Collaborations
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('accountability')}
              className="flex-1 items-center rounded-lg py-2"
              style={{
                backgroundColor: activeTab === 'accountability' ? '#7c3aed' : 'transparent',
                borderWidth: 1,
                borderColor: '#7c3aed',
              }}>
              <Text
                className="text-xs font-semibold"
                style={{ color: activeTab === 'accountability' ? '#ffffff' : '#7c3aed' }}>
                Accountability
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('completed')}
              className="flex-1 items-center rounded-lg py-2"
              style={{
                backgroundColor: activeTab === 'completed' ? '#7c3aed' : 'transparent',
                borderWidth: 1,
                borderColor: '#7c3aed',
              }}>
              <Text
                className="text-xs font-semibold"
                style={{ color: activeTab === 'completed' ? '#ffffff' : '#7c3aed' }}>
                Completed
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quest List */}
          {quests.length > 0 ? (
            quests.map((quest) => (
              <Animated.View
                key={quest.id}
                entering={FadeInDown.delay(100)}
                className="mb-3 overflow-hidden rounded-xl bg-background-default dark:bg-background-dark-paper">
                <Image
                  source={{ uri: quest.image }}
                  className="h-32 w-full bg-gray-200"
                  resizeMode="cover"
                />
                <View className="p-4">
                  <Text className="font-bold text-text-primary dark:text-text-dark">
                    {quest.title}
                  </Text>
                  <View className="mt-2 flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${quest.completionRate}%`,
                            backgroundColor: '#7c3aed',
                          }}
                        />
                      </View>
                    </View>
                    <Text className="ml-3 text-xs font-semibold text-text-secondary dark:text-text-dark-secondary">
                      {quest.completionRate}%
                    </Text>
                  </View>
                  <Text className="mt-2 text-xs capitalize text-text-secondary dark:text-text-dark-secondary">
                    Role: {quest.role.replace('_', ' ')}
                  </Text>
                </View>
              </Animated.View>
            ))
          ) : (
            <View className="items-center justify-center rounded-xl bg-background-default py-12 dark:bg-background-dark-paper">
              <Ionicons
                name="folder-open-outline"
                size={48}
                color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
              />
              <Text className="mt-3 text-center text-sm text-text-secondary dark:text-text-dark-secondary">
                No {activeTab} quests
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="mb-6 gap-3 px-4">
          <TouchableOpacity
            onPress={handleAddToShard}
            className="flex-row items-center justify-center rounded-xl py-4"
            style={{ backgroundColor: '#7c3aed' }}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-base font-semibold text-white">Add to Shard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleMessage}
            className="flex-row items-center justify-center rounded-xl border-2 py-4"
            style={{ borderColor: '#7c3aed' }}>
            <Ionicons name="chatbubble-outline" size={20} color="#7c3aed" style={{ marginRight: 8 }} />
            <Text className="text-base font-semibold" style={{ color: '#7c3aed' }}>
              Message
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRemoveFriend}
            className="flex-row items-center justify-center rounded-xl border-2 py-4"
            style={{ borderColor: '#ef4444' }}>
            <Ionicons name="person-remove-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
            <Text className="text-base font-semibold text-red-500">Remove Friend</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FriendProfile;
