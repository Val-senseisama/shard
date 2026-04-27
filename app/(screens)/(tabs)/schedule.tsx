import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  useColorScheme,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { GET_MY_SCHEDULE } from '~/Graphql/Queries';
import { COMPLETE_TASK } from '~/Graphql/Mutations';
import { useOfflineMutation } from '~/hooks/useOfflineMutation';
import { useScheduleStore } from '~/store/schedule.store';
import * as syncService from '~/services/syncService';
import Toast from 'react-native-toast-message';
import AnimatedPressable from '~/components/AnimatedPressable';
import { ACCENT, ACCENT_COLORS, t, useSkeletonOpacity } from '~/components/shard/constants';
import { Skeleton } from '~/components/shard/Skeleton';

const DAY_ITEM_WIDTH = 56;
const DAY_ITEM_MARGIN = 4;
const DAY_ITEM_TOTAL = DAY_ITEM_WIDTH + DAY_ITEM_MARGIN * 2;
const TODAY_INDEX = 30;

// Always use local date to avoid UTC offset shifting the day
const toLocalDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ─── Day Pill ─────────────────────────────────────────────────────
// Uses Pressable (not AnimatedPressable) — each AnimatedPressable creates
// a Reanimated useSharedValue; 60 of them kill scroll FPS.

const DayItem = React.memo(
  ({
    day,
    isToday,
    isSelected,
    isDark,
    onPress,
  }: {
    day: Date;
    isToday: boolean;
    isSelected: boolean;
    isDark: boolean;
    onPress: () => void;
  }) => {
    const theme = t(isDark);
    const bg = isSelected
      ? ACCENT
      : isToday
        ? isDark
          ? 'rgba(124,58,237,0.15)'
          : 'rgba(124,58,237,0.08)'
        : 'transparent';

    return (
      <Pressable
        onPress={onPress}
        style={{
          width: DAY_ITEM_WIDTH,
          marginHorizontal: DAY_ITEM_MARGIN,
          paddingVertical: 10,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderWidth: isToday && !isSelected ? 1.5 : 0,
          borderColor: ACCENT,
        }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1,
            color: isSelected ? 'rgba(255,255,255,0.7)' : theme.textSecondary,
            marginBottom: 4,
          }}>
          {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
        </Text>
        <Text
          style={{
            fontSize: isToday ? 20 : 16,
            fontWeight: isSelected || isToday ? '700' : '500',
            color: isSelected ? '#fff' : isToday ? ACCENT : theme.textSecondary,
          }}>
          {day.getDate()}
        </Text>
      </Pressable>
    );
  }
);

// ─── Task Item ────────────────────────────────────────────────────

const TaskItem = React.memo(
  ({
    task,
    color,
    isDark,
    onToggle,
  }: {
    task: any;
    color: string;
    isDark: boolean;
    onToggle: (task: any) => void;
  }) => {
    const theme = t(isDark);
    return (
      <AnimatedPressable
        onPress={() => onToggle(task)}
        scaleDown={0.98}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: task.completed ? color : 'transparent',
            borderWidth: task.completed ? 0 : 2,
            borderColor: theme.border,
          }}>
          {task.completed && <Ionicons name="checkmark" size={13} color="#fff" />}
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            color: task.completed ? theme.textSecondary : theme.text,
            textDecorationLine: task.completed ? 'line-through' : 'none',
          }}>
          {task.title}
        </Text>
      </AnimatedPressable>
    );
  }
);

// ─── Goal Card ────────────────────────────────────────────────────

