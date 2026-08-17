import type { ApolloClient } from '@apollo/client';
import { GET_MY_SCHEDULE, GET_STREAKS, MY_SIDE_QUESTS } from '@/Graphql/Queries';
import { COMPLETE_TASK } from '@/Graphql/Mutations';
import { buildTodayPlan, type PlanSuggestion } from '@/helpers/todayPlan';
import {
  clearPendingCompletions,
  getPendingCompletions,
  isWidgetInstalled,
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

/**
 * Translate the shared plan's suggestion into the widget's task shape.
 *
 * The choice itself lives in helpers/todayPlan.ts, not here. It used to be a
 * local `chooseNextTask` that only ever looked at today's bucket, so the widget
 * and Home could — and did — disagree about what the one thing was.
 */
function toWidgetTask(suggestion: PlanSuggestion | null): WidgetTask | null {
  if (!suggestion) return null;

  return {
    id: suggestion.id,
    title: suggestion.title,
    // A side quest has no shard or mini-goal to address, and `completeTask`
    // cannot finish one — the widget reads `kind` to decide whether to offer
    // "Mark done" or send the user into the app.
    kind: suggestion.kind,
    miniGoalId: suggestion.miniGoalId ?? '',
    shardId: suggestion.shardId ?? '',
    shardTitle: suggestion.context,
    miniGoalTitle: null,
    taskIndex: suggestion.taskIndex ?? -1,
  };
}

/**
 * Refresh what the widget displays.
 *
 * Best-effort throughout: a widget is decoration on top of the app and must never
 * be able to fail a screen the user is looking at.
 *
 * Skipped entirely when the user has no widget placed. Both queries below are
 * `network-only` and this runs on every foreground, so without that check every
 * Android user pays two round trips per app open to render something that does
 * not exist on their home screen — and the great majority of users never place a
 * widget at all.
 *
 * The cost of the check is a snapshot that is stale for the first moments after
 * someone pins the widget: nothing has synced yet, so it shows the signed-out
 * card. Tapping that card opens the app, which foregrounds and syncs, so the
 * state resolves itself the first time the widget is used.
 */
export async function syncWidget(client: ApolloClient<any>): Promise<void> {
  if (!isWidgetSupported || !isWidgetInstalled()) return;

  try {
    const [scheduleRes, streakRes, questRes] = await Promise.all([
      client.query({ query: GET_MY_SCHEDULE, fetchPolicy: 'network-only' }),
      client.query({ query: GET_STREAKS, fetchPolicy: 'network-only' }),
      // Cache-first: the server caches this for 30 minutes anyway, and it is
      // only consulted on a day the planner left empty. Failing softly matters
      // more than freshness — a side quest is the fallback, not the headline.
      client
        .query({ query: MY_SIDE_QUESTS, fetchPolicy: 'cache-first' })
        .catch(() => null),
    ]);

    // `tasks`, never `todaysTasks`. The server builds that field (and
    // `tasksByDate`) with `toISOString()`, so its buckets are UTC days while the
    // user's streak, their schedule screen and this widget all mean their *local*
    // day. buildTodayPlan re-buckets via helpers/dateKeys.ts, and also supplies
    // the fallback for a day the planner left empty.
    const plan = buildTodayPlan(
      scheduleRes?.data?.getMySchedule?.tasks ?? [],
      questRes?.data?.mySideQuests?.sideQuests ?? []
    );

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
      nextTask: toWidgetTask(plan.suggestion),
      // Both zero on a fallback day: nothing was scheduled, and reporting a
      // borrowed task as "1 of 1 today" would be the same lie the widget used to
      // tell with "Today cleared".
      tasksDone: plan.done,
      tasksTotal: plan.total,
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
  // Deliberately NOT gated on isWidgetInstalled, unlike syncWidget. Someone can
  // tap the widget and then remove it before the app next opens, and those taps
  // are real work the user did — dropping them because the widget is gone would
  // lose XP and, worse, break a streak. Costs nothing when the queue is empty:
  // a SharedPreferences read and an early return, no network.
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
 *
 * For a user with no widget placed — most users — this reaches the network zero
 * times. Each half decides that for itself; see the notes on the two functions
 * for why they answer it differently.
 */
export async function onAppForeground(client: ApolloClient<any>): Promise<void> {
  if (!isWidgetSupported) return;
  await drainWidgetCompletions(client);
  await syncWidget(client);
}
