import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { GET_MY_SCHEDULE } from '~/Graphql/Queries';
import { COMPLETE_TASK, UNCOMPLETE_TASK } from '~/Graphql/Mutations';
import { useOfflineMutation } from '~/hooks/useOfflineMutation';
import { useScheduleStore, ScheduleTask } from '~/store/schedule.store';
import { useUserStore } from '~/store/user.store';
import { groupTasksByLocalDate, todayKey } from '~/helpers/dateKeys';
import { canUndo } from '~/helpers/undo';
import AnimatedPressable from '~/components/AnimatedPressable';
import CelebrationOverlay from '~/components/CelebrationOverlay';
import { hud, FONT, HudLabel, Num, ShardBar, HudSkeleton } from '~/components/hud';

const MAX_ROWS = 4;

const TaskRow = ({
  task,
  isDark,
  onToggle,
}: {
  task: ScheduleTask;
  isDark: boolean;
  onToggle: (task: ScheduleTask) => void;
}) => {
  const c = hud(isDark);
  const done = task.completed;
  const undoable = canUndo(task);
  return (
    <AnimatedPressable
      scaleDown={0.98}
      onPress={() => (!done || undoable) && onToggle(task)}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderColor: done ? c.violet : c.panelBorderStrong,
          backgroundColor: done ? c.violet : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}>
        {done && <Ionicons name="checkmark" size={13} color="#fff" />}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            fontFamily: FONT.semibold,
            color: done ? c.textFaint : c.text,
            textDecorationLine: done ? 'line-through' : 'none',
          }}>
          {task.title}
        </Text>
        {!!task.shardTitle && (
          <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: FONT.regular, color: c.textFaint, marginTop: 2 }}>
            {task.shardTitle}
          </Text>
        )}
      </View>

      {undoable ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c.panelBorderStrong,
          }}>
          <Ionicons name="arrow-undo-outline" size={12} color={c.textDim} />
          <Text style={{ fontSize: 12, fontFamily: FONT.semibold, color: c.textDim }}>Undo</Text>
        </View>
      ) : (
        <Num color={done ? c.textFaint : c.ember} size={12}>
          +{task.xpReward} XP
        </Num>
      )}
    </AnimatedPressable>
  );
};

/**
 * "What do I do today" — the only module on Home that gives a reason to open
 * the app *daily*. Everything else is browsing. Completing inline closes the
 * loop (tap → XP → streak safe) without navigating anywhere.
 */
