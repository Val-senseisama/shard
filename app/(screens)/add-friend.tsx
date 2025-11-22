import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SuggestedUser {
  id: string;
  username: string;
  email: string;
  profilePic: string;
  mutualFriends?: number;
  sharedShards?: number;
}

interface SuggestionCardProps {
  user: SuggestedUser;
  onAddPress: (userId: string) => void;
}

const SuggestionCard = ({ user, onAddPress }: SuggestionCardProps) => {
  const [requested, setRequested] = useState(false);

  const handleAdd = () => {
    setRequested(true);
    onAddPress(user.id);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(100)}
      className="mb-3 flex-row items-center rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
      <Image
        source={{ uri: user.profilePic }}
        className="h-12 w-12 rounded-full bg-gray-200"
      />
      <View className="ml-3 flex-1">
        <Text className="font-bold text-text-primary dark:text-text-dark">
          {user.username}
        </Text>
        <Text className="text-xs text-text-secondary dark:text-text-dark-secondary">
          {user.mutualFriends ? `${user.mutualFriends} mutual friends` : user.email}
        </Text>
      </View>
      <TouchableOpacity
        onPress={handleAdd}
        disabled={requested}
        className="rounded-lg px-4 py-2"
        style={{ backgroundColor: requested ? '#9ca3af' : '#7c3aed' }}>
        <Text className="text-sm font-semibold text-white">
          {requested ? 'Requested' : 'Add'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const AddFriend = () => {
  const colorScheme = useColorScheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SuggestedUser[]>([]);

  // Mock suggestions data
  const suggestions: SuggestedUser[] = [
    {
      id: '1',
      username: 'sarah_dev',
      email: 'sarah@example.com',
      profilePic: 'https://i.pravatar.cc/150?img=1',
      mutualFriends: 3,
    },
    {
      id: '2',
      username: 'mike_fitness',
      email: 'mike@example.com',
      profilePic: 'https://i.pravatar.cc/150?img=2',
      sharedShards: 2,
    },
    {
      id: '3',
      username: 'alex_codes',
      email: 'alex@example.com',
      profilePic: 'https://i.pravatar.cc/150?img=3',
      mutualFriends: 1,
    },
  ];

  const handleSearch = () => {
    // TODO: Implement actual search
    console.log('Searching for:', searchQuery);
  };

  const handleAddFriend = (userId: string) => {
    // TODO: Implement friend request mutation
    console.log('Sending friend request to:', userId);
  };

  const handleQRCode = () => {
    // TODO: Implement QR code scanner/generator
    console.log('Open QR code');
  };

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={20}>
          <AntDesign
            name="arrowleft"
            size={24}
            color={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-text-primary dark:text-text-dark">
          Add Friends
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Search Section */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold text-text-primary dark:text-text-dark">
            Search by Username or Email
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-1 flex-row items-center rounded-xl bg-background-default px-4 py-3 dark:bg-background-dark-paper">
              <Ionicons name="search" size={20} color="#666" style={{ marginRight: 10 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Enter username or email..."
                placeholderTextColor="#666"
                className="flex-1 text-text-primary dark:text-text-dark"
                onSubmitEditing={handleSearch}
              />
            </View>
            <TouchableOpacity
              onPress={handleSearch}
              className="items-center justify-center rounded-xl px-4"
              style={{ backgroundColor: '#7c3aed' }}>
              <Ionicons name="search" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* QR Code Section */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold text-text-primary dark:text-text-dark">
            Quick Add
          </Text>
          <TouchableOpacity
            onPress={handleQRCode}
            className="flex-row items-center rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
            <View
              className="mr-3 items-center justify-center rounded-full p-3"
              style={{ backgroundColor: '#7c3aed' }}>
              <MaterialCommunityIcons name="qrcode-scan" size={24} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-text-primary dark:text-text-dark">
                Scan QR Code
              </Text>
              <Text className="text-xs text-text-secondary dark:text-text-dark-secondary">
                Scan a friend's QR code or share yours
              </Text>
            </View>
            <AntDesign
              name="right"
              size={16}
              color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
            />
          </TouchableOpacity>
        </View>

        {/* Suggestions Section */}
        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-text-primary dark:text-text-dark">
              Suggested for You
            </Text>
            <Text className="text-xs text-text-secondary dark:text-text-dark-secondary">
              Based on mutual friends & shards
            </Text>
          </View>

          {suggestions.length > 0 ? (
            suggestions.map((user) => (
              <SuggestionCard
                key={user.id}
                user={user}
                onAddPress={handleAddFriend}
              />
            ))
          ) : (
            <View className="items-center justify-center rounded-xl bg-background-default py-12 dark:bg-background-dark-paper">
              <Ionicons
                name="people-outline"
                size={48}
                color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
              />
              <Text className="mt-3 text-center text-sm text-text-secondary dark:text-text-dark-secondary">
                No suggestions available
              </Text>
            </View>
          )}
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View className="mb-6">
            <Text className="mb-3 text-sm font-semibold text-text-primary dark:text-text-dark">
              Search Results
            </Text>
            {searchResults.map((user) => (
              <SuggestionCard
                key={user.id}
                user={user}
                onAddPress={handleAddFriend}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddFriend;
