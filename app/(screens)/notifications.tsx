import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  useColorScheme,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_NOTIFICATIONS, GET_UNREAD_NOTIFICATION_COUNT } from '~/Graphql/Queries';
import { MARK_NOTIFICATION_READ, MARK_ALL_NOTIFICATIONS_READ } from '~/Graphql/Mutations';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';

const { width } = Dimensions.get('window');

interface Notification {
  id: string;
  message: string;
  shardId?: string;
  miniGoalId?: string;
  read: boolean;
  triggerAt: string;
  createdAt: string;
}

type FilterType = 'all' | 'shards' | 'friends' | 'system';

const NotificationSkeleton = () => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 1000 }), withTiming(0.3, { duration: 1000 })),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="mb-2 flex-row items-center rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
      <Animated.View
        style={animatedStyle}
        className="mr-4 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"
      />
      <View className="flex-1">
        <Animated.View
          style={animatedStyle}
          className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"
        />
        <Animated.View
          style={animatedStyle}
          className="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-700"
        />
      </View>
    </View>
  );
};

const Notifications = () => {
  const { shardId } = useLocalSearchParams<{ shardId: string }>();
  const colorScheme = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

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

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const notifications = data?.getNotifications?.notifications || [];

    // Apply filter
    let filtered = notifications;
    if (filter === 'shards') {
      filtered = notifications.filter((n: Notification) => n.shardId);
    } else if (filter === 'friends') {
      filtered = notifications.filter(
        (n: Notification) =>
          n.message.toLowerCase().includes('friend') || n.message.toLowerCase().includes('invite')
      );
    } else if (filter === 'system') {
      filtered = notifications.filter(
        (n: Notification) => !n.shardId && !n.message.toLowerCase().includes('friend')
      );
    }

    const groups: { title: string; data: Notification[] }[] = [];
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const thisWeek: Notification[] = [];
    const earlier: Notification[] = [];

    filtered.forEach((notification: Notification) => {
      const date = new Date(parseInt(notification.createdAt));

      if (isToday(date)) {
        today.push(notification);
      } else if (isYesterday(date)) {
        yesterday.push(notification);
      } else if (isThisWeek(date)) {
        thisWeek.push(notification);
      } else {
        earlier.push(notification);
      }
    });

    if (today.length > 0) groups.push({ title: 'Today', data: today });
    if (yesterday.length > 0) groups.push({ title: 'Yesterday', data: yesterday });
    if (thisWeek.length > 0) groups.push({ title: 'This Week', data: thisWeek });
    if (earlier.length > 0) groups.push({ title: 'Earlier', data: earlier });

    return groups;
  }, [data, filter]);

  const unreadCount = useMemo(() => {
    return (data?.getNotifications?.notifications || []).filter((n: Notification) => !n.read)
      .length;
  }, [data]);

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
        refetch();
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    // Navigate based on notification type
    if (notification.shardId) {
      router.push({
        pathname: '/shard-info',
        params: { shardId: notification.shardId },
      });
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.shardId) return 'prism-outline';
    if (notification.message.toLowerCase().includes('friend')) return 'people-outline';
    if (notification.message.toLowerCase().includes('message')) return 'chatbubble-outline';
    return 'notifications-outline';
  };

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 30)}
      className={`mb-2 flex-row items-center rounded-xl p-4 ${
        item.read
          ? 'bg-background-default dark:bg-background-dark-paper'
          : 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      }`}>
      <View
        className={`mr-4 h-10 w-10 items-center justify-center rounded-full ${
          item.read ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-100 dark:bg-blue-800'
        }`}>
        <Ionicons
          name={getNotificationIcon(item)}
          size={20}
          color={item.read ? (colorScheme === 'dark' ? '#9ca3af' : '#6b7280') : '#3b82f6'}
        />
      </View>
      <TouchableOpacity className="flex-1" onPress={() => handleNotificationPress(item)}>
        <Text
          className={`text-base ${
            item.read
              ? 'text-text-primary dark:text-text-dark'
              : 'font-semibold text-text-primary dark:text-text-dark'
          }`}>
          {item.message}
        </Text>
        <Text className="dark:text-text-dark-secondary mt-1 text-xs text-text-secondary">
          {formatDistanceToNow(new Date(parseInt(item.createdAt)), { addSuffix: true })}
        </Text>
      </TouchableOpacity>
      {!item.read && <View className="ml-2 h-2 w-2 rounded-full bg-blue-500" />}
    </Animated.View>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View className="mb-2 mt-4">
      <Text className="text-sm font-bold text-gray-500 dark:text-gray-400">{section.title}</Text>
    </View>
  );

  const FilterButton = ({
    type,
    label,
    icon,
  }: {
    type: FilterType;
    label: string;
    icon: string;
  }) => (
    <TouchableOpacity
      onPress={() => setFilter(type)}
      className={`mr-2 flex-row items-center gap-2 rounded-full px-4 py-2 ${
        filter === type
          ? 'bg-blue-500'
          : 'border border-gray-300 bg-background-default dark:border-gray-700 dark:bg-background-dark-paper'
      }`}>
      <Ionicons
        name={icon as any}
        size={16}
        color={filter === type ? '#fff' : colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
      />
      <Text
        className={`text-sm font-medium ${
          filter === type ? 'text-white' : 'text-text-primary dark:text-text-dark'
        }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="mb-2 flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-lg font-bold text-text-primary dark:text-text-dark">
            {shardId ? 'Shard Notifications' : 'Notifications'}
          </Text>
          {unreadCount > 0 && <Text className="text-xs text-blue-500">{unreadCount} unread</Text>}
        </View>
        <TouchableOpacity onPress={handleMarkAllRead} hitSlop={20} disabled={unreadCount === 0}>
          <Ionicons
            name="checkmark-done-outline"
            size={24}
            color={unreadCount === 0 ? '#9ca3af' : colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
      </View>

      {/* Filter Pills */}
      <View className="mb-3 px-4">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { type: 'all' as FilterType, label: 'All', icon: 'apps-outline' },
            { type: 'shards' as FilterType, label: 'Shards', icon: 'prism-outline' },
            { type: 'friends' as FilterType, label: 'Friends', icon: 'people-outline' },
            { type: 'system' as FilterType, label: 'System', icon: 'settings-outline' },
          ]}
          keyExtractor={(item) => item.type}
          renderItem={({ item }) => <FilterButton {...item} />}
        />
      </View>

      {loading && !refreshing ? (
        <View className="px-4 pt-4">
          <View className="mb-4">
            <View className="mb-2 h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            {[1, 2, 3].map((i) => (
              <NotificationSkeleton key={`skeleton-today-${i}`} />
            ))}
          </View>
          <View>
            <View className="mb-2 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            {[1, 2, 3, 4].map((i) => (
              <NotificationSkeleton key={`skeleton-yesterday-${i}`} />
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={groupedNotifications.flatMap((group) => [
            { isHeader: true, title: group.title },
            ...group.data.map((item) => ({ isHeader: false, ...item })),
          ])}
          renderItem={({ item, index }) => {
            if ((item as any).isHeader) {
              return (
                <View className="mb-2 mt-4 px-4">
                  <Text className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {(item as any).title}
                  </Text>
                </View>
              );
            }
            return renderNotification({ item: item as Notification, index });
          }}
          keyExtractor={(item, index) =>
            (item as any).isHeader ? `header-${index}` : (item as Notification).id
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View className="mt-20 items-center justify-center">
              <Ionicons
                name="notifications-off-outline"
                size={64}
                color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
              />
              <Text className="dark:text-text-dark-secondary mt-4 text-lg font-medium text-text-secondary">
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
