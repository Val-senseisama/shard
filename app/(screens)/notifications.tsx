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
import { t, ACCENT } from '~/components/shard/constants';
import AnimatedPressable from '~/components/AnimatedPressable';
import notificationService from '~/services/notificationService';

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

const NotificationSkeleton = ({ isDark }: { isDark: boolean }) => {
  const theme = t(isDark);
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

  const skeletonColor = isDark ? '#2a2a2a' : '#e5e7eb';

  return (
    <View
      style={{
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: theme.card,
        padding: 16,
      }}>
      <Animated.View
        style={[
          animatedStyle,
          {
            marginRight: 16,
            height: 40,
            width: 40,
            borderRadius: 20,
            backgroundColor: skeletonColor,
          },
        ]}
      />
      <View style={{ flex: 1 }}>
        <Animated.View
          style={[
            animatedStyle,
            {
              marginBottom: 8,
              height: 16,
              width: '75%',
              borderRadius: 4,
              backgroundColor: skeletonColor,
            },
          ]}
        />
        <Animated.View
          style={[
            animatedStyle,
            {
              height: 12,
              width: '25%',
              borderRadius: 4,
              backgroundColor: skeletonColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const Notifications = () => {
  const { shardId } = useLocalSearchParams<{ shardId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = t(isDark);
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

  // The FCM push sets the app icon badge, but there's no push to CLEAR it —
  // opening this screen and reading things is the only other moment the badge
  // can be corrected, so sync it to server truth on mount and after every
  // read action rather than leaving it stuck at the last push's count.
  const { refetch: refetchUnreadCount } = useQuery(GET_UNREAD_NOTIFICATION_COUNT, {
    fetchPolicy: 'network-only',
    onCompleted: (d) => {
      if (d?.getUnreadNotificationCount?.success) {
        notificationService.setBadgeCount(d.getUnreadNotificationCount.count).catch(() => {});
      }
    },
  });

  const syncBadge = async () => {
    try {
      const { data: fresh } = await refetchUnreadCount();
      if (fresh?.getUnreadNotificationCount?.success) {
        await notificationService.setBadgeCount(fresh.getUnreadNotificationCount.count);
      }
    } catch {
      // best-effort — a stale badge self-corrects on the next push or screen visit
    }
  };

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
      syncBadge();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await markRead({ variables: { notificationId: notification.id } });
        refetch();
        syncBadge();
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    // Navigate based on notification type
    if (notification.shardId) {
      router.push(`/(screens)/shard/${notification.shardId}`);
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
      style={[
        {
          marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 12,
          padding: 16,
        },
        item.read
          ? { backgroundColor: theme.card }
          : {
              backgroundColor: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.06)',
              borderLeftWidth: 4,
              borderLeftColor: ACCENT,
            },
      ]}>
      <View
        style={{
          marginRight: 16,
          height: 40,
          width: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 20,
          backgroundColor: item.read
            ? isDark ? '#374151' : '#e5e7eb'
            : isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)',
        }}>
        <Ionicons
          name={getNotificationIcon(item)}
          size={20}
          color={item.read ? theme.textSecondary : ACCENT}
        />
      </View>
      <TouchableOpacity style={{ flex: 1 }} onPress={() => handleNotificationPress(item)}>
        <Text
          style={{
            fontSize: 16,
            color: theme.text,
            fontWeight: item.read ? '400' : '600',
          }}>
          {item.message}
        </Text>
        <Text
          style={{
            marginTop: 4,
            fontSize: 12,
            color: theme.textSecondary,
          }}>
          {formatDistanceToNow(new Date(parseInt(item.createdAt)), { addSuffix: true })}
        </Text>
      </TouchableOpacity>
      {!item.read && (
        <View
          style={{
            marginLeft: 8,
            height: 8,
            width: 8,
            borderRadius: 4,
            backgroundColor: ACCENT,
          }}
        />
      )}
    </Animated.View>
  );

  const FilterButton = ({
    type,
    label,
    icon,
  }: {
    type: FilterType;
    label: string;
    icon: string;
  }) => {
    const isSelected = filter === type;
    return (
      <TouchableOpacity
        onPress={() => setFilter(type)}
        style={[
          {
            marginRight: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
          },
          isSelected
            ? { backgroundColor: ACCENT }
            : {
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              },
        ]}>
        <Ionicons
          name={icon as any}
          size={16}
          color={isSelected ? '#fff' : theme.textSecondary}
        />
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: isSelected ? '#fff' : theme.text,
          }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View
        style={{
          marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: theme.bg,
        }}>
        <AnimatedPressable onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </AnimatedPressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>
            {shardId ? 'Shard Notifications' : 'Notifications'}
          </Text>
          {unreadCount > 0 && (
            <Text style={{ fontSize: 12, color: ACCENT }}>{unreadCount} unread</Text>
          )}
        </View>
        <AnimatedPressable onPress={handleMarkAllRead} hitSlop={20} disabled={unreadCount === 0}>
          <Ionicons
            name="checkmark-done-outline"
            size={24}
            color={unreadCount === 0 ? theme.textSecondary : ACCENT}
          />
        </AnimatedPressable>
      </View>

      {/* Filter Pills */}
      <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
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
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                marginBottom: 8,
                height: 16,
                width: 80,
                borderRadius: 4,
                backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb',
              }}
            />
            {[1, 2, 3].map((i) => (
              <NotificationSkeleton key={`skeleton-today-${i}`} isDark={isDark} />
            ))}
          </View>
          <View>
            <View
              style={{
                marginBottom: 8,
                height: 16,
                width: 96,
                borderRadius: 4,
                backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb',
              }}
            />
            {[1, 2, 3, 4].map((i) => (
              <NotificationSkeleton key={`skeleton-yesterday-${i}`} isDark={isDark} />
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
                <View style={{ marginBottom: 8, marginTop: 16, paddingHorizontal: 16 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: 'bold',
                      color: theme.textSecondary,
                    }}>
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
            <View style={{ marginTop: 80, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons
                name="notifications-off-outline"
                size={64}
                color={isDark ? '#374151' : '#d1d5db'}
              />
              <Text
                style={{
                  marginTop: 16,
                  fontSize: 18,
                  fontWeight: '500',
                  color: theme.textSecondary,
                }}>
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