const GoalCard = React.memo(
  ({
    group,
    color,
    isDark,
    onTaskToggle,
  }: {
    group: any;
    color: string;
    isDark: boolean;
    onTaskToggle: (task: any) => void;
  }) => {
    const theme = t(isDark);
    const total = group.tasks.length;
    const done = group.tasks.filter((task: any) => task.completed).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const allDone = done === total;

    return (
      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isDark ? theme.border : 'rgba(0,0,0,0.06)',
        }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 4, backgroundColor: allDone ? '#22c55e' : color, borderRadius: 2 }} />
          <View style={{ flex: 1, padding: 16 }}>
            {/* Shard name + completion badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color }}>
                {group.shardTitle}
              </Text>
              {allDone ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: 'rgba(34,197,94,0.12)',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}>
                  <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#22c55e' }}>Done</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>
                  {done}/{total}
                </Text>
              )}
            </View>

            {/* Mini-goal title */}
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 10 }}>
              {group.miniGoalTitle}
            </Text>

            {/* Progress bar */}
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.trackBg,
                marginBottom: 12,
                overflow: 'hidden',
              }}>
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: allDone ? '#22c55e' : color,
                  width: `${pct}%`,
                }}
              />
            </View>

            {/* Tasks */}
            <View style={{ gap: 4 }}>
              {group.tasks.map((task: any) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  color={allDone ? '#22c55e' : color}
                  isDark={isDark}
                  onToggle={onTaskToggle}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }
);

// ─── Goal Card Skeleton ───────────────────────────────────────────

const GoalCardSkeleton = ({ isDark, animStyle }: { isDark: boolean; animStyle: any }) => {
  const theme = t(isDark);
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isDark ? theme.border : 'rgba(0,0,0,0.06)',
      }}>
      <View style={{ flexDirection: 'row' }}>
        <Skeleton width={4} height={110} style={{ borderRadius: 0 }} animStyle={animStyle} />
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width="45%" height={11} animStyle={animStyle} />
            <Skeleton width={32} height={11} animStyle={animStyle} />
          </View>
          <Skeleton width="70%" height={16} animStyle={animStyle} />
          <Skeleton width="100%" height={4} style={{ borderRadius: 2 }} animStyle={animStyle} />
          <Skeleton width="80%" height={13} animStyle={animStyle} />
          <Skeleton width="65%" height={13} animStyle={animStyle} />
        </View>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────

