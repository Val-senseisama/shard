import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CHAT } from '~/Graphql/Queries';
import { REMOVE_SHARD_PARTICIPANT, ASSIGN_TASK_FROM_CHAT } from '~/Graphql/Mutations';
import { useAppStore } from '~/store/app.store';
import { useUserStore } from '~/store/user.store';

const ChatSettings = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const user = useUserStore((state) => state.user);
  const addAlert = useAppStore((state) => state.addAlert);

  const { data, loading, refetch } = useQuery(GET_CHAT, {
    variables: { chatId: id },
    skip: !id,
  });

  const [removeParticipant] = useMutation(REMOVE_SHARD_PARTICIPANT);
  const [assignTask] = useMutation(ASSIGN_TASK_FROM_CHAT);

  const chat = data?.getChat?.chat;
  const isOwner = chat?.shard?.owner?.id === user?.id;

  const handleRemoveUser = async (userId: string) => {
    try {
      const { data: res } = await removeParticipant({
        variables: {
          shardId: chat?.shard?.id,
          userId,
        },
      });
      if (res?.removeShardParticipant?.success) {
        addAlert({ str: 'User removed from shard', type: 'success' });
        refetch();
      }
    } catch (err) {
      addAlert({ str: 'Failed to remove user', type: 'error' });
    }
  };

  const handleAssignTask = async (userId: string, username: string) => {
    // For simplicity, we just prompt or use a default task description for now
    // Ideally we'd have a small modal for task description
    try {
      const { data: res } = await assignTask({
        variables: {
          chatId: id,
          assigneeId: userId,
        },
      });
      if (res?.assignTaskFromChat?.success) {
        addAlert({ str: `Task assigned to ${username}`, type: 'success' });
        router.back();
      }
    } catch (err) {
      addAlert({ str: 'Failed to assign task', type: 'error' });
    }
  };

  const renderParticipant = ({ item }: { item: any }) => (
    <View className="flex-row items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
      <View className="flex-row items-center">
        <Image
          source={{ uri: item.profilePic || 'https://via.placeholder.com/40' }}
          className="h-10 w-10 rounded-full"
        />
        <View className="ml-3">
          <Text className="text-sm font-bold text-text-primary dark:text-text-dark">
            {item.username}
          </Text>
          <Text className="text-xs text-gray-500">
            {chat?.shard?.owner?.id === item.id ? 'Owner' : 'Participant'}
          </Text>
        </View>
      </View>

      {isOwner && item.id !== user?.id && (
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => handleAssignTask(item.id, item.username)}
            className="rounded-full bg-blue-100 px-3 py-1.5 dark:bg-blue-900/30">
            <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">Assign Task</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleRemoveUser(item.id)}
            className="rounded-full bg-red-100 px-3 py-1.5 dark:bg-red-900/30">
            <Text className="text-xs font-bold text-red-600 dark:text-red-400">Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background-paper dark:bg-background-dark-default">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      <View className="flex-row items-center border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text className="ml-4 text-lg font-bold text-text-primary dark:text-text-dark">
          Participants
        </Text>
      </View>

      <FlatList
        data={chat?.participants || []}
        renderItem={renderParticipant}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-gray-500">No participants found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default ChatSettings;
