import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import ConfirmModal from '~/components/ConfirmModal';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useQuery, useLazyQuery } from '@apollo/client';
import { useFriendsStore, Friend } from '~/store/friends.store';
import {
  GET_FRIENDS,
  GET_PENDING_REQUESTS,
  GET_FRIEND_SUGGESTIONS,
  SEARCH_USERS,
} from '~/Graphql/Queries';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useMutation } from '@apollo/client';
import Toast from 'react-native-toast-message';
import {
  UNFRIEND,
  BLOCK_USER,
  ACCEPT_FRIEND_REQUEST,
  REJECT_FRIEND_REQUEST,
  CANCEL_FRIEND_REQUEST,
  SEND_FRIEND_REQUEST,
} from '~/Graphql/Mutations';
import { useAppStore } from '~/store/app.store';
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
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/friend-profile',
          params: {
            friendId: friend.id,
            username: friend.username,
            profilePic: friend.profilePic || '',
            email: friend.email || '',
            isOnline: friend.isOnline ? '1' : '0',
          },
        })
      }>
      <View className="mb-3 flex-row items-center rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
        {/* Avatar with status indicator */}
        <View className="relative">
          <Image
            source={{ uri: friend.profilePic }}
            className="h-12 w-12 rounded-full bg-gray-200"
          />
          <View
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-background-dark-paper"
            style={{ backgroundColor: friend.isOnline ? '#10b981' : '#9ca3af' }}
          />
        </View>

        {/* Friend info */}
        <View className="ml-3 flex-1">
          <Text className="font-bold text-text-primary dark:text-text-dark">{friend.username}</Text>
          <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
            {friend.isOnline
              ? 'Online'
              : friend.lastActive
                ? `Active ${new Date(parseInt(friend.lastActive)).toLocaleDateString()}`
                : friend.email}
          </Text>
        </View>

        {/* 3-dot menu button */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onMenuPress(friend);
          }}
          hitSlop={10}
          className="rounded-full p-2">
          <MaterialIcons
            name="more-vert"
            size={24}
            color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
          />
        </Pressable>
      </View>
    </TouchableOpacity>
  );
};

interface SwipeableRequestCardProps {
  request: FriendRequest;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onBlock?: (requestId: string) => void;
}