const TodayCard = ({ isDark: isDarkProp }: { isDark?: boolean }) => {
  const scheme = useColorScheme();
  const isDark = isDarkProp ?? scheme === 'dark';
  const c = hud(isDark);
  const client = useApolloClient();

  const [celebration, setCelebration] = useState<{ xpEarned: number; leveledUp: boolean; newLevel: number } | null>(
    null
  );

  // The STORE is the single source of truth for rendering, not the Apollo
  // cache. `markTaskComplete` writes to the store, so reading from Apollo here
  // would leave the row unticked after a tap — which made people tap again and
  // hit the server's "already completed" path (xpEarned: 0).
  const tasks = useScheduleStore((s) => s.tasks);
  const setSchedule = useScheduleStore((s) => s.setSchedule);
  const markLocalComplete = useScheduleStore((s) => s.markTaskComplete);
  const markLocalIncomplete = useScheduleStore((s) => s.markTaskIncomplete);
  const updateUser = useUserStore((s) => s.updateUser);

  const { data, loading, refetch } = useQuery(GET_MY_SCHEDULE, {
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  // Only the very first fetch (no cached data at all) should show a skeleton —
  // background refetches (pull-to-refresh, post-toggle) must not blank the card.
  const initialLoading = loading && data === undefined;

  // Sync query → store on every result. Using `onCompleted` here would miss
  // refetches (e.g. pull-to-refresh via client.refetchQueries), leaving the
  // store — which is what we render from — stale.
  useEffect(() => {
    if (data?.getMySchedule) setSchedule(data.getMySchedule);
  }, [data, setSchedule]);

  // NB: deliberately NOT using getMySchedule.todaysTasks — the server buckets
  // it in UTC. See helpers/dateKeys.ts.
  const todaysTasks = useMemo(() => groupTasksByLocalDate(tasks)[todayKey()] ?? [], [tasks]);

  // A task already being completed must not be submitted twice; the second
  // request returns success with xpEarned: 0 and would show a "+0 XP" party.
  const inFlight = useRef<Set<string>>(new Set());

  const [completeTask] = useOfflineMutation('COMPLETE_TASK', COMPLETE_TASK, {
    onCompleted: (result: any) => {
      const res = result?.completeTask;
      if (!res?.success) return;

      // Keep the header's XP/level in sync — otherwise Home still shows the old
      // XP until the next CURRENT_USER fetch.
      if (res.xpResult?.newXP != null) {
        updateUser({ xp: res.xpResult.newXP, level: res.xpResult.newLevel ?? undefined });
      }

      // Only celebrate a real award. `xpEarned: 0` means the server considered
      // it already done, and a "+0 XP" celebration is worse than none.
      const earned = res.xpEarned ?? 0;
      if (earned > 0) {
        setCelebration({
          xpEarned: earned,
          leveledUp: res.xpResult?.leveledUp ?? false,
          newLevel: res.xpResult?.newLevel ?? 1,
        });
      }

      // Pull server truth back in (streaks, sibling tasks in the same mini-goal).
      // Write the result to the store explicitly — onCompleted isn't guaranteed
      // to fire for a refetch.
      refetch()
        .then((r) => {
          if (r.data?.getMySchedule) setSchedule(r.data.getMySchedule);
        })
        .catch(() => {});

      // Earning XP changes your rank, but the leaderboard is a separate cached
      // query — without this the RankCard right below still shows the old XP.
      client.refetchQueries({ include: ['GetLeaderboard'] });
    },
  });

  const [uncompleteTask] = useMutation(UNCOMPLETE_TASK, {
    onCompleted: (result: any) => {
      const res = result?.uncompleteTask;
      if (!res?.success) {
        // Window closed, or not permitted — say so and restore the tick.
        Toast.show({ type: 'error', text1: res?.message || 'Could not undo that task.' });
        refetch()
          .then((r) => r.data?.getMySchedule && setSchedule(r.data.getMySchedule))
          .catch(() => {});
        return;
      }
      if (res.xpResult?.newXP != null) {
        updateUser({ xp: res.xpResult.newXP, level: res.xpResult.newLevel ?? undefined });
      }
      Toast.show({ type: 'success', text1: 'Task undone', text2: `${Math.abs(res.xpEarned ?? 0)} XP returned` });
      client.refetchQueries({ include: ['GetLeaderboard'] });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Could not undo that task.' }),
  });

  const handleToggle = useCallback(
    async (task: ScheduleTask) => {
      if (inFlight.current.has(task.id)) return;

      const [miniGoalId, taskIndexStr] = task.id.split('-');
      const taskIndex = parseInt(taskIndexStr, 10);
      const vars = { shardId: task.shardId, miniGoalId, taskIndex };

      inFlight.current.add(task.id);
      try {
        if (task.completed) {
          if (!canUndo(task)) return; // window closed — row is inert, not tappable
          markLocalIncomplete(task.id);
          await uncompleteTask({ variables: vars });
        } else {
          markLocalComplete(task.id);
          await completeTask(vars);
        }
      } catch (err) {
        console.error('Task toggle error:', err);
      } finally {
        inFlight.current.delete(task.id);
      }
    },
    [completeTask, uncompleteTask, markLocalComplete, markLocalIncomplete]
  );

  const doneCount = todaysTasks.filter((t) => t.completed).length;
  const total = todaysTasks.length;
  const allDone = total > 0 && doneCount === total;
  const xpToday = todaysTasks.filter((t) => t.completed).reduce((sum, t) => sum + (t.xpReward || 0), 0);
  const visible = todaysTasks.slice(0, MAX_ROWS);
  const overflow = total - visible.length;

  // Most recently completed task that's still inside the undo window.
  const lastUndoable = todaysTasks
    .filter(canUndo)
    .sort((a, b) => Number(b.completedAt) - Number(a.completedAt))[0];

  return (
    <>
      <View
        style={{
          backgroundColor: c.panel,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.panelBorder,
          padding: 16,
          marginTop: 16,
        }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <HudLabel color={c.text} size={15}>
            Today
          </HudLabel>
          {!initialLoading && total > 0 && (
            <Num color={allDone ? c.violet : c.textDim} size={12}>
              {doneCount} / {total}
            </Num>
          )}
        </View>

        {!initialLoading && total > 0 && (
          <ShardBar progress={doneCount / total} isDark={isDark} height={5} style={{ marginTop: 10 }} />
        )}

        {initialLoading ? (
          <View style={{ marginTop: 14, gap: 4 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                <HudSkeleton isDark={isDark} width={22} height={22} radius={11} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <HudSkeleton isDark={isDark} width={i === 1 ? '55%' : '75%'} height={14} radius={4} />
                </View>
                <HudSkeleton isDark={isDark} width={40} height={12} radius={4} style={{ marginLeft: 12 }} />
              </View>
            ))}
          </View>
        ) : total === 0 ? (
          <AnimatedPressable
            scaleDown={0.98}
            onPress={() => router.push('/(screens)/(tabs)/schedule')}
            style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: FONT.semibold, color: c.textDim }}>
                Nothing scheduled today
              </Text>
              <Text style={{ fontSize: 13, fontFamily: FONT.regular, color: c.violet, marginTop: 3 }}>
                Plan my day
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
          </AnimatedPressable>
        ) : allDone ? (
          <View style={{ paddingTop: 14 }}>
            <Text style={{ fontSize: 15, fontFamily: FONT.bold, color: c.text }}>Today cleared 🔥</Text>
            <Text style={{ fontSize: 13, fontFamily: FONT.regular, color: c.textDim, marginTop: 3 }}>
              <Num color={c.ember} size={13}>
                +{xpToday} XP
              </Num>{' '}
              earned · streak safe
            </Text>
            {/* Clearing the last task swaps the list out for this panel — without
                this the undo window would be unreachable exactly when you mis-tap. */}
            {lastUndoable && (
              <AnimatedPressable
                scaleDown={0.97}
                onPress={() => handleToggle(lastUndoable)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 }}>
                <Ionicons name="arrow-undo-outline" size={13} color={c.textDim} />
                <Text style={{ fontSize: 13, fontFamily: FONT.semibold, color: c.textDim }}>
                  Undo "{lastUndoable.title}"
                </Text>
              </AnimatedPressable>
            )}
          </View>
        ) : (
          <View style={{ marginTop: 4 }}>
            {visible.map((task) => (
              <TaskRow key={task.id} task={task} isDark={isDark} onToggle={handleToggle} />
            ))}
            {overflow > 0 && (
              <AnimatedPressable
                scaleDown={0.98}
                onPress={() => router.push('/(screens)/(tabs)/schedule')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10 }}>
                <Text style={{ fontSize: 13, fontFamily: FONT.semibold, color: c.violet }}>
                  {overflow} more
                </Text>
                <Ionicons name="chevron-forward" size={15} color={c.violet} style={{ marginLeft: 2 }} />
              </AnimatedPressable>
            )}
          </View>
        )}
      </View>

      <CelebrationOverlay
        visible={!!celebration}
        xpEarned={celebration?.xpEarned ?? 0}
        leveledUp={celebration?.leveledUp ?? false}
        newLevel={celebration?.newLevel ?? 1}
        onClose={() => setCelebration(null)}
      />
    </>
  );
};

export default React.memo(TodayCard);
