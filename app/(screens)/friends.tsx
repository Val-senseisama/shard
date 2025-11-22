import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  useColorScheme,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client';
import { useFriendsStore, Friend } from '~/store/friends.store';
import { GET_FRIENDS } from '~/Graphql/Queries';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import DrawerNavigation from '~/components/DrawerNavigation';
import { useUserStore } from '~/store/user.store';

type TabType = 'friends' | 'requests' | 'discover';
type RequestSubTab = 'incoming' | 'outgoing';

interface FriendRequest {
  id: string;
  username: string;
  email: string;
  profilePic: string;
  mutualFriends?: number;
  mutualShards?: number;
  timestamp: string;
}

interface FriendCardProps {
  friend: Friend;
  onMenuPress: (friend: Friend) => void;
}

const FriendCard = ({ friend, onMenuPress }: FriendCardProps) => {
  const colorScheme = useColorScheme();
  
  return (
    <Animated.View
      entering={FadeInDown.delay(100)}
      className="mb-3 flex-row items-center rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
      {/* Avatar with status indicator */}
      <View className="relative">
        <Image
          source={{ uri: friend.profilePic }}
          className="h-12 w-12 rounded-full bg-gray-200"
        />
        {/* Status indicator - placeholder for now */}
        <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-gray-400 dark:border-background-dark-paper" />
      </View>

      {/* Friend info */}
      <View className="ml-3 flex-1">
        <Text className="font-bold text-text-primary dark:text-text-dark">
          {friend.username}
        </Text>
        <Text className="text-xs text-text-secondary dark:text-text-dark-secondary">
          {friend.email}
        </Text>
      </View>

      {/* 3-dot menu button */}
      <TouchableOpacity
        onPress={() => onMenuPress(friend)}
        className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
        <MaterialIcons
          name="more-vert"
          size={24}
          color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

interface SwipeableRequestCardProps {
  request: FriendRequest;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onBlock?: (requestId: string) => void;
}

const SwipeableRequestCard = ({ request, onAccept, onDecline, onBlock }: SwipeableRequestCardProps) => {
  const colorScheme = useColorScheme();
  const [isProcessing, setIsProcessing] = useState(false);

  const renderRightActions = () => (
    <View className="flex-row">
      <TouchableOpacity
        onPress={() => {
          setIsProcessing(true);
          onAccept(request.id);
        }}
        disabled={isProcessing}
        className="items-center justify-center px-6"
        style={{ backgroundColor: '#10b981' }}>
        <Ionicons name="checkmark" size={24} color="#fff" />
        <Text className="mt-1 text-xs font-semibold text-white">Accept</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLeftActions = () => (
    <View className="flex-row">
      <TouchableOpacity
        onPress={() => {
          setIsProcessing(true);
          onDecline(request.id);
        }}
        disabled={isProcessing}
        className="items-center justify-center px-6"
        style={{ backgroundColor: '#ef4444' }}>
        <Ionicons name="close" size={24} color="#fff" />
        <Text className="mt-1 text-xs font-semibold text-white">Decline</Text>
      </TouchableOpacity>
      {onBlock && (
        <TouchableOpacity
          onPress={() => {
            setIsProcessing(true);
            onBlock(request.id);
          }}
          disabled={isProcessing}
          className="items-center justify-center px-6"
          style={{ backgroundColor: '#991b1b' }}>
          <Ionicons name="ban" size={24} color="#fff" />
          <Text className="mt-1 text-xs font-semibold text-white">Block</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}>
      <Animated.View
        entering={FadeInDown.delay(100)}
        className="mb-3 flex-row items-center rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
        <Image
          source={{ uri: request.profilePic }}
          className="h-12 w-12 rounded-full bg-gray-200"
        />
        <View className="ml-3 flex-1">
          <Text className="font-bold text-text-primary dark:text-text-dark">
            {request.username}
          </Text>
          <Text className="text-xs text-text-secondary dark:text-text-dark-secondary">
            {request.mutualFriends ? `${request.mutualFriends} mutual friends` : request.email}
            {request.mutualShards ? ` • ${request.mutualShards} shared shards` : ''}
          </Text>
          <Text className="mt-1 text-xs text-text-secondary dark:text-text-dark-secondary">
            {request.timestamp}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => onAccept(request.id)}
            disabled={isProcessing}
            className="rounded-lg px-4 py-2"
            style={{ backgroundColor: '#10b981' }}>
            <Text className="text-sm font-semibold text-white">Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDecline(request.id)}
            disabled={isProcessing}
            className="rounded-lg px-4 py-2"
            style={{ backgroundColor: '#ef4444' }}>
            <Text className="text-sm font-semibold text-white">Decline</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Swipeable>
  );
};

interface ActionMenuProps {
  visible: boolean;
  friend: Friend | null;
  onClose: () => void;
  onAction: (action: string, friend: Friend) => void;
}

const ActionMenu = ({ visible, friend, onClose, onAction }: ActionMenuProps) => {
  const colorScheme = useColorScheme();

  if (!friend) return null;

  const actions = [
    { icon: 'person-outline', label: 'View Profile', action: 'view_profile' },
    { icon: 'add-circle-outline', label: 'Add to Shard', action: 'add_to_shard' },
    { icon: 'person-remove-outline', label: 'Remove Friend', action: 'remove_friend', danger: true },
    { icon: 'ban', label: 'Block', action: 'block', danger: true },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable
        className="flex-1 bg-black/50"
        onPress={onClose}>
        <View className="flex-1 items-center justify-center p-4">
          <Pressable
            className="w-full max-w-sm rounded-2xl bg-background-paper p-2 dark:bg-background-dark-default"
            onPress={(e) => e.stopPropagation()}>
            {/* Friend info header */}
            <View className="flex-row items-center border-b border-gray-200 p-4 dark:border-gray-700">
              <Image
                source={{ uri: friend.profilePic }}
                className="h-12 w-12 rounded-full bg-gray-200"
              />
              <View className="ml-3 flex-1">
                <Text className="font-bold text-text-primary dark:text-text-dark">
                  {friend.username}
                </Text>
                <Text className="text-xs text-text-secondary dark:text-text-dark-secondary">
                  {friend.email}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View className="py-2">
              {actions.map((action, index) => (
                <TouchableOpacity
                  key={action.action}
                  onPress={() => {
                    onAction(action.action, friend);
                    onClose();
                  }}
                  className="flex-row items-center rounded-lg px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Ionicons
                    name={action.icon as any}
                    size={24}
                    color={action.danger ? '#ef4444' : colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                  />
                  <Text
                    className={`ml-3 text-base ${
                      action.danger
                        ? 'text-red-500'
                        : 'text-text-primary dark:text-text-dark'
                    }`}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel button */}
            <TouchableOpacity
              onPress={onClose}
              className="mx-2 mb-2 mt-1 rounded-lg bg-gray-100 py-3 dark:bg-gray-800">
              <Text className="text-center font-semibold text-text-primary dark:text-text-dark">
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const Friends = () => {
  const colorScheme = useColorScheme();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [requestSubTab, setRequestSubTab] = useState<RequestSubTab>('incoming');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'remove' | 'block' | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);
  const [friendToBlock, setFriendToBlock] = useState<Friend | null>(null);
  const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
  const [confirmBlockVisible, setConfirmBlockVisible] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const user = useUserStore((state) => state.user);

  // Mock friend requests data
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([
    {
      id: '1',
      username: 'john_doe',
      email: 'john@example.com',
      profilePic: 'https://i.pravatar.cc/150?img=11',
      mutualFriends: 5,
      mutualShards: 2,
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      username: 'jane_smith',
      email: 'jane@example.com',
      profilePic: 'https://i.pravatar.cc/150?img=12',
      mutualFriends: 3,
      timestamp: '1 day ago',
    },
  ]);

  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([
    {
      id: '3',
      username: 'bob_builder',
      email: 'bob@example.com',
      profilePic: 'https://i.pravatar.cc/150?img=13',
      timestamp: '3 days ago',
    },
  ]);

  const { friends, setFriends, searchQuery, setSearchQuery, filteredFriends } = useFriendsStore();

  const { refetch } = useQuery(GET_FRIENDS, {
    onCompleted: (data) => {
      if (data?.getFriends?.success) {
        setFriends(data.getFriends.friends);
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleMenuPress = (friend: Friend) => {
    setSelectedFriend(friend);
    setMenuVisible(true);
  };

  const handleAction = (action: string, friend: Friend) => {
    console.log(`Action: ${action} for friend:`, friend.username);
    
    switch (action) {
      case 'view_profile':
        router.push({
          pathname: '/friend-profile',
          params: { friendId: friend.id },
        });
        break;
      case 'add_to_shard':
        router.push('/new-shard');
        break;
      case 'remove_friend':
        setFriendToRemove(friend);
        setConfirmRemoveVisible(true);
        break;
      case 'block':
        setFriendToBlock(friend);
        setConfirmBlockVisible(true);
        break;
    }
  };

  const handleConfirmRemove = () => {
    if (friendToRemove) {
      console.log('Removing friend:', friendToRemove.username);
      // TODO: Implement remove friend mutation
      setConfirmRemoveVisible(false);
      setFriendToRemove(null);
    }
  };

  const handleConfirmBlock = () => {
    if (friendToBlock) {
      console.log('Blocking user:', friendToBlock.username);
      // TODO: Implement block user mutation
      setConfirmBlockVisible(false);
      setFriendToBlock(null);
    }
  };

  const handleAcceptRequest = (requestId: string) => {
    console.log('Accepting request:', requestId);
    // TODO: Implement accept mutation
    setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const handleDeclineRequest = (requestId: string) => {
    console.log('Declining request:', requestId);
    // TODO: Implement decline mutation
    setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const handleBlockRequest = (requestId: string) => {
    console.log('Blocking user:', requestId);
    // TODO: Implement block mutation
    setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const handleCancelRequest = (requestId: string) => {
    console.log('Canceling request:', requestId);
    // TODO: Implement cancel mutation
    setOutgoingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const filtered = filteredFriends();

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      <DrawerNavigation isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} user={user} />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 mb-3">
        <TouchableOpacity onPress={() => setIsDrawerOpen(true)}>
          <Ionicons
            name="menu"
            size={24}
            color={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-text-primary dark:text-text-dark">
          Friends
        </Text>
        <TouchableOpacity
        hitSlop={20}
        onPress={() => router.push('/add-friend')}
        >
          <Ionicons
            name="person-add-outline"
            size={20}
            color={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="px-4 pb-4">
        <View className="flex-row items-center rounded-xl bg-background-default px-4 py-3 dark:bg-background-dark-paper">
          <Ionicons name="search" size={20} color="#666" style={{ marginRight: 10 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search friends..."
            placeholderTextColor="#666"
            className="flex-1 text-text-primary dark:text-text-dark"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs - Pill Style */}
      <View className="mb-4 px-4">
        <View className="flex-row justify-between rounded-full p-1">
          <TouchableOpacity
            onPress={() => setActiveTab('friends')}
            className="flex-1 items-center rounded-full py-2"
            style={{ backgroundColor: activeTab === 'friends' ? '#7c3aed' : 'transparent' }}>
            <Text
              className="text-sm font-semibold"
              style={{ color: activeTab === 'friends' ? '#ffffff' : (colorScheme === 'dark' ? '#9ca3af' : '#6b7280') }}>
              Friends
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('requests')}
            className="flex-1 items-center rounded-full py-2"
            style={{ backgroundColor: activeTab === 'requests' ? '#7c3aed' : 'transparent' }}>
            <Text
              className="text-sm font-semibold"
              style={{ color: activeTab === 'requests' ? '#ffffff' : (colorScheme === 'dark' ? '#9ca3af' : '#6b7280') }}>
              Requests
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('discover')}
            className="flex-1 items-center rounded-full py-2"
            style={{ backgroundColor: activeTab === 'discover' ? '#7c3aed' : 'transparent' }}>
            <Text
              className="text-sm font-semibold"
              style={{ color: activeTab === 'discover' ? '#ffffff' : (colorScheme === 'dark' ? '#9ca3af' : '#6b7280') }}>
              Discover
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {activeTab === 'friends' ? (
          filtered.length > 0 ? (
            <Animated.View entering={FadeIn} className="pb-6">
              {filtered.map((friend) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  onMenuPress={handleMenuPress}
                />
              ))}
            </Animated.View>
          ) : (
            <View className="items-center justify-center py-20">
              <Ionicons
                name="people-outline"
                size={64}
                color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
              />
              <Text className="mt-4 text-center text-text-secondary dark:text-text-dark-secondary">
                {searchQuery ? 'No friends found' : 'No friends yet'}
              </Text>
              {!searchQuery && (
                <Text className="mt-2 text-center text-xs text-text-secondary dark:text-text-dark-secondary">
                  Tap the + icon to add friends
                </Text>
              )}
            </View>
          )
        ) : activeTab === 'requests' ? (
          <View>
            {/* Request SubTabs */}
            <View className="mb-4 flex-row gap-2">
              <TouchableOpacity
                onPress={() => setRequestSubTab('incoming')}
                className="flex-1 items-center rounded-lg py-2"
                style={{ backgroundColor: requestSubTab === 'incoming' ? '#7c3aed' : 'transparent', borderWidth: 1, borderColor: '#7c3aed' }}>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: requestSubTab === 'incoming' ? '#ffffff' : '#7c3aed' }}>
                  Incoming ({incomingRequests.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRequestSubTab('outgoing')}
                className="flex-1 items-center rounded-lg py-2"
                style={{ backgroundColor: requestSubTab === 'outgoing' ? '#7c3aed' : 'transparent', borderWidth: 1, borderColor: '#7c3aed' }}>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: requestSubTab === 'outgoing' ? '#ffffff' : '#7c3aed' }}>
                  Outgoing ({outgoingRequests.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Request List */}
            {requestSubTab === 'incoming' ? (
              incomingRequests.length > 0 ? (
                <View className="pb-6">
                  <Text className="mb-3 text-xs text-text-secondary dark:text-text-dark-secondary">
                    💡 Swipe right to accept, left to decline
                  </Text>
                  {incomingRequests.map((request) => (
                    <SwipeableRequestCard
                      key={request.id}
                      request={request}
                      onAccept={handleAcceptRequest}
                      onDecline={handleDeclineRequest}
                      onBlock={handleBlockRequest}
                    />
                  ))}
                </View>
              ) : (
                <View className="items-center justify-center py-20">
                  <Ionicons
                    name="mail-outline"
                    size={64}
                    color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
                  />
                  <Text className="mt-4 text-center text-text-secondary dark:text-text-dark-secondary">
                    No incoming requests
                  </Text>
                </View>
              )
            ) : (
              outgoingRequests.length > 0 ? (
                <View className="pb-6">
                  {outgoingRequests.map((request) => (
                    <Animated.View
                      key={request.id}
                      entering={FadeInDown.delay(100)}
                      className="mb-3 flex-row items-center rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
                      <Image
                        source={{ uri: request.profilePic }}
                        className="h-12 w-12 rounded-full bg-gray-200"
                      />
                      <View className="ml-3 flex-1">
                        <Text className="font-bold text-text-primary dark:text-text-dark">
                          {request.username}
                        </Text>
                        <Text className="text-xs text-text-secondary dark:text-text-dark-secondary">
                          {request.email}
                        </Text>
                        <Text className="mt-1 text-xs text-text-secondary dark:text-text-dark-secondary">
                          Sent {request.timestamp}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleCancelRequest(request.id)}
                        className="rounded-lg px-4 py-2"
                        style={{ backgroundColor: '#6b7280' }}>
                        <Text className="text-sm font-semibold text-white">Cancel</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                </View>
              ) : (
                <View className="items-center justify-center py-20">
                  <Ionicons
                    name="paper-plane-outline"
                    size={64}
                    color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
                  />
                  <Text className="mt-4 text-center text-text-secondary dark:text-text-dark-secondary">
                    No outgoing requests
                  </Text>
                </View>
              )
            )}
          </View>
        ) : (
          <View className="items-center justify-center py-20">
            <Ionicons
              name="compass-outline"
              size={64}
              color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
            />
            <Text className="mt-4 text-center text-text-secondary dark:text-text-dark-secondary">
              Discover new friends
            </Text>
            <Text className="mt-2 text-center text-xs text-text-secondary dark:text-text-dark-secondary">
              Find people with similar interests and goals
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Menu Modal */}
      <ActionMenu
        visible={menuVisible}
        friend={selectedFriend}
        onClose={() => setMenuVisible(false)}
        onAction={handleAction}
      />

      {/* Remove Friend Confirmation */}
      <Modal
        visible={confirmRemoveVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmRemoveVisible(false)}>
        <Pressable
          className="flex-1 bg-black/50"
          onPress={() => setConfirmRemoveVisible(false)}>
          <View className="flex-1 items-center justify-center p-4">
            <Pressable
              className="w-full max-w-sm rounded-2xl bg-background-paper p-6 dark:bg-background-dark-default"
              onPress={(e) => e.stopPropagation()}>
              <View className="mb-4 items-center">
                <View
                  className="mb-4 items-center justify-center rounded-full p-4"
                  style={{ backgroundColor: '#fee2e2' }}>
                  <Ionicons name="person-remove" size={32} color="#ef4444" />
                </View>
                <Text className="mb-2 text-center text-xl font-bold text-text-primary dark:text-text-dark">
                  Remove Friend?
                </Text>
                <Text className="text-center text-sm text-text-secondary dark:text-text-dark-secondary">
                  Are you sure you want to remove {friendToRemove?.username} from your friends?
                </Text>
              </View>
              <View className="gap-3">
                <TouchableOpacity
                  onPress={handleConfirmRemove}
                  className="rounded-lg py-3"
                  style={{ backgroundColor: '#ef4444' }}>
                  <Text className="text-center font-semibold text-white">
                    Remove Friend
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setConfirmRemoveVisible(false)}
                  className="rounded-lg bg-gray-100 py-3 dark:bg-gray-800">
                  <Text className="text-center font-semibold text-text-primary dark:text-text-dark">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Block User Confirmation */}
      <Modal
        visible={confirmBlockVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmBlockVisible(false)}>
        <Pressable
          className="flex-1 bg-black/50"
          onPress={() => setConfirmBlockVisible(false)}>
          <View className="flex-1 items-center justify-center p-4">
            <Pressable
              className="w-full max-w-sm rounded-2xl bg-background-paper p-6 dark:bg-background-dark-default"
              onPress={(e) => e.stopPropagation()}>
              <View className="mb-4 items-center">
                <View
                  className="mb-4 items-center justify-center rounded-full p-4"
                  style={{ backgroundColor: '#fee2e2' }}>
                  <Ionicons name="ban" size={32} color="#991b1b" />
                </View>
                <Text className="mb-2 text-center text-xl font-bold text-text-primary dark:text-text-dark">
                  Block User?
                </Text>
                <Text className="text-center text-sm text-text-secondary dark:text-text-dark-secondary">
                  {friendToBlock?.username} will no longer be able to send you friend requests or see your profile.
                </Text>
              </View>
              <View className="gap-3">
                <TouchableOpacity
                  onPress={handleConfirmBlock}
                  className="rounded-lg py-3"
                  style={{ backgroundColor: '#991b1b' }}>
                  <Text className="text-center font-semibold text-white">
                    Block User
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setConfirmBlockVisible(false)}
                  className="rounded-lg bg-gray-100 py-3 dark:bg-gray-800">
                  <Text className="text-center font-semibold text-text-primary dark:text-text-dark">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default Friends;
