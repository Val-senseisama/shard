import type { ApolloClient } from '@apollo/client';
import { GET_MY_SCHEDULE, GET_STREAKS } from '@/Graphql/Queries';
import { COMPLETE_TASK } from '@/Graphql/Mutations';
import {
  clearPendingCompletions,
  getPendingCompletions,
  isWidgetSupported,
  setWidgetSnapshot,
  type WidgetSnapshot,
  type WidgetTask,
} from '@/modules/shard-widget';

/**
 * Home-screen widget sync.
 *
 * Two directions, both driven from the app:
 *
 *   app  → widget   `syncWidget()` writes the snapshot the widget renders
 *   widget → app    `drainWidgetCompletions()` sends taps to the server
 *
 * The widget never touches the network itself. It has no auth token (by design —
 * see modules/shard-widget/WidgetStore.kt) and both platforms throttle widget
 * refreshes hard, so a widget that fetched its own data would show stale state
 * and hold credentials for no reason.
 */

/** Pick the task the widget should show. */
function chooseNextTask(tasks: any[]): WidgetTask | null {
  const open = (tasks ?? []).filter((t) => t && !t.completed);
  if (open.length === 0) return null;

  // Earliest due first; undated last. The widget shows exactly one task, so this
  // choice is the whole feature — get it wrong and the widget nags about the
  // wrong thing.
  const sorted = [...open].sort((a, b) => {
    const av = a.dueDate ? Number(a.dueDate) : Number.POSITIVE_INFINITY;
    const bv = b.dueDate ? Number(b.dueDate) : Number.POSITIVE_INFINITY;
    return av - bv;
  });

  const t = sorted[0];

  // `id` is the composite `${miniGoalId}-${taskIndex}` the schedule API returns.
  // taskIndex is parsed from it rather than trusted separately, so the id and the
  // index can never disagree about which task is meant.
  const parsedIndex = Number(String(t.id).split('-').pop());

  return {
    id: String(t.id),
    title: String(t.title ?? ''),
    miniGoalId: String(t.miniGoalId ?? ''),
    shardId: String(t.shardId ?? ''),
    shardTitle: t.shardTitle ?? null,
    miniGoalTitle: t.miniGoalTitle ?? null,
    taskIndex: Number.isFinite(parsedIndex) ? parsedIndex : -1,
  };
}

/**
 * Refresh what the widget displays.
 *
 * Best-effort throughout: a widget is decoration on top of the app and must never
 * be able to fail a screen the user is looking at.
 */
export async function syncWidget(client: ApolloClient<any>): Promise<void> {
  if (!isWidgetSupported) return;

  try {
    const [scheduleRes, streakRes] = await Promise.all([
      client.query({ query: GET_MY_SCHEDULE, fetchPolicy: 'network-only' }),
      client.query({ query: GET_STREAKS, fetchPolicy: 'network-only' }),
    ]);

    const todays = scheduleRes?.data?.getMySchedule?.todaysTasks ?? [];

    // getStreaks returns a list by type; the daily streak is the one the widget
    // shows, falling back to the first entry if the shape ever changes.
    const streaks = streakRes?.data?.getStreaks?.streaks ?? [];
    const daily = streaks.find((s: any) => s?.type === 'daily') ?? streaks[0];

    const snapshot: WidgetSnapshot = {
      streak: Number(daily?.currentStreak ?? 0),
      // The server already decides whether today counts. Deriving it on the
      // client would mean re-implementing the timezone-aware day-key logic that
      // Helpers/Streak.ts owns, and getting it subtly wrong.
      doneToday: !(daily?.atRiskToday ?? true),
      nextTask: chooseNextTask(todays),
      updatedAt: Date.now(),
    };

    setWidgetSnapshot(snapshot);
  } catch {
    // Leave the previous snapshot in place. Stale-but-plausible beats blank.
  }
}

/**
 * Send completions tapped on the widget to the server.
 *
 * Safe to call on every foreground: `completeTask` claims the task with a
 * conditional update and returns "already completed" rather than paying XP twice,
 * so replaying a queue entry that did land is harmless. That server-side
 * idempotency is what lets the widget acknowledge a tap instantly without
 * waiting for a round-trip.
 */
export async function drainWidgetCompletions(client: ApolloClient<any>): Promise<number> {
  if (!isWidgetSupported) return 0;

  const pending = getPendingCompletions();
  if (pending.length === 0) return 0;

  const sent: string[] = [];

  for (const item of pending) {
    // A malformed entry can never be sent successfully, so drop it rather than
    // retrying it on every foreground forever.
    if (!item.shardId || !item.miniGoalId || item.taskIndex < 0) {
      sent.push(item.taskId);
      continue;
    }

    try {
      const res = await client.mutate({
        mutation: COMPLETE_TASK,
        variables: {
          shardId: item.shardId,
          miniGoalId: item.miniGoalId,
          taskIndex: item.taskIndex,
        },
      });
      if (res?.data?.completeTask?.success) sent.push(item.taskId);
    } catch {
      // Almost certainly offline — keep it queued and try again next foreground.
    }
  }

  clearPendingCompletions(sent);
  return sent.length;
}

/**
 * Foreground entry point: flush the queue first, then re-read.
 *
 * Order matters. Refreshing before draining would fetch a schedule that does not
 * yet include the completions the user tapped on the widget, and the snapshot
 * would briefly show a finished task as outstanding.
 */
export async function onAppForeground(client: ApolloClient<any>): Promise<void> {
  if (!isWidgetSupported) return;
  await drainWidgetCompletions(client);
  await syncWidget(client);
}
