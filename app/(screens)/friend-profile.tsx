import React, { useState } from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import { brand, FONT, RADIUS } from '~/components/hud';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client';
import { UNFRIEND, BLOCK_USER, CREATE_OR_GET_DIRECT_CHAT } from '~/Graphql/Mutations';
import { useFriendsStore } from '~/store/friends.store';
import { avatarUri } from '~/helpers/avatarUri';
import AnimatedPressable from '~/components/AnimatedPressable';
import ConfirmModal from '~/components/ConfirmModal';
import Toast from 'react-native-toast-message';

const FriendProfile = () => {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { friends, setFriends } = useFriendsStore();

  const friendId = params.friendId as string;
  const username = params.username as string;
  const profilePic = params.profilePic as string;
  const email = params.email as string;
  const isOnline = params.isOnline === '1';

  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);

  const [unfriend] = useMutation(UNFRIEND);
  const [blockUser] = useMutation(BLOCK_USER);
  const [createOrGetDirectChat] = useMutation(CREATE_OR_GET_DIRECT_CHAT);

  const handleMessage = async () => {
    try {
      const { data } = await createOrGetDirectChat({ variables: { friendId } });
      if (data?.createOrGetDirectChat?.success && data.createOrGetDirectChat.chatId) {
        router.dismiss();
        setTimeout(() => {
          router.push(`/(screens)/shard/${data.createOrGetDirectChat.chatId}/chat`);
        }, 300);
      } else {
        Toast.show({ type: 'error', text1: 'Failed to open chat' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to open chat' });
    }
  };

  const handleAddToShard = () => {
    router.dismiss();
    setTimeout(() => {
      router.push({ pathname: '/new-shard', params: { preSelectedFriend: friendId } });
    }, 300);
  };

  const handleConfirmRemove = async () => {
    setRemoveModalVisible(false);
    try {
      const { data } = await unfriend({ variables: { friendId } });
      if (data?.unfriend?.success) {
        Toast.show({ type: 'success', text1: 'Friend removed' });
        setFriends(friends.filter((f) => f.id !== friendId));
        router.dismiss();
      } else {
        Toast.show({ type: 'error', text1: data?.unfriend?.message || 'Failed' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to remove friend' });
    }
  };

  const handleConfirmBlock = async () => {
    setBlockModalVisible(false);
    try {
      const { data } = await blockUser({ variables: { userId: friendId } });
      if (data?.blockUser?.success) {
        Toast.show({ type: 'success', text1: 'User blocked' });
        setFriends(friends.filter((f) => f.id !== friendId));
        router.dismiss();
      } else {
        Toast.show({ type: 'error', text1: data?.blockUser?.message || 'Failed' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to block user' });
    }
  };

  const cardBorder = isDark ? 'rgba(72,72,71,0.15)' : 'rgba(0,0,0,0.06)';
  const subtleText = isDark ? '#767575' : '#9ca3af';

  const actions = [
    { icon: 'chatbubble-outline', label: 'Message', color: brand.violet, onPress: handleMessage },
    { icon: 'add-circle-outline', label: 'Add to Shard', color: brand.violet, onPress: handleAddToShard },
    { icon: 'person-remove-outline', label: 'Remove Friend', color: '#ef4444', onPress: () => setRemoveModalVisible(true) },
  ];

  return (
    // No flex-1: the sheet uses `fitToContents`, so the content must define its own height.
    <View style={{ backgroundColor: isDark ? '#0e0e0e' : '#fff' }}>
      {/* Grabber */}
      <View className="items-center pt-2 pb-1">
        <View
          style={{
            width: 36,
            height: 5,
            borderRadius: RADIUS.xs,
            backgroundColor: isDark ? '#484847' : '#d1d5db',
          }}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
        {/* Profile Header */}
        <View className="items-center px-6 pt-4 pb-5">
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: avatarUri(profilePic, username) }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 3,
                borderColor: brand.violet,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: isOnline ? '#10b981' : '#9ca3af',
                borderWidth: 3,
                borderColor: isDark ? '#0e0e0e' : '#fff',
              }}
            />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontFamily: FONT.bold,
              color: isDark ? '#fff' : '#1a1a1a',
              marginTop: 12,
            }}>
            {username}
          </Text>
          {email ? (
            <Text style={{ fontSize: 12, color: subtleText, marginTop: 4 }}>{email}</Text>
          ) : null}
          <View
            className="mt-2 flex-row items-center gap-1 rounded-full px-3 py-1"
            style={{ backgroundColor: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(156,163,175,0.1)' }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: isOnline ? '#10b981' : '#9ca3af',
              }}
            />
            <Text style={{ fontSize: 11, fontFamily: FONT.semibold, color: isOnline ? '#10b981' : subtleText }}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Quick Actions Row */}
        <View className="flex-row justify-center gap-5 px-6 pb-5">
          <AnimatedPressable onPress={handleMessage} scaleDown={0.92}>
            <View className="items-center">
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: 'rgba(139,92,246,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="chatbubble-outline" size={22} color="#8b5cf6" />
              </View>
              <Text style={{ fontSize: 10, fontFamily: FONT.semibold, color: subtleText, marginTop: 6 }}>
                Message
              </Text>
            </View>
          </AnimatedPressable>

          <AnimatedPressable onPress={handleAddToShard} scaleDown={0.92}>
            <View className="items-center">
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: 'rgba(139,92,246,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="add-circle-outline" size={22} color="#8b5cf6" />
              </View>
              <Text style={{ fontSize: 10, fontFamily: FONT.semibold, color: subtleText, marginTop: 6 }}>
                Add to Shard
              </Text>
            </View>
          </AnimatedPressable>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: cardBorder, marginHorizontal: 24 }} />

        {/* Action List */}
        <View className="px-4 pt-3 pb-2">
          {actions.map((action, index) => (
            <AnimatedPressable key={action.label} onPress={action.onPress} scaleDown={0.98}>
              <View
                className="flex-row items-center gap-3 rounded-xl px-4 py-3.5"
                style={
                  index < actions.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: cardBorder }
                    : undefined
                }>
                <Ionicons name={action.icon as any} size={20} color={action.color} />
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: FONT.medium,
                    color: action.color === '#ef4444' ? '#ef4444' : isDark ? '#fff' : '#1a1a1a',
                    flex: 1,
                  }}>
                  {action.label}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={isDark ? '#484847' : '#d1d5db'} />
              </View>
            </AnimatedPressable>
          ))}
        </View>

        {/* Block button at bottom */}
        <View className="px-6 pt-4">
          <AnimatedPressable onPress={() => setBlockModalVisible(true)} scaleDown={0.97}>
            <View
              style={{
                borderRadius: RADIUS.sm,
                paddingVertical: 13,
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
              }}>
              <View className="flex-row items-center gap-2">
                <Ionicons name="ban-outline" size={16} color="#ef4444" />
                <Text style={{ fontSize: 14, fontFamily: FONT.semibold, color: '#ef4444' }}>Block User</Text>
              </View>
            </View>
          </AnimatedPressable>
        </View>
      </ScrollView>

      {/* Confirm Modals */}
      <ConfirmModal
        visible={removeModalVisible}
        onClose={() => setRemoveModalVisible(false)}
        onConfirm={handleConfirmRemove}
        title="Remove Friend?"
        message={`Are you sure you want to remove ${username} from your friends?`}
        confirmLabel="Remove Friend"
        icon="person-remove-outline"
        destructive
      />
      <ConfirmModal
        visible={blockModalVisible}
        onClose={() => setBlockModalVisible(false)}
        onConfirm={handleConfirmBlock}
        title="Block User?"
        message={`${username} won't be able to see your profile or send you requests.`}
        confirmLabel="Block User"
        icon="ban-outline"
        confirmColor="#991b1b"
        destructive
      />
    </View>
  );
};

export default FriendProfile;
