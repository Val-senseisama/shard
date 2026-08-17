import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AntDesign, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_MY_SCHEDULE } from '~/Graphql/Queries';
import { COMPLETE_TASK } from '~/Graphql/Mutations';
import Toast from 'react-native-toast-message';
import DrawerNavigation from '@/components/DrawerNavigation';
import AnimatedPressable from '~/components/AnimatedPressable';
import TaskCheck, { TaskTitle } from '~/components/TaskCheck';
import RescheduleSheet, { type RescheduleTarget } from '~/components/RescheduleSheet';
import { useUserStore } from '~/store/user.store';
import type { ScheduleTask } from '~/store/schedule.store';
import { selectOverdue, taskIndexOf, daysFromToday } from '~/helpers/todayPlan';
import { haptic } from '~/helpers/motion';
import { hud, FONT, Num, RADIUS, HudLabel } from '~/components/hud';

/**
 * Everything that slipped, and the three things you can do about it.
 *
 * This screen used to be read-only in practice. It carried a `handleCompleteTask`
 * that nothing called, whose body passed a hard-coded `taskIndex: 0` under a
 * comment thread reasoning itself into a dead end — so the only actual action was
 * a row tap that navigated away to the quest. Meanwhile `resolveOverdueTask` sat
 * fully implemented on the server with no caller anywhere in the app.
 *
 * A backlog you can only look at is a guilt list. The three resolutions a late
 * task actually has — do it, move it, drop it — are all here now, on the row.
 */
