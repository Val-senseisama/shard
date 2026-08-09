import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Image,
  ScrollView,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { brand, FONT, RADIUS } from '~/components/hud';
import { useColorScheme } from '~/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useQuery, useMutation } from '@apollo/client';
import { GET_SHARD, GET_SHARD_SCHEDULE, GET_SHARD_ANALYTICS } from '~/Graphql/Queries';
import {
  SCHEDULE_TASKS,
  COMPLETE_TASK,
  COMPLETE_HABIT_CYCLE,
  CREATE_SHARD_CHAT,
  TRIGGER_COACH_NUDGE,
} from '~/Graphql/Mutations';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAppStore } from '~/store/app.store';
import ShardHeaderSkeleton from '@/components/ShardHeaderSkeleton';
import GoalCardSkeleton from '@/components/GoalCardSkeleton';
import ProgressChartSkeleton from '@/components/ProgressChartSkeleton';
import Toast from 'react-native-toast-message';
import ScheduleTaskSkeleton from '@/components/ScheduleTaskSkeleton';
import AssignmentSheet from '~/components/AssignmentSheet';
import { useUserStore } from '~/store/user.store';
import AnimatedPressable from '~/components/AnimatedPressable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_ITEM_WIDTH = 60;

type TabType = 'overview' | 'progress' | 'schedule';

interface Participant {
  user: string;
  username?: string;
  profilePic?: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  taskIndex: number;
  assignedTo?: string | null;
}

interface Goal {
  id: string;
  title: string;
  tasks: Task[];
  assignedTo?: string | null;
}

// ── Animated Task Row ─────────────────────────────────────────────
const AnimatedTaskRow = ({
  task,
  onToggle,
  onLongPress,
  assigneeName,
  assigneeAvatar,
  isDark,
}: {
  task: Task;
  onToggle: () => void;
  onLongPress: () => void;
  assigneeName?: string;
  assigneeAvatar?: string;
  isDark: boolean;
}) => {
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(task.completed ? 1 : 0);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.92), withSpring(1));
    checkScale.value = task.completed
      ? withTiming(0, { duration: 150 })
      : withSequence(withSpring(1.3), withSpring(1));
    onToggle();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={{ marginBottom: 10 }}>
      <Animated.View style={[animStyle, { flexDirection: 'row', alignItems: 'center' }]}>
        {/* Checkbox */}
        <Pressable
          onPress={handlePress}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            marginRight: 12,
            backgroundColor: task.completed ? brand.violet : 'transparent',
            borderWidth: task.completed ? 0 : 2,
            borderColor: isDark ? '#4b5563' : '#d1d5db',
            alignItems: 'center',
            justifyContent: 'center',
          }}
            accessibilityRole="button" accessibilityLabel="Confirm">
          {task.completed && (
            <Animated.View style={checkStyle}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </Animated.View>
          )}
        </Pressable>

        {/* Title */}
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            color: task.completed ? (isDark ? '#4b5563' : '#9ca3af') : isDark ? '#fff' : '#1a1a1a',
            textDecorationLine: task.completed ? 'line-through' : 'none',
          }}>
          {task.title}
        </Text>

        {/* Assignee badge */}
        {assigneeName && (
          <Animated.View
            entering={ZoomIn.duration(250)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}>
            {assigneeAvatar ? (
              <Image
                source={{ uri: assigneeAvatar }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: brand.violet,
                }}
              />
            ) : (
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: 'rgba(139,92,246,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ color: brand.violet, fontSize: 9, fontFamily: FONT.bold }}>
                  {assigneeName[0].toUpperCase()}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Long-press hint dot */}
        <Ionicons
          name="person-add-outline"
          size={13}
          color={isDark ? '#333' : '#ddd'}
          style={{ marginLeft: 8 }}
        />
      </Animated.View>
    </Pressable>
  );
};

