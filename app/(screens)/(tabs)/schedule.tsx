import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { FONT, RADIUS } from '~/components/hud';
import { useColorScheme } from '~/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { GET_MY_SCHEDULE } from '~/Graphql/Queries';
import { COMPLETE_TASK, UNCOMPLETE_TASK } from '~/Graphql/Mutations';
import { useOfflineMutation } from '~/hooks/useOfflineMutation';
import { useScheduleStore } from '~/store/schedule.store';
import { canUndo } from '~/helpers/undo';
import { toLocalDateKey, groupTasksByLocalDate } from '~/helpers/dateKeys';
import * as syncService from '~/services/syncService';
import Toast from 'react-native-toast-message';
import AnimatedPressable from '~/components/AnimatedPressable';
import { ACCENT, ACCENT_COLORS, t, useSkeletonOpacity } from '~/components/shard/constants';
import { Skeleton } from '~/components/shard/Skeleton';
import RescheduleSheet, { type RescheduleTarget } from '~/components/RescheduleSheet';
import { taskIndexOf } from '~/helpers/todayPlan';

const DAY_ITEM_WIDTH = 56;
const DAY_ITEM_MARGIN = 4;
const DAY_ITEM_TOTAL = DAY_ITEM_WIDTH + DAY_ITEM_MARGIN * 2;
const TODAY_INDEX = 30;

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
          borderRadius: RADIUS.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderWidth: isToday && !isSelected ? 1.5 : 0,
          borderColor: ACCENT,
        }}>
        <Text
          style={{
            fontSize: 10,
            fontFamily: FONT.bold,
            letterSpacing: 0.2,
            color: isSelected ? 'rgba(255,255,255,0.7)' : theme.textSecondary,
            marginBottom: 4,
          }}>
          {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
        </Text>
        <Text
          style={{
            fontSize: isToday ? 20 : 16,
            fontFamily: isSelected || isToday ? FONT.bold : FONT.medium,
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
    onReschedule,
  }: {
    task: any;
    color: string;
    isDark: boolean;
    onToggle: (task: any) => void;
    onReschedule: (task: any) => void;
  }) => {
    const theme = t(isDark);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <AnimatedPressable
        onPress={() => onToggle(task)}
        scaleDown={0.98}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: !!task.completed }}
        accessibilityLabel={task.title}
        containerStyle={{ flex: 1 }}
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

      {/* Only on open tasks: a finished one has no day left to move to. An icon
          rather than a long-press because a hidden gesture is not a feature —
          rescheduling had no entry point at all before this, and burying it in
          one people have to guess at would barely change that. */}
      {!task.completed && (
        <AnimatedPressable
          onPress={() => onReschedule(task)}
          scaleDown={0.9}
          hitSlop={10}
          accessibilityLabel={`Move or drop ${task.title}`}
          containerStyle={{ paddingLeft: 10 }}>
          <Ionicons name="calendar-outline" size={15} color={theme.textSecondary} />
        </AnimatedPressable>
      )}
      </View>
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
    onTaskReschedule,
    onGoalReschedule,
  }: {
    group: any;
    color: string;
    isDark: boolean;
    onTaskToggle: (task: any) => void;
    onTaskReschedule: (task: any) => void;
    onGoalReschedule: (group: any) => void;
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
          borderRadius: RADIUS.md,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isDark ? theme.border : 'rgba(0,0,0,0.06)',
        }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 4, backgroundColor: allDone ? '#22c55e' : color, borderRadius: 2 }} />
          <View style={{ flex: 1, padding: 16 }}>
            {/* Shard name + completion badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Text style={{ flex: 1, fontSize: 12, fontFamily: FONT.semibold, color }}>
                {group.shardTitle}
              </Text>
              {allDone ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: 'rgba(34,197,94,0.12)',
                    borderRadius: RADIUS.xs,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}>
                  <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
                  <Text style={{ fontSize: 11, fontFamily: FONT.bold, color: '#22c55e' }}>Done</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 12, fontFamily: FONT.semibold, color: theme.textSecondary }}>
                  {done}/{total}
                </Text>
              )}
            </View>

            {/* Mini-goal title. The move control sits on this row rather than
                the task rows because it acts on the whole mini-goal — shifting
                every open task in it by the same amount. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
              <Text style={{ flex: 1, fontSize: 15, fontFamily: FONT.bold, color: theme.text }}>
                {group.miniGoalTitle}
              </Text>
              {!allDone && (
                <AnimatedPressable
                  onPress={() => onGoalReschedule(group)}
                  scaleDown={0.9}
                  hitSlop={10}
                  accessibilityLabel={`Move all of ${group.miniGoalTitle}`}>
                  <Ionicons name="calendar-clear-outline" size={16} color={theme.textSecondary} />
                </AnimatedPressable>
              )}
            </View>

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
                  onReschedule={onTaskReschedule}
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
        borderRadius: RADIUS.md,
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
          <Skeleton width="100%" height={4} style={{ borderRadius: RADIUS.xs }} animStyle={animStyle} />
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

  // Which task the move-or-drop sheet is acting on, if any.
  const [rescheduling, setRescheduling] = useState<RescheduleTarget | null>(null);
  const openReschedule = useCallback((task: any) => {
    setRescheduling({
      miniGoalId: task.miniGoalId,
      taskIndex: taskIndexOf(task),
      title: task.title,
    });
  }, []);

  // No taskIndex — that is what tells the sheet to move the whole mini-goal.
  //
  // No taskCount either, deliberately: this card is scoped to ONE day, so it can
  // only see the mini-goal's tasks that fall on that day. Quoting that number
  // would promise "2 tasks move" and then move seven. The server counts what it
  // actually moved and says so in the result.
  const openGoalReschedule = useCallback((group: any) => {
    setRescheduling({
      miniGoalId: group.miniGoalId,
      title: group.miniGoalTitle,
    });
  }, []);
  const cachedTasks = useScheduleStore((state) => state.tasks);
  const setSchedule = useScheduleStore((state) => state.setSchedule);
  const markLocalComplete = useScheduleStore((state) => state.markTaskComplete);
  const markLocalIncomplete = useScheduleStore((state) => state.markTaskIncomplete);

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

  const [uncompleteTask] = useMutation(UNCOMPLETE_TASK, {
    onCompleted: (result: any) => {
      const res = result?.uncompleteTask;
      Toast.show({
        type: res?.success ? 'success' : 'error',
        text1: res?.success ? 'Task undone' : res?.message || 'Could not undo that task.',
      });
      refetch();
    },
    onError: () => Toast.show({ type: 'error', text1: 'Could not undo that task.' }),
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
      const [miniGoalId, taskIndexStr] = task.id.split('-');
      const taskIndex = parseInt(taskIndexStr, 10);
      const vars = { shardId: task.shardId, miniGoalId, taskIndex };

      // Completed tasks can be taken back, but only inside the undo window;
      // outside it they're inert. The server is the authority either way.
      if (task.completed) {
        if (!canUndo(task)) return;
        markLocalIncomplete(task.id);
        try {
          await uncompleteTask({ variables: vars });
        } catch (err) {
          console.error('Task undo error:', err);
        }
        return;
      }

      // Optimistic update — marks it done in the store immediately
      markLocalComplete(task.id);
      try {
        await completeTask(vars);
      } catch (err) {
        console.error('Task completion error:', err);
      }
    },
    [completeTask, uncompleteTask, markLocalComplete, markLocalIncomplete]
  );

  // Read from the STORE, not the Apollo cache: `markTaskComplete` writes to the
  // store, so rendering from Apollo would leave the box unticked after a tap.
  // Also re-bucket against the LOCAL clock — the server's `tasksByDate` keys are
  // UTC, so a local-key lookup shifts tasks a day off UTC. See helpers/dateKeys.ts.
  const tasksByLocalDate = useMemo(() => groupTasksByLocalDate(cachedTasks), [cachedTasks]);

  const tasksForSelectedDate = tasksByLocalDate[selectedDateKey] ?? [];

  const groupedTasks = useMemo(
    () =>
      tasksForSelectedDate.reduce((acc: any, task: any) => {
        const key = task.miniGoalId;
        if (!acc[key]) {
          // miniGoalId is carried, not just used as the key — the move control
          // on the card header needs it to address the mini-goal.
          acc[key] = {
            miniGoalId: key,
            miniGoalTitle: task.miniGoalTitle,
            shardTitle: task.shardTitle,
            tasks: [],
          };
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
        <Text style={{ fontSize: 24, fontFamily: FONT.extrabold, letterSpacing: -0.5, color: ACCENT }}>
          Schedule
        </Text>
      </View>

      {/* Month label */}
      <Text
        style={{
          marginBottom: 8,
          paddingHorizontal: 20,
          fontSize: 11,
          fontFamily: FONT.extrabold,
          letterSpacing: 0.2,
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
                fontFamily: FONT.extrabold,
                letterSpacing: 0.2,
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
                    borderRadius: RADIUS.lg,
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
                    onTaskReschedule={openReschedule}
                    onGoalReschedule={openGoalReschedule}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

      </View>

      <RescheduleSheet
        visible={rescheduling !== null}
        onClose={() => setRescheduling(null)}
        task={rescheduling}
        isDark={isDark}
        onResolved={() => refetch().catch(() => {})}
      />
    </SafeAreaView>
  );
};

export default Schedule;