const Backlog = () => {
  const isDark = useColorScheme() === 'dark';
  const c = hud(isDark);
  const user = useUserStore((state) => state.user);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState<RescheduleTarget | null>(null);

  const { data, loading, refetch } = useQuery(GET_MY_SCHEDULE, {
    fetchPolicy: 'cache-and-network',
  });

  const [completeTask] = useMutation(COMPLETE_TASK);

  // One definition of "late", shared with the empty-day ladder on Home. The
  // boundary is local midnight rather than `Date.now()`: a task due at 9am today
  // is still today's work at 2pm, not backlog.
  const overdueTasks: ScheduleTask[] = useMemo(
    () => selectOverdue(data?.getMySchedule?.tasks ?? []),
    [data]
  );

  const inFlight = useRef<Set<string>>(new Set());

  const handleComplete = useCallback(
    async (task: ScheduleTask) => {
      if (inFlight.current.has(task.id)) return;

      // The real index, from the API field with the composite id as fallback.
      // The old hard-coded 0 would have completed the first task of the mini-goal
      // whichever row was tapped.
      const taskIndex = taskIndexOf(task);
      if (!task.shardId || !task.miniGoalId || taskIndex < 0) {
        Toast.show({ type: 'error', text1: 'Could not complete that task.' });
        return;
      }

      inFlight.current.add(task.id);
      haptic.complete();
      try {
        const res = await completeTask({
          variables: { shardId: task.shardId, miniGoalId: task.miniGoalId, taskIndex },
        });
        const payload = res?.data?.completeTask;
        if (payload?.success) {
          const earned = payload.xpEarned ?? 0;
          Toast.show({
            type: 'success',
            text1: 'Caught up',
            text2: earned > 0 ? `+${earned} XP` : undefined,
          });
          await refetch();
        } else {
          Toast.show({ type: 'error', text1: payload?.message || 'Could not complete that task.' });
        }
      } catch {
        Toast.show({ type: 'error', text1: 'Could not complete that task.' });
      } finally {
        inFlight.current.delete(task.id);
      }
    },
    [completeTask, refetch]
  );

  const renderItem = useCallback(
    ({ item }: { item: ScheduleTask }) => {
      const late = -daysFromToday(item.dueDate);

      return (
        <View
          style={{
            backgroundColor: c.panel,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: c.panelBorder,
            padding: 14,
            marginBottom: 10,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <AnimatedPressable
              onPress={() => handleComplete(item)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: false }}
              accessibilityLabel={`Complete ${item.title}`}
              hitSlop={8}
              containerStyle={{ marginRight: 12, marginTop: 1 }}>
              <TaskCheck done={false} isDark={isDark} />
            </AnimatedPressable>

            <AnimatedPressable
              scaleDown={0.99}
              onPress={() => router.push(`/(screens)/shard/${item.shardId}`)}
              accessibilityLabel={`Open ${item.shardTitle ?? 'quest'}`}
              containerStyle={{ flex: 1 }}
              style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <TaskTitle done={false} isDark={isDark} size={15}>
                  {item.title}
                </TaskTitle>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 3,
                    flexWrap: 'wrap',
                  }}>
                  {!!item.shardTitle && (
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: FONT.regular, fontSize: 12, color: c.textFaint, flexShrink: 1 }}>
                      {item.shardTitle}
                    </Text>
                  )}
                  <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: c.ember }}>
                    <Num color={c.ember} size={12}>
                      {late}
                    </Num>{' '}
                    day{late === 1 ? '' : 's'} late
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={17} color={c.textFaint} style={{ marginTop: 2 }} />
            </AnimatedPressable>
          </View>

          <AnimatedPressable
            scaleDown={0.97}
            onPress={() =>
              setRescheduling({
                miniGoalId: item.miniGoalId,
                taskIndex: taskIndexOf(item),
                title: item.title,
              })
            }
            accessibilityLabel={`Move or drop ${item.title}`}
            containerStyle={{ alignSelf: 'flex-start', marginTop: 10, marginLeft: 34 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: RADIUS.pill,
              borderWidth: 1,
              borderColor: c.panelBorderStrong,
            }}>
            <Ionicons name="calendar-outline" size={13} color={c.textDim} />
            <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: c.textDim }}>
              Move or drop
            </Text>
          </AnimatedPressable>
        </View>
      );
    },
    [c, isDark, handleComplete]
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <DrawerNavigation isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} user={user} />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AnimatedPressable
              onPress={() => setIsDrawerOpen(true)}
              accessibilityLabel="Open menu"
              hitSlop={8}>
              <AntDesign name="menu-unfold" size={22} color={c.text} />
            </AnimatedPressable>
            <Text style={{ fontFamily: FONT.bold, fontSize: 20, color: c.text }}>Backlog</Text>
          </View>

          {overdueTasks.length > 0 && (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: RADIUS.pill,
                backgroundColor: 'rgba(245,165,36,0.15)',
              }}>
              <Num color={c.ember} size={12}>
                {overdueTasks.length} late
              </Num>
            </View>
          )}
        </View>

        {loading && !data ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={c.violet} />
          </View>
        ) : (
          <FlatList
            data={overdueTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={c.violet} />
            }
            ListHeaderComponent={
              overdueTasks.length > 0 ? (
                <HudLabel color={c.textDim} size={13} style={{ marginBottom: 12 }}>
                  Do it, move it, or drop it — anything but leave it here.
                </HudLabel>
              ) : null
            }
            ListEmptyComponent={
              <View style={{ marginTop: 80, alignItems: 'center', paddingHorizontal: 32 }}>
                <MaterialIcons name="assignment-turned-in" size={56} color={c.track} />
                <Text
                  style={{ fontFamily: FONT.bold, fontSize: 17, color: c.text, marginTop: 16 }}>
                  Nothing overdue
                </Text>
                <Text
                  style={{
                    fontFamily: FONT.regular,
                    fontSize: 14,
                    color: c.textDim,
                    marginTop: 4,
                    textAlign: 'center',
                  }}>
                  You're all caught up.
                </Text>
              </View>
            }
            renderItem={renderItem}
          />
        )}
      </SafeAreaView>

      <RescheduleSheet
        visible={rescheduling !== null}
        onClose={() => setRescheduling(null)}
        task={rescheduling}
        isDark={isDark}
        onResolved={() => refetch().catch(() => {})}
      />
    </View>
  );
};

export default Backlog;