const ShardInfo = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();
  const currentUser = useUserStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [shard, setShard] = useState<any>(null);
  const [expandedSummary, setExpandedSummary] = useState(false);
  const [coachNudge, setCoachNudge] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasksForSelectedDate, setTasksForSelectedDate] = useState<Task[]>([]);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('week');
  const { addAlert } = useAppStore();
  const flatListRef = useRef<FlatList>(null);

  // Derive user role
  const userRole = useMemo(() => {
    if (!shard || !currentUser) return null;
    if (shard.owner === currentUser.id || shard.owner?.id === currentUser.id) return 'owner';
    const p = shard.participants?.find(
      (p: any) => p.user === currentUser.id || p.user?.id === currentUser.id
    );
    return p?.role || null;
  }, [shard, currentUser]);

  const isAccountabilityPartner = userRole === 'accountability_partner';

  // Assignment sheet state
  const [assignSheet, setAssignSheet] = useState<{
    visible: boolean;
    miniGoalId: string;
    miniGoalTitle: string;
    taskIndex?: number;
    taskTitle?: string;
    currentAssigneeId?: string | null;
  } | null>(null);

  // Get shard ID from params or selected shard
  const shardId = (params.shardId as string) || (params.id as string);

  // Fetch full shard data
  const {
    data: shardData,
    loading: shardLoading,
    error: shardError,
    refetch: refetchShard,
  } = useQuery(GET_SHARD, {
    variables: { id: shardId },
    skip: !shardId,
    fetchPolicy: 'cache-and-network', // Show cache immediately, update in background
    returnPartialData: true, // Don't block on incomplete data
    notifyOnNetworkStatusChange: true,
  });

  // Update shard state whenever shardData changes (including on refetch)
  useEffect(() => {
    if (shardData?.getShard?.shard) {
      console.log('📊 [shard-info] Updating shard state from query data', shardData.getShard.shard);
      setShard(shardData.getShard.shard);
    }
  }, [shardData]);

  // Fetch schedule data
  const {
    data: scheduleData,
    loading: scheduleLoading,
    refetch: refetchSchedule,
  } = useQuery(GET_SHARD_SCHEDULE, {
    variables: { shardId },
    skip: !shardId || activeTab !== 'schedule',
    fetchPolicy: 'cache-first', // Use cache for instant display
    onCompleted: (data) => {
      const tasks =
        data.getShardSchedule?.tasksByDate?.[selectedDate.toISOString().split('T')[0]] || [];
      setTasksForSelectedDate(tasks);
    },
  });

  // Map mini-goals with full task data including assignedTo
  const goals: Goal[] =
    (shard as any)?.minigoals?.map((mg: any) => ({
      id: mg.id,
      title: mg.title,
      assignedTo: mg.assignedTo || null,
      tasks:
        mg.tasks?.map((task: any, index: number) => ({
          id: `${mg.id}-${index}`,
          title: task.title,
          completed: task.completed,
          taskIndex: index,
          assignedTo: task.assignedTo || null,
        })) || [],
    })) || [];

  // Build a lookup: userId -> participant info (from real participants)
  const participantMap: Record<string, Participant> = {};
  if (shard?.participants) {
    shard.participants.forEach((p: any) => {
      participantMap[p.user] = {
        user: p.user,
        username: p.username,
        profilePic: p.profilePic,
        role: p.role,
      };
    });
  }
  // Also include the owner — support both .id and ._id to be safe
  const ownerId = shard?.owner?.id || shard?.owner?._id?.toString();
  if (ownerId) {
    participantMap[ownerId] = {
      user: ownerId,
      username: shard.owner.username,
      profilePic: shard.owner.profilePic || undefined,
      role: 'owner',
    };
  }

  const shardParticipants: Participant[] = Object.values(participantMap);

  // Initialize expanded goals when shard loads
  React.useEffect(() => {
    if (goals.length > 0 && expandedGoals.size === 0) {
      // Start with all goals expanded
      setExpandedGoals(new Set(goals.map((g) => g.id)));
    }
  }, [goals.length]);

  // Format time from date (handles Unix timestamps in milliseconds)
  const formatTime = (dateString: string) => {
    // Parse Unix timestamp if it's a numeric string
    const timestamp = parseInt(dateString);
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Generate 60 days (30 before, 30 after today)
  const getDaysArray = () => {
    const days = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);

    for (let i = 0; i < 60; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const allDays = getDaysArray();
  const todayIndex = 30;
  const today = new Date().toISOString().split('T')[0];
  const selectedDateKey = selectedDate.toISOString().split('T')[0];

  // Auto-scroll to today on mount when schedule tab is active
  useEffect(() => {
    if (activeTab === 'schedule') {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: todayIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, [activeTab]);

  // Scroll to selected date when it changes
  useEffect(() => {
    const selectedIndex = allDays.findIndex(
      (day) => day.toISOString().split('T')[0] === selectedDateKey
    );
    if (selectedIndex !== -1 && activeTab === 'schedule') {
      flatListRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });

      const newTasksForSelectedDate =
        scheduleData?.getShardSchedule?.tasksByDate?.[selectedDateKey] || [];
      setTasksForSelectedDate(newTasksForSelectedDate);
    }
  }, [selectedDateKey]);

  // Fetch shard analytics
  const {
    data: analyticsData,
    loading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery(GET_SHARD_ANALYTICS, {
    variables: { shardId },
    skip: !shardId || activeTab !== 'progress',
    fetchPolicy: 'cache-first', // Use cache for instant display
  });

  // Reschedule tasks
  const [scheduleTasks] = useMutation(SCHEDULE_TASKS);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTasks = async () => {
    if (!shard) return;

    setIsGenerating(true);
    try {
      const { data } = await scheduleTasks({
        variables: { shardId },
      });

      if (data?.scheduleTasks?.success) {
        refetchSchedule();
        refetchShard();
        addAlert({ str: data.scheduleTasks.message, type: 'success' });
      } else {
        addAlert({
          str: data?.scheduleTasks?.message || 'Failed to reschedule tasks.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Schedule error:', error);
      addAlert({ str: 'An error occurred while scheduling tasks.', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Task Completion
  const [completeTaskMutation] = useMutation(COMPLETE_TASK);
  const [completeHabitCycleMutation] = useMutation(COMPLETE_HABIT_CYCLE);
  const [triggerCoachNudgeMutation, { loading: coachLoading }] = useMutation(TRIGGER_COACH_NUDGE);

  const handleTriggerCoachNudge = async () => {
    if (!shardId) return;
    const { data } = await triggerCoachNudgeMutation({ variables: { shardId } }).catch(() => ({
      data: null,
    }));
    if (data?.triggerCoachNudge?.success && data.triggerCoachNudge.nudge) {
      setCoachNudge(data.triggerCoachNudge.nudge);
    } else {
      addAlert({
        str: data?.triggerCoachNudge?.message || 'Could not get a nudge right now.',
        type: 'info',
      });
    }
  };

  const handleCompleteHabitCycle = async () => {
    if (!shardId) return;
    try {
      const { data } = await completeHabitCycleMutation({
        variables: { shardId },
      });
      if (data?.completeHabitCycle?.success) {
        if (data.completeHabitCycle.xpEarned > 0) {
          Toast.show({
            type: 'success',
            text1: `+${data.completeHabitCycle.xpEarned} XP earned! 🎉 (${data.completeHabitCycle.newStreak} streak)`,
          });
        }
        await refetchShard();
        await refetchAnalytics();
        await refetchSchedule();
      } else {
        addAlert({
          str: data?.completeHabitCycle?.message || 'Failed to complete cycle',
          type: 'error',
        });
      }
    } catch (e) {
      addAlert({ str: 'Error completing cycle', type: 'error' });
    }
  };

  const handleTaskToggle = async (
    miniGoalId: string,
    taskIndex: number,
    currentCompleted: boolean
  ) => {
    if (!shardId) return;

    try {
      const { data } = await completeTaskMutation({
        variables: {
          shardId,
          miniGoalId,
          taskIndex,
        },
      });

      if (data?.completeTask?.success) {
        // Show XP toast if XP was earned
        if (data.completeTask.xpEarned > 0) {
          Toast.show({
            type: 'success',
            text1: `+${data.completeTask.xpEarned} XP earned! 🎉`,
          });
        }

        // Wait a moment for cache invalidation to complete on the backend
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Force refetch from network to ensure data is in sync
        await refetchShard();
        await refetchAnalytics();
        await refetchSchedule();
      } else {
        addAlert({ str: data?.completeTask?.message || 'Failed to update task', type: 'error' });
      }
    } catch (error) {
      console.error('Task completion error:', error);
      addAlert({ str: 'Failed to update task', type: 'error' });
      // Refetch to ensure accurate state
      await refetchShard();
    }
  };

  const toggleGoalExpanded = (goalId: string) => {
    setExpandedGoals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  // Chat navigation
  const [createShardChat, { loading: creatingChat }] = useMutation(CREATE_SHARD_CHAT);

  const handleChatPress = async () => {
    if (!shardId || creatingChat) return;

    try {
      const { data } = await createShardChat({
        variables: { shardId },
      });

      if (data?.createOrGetShardChat?.success && data?.createOrGetShardChat?.chatId) {
        router.push(`/shard/${data.createOrGetShardChat.chatId}/chat`);
      } else {
        addAlert({
          str: data?.createOrGetShardChat?.message || 'Failed to create chat',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Chat creation error:', error);
      addAlert({ str: 'Failed to open chat', type: 'error' });
    }
  };

  // Render day item for FlatList
  const renderDayItem = ({ item: day, index }: { item: Date; index: number }) => {
    const dateKey = day.toISOString().split('T')[0];
    const isToday = dateKey === today;
    const isSelected = dateKey === selectedDateKey;
    const hasTasks = (scheduleData?.getShardSchedule?.tasksByDate?.[dateKey]?.length || 0) > 0;

    return (
      <TouchableOpacity
        onPress={() => setSelectedDate(day)}
        className="mx-1 items-center justify-center rounded-xl p-3"
        style={{
          backgroundColor: isSelected
            ? colorScheme === 'dark'
              ? '#374151'
              : '#e5e7eb'
            : 'transparent',
          width: DAY_ITEM_WIDTH,
          height: 60,
          borderWidth: isToday ? 2 : 0,
          borderColor: '#7c3aed',
        }}>
        <Text className="mb-1 text-xs font-medium" style={{ color: '#9ca3af' }}>
          {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
        </Text>
        <Text
          className="text-base font-semibold"
          style={{
            color: isSelected ? (colorScheme === 'dark' ? '#fff' : '#000') : '#9ca3af',

            fontSize: isToday ? 24 : 12,
            opacity: isToday ? 1 : 0.9,
          }}>
          {day.getDate()}
        </Text>
        {hasTasks && (
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: '#7c3aed',
              marginTop: 2,
            }}
          />
        )}
      </TouchableOpacity>
    );
  };

  // Group tasks by mini-goal
  const groupedTasks = tasksForSelectedDate.reduce((acc: any, task: any) => {
    const key = task.miniGoalId;
    if (!acc[key]) {
      acc[key] = {
        miniGoalTitle: task.miniGoalTitle,
        tasks: [],
      };
    }
    acc[key].tasks.push(task);
    return acc;
  }, {});

  const colors = ['#d946ef', '#7c3aed', '#6366f1', '#ec4899', brand.violet];

  // Loading state
  if (shardLoading && !shard) {
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
          <Text className="text-lg font-bold text-text-primary dark:text-text-dark">Shard</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Tabs - Pill Style */}
        <View className="mb-4 px-4">
          <View className="flex-row justify-between rounded-full p-1">
            <View
              className="flex-1 items-center rounded-full py-2"
              style={{ backgroundColor: '#7c3aed' }}>
              <Text className="text-sm font-semibold" style={{ color: '#ffffff' }}>
                Overview
              </Text>
            </View>
            <View className="flex-1 items-center rounded-full py-2">
              <Text
                className="text-sm font-semibold"
                style={{ color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                Progress
              </Text>
            </View>
            <View className="flex-1 items-center rounded-full py-2">
              <Text
                className="text-sm font-semibold"
                style={{ color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                Schedule
              </Text>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1 px-4">
          <ShardHeaderSkeleton />
          <GoalCardSkeleton />
          <GoalCardSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Error or not found state
  if (shardError || (!shardLoading && !shard)) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background-paper dark:bg-background-dark-default">
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
        />
        <Text className="dark:text-text-dark-secondary mt-4 text-center text-text-secondary">
          {shardError ? 'Error loading shard' : 'Shard not found'}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-lg px-6 py-3"
          style={{ backgroundColor: '#7c3aed' }}>
          <Text className="font-semibold text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Render the overview Goals section
  const renderGoals = () => (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
        <Text
          style={{
            fontSize: 11,
            fontFamily: FONT.bold,
            letterSpacing: 0.2,
            color: isDark ? '#adaaaa' : '#666',
          }}>
          Shard Goals
        </Text>
        {!isAccountabilityPartner && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="person-add-outline" size={11} color={isDark ? '#555' : '#aaa'} />
            <Text style={{ fontSize: 10, color: isDark ? '#555' : '#aaa' }}>
              Long-press to assign
            </Text>
          </View>
        )}
      </View>

      {goals.map((goal, goalIndex) => {
        const goalAssignee = goal.assignedTo ? participantMap[goal.assignedTo] : null;
        return (
          <Animated.View
            key={goal.id}
            entering={FadeInDown.delay(goalIndex * 30).duration(260)}
            style={{ marginBottom: 16 }}>
            {/* Goal header — long-press to assign whole goal */}
            <Pressable
              onPress={() => toggleGoalExpanded(goal.id)}
              onLongPress={() => {
                if (isAccountabilityPartner) return;
                setAssignSheet({
                  visible: true,
                  miniGoalId: goal.id,
                  miniGoalTitle: goal.title,
                  currentAssigneeId: goal.assignedTo,
                });
              }}
              delayLongPress={400}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#1a1a1a' : '#f6f7fb',
                borderRadius: RADIUS.md,
                padding: 14,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(72,72,71,0.25)' : 'rgba(0,0,0,0.06)',
              }}>
              {/* Number badge */}
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  backgroundColor: 'rgba(139,92,246,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                <Text style={{ color: brand.violet, fontFamily: FONT.extrabold, fontSize: 12 }}>
                  {goalIndex + 1}
                </Text>
              </View>

              <Text
                style={{
                  flex: 1,
                  fontFamily: FONT.bold,
                  fontSize: 14,
                  color: isDark ? '#fff' : '#1a1a1a',
                }}>
                {goal.title}
              </Text>

              {/* Assignee chip */}
              {goalAssignee && (
                <Animated.View
                  entering={ZoomIn.duration(250)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    marginRight: 8,
                    backgroundColor: 'rgba(139,92,246,0.1)',
                    borderRadius: RADIUS.sm,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}>
                  {goalAssignee.profilePic ? (
                    <Image
                      source={{ uri: goalAssignee.profilePic }}
                      style={{ width: 16, height: 16, borderRadius: 8 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: brand.violet,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text style={{ color: '#fff', fontSize: 8, fontFamily: FONT.bold }}>
                        {(goalAssignee.username || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={{ color: brand.violet, fontSize: 11, fontFamily: FONT.semibold }}>
                    {goalAssignee.username}
                  </Text>
                </Animated.View>
              )}

              <Ionicons
                name={expandedGoals.has(goal.id) ? 'chevron-down' : 'chevron-forward'}
                size={16}
                color={isDark ? '#555' : '#bbb'}
              />
            </Pressable>

            {/* Tasks */}
            {expandedGoals.has(goal.id) && (
              <Animated.View
                entering={FadeInDown.duration(250)}
                style={{ paddingTop: 10, paddingHorizontal: 4 }}>
                {goal.tasks.length === 0 ? (
                  <Text
                    style={{
                      color: isDark ? '#444' : '#bbb',
                      fontSize: 12,
                      textAlign: 'center',
                      paddingVertical: 12,
                    }}>
                    No tasks yet
                  </Text>
                ) : (
                  goal.tasks.map((task) => {
                    const taskAssignee = task.assignedTo ? participantMap[task.assignedTo] : null;
                    return (
                      <AnimatedTaskRow
                        key={task.id}
                        task={task}
                        isDark={isDark}
                        assigneeName={taskAssignee?.username}
                        assigneeAvatar={taskAssignee?.profilePic}
                        onToggle={() => {
                          if (!isAccountabilityPartner) {
                            handleTaskToggle(goal.id, task.taskIndex, task.completed);
                          }
                        }}
                        onLongPress={() => {
                          if (!isAccountabilityPartner) {
                            setAssignSheet({
                              visible: true,
                              miniGoalId: goal.id,
                              miniGoalTitle: goal.title,
                              taskIndex: task.taskIndex,
                              taskTitle: task.title,
                              currentAssigneeId: task.assignedTo,
                            });
                          }
                        }}
                      />
                    );
                  })
                )}
              </Animated.View>
            )}
          </Animated.View>
        );
      })}

      {goals.length === 0 && (
        <View
          style={{
            alignItems: 'center',
            paddingVertical: 32,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: isDark ? '#2a2a2a' : '#e5e7eb',
          }}>
          <Ionicons name="flag-outline" size={32} color={isDark ? '#333' : '#ccc'} />
          <Text style={{ color: isDark ? '#444' : '#bbb', fontSize: 13, marginTop: 8 }}>
            No goals yet
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={20}>
          <AntDesign name="arrowleft" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary dark:text-text-dark">Shard</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs - Pill Style */}
      <View className="mb-4 px-4">
        <View className="flex-row justify-between rounded-full p-1">
          <TouchableOpacity
            onPress={() => setActiveTab('overview')}
            className="flex-1 items-center rounded-full py-2"
            style={{ backgroundColor: activeTab === 'overview' ? '#7c3aed' : 'transparent' }}>
            <Text
              className="text-sm font-semibold"
              style={{
                color:
                  activeTab === 'overview'
                    ? '#ffffff'
                    : colorScheme === 'dark'
                      ? '#9ca3af'
                      : '#6b7280',
              }}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('progress')}
            className="flex-1 items-center rounded-full py-2"
            style={{ backgroundColor: activeTab === 'progress' ? '#7c3aed' : 'transparent' }}>
            <Text
              className="text-sm font-semibold"
              style={{
                color:
                  activeTab === 'progress'
                    ? '#ffffff'
                    : colorScheme === 'dark'
                      ? '#9ca3af'
                      : '#6b7280',
              }}>
              Progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('schedule')}
            className="flex-1 items-center rounded-full py-2"
            style={{ backgroundColor: activeTab === 'schedule' ? '#7c3aed' : 'transparent' }}>
            <Text
              className="text-sm font-semibold"
              style={{
                color:
                  activeTab === 'schedule'
                    ? '#ffffff'
                    : colorScheme === 'dark'
                      ? '#9ca3af'
                      : '#6b7280',
              }}>
              Schedule
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        {isAccountabilityPartner && (
          <View
            style={{
              marginBottom: 16,
              backgroundColor: isDark ? 'rgba(234,179,8,0.15)' : 'rgba(234,179,8,0.1)',
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: RADIUS.sm,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(234,179,8,0.3)' : 'rgba(234,179,8,0.2)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
            <Ionicons name="eye" size={16} color={isDark ? '#fde047' : '#eab308'} />
            <Text
              style={{ color: isDark ? '#fde047' : '#ca8a04', fontFamily: FONT.bold, fontSize: 13 }}>
              Viewing as Accountability Partner
            </Text>
          </View>
        )}

        {activeTab === 'overview' && (
          <Animated.View entering={FadeIn}>
            {/* Shard Header Card */}
            <View
              className="mb-6 overflow-hidden rounded-2xl p-4"
              style={{ backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb' }}>
              <View className="flex-row">
                {/* Left Column: Image + Icons */}
                <View className="mr-4">
                  {/* Shard Image */}
                  <Image
                    source={{ uri: shard.image }}
                    className="mb-3 h-40 w-40 rounded-xl bg-gray-200"
                    resizeMode="cover"
                  />

                  {/* Action Icons */}
                  <View className="flex-row items-center justify-center gap-3">
                    <TouchableOpacity
                      onPress={() => {
                        const chatIdentifier = shard.chatId || shard.id;
                        router.push(`/shard/${chatIdentifier}/chat`);
                      }}
                      className="items-center justify-center rounded-full p-2"
                      style={{ backgroundColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }} accessibilityLabel="Open chat">
                      <Ionicons
                        name="chatbubble-outline"
                        size={18}
                        color={colorScheme === 'dark' ? '#fff' : '#000'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.push(`/shard/${shard.id}/edit`)}
                      className="items-center justify-center rounded-full p-2"
                      style={{ backgroundColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }} accessibilityLabel="Edit">
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={colorScheme === 'dark' ? '#fff' : '#000'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="items-center justify-center rounded-full p-2"
                      style={{ backgroundColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }}
                      onPress={() => {
                        // Use chatId if available, otherwise fall back to shard ID (for backward compatibility)
                        const chatIdentifier = shard.chatId || shard.id;
                        router.push(`/shard/${chatIdentifier}/chat`);
                      }}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={20}
                        color={colorScheme === 'dark' ? '#fff' : '#000'}
                      />
                      {/* <Text className="font-semibold text-white">Chat</Text> */}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.push(`/shard/${shard.id}/notifications`)}
                      className="items-center justify-center rounded-full p-2"
                      style={{ backgroundColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }} accessibilityLabel="Notifications">
                      <Ionicons
                        name="notifications-outline"
                        size={18}
                        color={colorScheme === 'dark' ? '#fff' : '#000'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Right Column: Title and Participants */}
                <View
                  className="flex-1 justify-start"
                  style={{
                    alignItems: 'flex-start',
                  }}>
                  <Text className="mb-3 text-lg font-bold text-text-primary dark:text-text-dark">
                    {shard.title}
                  </Text>

                  {/* Participants */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {shardParticipants.map((p) => (
                      <Animated.View
                        key={p.user}
                        entering={ZoomIn.delay(50).duration(250)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: isDark
                            ? 'rgba(139,92,246,0.15)'
                            : 'rgba(139,92,246,0.1)',
                          borderRadius: RADIUS.lg,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}>
                        {p.profilePic ? (
                          <Image
                            source={{ uri: p.profilePic }}
                            style={{ width: 18, height: 18, borderRadius: 9 }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: brand.violet,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                            <Text style={{ color: '#fff', fontSize: 8, fontFamily: FONT.bold }}>
                              {(p.username || '?')[0].toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text
                          style={{
                            color: isDark ? '#c4b5fd' : '#7c3aed',
                            fontSize: 11,
                            fontFamily: FONT.semibold,
                          }}>
                          {p.username || 'Teammate'}
                        </Text>
                      </Animated.View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* AI Coach Nudge Modal */}
            <Modal
              visible={!!coachNudge}
              transparent
              animationType="fade"
              onRequestClose={() => setCoachNudge(null)}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setCoachNudge(null)}
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                <TouchableOpacity activeOpacity={1}>
                  <Animated.View
                    entering={FadeInDown.duration(300)}
                    style={{
                      backgroundColor: isDark ? '#131313' : '#f8f8fa',
                      borderTopLeftRadius: 28,
                      borderTopRightRadius: 28,
                      paddingTop: 12,
                      paddingBottom: 40,
                      paddingHorizontal: 20,
                    }}>
                    {/* Drag handle */}
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      <View
                        style={{
                          width: 36,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: isDark ? '#333' : '#ddd',
                        }}
                      />
                    </View>

                    <View
                      style={{
                        marginBottom: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                      <View
                        style={{
                          backgroundColor: 'rgba(139,92,246,0.15)',
                          padding: 10,
                          borderRadius: RADIUS.sm,
                        }}>
                        <Ionicons name="sparkles" size={20} color="#8b5cf6" />
                      </View>
                      <Text
                        style={{
                          fontSize: 18,
                          fontFamily: FONT.extrabold,
                          color: isDark ? '#fff' : '#1a1a1a',
                        }}>
                        Quest Coach
                      </Text>
                    </View>

                    <Text
                      style={{
                        fontSize: 16,
                        color: isDark ? '#d1d5db' : '#374151',
                        lineHeight: 24,
                        marginBottom: 24,
                      }}>
                      {coachNudge}
                    </Text>

                    <TouchableOpacity
                      onPress={() => setCoachNudge(null)}
                      style={{
                        backgroundColor: brand.violet,
                        paddingVertical: 14,
                        borderRadius: RADIUS.sm,
                        alignItems: 'center',
                      }}>
                      <Text style={{ color: '#fff', fontFamily: FONT.bold, fontSize: 15 }}>Close</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>

            {/* AI Coach Button */}
            {!isAccountabilityPartner && (
              <TouchableOpacity
                onPress={handleTriggerCoachNudge}
                disabled={coachLoading}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.1)',
                  paddingVertical: 12,
                  borderRadius: RADIUS.sm,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(14,165,233,0.3)' : 'rgba(14,165,233,0.2)',
                }}>
                <Ionicons name="sparkles" size={16} color={isDark ? '#38bdf8' : '#0284c7'} />
                <Text
                  style={{
                    color: isDark ? '#38bdf8' : '#0284c7',
                    fontFamily: FONT.bold,
                    marginLeft: 8,
                  }}>
                  {coachLoading ? 'Asking Coach...' : 'Get AI Coach Tip'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Habit Quest Banner */}
            {shard?.questType === 'habit' && (
              <View
                className="mb-6 rounded-2xl p-4"
                style={{
                  backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)',
                }}>
                <View className="mb-3 flex-row items-center justify-between">
                  <View>
                    <Text style={{ color: brand.violet, fontFamily: FONT.extrabold, fontSize: 16 }}>
                      Recurring Habit
                    </Text>
                    <Text
                      style={{ color: isDark ? '#a0a0a0' : '#666', fontSize: 13, marginTop: 2 }}>
                      {shard.cadence === 'daily' ? 'Resets daily' : 'Resets weekly'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontFamily: FONT.extrabold, color: brand.violet }}>
                      🔥 {shard.habitStreak || 0}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: isDark ? '#a0a0a0' : '#666',
                        fontFamily: FONT.bold,
                      }}>
                      Streak
                    </Text>
                  </View>
                </View>
                <AnimatedPressable
                  onPress={handleCompleteHabitCycle}
                  style={{
                    backgroundColor: brand.violet,
                    borderRadius: RADIUS.sm,
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}>
                  <Text style={{ color: '#fff', fontFamily: FONT.bold, fontSize: 14 }}>
                    Complete Cycle & Reset
                  </Text>
                </AnimatedPressable>
              </View>
            )}

            {/* Shard Summary */}
            {shard?.description && (
              <View className="mb-6">
                <Text className="mb-2 text-sm font-bold uppercase text-text-primary dark:text-text-dark">
                  Shard Summary
                </Text>
                <Text
                  className="dark:text-text-dark-secondary text-sm leading-6 text-text-secondary"
                  numberOfLines={expandedSummary ? undefined : 3}>
                  {shard.description}
                </Text>
                <TouchableOpacity onPress={() => setExpandedSummary(!expandedSummary)}>
                  <Text className="mt-2 text-sm font-semibold" style={{ color: '#a855f7' }}>
                    {expandedSummary ? 'Read Less' : 'Read More'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Shard Goals */}
            {renderGoals()}
          </Animated.View>
        )}

        {activeTab === 'progress' && (
          <Animated.View entering={FadeIn} className="pb-6">
            {/* Timeframe Selector */}
            <View className="mb-6 flex-row justify-center gap-2">
              {(['week', 'month', 'all'] as const).map((tf) => (
                <TouchableOpacity
                  key={tf}
                  onPress={() => setTimeframe(tf)}
                  className="rounded-full px-6 py-2"
                  style={{
                    backgroundColor:
                      timeframe === tf ? '#a855f7' : colorScheme === 'dark' ? '#374151' : '#f3f4f6',
                  }}>
                  <Text
                    className="text-sm font-semibold capitalize"
                    style={{
                      color:
                        timeframe === tf
                          ? '#ffffff'
                          : colorScheme === 'dark'
                            ? '#9ca3af'
                            : '#6b7280',
                    }}>
                    {tf === 'all' ? 'All Time' : tf}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Productivity Card */}
            <View
              className="mb-6 rounded-3xl p-8"
              style={{ backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb' }}>
              <Text className="mb-8 text-center text-sm font-bold uppercase tracking-widest text-text-primary dark:text-text-dark">
                PRODUCTIVITY
              </Text>

              {/* Circular Progress */}
              <View className="mb-6 items-center justify-center">
                <Svg width="200" height="200" viewBox="0 0 200 200">
                  {/* Background Circle */}
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke={colorScheme === 'dark' ? '#374151' : '#e5e7eb'}
                    strokeWidth="16"
                    fill="none"
                  />
                  {/* Progress Circle */}
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="url(#gradient)"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={`${2 * Math.PI * 80 * (1 - (shard?.progress?.completion || 0) / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                  />
                  {/* Gradient Definition */}
                  <Defs>
                    <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#a855f7" />
                      <Stop offset="100%" stopColor="#ec4899" />
                    </LinearGradient>
                  </Defs>
                </Svg>
                {/* Percentage Text */}
                <View style={{ position: 'absolute' }}>
                  <Text className="text-5xl font-bold text-text-primary dark:text-text-dark">
                    {analyticsData?.getShardAnalytics?.weeklyCompletion || 0}%
                  </Text>
                </View>
              </View>

              {/* Message */}
              <Text className="dark:text-text-dark-secondary text-center text-base text-text-secondary">
                {analyticsData?.getShardAnalytics?.weeklyCompletion >= 80
                  ? "Amazing! You're crushing it this week! 🔥"
                  : analyticsData?.getShardAnalytics?.weeklyCompletion >= 50
                    ? 'Great progress! Keep the momentum going! 💪'
                    : "Let's pick up the pace! You've got this! 🚀"}
              </Text>
            </View>

            {/* Bar Chart */}
            <View
              className="rounded-3xl p-6"
              style={{ backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb' }}>
              <View className="flex-row items-end justify-between" style={{ height: 200 }}>
                {(() => {
                  const dailyProgress = analyticsData?.getShardAnalytics?.dailyProgress || [];
                  const now = new Date();

                  // Filter based on timeframe
                  const filtered = dailyProgress.filter((d: any) => {
                    const date = new Date(d.date);
                    const diffDays = Math.floor(
                      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (timeframe === 'week') return diffDays <= 7;
                    if (timeframe === 'month') return diffDays <= 30;
                    return true; // all time
                  });

                  // Group by day of week for 'week' view
                  if (timeframe === 'week') {
                    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                    const weekData = days.map((day, index) => {
                      const targetDate = new Date(now);
                      targetDate.setDate(now.getDate() - (now.getDay() - index));
                      const dateStr = targetDate.toISOString().split('T')[0];

                      const dayData = dailyProgress.find((d: any) => d.date === dateStr);
                      return {
                        day,
                        tasksCompleted: dayData?.tasksCompleted || 0,
                        date: dateStr,
                      };
                    });

                    console.log('📊 [Week View] Data:', weekData);
                    console.log('📊 [Week View] Daily progress:', dailyProgress);

                    const maxTasks = Math.max(...weekData.map((d) => d.tasksCompleted), 1);

                    return weekData.map((item, index) => {
                      const barHeight =
                        item.tasksCompleted > 0
                          ? (item.tasksCompleted / maxTasks) * 180 // 180px max height
                          : 10; // Minimum 10px for empty days

                      return (
                        <View key={item.day} className="flex-1 items-center">
                          <View
                            className="mb-2 w-10 rounded-full"
                            style={{
                              height: barHeight,
                              backgroundColor:
                                index === new Date().getDay() ? '#ec4899' : '#a855f7',
                              opacity: item.tasksCompleted === 0 ? 0.2 : 1,
                            }}
                          />
                          <Text className="dark:text-text-dark-secondary text-xs font-medium text-text-secondary">
                            {item.day}
                          </Text>
                        </View>
                      );
                    });
                  }

                  // For month/all: show aggregated data (limit to 7 bars)
                  const maxBars = 7;
                  const barsToShow = Math.min(filtered.length, maxBars);
                  const step = Math.max(1, Math.floor(filtered.length / maxBars));
                  const aggregated = [];

                  for (let i = 0; i < barsToShow; i++) {
                    const index = i * step;
                    if (index < filtered.length) {
                      aggregated.push(filtered[index]);
                    }
                  }

                  if (aggregated.length === 0) {
                    return (
                      <View className="flex-1 items-center justify-center">
                        <Text className="dark:text-text-dark-secondary text-center text-sm text-text-secondary">
                          No data yet. Start completing tasks!
                        </Text>
                      </View>
                    );
                  }

                  const maxTasks = Math.max(...aggregated.map((d: any) => d.tasksCompleted), 1);

                  return aggregated.map((item: any, index: number) => (
                    <View key={index} className="flex-1 items-center">
                      <View
                        className="mb-2 w-10 rounded-full"
                        style={{
                          height: `${(item.tasksCompleted / maxTasks) * 100}%`,
                          backgroundColor: '#a855f7',
                        }}
                      />
                      <Text className="dark:text-text-dark-secondary text-xs font-medium text-text-secondary">
                        {new Date(item.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  ));
                })()}
              </View>
            </View>
          </Animated.View>
        )}

        {activeTab === 'schedule' && (
          <Animated.View entering={FadeIn}>
            {/* Calendar Week View */}
            <View
              className="mb-6 rounded-2xl p-4"
              style={{ backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb' }}>
              <Text className="mb-4 text-center text-lg font-bold text-text-primary dark:text-text-dark">
                {selectedDate
                  .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  .toUpperCase()}
              </Text>

              {/* Horizontal Scrollable Days */}
              <FlatList
                ref={flatListRef}
                data={allDays}
                renderItem={renderDayItem}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: SCREEN_WIDTH / 2 - DAY_ITEM_WIDTH / 2 }}
                snapToInterval={DAY_ITEM_WIDTH + 8}
                decelerationRate="fast"
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: true,
                      viewPosition: 0.5,
                    });
                  }, 100);
                }}
              />
            </View>

            {/* Today's Goals Header */}
            <Text className="mb-4 text-center text-lg font-bold text-text-primary dark:text-text-dark">
              {selectedDateKey === today ? "TODAY'S GOALS" : 'SCHEDULED GOALS'}
            </Text>

            {/* Loading State */}
            {scheduleLoading && (
              <View className="py-4">
                <ScheduleTaskSkeleton />
                <ScheduleTaskSkeleton />
                <ScheduleTaskSkeleton />
                <ScheduleTaskSkeleton />
              </View>
            )}

            {/* Tasks List */}
            {!scheduleLoading && tasksForSelectedDate.length > 0
              ? tasksForSelectedDate.map((task: any) => (
                  <View
                    key={task.id}
                    className="mb-3 flex-row items-center rounded-xl p-4"
                    style={{ backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb' }}>
                    <View
                      className="mr-3 h-6 w-6 items-center justify-center rounded-full border-2"
                      style={{
                        borderColor: task.completed ? '#a855f7' : '#d1d5db',
                        backgroundColor: task.completed ? '#a855f7' : 'transparent',
                      }}>
                      {task.completed && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold text-text-primary dark:text-text-dark"
                        style={{
                          textDecorationLine: task.completed ? 'line-through' : 'none',
                          color: task.completed
                            ? '#9ca3af'
                            : colorScheme === 'dark'
                              ? '#fff'
                              : '#1f2937',
                        }}>
                        {task.title}
                      </Text>
                      <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
                        {task.miniGoalTitle} • {formatTime(task.dueDate)}
                      </Text>
                    </View>
                    <View className="rounded-full bg-purple-100 px-2 py-1 dark:bg-purple-900">
                      <Text className="text-xs font-bold text-purple-600 dark:text-purple-300">
                        +{task.xpReward} XP
                      </Text>
                    </View>
                  </View>
                ))
              : !scheduleLoading && (
                  <View className="items-center justify-center py-10">
                    <Text className="dark:text-text-dark-secondary mb-2 text-center text-text-secondary">
                      No tasks scheduled for this day.
                    </Text>
                    <Text className="dark:text-text-dark-secondary mb-4 text-center text-xs text-text-secondary">
                      Scroll through the calendar to find days with purple dots 🟣
                    </Text>

                    {/* Reschedule Tasks Button */}
                    <TouchableOpacity
                      onPress={handleGenerateTasks}
                      disabled={isGenerating}
                      className="flex-row items-center rounded-full px-6 py-3"
                      style={{ backgroundColor: '#7c3aed', opacity: isGenerating ? 0.7 : 1 }}>
                      {isGenerating ? (
                        <ActivityIndicator size="small" color="#fff" className="mr-2" />
                      ) : (
                        <Ionicons name="calendar-outline" size={20} color="#fff" className="mr-2" />
                      )}
                      <Text className="font-semibold text-white">
                        {isGenerating ? 'Scheduling...' : 'Reschedule Tasks'}
                      </Text>
                    </TouchableOpacity>
                    <Text className="dark:text-text-dark-secondary mt-2 text-xs text-text-secondary">
                      Uses 1 AI Credit
                    </Text>
                  </View>
                )}
            {/* Goal Cards */}
            {!scheduleLoading && Object.keys(groupedTasks).length > 0 && (
              <View className="gap-4">
                {Object.values(groupedTasks).map((group: any, groupIndex: number) => {
                  const color = colors[groupIndex % colors.length];
                  const firstTask = group.tasks[0];
                  const lastTask = group.tasks[group.tasks.length - 1];

                  return (
                    <Animated.View
                      key={groupIndex}
                      entering={FadeInDown.delay(groupIndex * 30)}
                      className="overflow-hidden rounded-2xl"
                      style={{ backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb' }}>
                      <View className="flex-row">
                        {/* Colored Left Border */}
                        <View style={{ width: 6, backgroundColor: color }} />

                        {/* Content */}
                        <View className="flex-1 p-4">
                          {/* Mini-Goal Title */}
                          <Text className="mb-3 text-base font-bold text-text-primary dark:text-text-dark">
                            {group.miniGoalTitle}
                          </Text>

                          {/* Time Range */}
                          {firstTask.dueDate && (
                            <View className="mb-3 flex-row items-center gap-2">
                              <Ionicons
                                name="time-outline"
                                size={18}
                                color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                              />
                              <View
                                className="rounded px-2 py-1"
                                style={{ backgroundColor: color }}>
                                <Text className="text-xs font-semibold text-white">
                                  {formatTime(firstTask.dueDate)}
                                </Text>
                              </View>
                              {group.tasks.length > 1 && lastTask.dueDate && (
                                <>
                                  <Text className="dark:text-text-dark-secondary text-sm text-text-secondary">
                                    To
                                  </Text>
                                  <View
                                    className="rounded px-2 py-1"
                                    style={{ backgroundColor: color, opacity: 0.8 }}>
                                    <Text className="text-xs font-semibold text-white">
                                      {formatTime(lastTask.dueDate)}
                                    </Text>
                                  </View>
                                </>
                              )}
                            </View>
                          )}

                          {/* Tasks */}
                          <View className="gap-2">
                            {group.tasks.map((task: any) => (
                              <TouchableOpacity
                                key={task.id}
                                className="flex-row items-center gap-3">
                                <View
                                  className="h-5 w-5 items-center justify-center rounded-full"
                                  style={{
                                    backgroundColor: task.completed ? color : 'transparent',
                                    borderWidth: task.completed ? 0 : 2,
                                    borderColor: '#d1d5db',
                                  }}>
                                  {task.completed && (
                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                  )}
                                </View>
                                <Text
                                  className="flex-1 text-sm"
                                  style={{
                                    color: task.completed
                                      ? '#9ca3af'
                                      : colorScheme === 'dark'
                                        ? '#fff'
                                        : '#000',
                                    textDecorationLine: task.completed ? 'line-through' : 'none',
                                  }}>
                                  {task.title}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Assignment sheet */}
      {assignSheet && (
        <AssignmentSheet
          visible={assignSheet.visible}
          onClose={() => setAssignSheet(null)}
          miniGoalId={assignSheet.miniGoalId}
          miniGoalTitle={assignSheet.miniGoalTitle}
          taskIndex={assignSheet.taskIndex}
          taskTitle={assignSheet.taskTitle}
          participants={shardParticipants}
          currentAssigneeId={assignSheet.currentAssigneeId}
          onAssigned={() => refetchShard()}
        />
      )}
    </SafeAreaView>
  );
};
export default ShardInfo;
