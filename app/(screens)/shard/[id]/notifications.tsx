import { useLocalSearchParams, router } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_NOTIFICATIONS } from '~/Graphql/Queries';
import { MARK_NOTIFICATION_READ, MARK_ALL_NOTIFICATIONS_READ } from '~/Graphql/Mutations';
import AnimatedPressable from '~/components/AnimatedPressable';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useReducedMotion } from '~/helpers/motion';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';

interface Notification {
  id: string;
  message: string;
  shardId?: string;
  miniGoalId?: string;
  read: boolean;
  triggerAt: string;
  createdAt: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────
const Skeleton = ({ width, height, style }: { width: number | string; height: number; style?: any }) => {
  const isDark = useColorScheme() === 'dark';
  const opacity = useSharedValue(0.3);

  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Decorative loop — hold still when the user asked for less motion.
    if (reducedMotion) return;
    opacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 800 }), withTiming(0.3, { duration: 800 })),
      -1,
      true
    );
  }, [reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: 8, backgroundColor: isDark ? '#262626' : '#e5e7eb' },
        animatedStyle,
        style,
      ]}
    />
  );
};

// ─── Notification Icon ────────────────────────────────────────────────
const getIcon = (msg: string): { name: string; color: string; bg: string } => {
  const lower = msg.toLowerCase();
  if (lower.includes('overdue') || lower.includes('deadline'))
    return { name: 'alert-circle-outline', color: '#f97316', bg: 'rgba(249,115,22,0.1)' };
  if (lower.includes('complete') || lower.includes('finished'))
    return { name: 'checkmark-circle-outline', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' };
  if (lower.includes('task'))
    return { name: 'calendar-outline', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' };
  if (lower.includes('joined') || lower.includes('added') || lower.includes('participant'))
    return { name: 'person-add-outline', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
  if (lower.includes('updated') || lower.includes('changed'))
    return { name: 'create-outline', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' };
  if (lower.includes('reflection') || lower.includes('side quest'))
    return { name: 'sparkles-outline', color: '#d946ef', bg: 'rgba(217,70,239,0.1)' };
  return { name: 'notifications-outline', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' };
};

// ─── Main Component ───────────────────────────────────────────────────
const ShardNotifications = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, refetch } = useQuery(GET_NOTIFICATIONS, {
    variables: { limit: 50, skip: 0, shardId: id },
    fetchPolicy: 'network-only',
  });

  const [markRead] = useMutation(MARK_NOTIFICATION_READ);
  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ);

  const notifications: Notification[] = data?.getNotifications?.notifications || [];

  const grouped = useMemo(() => {
    const groups: { title: string; data: Notification[] }[] = [];
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const thisWeek: Notification[] = [];
    const earlier: Notification[] = [];

    notifications.forEach((n) => {
      const date = new Date(parseInt(n.createdAt));
      if (isToday(date)) today.push(n);
      else if (isYesterday(date)) yesterday.push(n);
      else if (isThisWeek(date)) thisWeek.push(n);
      else earlier.push(n);
    });

    if (today.length > 0) groups.push({ title: 'Today', data: today });
    if (yesterday.length > 0) groups.push({ title: 'Yesterday', data: yesterday });
    if (thisWeek.length > 0) groups.push({ title: 'This Week', data: thisWeek });
    if (earlier.length > 0) groups.push({ title: 'Earlier', data: earlier });
    return groups;
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePress = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await markRead({ variables: { notificationId: notification.id } });
        refetch();
      } catch {}
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      refetch();
    } catch {}
  };

  const cardBg = isDark ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.8)';
  const borderColor = isDark ? 'rgba(72,72,71,0.15)' : 'rgba(0,0,0,0.06)';

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (item.isHeader) {
      return (
        <View className="mb-2 mt-5 px-1">
          <Text
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: isDark ? '#adaaaa' : '#666' }}>
            {item.title}
          </Text>
        </View>
      );
    }

    const n = item as Notification;
    const icon = getIcon(n.message);
    const timeAgo = formatDistanceToNow(new Date(parseInt(n.createdAt)), { addSuffix: true });

    return (
      <AnimatedPressable onPress={() => handlePress(n)} scaleDown={0.98}>
        <View
          className="mb-2 flex-row items-start gap-3 rounded-2xl p-4"
          style={{
            backgroundColor: n.read ? cardBg : isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.04)',
            borderWidth: 1,
            borderColor: n.read ? borderColor : 'rgba(139,92,246,0.15)',
          }}>
          <View
            className="items-center justify-center rounded-xl"
            style={{ width: 40, height: 40, backgroundColor: icon.bg }}>
            <Ionicons name={icon.name as any} size={20} color={icon.color} />
          </View>
          <View className="flex-1">
            <Text
              className="text-sm leading-5"
              style={{
                color: isDark ? '#fff' : '#1a1a1a',
                fontWeight: n.read ? '400' : '600',
              }}>
              {n.message}
            </Text>
            <Text className="mt-1 text-xs" style={{ color: '#767575' }}>
              {timeAgo}
            </Text>
          </View>
          {!n.read && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#8b5cf6',
                marginTop: 6,
              }}
            />
          )}
        </View>
      </AnimatedPressable>
    );
  };

  const flatData = grouped.flatMap((group) => [
    { isHeader: true, title: group.title, id: `header-${group.title}` },
    ...group.data,
  ]);

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <AnimatedPressable onPress={() => router.back()} hitSlop={20} scaleDown={0.9} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#8b5cf6' : '#1a1a1a'} />
        </AnimatedPressable>
        <View className="items-center">
          <Text className="text-base font-bold" style={{ color: '#8b5cf6' }}>
            Quest Activity
          </Text>
          {unreadCount > 0 && (
            <Text className="text-[10px]" style={{ color: '#767575' }}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        <AnimatedPressable
          onPress={handleMarkAllRead}
          hitSlop={20}
          scaleDown={0.9}
          disabled={unreadCount === 0}
            accessibilityLabel="Mark all as read">
          <Ionicons
            name="checkmark-done-outline"
            size={22}
            color={unreadCount === 0 ? '#767575' : isDark ? '#fff' : '#1a1a1a'}
          />
        </AnimatedPressable>
      </View>

      {loading && !refreshing ? (
        <View className="gap-3 px-5 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              className="flex-row items-start gap-3 rounded-2xl p-4"
              style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}>
              <Skeleton width={40} height={40} style={{ borderRadius: 12 }} />
              <View className="flex-1 gap-2">
                <Skeleton width="85%" height={14} />
                <Skeleton width="40%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={flatData}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.id || `header-${item.title}`}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View className="mt-20 items-center justify-center">
              <View
                className="mb-4 items-center justify-center rounded-2xl"
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)',
                }}>
                <Ionicons name="notifications-off-outline" size={36} color="#8b5cf6" />
              </View>
              <Text className="text-sm" style={{ color: '#767575' }}>
                No activity yet for this quest
              </Text>
              <Text className="mt-1 text-xs" style={{ color: isDark ? '#484847' : '#d1d5db' }}>
                Task completions, overdue alerts, and collaborator updates will show here
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default ShardNotifications;