const Schedule = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = t(isDark);
  const { width: screenWidth } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const flatListRef = useRef<FlatList>(null);
  const skeletonAnim = useSkeletonOpacity();

  const calendarInitialOffset = useMemo(
    () => ({
      x: Math.max(0, 16 + TODAY_INDEX * DAY_ITEM_TOTAL + DAY_ITEM_TOTAL / 2 - screenWidth / 2),
      y: 0,
    }),
    [screenWidth]
  );

  const [refreshing, setRefreshing] = useState(false);
  const cachedTasksByDate = useScheduleStore((state) => state.tasksByDate);
  const setSchedule = useScheduleStore((state) => state.setSchedule);
  const markLocalComplete = useScheduleStore((state) => state.markTaskComplete);

  const { data, loading, error, refetch } = useQuery(GET_MY_SCHEDULE, {
    onCompleted: (d) => {
      if (d?.getMySchedule) {
        setSchedule(d.getMySchedule);
        const all = d.getMySchedule.tasks ?? [];
        if (all.length) syncService.saveSchedule(all).catch(console.warn);
      }
    },
  });

  const [completeTask] = useOfflineMutation('COMPLETE_TASK', COMPLETE_TASK, {
    onCompleted: (result) => {
      if (result?.completeTask?.success) {
        Toast.show({ type: 'success', text1: result.completeTask.message || 'Task completed!' });
        refetch();
      }
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const allDays = useMemo(() => {
    const days: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const start = new Date(base);
    start.setDate(base.getDate() - TODAY_INDEX);
    for (let i = 0; i < 60; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  // Stable string — computed once per render, not inside callbacks
  const today = useMemo(() => toLocalDateKey(new Date()), []);
  const selectedDateKey = toLocalDateKey(selectedDate);
  const isViewingToday = selectedDateKey === today;

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: DAY_ITEM_TOTAL,
      offset: DAY_ITEM_TOTAL * index,
      index,
    }),
    []
  );

  const handleTaskToggle = useCallback(
    async (task: any) => {
      if (task.completed) return;
      const [miniGoalId, taskIndexStr] = task.id.split('-');
      const taskIndex = parseInt(taskIndexStr, 10);
      // Optimistic update — marks it done in the store immediately
      markLocalComplete(task.id);
      try {
        await completeTask({
          shardId: task.shardId,
          miniGoalId,
          taskIndex,
        });
      } catch (err) {
        console.error('Task completion error:', err);
      }
    },
    [completeTask, markLocalComplete]
  );

  const tasksForSelectedDate =
    data?.getMySchedule?.tasksByDate?.[selectedDateKey] ??
    cachedTasksByDate?.[selectedDateKey] ??
    [];

  const groupedTasks = useMemo(
    () =>
      tasksForSelectedDate.reduce((acc: any, task: any) => {
        const key = task.miniGoalId;
        if (!acc[key]) {
          acc[key] = { miniGoalTitle: task.miniGoalTitle, shardTitle: task.shardTitle, tasks: [] };
        }
        acc[key].tasks.push(task);
        return acc;
      }, {}),
    [tasksForSelectedDate]
  );

  const renderDayItem = useCallback(
    ({ item: day }: { item: Date }) => {
      const dateKey = toLocalDateKey(day);
      return (
        <DayItem
          day={day}
          isToday={dateKey === today}
          isSelected={dateKey === selectedDateKey}
          isDark={isDark}
          onPress={() => setSelectedDate(day)}
        />
      );
    },
    [today, selectedDateKey, isDark]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: ACCENT }}>
          Schedule
        </Text>
      </View>

      {/* Month label */}
      <Text
        style={{
          marginBottom: 8,
          paddingHorizontal: 20,
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: theme.textSecondary,
        }}>
        {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </Text>

      {/* Calendar strip */}
      <FlatList
        ref={flatListRef}
        data={allDays}
        renderItem={renderDayItem}
        keyExtractor={(_, i) => i.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        contentOffset={calendarInitialOffset}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        snapToInterval={DAY_ITEM_TOTAL}
        decelerationRate="fast"
        scrollEventThrottle={32}
        windowSize={5}
        maxToRenderPerBatch={10}
        style={{ flexGrow: 0 }}
      />

      {/* Content */}
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ACCENT}
              colors={[ACCENT]}
            />
          }>
          {/* Section title */}
          <View style={{ marginTop: 12, marginBottom: 12, paddingHorizontal: 20 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: theme.textSecondary,
              }}>
              {isViewingToday ? "Today's Goals" : 'Scheduled Goals'}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {/* Skeletons while loading */}
            {loading && (
              <View style={{ gap: 16 }}>
                {[1, 2, 3].map((i) => (
                  <GoalCardSkeleton key={i} isDark={isDark} animStyle={skeletonAnim} />
                ))}
              </View>
            )}

            {/* Error */}
            {error && (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                <Ionicons name="alert-circle-outline" size={48} color={theme.textSecondary} />
                <Text style={{ marginTop: 12, color: theme.textSecondary }}>
                  Failed to load schedule
                </Text>
              </View>
            )}

            {/* Empty */}
            {!loading && !error && tasksForSelectedDate.length === 0 && (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 20,
                    backgroundColor: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.06)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}>
                  <Ionicons name="calendar-outline" size={36} color={ACCENT} />
                </View>
                <Text style={{ fontSize: 14, textAlign: 'center', color: theme.textSecondary }}>
                  No tasks scheduled for this date
                </Text>
              </View>
            )}

            {/* Goal cards */}
            {!loading && !error && Object.keys(groupedTasks).length > 0 && (
              <View style={{ gap: 16 }}>
                {Object.values(groupedTasks).map((group: any, i: number) => (
                  <GoalCard
                    key={i}
                    group={group}
                    color={ACCENT_COLORS[i % ACCENT_COLORS.length]}
                    isDark={isDark}
                    onTaskToggle={handleTaskToggle}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

      </View>
    </SafeAreaView>
  );
};

export default Schedule;
