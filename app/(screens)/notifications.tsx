import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_NOTIFICATIONS, GET_UNREAD_NOTIFICATION_COUNT } from '~/Graphql/Queries';
import { MARK_NOTIFICATION_READ, MARK_ALL_NOTIFICATIONS_READ } from '~/Graphql/Mutations';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  message: string;
  shardId?: string;
  miniGoalId?: string;
  read: boolean;
  triggerAt: string;
  createdAt: string;
}

const Notifications = () => {
  const { shardId } = useLocalSearchParams<{ shardId: string }>();
  const colorScheme = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_NOTIFICATIONS, {
    variables: {
      limit: 50,
      skip: 0,
      shardId: shardId || undefined,
    },
    fetchPolicy: 'network-only',
  });

  const [markRead] = useMutation(MARK_NOTIFICATION_READ);
  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      refetch();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await markRead({ variables: { notificationId: notification.id } });
        // Optimistically update UI or refetch
        refetch();
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    // Navigate based on notification type/content
    if (notification.shardId) {
      router.push({
        pathname: '/shard-info',
        params: { shardId: notification.shardId },
      });
    }
  };

  const renderItem = ({ item, index }: { item: Notification; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50)}
      className={`mb-3 flex-row items-center rounded-xl p-4 ${
        item.read
          ? 'bg-background-default dark:bg-background-dark-paper'
          : 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
      }`}>
      <View
        className={`mr-4 h-10 w-10 items-center justify-center rounded-full ${
          item.read ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-100 dark:bg-blue-800'
        }`}>
        <Ionicons
          name={item.shardId ? 'prism-outline' : 'notifications-outline'}
          size={20}
          color={item.read ? (colorScheme === 'dark' ? '#9ca3af' : '#6b7280') : '#3b82f6'}
        />
      </View>
      <TouchableOpacity
        className="flex-1"
        onPress={() => handleNotificationPress(item)}>
        <Text
          className={`text-base ${
            item.read
              ? 'text-text-primary dark:text-text-dark'
              : 'font-semibold text-text-primary dark:text-text-dark'
          }`}>
          {item.message}
        </Text>
        <Text className="mt-1 text-xs text-text-secondary dark:text-text-dark-secondary">
          {formatDistanceToNow(new Date(parseInt(item.createdAt)), { addSuffix: true })}
        </Text>
      </TouchableOpacity>
      {!item.read && (
        <View className="ml-2 h-2 w-2 rounded-full bg-blue-500" />
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 mb-2">
        <TouchableOpacity onPress={() => router.back()} hitSlop={20}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary dark:text-text-dark">
          {shardId ? 'Shard Notifications' : 'Notifications'}
        </Text>
        <TouchableOpacity onPress={handleMarkAllRead} hitSlop={20}>
          <Ionicons
            name="checkmark-done-outline"
            size={24}
            color={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          data={data?.getNotifications?.notifications || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="mt-20 items-center justify-center">
              <Ionicons
                name="notifications-off-outline"
                size={64}
                color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
              />
              <Text className="mt-4 text-lg font-medium text-text-secondary dark:text-text-dark-secondary">
                No notifications yet
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default Notifications;