const SwipeableRequestCard = ({
  request,
  onAccept,
  onDecline,
  onBlock,
}: SwipeableRequestCardProps) => {
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
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: '/friend-profile',
            params: {
              friendId: request.id,
              username: request.username,
              profilePic: request.profilePic || '',
              email: request.email || '',
              isOnline: '0',
            },
          })
        }>
        <View className="mb-3 flex-row items-center rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
          <Image
            source={{ uri: request.profilePic }}
            className="h-12 w-12 rounded-full bg-gray-200"
          />
          <View className="ml-3 flex-1">
            <Text className="font-bold text-text-primary dark:text-text-dark">
              {request.username}
            </Text>
            <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
              {request.mutualFriends ? `${request.mutualFriends} mutual friends` : request.email}
              {request.mutualShards ? ` • ${request.mutualShards} shared shards` : ''}
            </Text>
            <Text className="dark:text-text-dark-secondary mt-1 text-xs text-text-secondary">
              {request.timestamp}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onAccept(request.id);
              }}
              disabled={isProcessing}
              className="rounded-lg px-4 py-2"
              style={{ backgroundColor: '#10b981' }}>
              <Text className="text-sm font-semibold text-white">Accept</Text>
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDecline(request.id);
              }}
              disabled={isProcessing}
              className="rounded-lg px-4 py-2"
              style={{ backgroundColor: '#ef4444' }}>
              <Text className="text-sm font-semibold text-white">Decline</Text>
            </Pressable>
          </View>
        </View>
      </TouchableOpacity>
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
    {
      icon: 'person-remove-outline',
      label: 'Remove Friend',
      action: 'remove_friend',
      danger: true,
    },
    { icon: 'ban', label: 'Block', action: 'block', danger: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose}>
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
                <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
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
                    color={
                      action.danger ? '#ef4444' : colorScheme === 'dark' ? '#9ca3af' : '#6b7280'
                    }
                  />
                  <Text
                    className={`ml-3 text-base ${
                      action.danger ? 'text-red-500' : 'text-text-primary dark:text-text-dark'
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
  const [loadingSuggestionId, setLoadingSuggestionId] = useState<string | null>(null);
  const user = useUserStore((state) => state.user);

  const { addAlert } = useAppStore();

  // Mutations
  const [unfriend] = useMutation(UNFRIEND);
  const [blockUser] = useMutation(BLOCK_USER);
  const [acceptFriendRequest] = useMutation(ACCEPT_FRIEND_REQUEST);
  const [rejectFriendRequest] = useMutation(REJECT_FRIEND_REQUEST);
  const [cancelFriendRequest] = useMutation(CANCEL_FRIEND_REQUEST);
  const [sendFriendRequest] = useMutation(SEND_FRIEND_REQUEST);

  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<FriendRequest[]>([]);

  const { refetch: refetchRequests } = useQuery(GET_PENDING_REQUESTS, {
    onCompleted: applyRequestsData,
  });

  function applyRequestsData(data: any) {
    if (data?.getPendingRequests?.success) {
      setIncomingRequests(
        (data.getPendingRequests.incoming || []).map((u: any) => ({
          id: u.id,
          username: u.username,
          email: '',
          profilePic: u.profilePic,
          timestamp: '',
        }))
      );
      setOutgoingRequests(
        (data.getPendingRequests.outgoing || []).map((u: any) => ({
          id: u.id,
          username: u.username,
          email: '',
          profilePic: u.profilePic,
          timestamp: '',
        }))
      );
    }
  }

  const doRefetchRequests = async () => {
    const result = await refetchRequests();
    applyRequestsData(result.data);
  };

  const { refetch: refetchSuggestions } = useQuery(GET_FRIEND_SUGGESTIONS, {
    onCompleted: (data) => {
      if (data?.getFriendSuggestions?.success) {
        setSuggestions(
          (data.getFriendSuggestions.suggestions || []).map((u: any) => ({
            id: u.id,
            username: u.username,
            email: '',
            profilePic: u.profilePic,
            mutualFriends: 0,
            timestamp: '',
          }))
        );
      }
    },
  });

  const [searchUsers, { loading: searchLoading }] = useLazyQuery(SEARCH_USERS);
  const [searchResults, setSearchResults] = useState<FriendRequest[]>([]);
  const [loadingSearchAddId, setLoadingSearchAddId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { friends, setFriends, searchQuery, setSearchQuery, filteredFriends } = useFriendsStore();

  const { refetch } = useQuery(GET_FRIENDS, {
    onCompleted: (data) => {
      if (data?.getFriends?.success) {
        setFriends(data.getFriends.friends);
      }
    },
  });

  // Debounced search - triggers after 850ms of no typing, min 3 chars
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await searchUsers({
          variables: { query: searchQuery.trim() },
        });
        if (data?.searchUsers?.success) {
          setSearchResults(
            (data.searchUsers.users || []).map((u: any) => ({
              id: u.id,
              username: u.username,
              email: '',
              profilePic: u.profilePic,
              mutualFriends: u.mutualFriends || 0,
              timestamp: '',
            }))
          );
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 850);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleSearchAdd = async (userId: string) => {
    setLoadingSearchAddId(userId);
    try {
      const { data } = await sendFriendRequest({
        variables: { friendId: userId },
      });
      if (data?.sendFriendRequest?.success) {
        addAlert({ str: 'Friend request sent!', type: 'success' });
        setSearchResults((prev) => prev.filter((u) => u.id !== userId));
      } else {
        addAlert({ str: data?.sendFriendRequest?.message || 'Failed', type: 'error' });
      }
    } catch {
      addAlert({ str: 'Failed to send request', type: 'error' });
    } finally {
      setLoadingSearchAddId(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const [result] = await Promise.all([refetch(), doRefetchRequests(), refetchSuggestions()]);
    if (result.data?.getFriends?.success) {
      setFriends(result.data.getFriends.friends);
    }
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

  const handleConfirmRemove = async () => {
    if (friendToRemove) {
      try {
        const { data } = await unfriend({
          variables: { friendId: friendToRemove.id },
        });

        if (data?.unfriend?.success) {
          addAlert({ str: 'Friend removed', type: 'success' });
          setFriends(friends.filter((f: Friend) => f.id !== friendToRemove.id));
        } else {
          addAlert({ str: data?.unfriend?.message || 'Failed to remove friend', type: 'error' });
        }
      } catch (error) {
        console.error('Remove friend error:', error);
        addAlert({ str: 'Failed to remove friend', type: 'error' });
      }
      setConfirmRemoveVisible(false);
      setFriendToRemove(null);
    }
  };

  const handleConfirmBlock = async () => {
    if (friendToBlock) {
      try {
        const { data } = await blockUser({
          variables: { userId: friendToBlock.id },
        });

        if (data?.blockUser?.success) {
          addAlert({ str: 'User blocked', type: 'success' });
          setFriends(friends.filter((f: Friend) => f.id !== friendToBlock.id));
        } else {
          addAlert({ str: data?.blockUser?.message || 'Failed to block user', type: 'error' });
        }
      } catch (error) {
        console.error('Block user error:', error);
        addAlert({ str: 'Failed to block user', type: 'error' });
      }
      setConfirmBlockVisible(false);
      setFriendToBlock(null);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { data } = await acceptFriendRequest({
        variables: { friendId: requestId },
      });

      if (data?.acceptFriendRequest?.success) {
        addAlert({ str: 'Friend request accepted!', type: 'success' });
        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
        setSuggestions((prev) => prev.filter((s) => s.id !== requestId));
        setSearchResults((prev) => prev.filter((s) => s.id !== requestId));
        const result = await refetch();
        if (result.data?.getFriends?.success) {
          setFriends(result.data.getFriends.friends);
        }
        refetchSuggestions();
      } else {
        addAlert({
          str: data?.acceptFriendRequest?.message || 'Failed to accept request',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Accept request error:', error);
      addAlert({ str: 'Failed to accept request', type: 'error' });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const { data } = await rejectFriendRequest({
        variables: { friendId: requestId },
      });

      if (data?.rejectFriendRequest?.success) {
        addAlert({ str: 'Friend request declined', type: 'success' });
        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
        doRefetchRequests();
        refetchSuggestions();
      } else {
        addAlert({
          str: data?.rejectFriendRequest?.message || 'Failed to decline request',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Decline request error:', error);
      addAlert({ str: 'Failed to decline request', type: 'error' });
    }
  };

  const handleBlockRequest = async (requestId: string) => {
    try {
      const { data } = await blockUser({
        variables: { userId: requestId },
      });

      if (data?.blockUser?.success) {
        addAlert({ str: 'User blocked', type: 'success' });
        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
        doRefetchRequests();
        refetchSuggestions();
      } else {
        addAlert({ str: data?.blockUser?.message || 'Failed to block user', type: 'error' });
      }
    } catch (error) {
      console.error('Block user error:', error);
      addAlert({ str: 'Failed to block user', type: 'error' });
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const { data } = await cancelFriendRequest({
        variables: { friendId: requestId },
      });

      if (data?.cancelFriendRequest?.success) {
        addAlert({ str: 'Friend request cancelled', type: 'success' });
        setOutgoingRequests((prev) => prev.filter((r) => r.id !== requestId));
        doRefetchRequests();
        refetchSuggestions();
      } else {
        addAlert({
          str: data?.cancelFriendRequest?.message || 'Failed to cancel request',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Cancel request error:', error);
      addAlert({ str: 'Failed to cancel request', type: 'error' });
    }
  };

  const filtered = filteredFriends();

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between px-4 py-3">
        <Text className="text-2xl font-bold text-text-primary dark:text-text-dark">Friends</Text>
      </View>

      {/* Search Bar */}
      <View className="px-4 pb-4">
        <View className="flex-row items-center rounded-xl bg-background-default px-4 py-3 dark:bg-background-dark-paper">
          <Ionicons name="search" size={20} color="#666" style={{ marginRight: 10 }} />
          <TextInput
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (!text.trim()) setSearchResults([]);
              if (text.trim().length >= 3 && activeTab !== 'friends') {
                setActiveTab('friends');
              }
            }}
            placeholder="Search friends..."
            placeholderTextColor="#666"
            className="flex-1"
            style={{ color: colorScheme === 'dark' ? '#fff' : '#000' }}
            autoCorrect={false}
            autoCapitalize="none"
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
              style={{
                color:
                  activeTab === 'friends'
                    ? '#ffffff'
                    : colorScheme === 'dark'
                      ? '#9ca3af'
                      : '#6b7280',
              }}>
              Friends
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('requests')}
            className="flex-1 items-center rounded-full py-2"
            style={{ backgroundColor: activeTab === 'requests' ? '#7c3aed' : 'transparent' }}>
            <Text
              className="text-sm font-semibold"
              style={{
                color:
                  activeTab === 'requests'
                    ? '#ffffff'
                    : colorScheme === 'dark'
                      ? '#9ca3af'
                      : '#6b7280',
              }}>
              Requests
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('discover')}
            className="flex-1 items-center rounded-full py-2"
            style={{ backgroundColor: activeTab === 'discover' ? '#7c3aed' : 'transparent' }}>
            <Text
              className="text-sm font-semibold"
              style={{
                color:
                  activeTab === 'discover'
                    ? '#ffffff'
                    : colorScheme === 'dark'
                      ? '#9ca3af'
                      : '#6b7280',
              }}>
              Discover
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {activeTab === 'friends' ? (
          <View className="pb-6">
            {/* Local friend matches */}
            {filtered.length > 0 ? (
              <Animated.View entering={FadeIn}>
                {filtered.map((friend) => (
                  <FriendCard key={friend.id} friend={friend} onMenuPress={handleMenuPress} />
                ))}
              </Animated.View>
            ) : (
              <View className="items-center justify-center py-12">
                <Ionicons
                  name="people-outline"
                  size={64}
                  color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
                />
                <Text className="dark:text-text-dark-secondary mt-4 text-center text-text-secondary">
                  {searchQuery ? 'No friends found' : 'No friends yet'}
                </Text>
                {!searchQuery && (
                  <Text className="dark:text-text-dark-secondary mt-2 text-center text-xs text-text-secondary">
                    Tap the + icon to add friends
                  </Text>
                )}
              </View>
            )}

            {/* Server search results */}
            {searchQuery.trim().length >= 3 && (
              <View className="mt-4">
                <Text className="mb-3 text-sm font-semibold text-text-primary dark:text-text-dark">
                  Search Results
                </Text>
                {searchLoading ? (
                  <ActivityIndicator size="small" color="#7c3aed" style={{ marginTop: 12 }} />
                ) : searchResults.length > 0 ? (
                  searchResults
                    .filter((u) => !friends.some((f) => f.id === u.id))
                    .map((result) => (
                      <TouchableOpacity
                        key={result.id}
                        activeOpacity={0.7}
                        onPress={() =>
                          router.push({
                            pathname: '/friend-profile',
                            params: {
                              friendId: result.id,
                              username: result.username,
                              profilePic: result.profilePic || '',
                              email: '',
                              isOnline: '0',
                            },
                          })
                        }>
                        <View className="mb-3 flex-row items-center rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
                          <Image
                            source={{ uri: result.profilePic }}
                            className="h-12 w-12 rounded-full bg-gray-200"
                          />
                          <View className="ml-3 flex-1">
                            <Text className="font-bold text-text-primary dark:text-text-dark">
                              {result.username}
                            </Text>
                            {result.mutualFriends ? (
                              <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
                                {result.mutualFriends} mutual friends
                              </Text>
                            ) : null}
                          </View>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              handleSearchAdd(result.id);
                            }}
                            disabled={loadingSearchAddId === result.id}
                            className="rounded-lg px-4 py-2"
                            style={{
                              backgroundColor: '#7c3aed',
                              minWidth: 70,
                              alignItems: 'center',
                            }}>
                            {loadingSearchAddId === result.id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text className="text-sm font-semibold text-white">Add</Text>
                            )}
                          </Pressable>
                        </View>
                      </TouchableOpacity>
                    ))
                ) : (
                  <Text className="dark:text-text-dark-secondary mt-2 text-center text-sm text-text-secondary">
                    No users found
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : activeTab === 'requests' ? (
          <View>
            {/* Request SubTabs */}
            <View className="mb-4 flex-row gap-2">
              <TouchableOpacity
                onPress={() => setRequestSubTab('incoming')}
                className="flex-1 items-center rounded-lg py-2"
                style={{
                  backgroundColor: requestSubTab === 'incoming' ? '#7c3aed' : 'transparent',
                  borderWidth: 1,
                  borderColor: '#7c3aed',
                }}>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: requestSubTab === 'incoming' ? '#ffffff' : '#7c3aed' }}>
                  Incoming ({incomingRequests.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRequestSubTab('outgoing')}
                className="flex-1 items-center rounded-lg py-2"
                style={{
                  backgroundColor: requestSubTab === 'outgoing' ? '#7c3aed' : 'transparent',
                  borderWidth: 1,
                  borderColor: '#7c3aed',
                }}>
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
                  <Text className="dark:text-text-dark-secondary mb-3 text-xs text-text-secondary">
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
                  <Text className="dark:text-text-dark-secondary mt-4 text-center text-text-secondary">
                    No incoming requests
                  </Text>
                </View>
              )
            ) : outgoingRequests.length > 0 ? (
              <View className="pb-6">
                {outgoingRequests.map((request) => (
                  <TouchableOpacity
                    key={request.id}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/friend-profile',
                        params: {
                          friendId: request.id,
                          username: request.username,
                          profilePic: request.profilePic || '',
                          email: request.email || '',
                          isOnline: '0',
                        },
                      })
                    }>
                    <View className="mb-3 flex-row items-center rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
                      <Image
                        source={{ uri: request.profilePic }}
                        className="h-12 w-12 rounded-full bg-gray-200"
                      />
                      <View className="ml-3 flex-1">
                        <Text className="font-bold text-text-primary dark:text-text-dark">
                          {request.username}
                        </Text>
                        <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
                          {request.email}
                        </Text>
                        <Text className="dark:text-text-dark-secondary mt-1 text-xs text-text-secondary">
                          Sent {request.timestamp}
                        </Text>
                      </View>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCancelRequest(request.id);
                        }}
                        className="rounded-lg px-4 py-2"
                        style={{ backgroundColor: '#6b7280' }}>
                        <Text className="text-sm font-semibold text-white">Cancel</Text>
                      </Pressable>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View className="items-center justify-center py-20">
                <Ionicons
                  name="paper-plane-outline"
                  size={64}
                  color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
                />
                <Text className="dark:text-text-dark-secondary mt-4 text-center text-text-secondary">
                  No outgoing requests
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="pb-6">
            <Text className="mb-3 text-sm font-semibold text-text-primary dark:text-text-dark">
              People You May Know
            </Text>
            {suggestions.filter((s) => !friends.some((f) => f.id === s.id)).length > 0 ? (
              suggestions.filter((s) => !friends.some((f) => f.id === s.id)).map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/friend-profile',
                      params: {
                        friendId: suggestion.id,
                        username: suggestion.username,
                        profilePic: suggestion.profilePic || '',
                        email: '',
                        isOnline: '0',
                      },
                    })
                  }>
                  <View className="mb-3 flex-row items-center rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
                    <Image
                      source={{ uri: suggestion.profilePic }}
                      className="h-12 w-12 rounded-full bg-gray-200"
                    />
                    <View className="ml-3 flex-1">
                      <Text className="font-bold text-text-primary dark:text-text-dark">
                        {suggestion.username}
                      </Text>
                      {suggestion.mutualFriends ? (
                        <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
                          {suggestion.mutualFriends} mutual friends
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={async (e) => {
                        e.stopPropagation();
                        setLoadingSuggestionId(suggestion.id);
                        try {
                          const { data } = await sendFriendRequest({
                            variables: { friendId: suggestion.id },
                          });
                          if (data?.sendFriendRequest?.success) {
                            addAlert({ str: 'Friend request sent!', type: 'success' });
                            setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
                          } else {
                            addAlert({
                              str: data?.sendFriendRequest?.message || 'Failed',
                              type: 'error',
                            });
                          }
                        } catch {
                          addAlert({ str: 'Failed to send request', type: 'error' });
                        } finally {
                          setLoadingSuggestionId(null);
                        }
                      }}
                      disabled={loadingSuggestionId === suggestion.id}
                      className="rounded-lg px-4 py-2"
                      style={{ backgroundColor: '#7c3aed', minWidth: 70, alignItems: 'center' }}>
                      {loadingSuggestionId === suggestion.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-sm font-semibold text-white">Add</Text>
                      )}
                    </Pressable>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View className="items-center justify-center py-16">
                <Ionicons
                  name="compass-outline"
                  size={64}
                  color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
                />
                <Text className="dark:text-text-dark-secondary mt-4 text-center text-text-secondary">
                  No suggestions right now
                </Text>
                <Text className="dark:text-text-dark-secondary mt-2 text-center text-xs text-text-secondary">
                  Add more friends to get suggestions
                </Text>
              </View>
            )}
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
      <ConfirmModal
        visible={confirmRemoveVisible}
        onClose={() => setConfirmRemoveVisible(false)}
        onConfirm={handleConfirmRemove}
        title="Remove Friend?"
        message={`Are you sure you want to remove ${friendToRemove?.username} from your friends?`}
        confirmLabel="Remove Friend"
        icon="person-remove-outline"
        destructive
      />

      {/* Block User Confirmation */}
      <ConfirmModal
        visible={confirmBlockVisible}
        onClose={() => setConfirmBlockVisible(false)}
        onConfirm={handleConfirmBlock}
        title="Block User?"
        message={`${friendToBlock?.username} will no longer be able to send you friend requests or see your profile.`}
        confirmLabel="Block User"
        icon="ban-outline"
        confirmColor="#991b1b"
        destructive
      />
    </SafeAreaView>
  );
};

export default Friends;
