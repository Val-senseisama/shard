import type { ScheduleTask } from '~/store/schedule.store';
import { groupTasksByLocalDate, todayKey } from '~/helpers/dateKeys';

/**
 * What the user should do today — the one answer, shared by Home and the widget.
 *
 * The streak asks a question the planner does not answer. `recordActivity` on the
 * server credits a day when the user finishes *anything* and never looks at the
 * schedule, so a day the planner left empty still breaks a streak. Before this,
 * both surfaces just reported the emptiness: Home said "Nothing scheduled today"
 * and the widget said "Today cleared", and neither mentioned that the streak was
 * about to go.
 *
 * The fix is at the cause rather than the symptom. Shard is what schedules the
 * day, so an empty day is the planner having nothing to say, not the user having
 * nothing to do — and there is almost always something: work that slipped, a side
 * quest, or the next thing on the plan. This ladder finds it.
 *
 * Lives here, pure and client-side, for two reasons. The day boundary is the
 * user's local one and the server buckets in UTC (see helpers/dateKeys.ts), so
 * "today" can only be decided here. And Home and the widget must never disagree
 * about what the one thing is — that disagreement is the exact class of bug this
 * replaces.
 */

/** Where today's work came from. Drives the copy on both surfaces. */
export type PlanSource =
  /** Tasks the planner actually put on today. The normal path. */
  | 'scheduled'
  /** Nothing due today, but something is past due. Debt outranks everything. */
  | 'overdue'
  /** Nothing due or late — offer the daily-habit mechanic. */
  | 'sideQuest'
  /** No tasks and no side quests, so pull the next thing on the plan forward. */
  | 'upcoming'
  /** Genuinely nothing anywhere. The only honest "nothing to do" state. */
  | 'empty';

/**
 * One suggested thing, normalised across the two kinds.
 *
 * `kind` matters to callers that can act on it: a task can be completed in place
 * (it carries the shard/mini-goal/index that `completeTask` addresses), a side
 * quest needs `completeSideQuest` and so cannot be ticked from a widget.
 */
export interface PlanSuggestion {
  kind: 'task' | 'sideQuest';
  id: string;
  title: string;
  /** Where it comes from — shard title, or the side quest's category. */
  context: string | null;
  xpReward: number;
  /** Only on tasks: what `completeTask` needs. */
  shardId?: string;
  miniGoalId?: string;
  taskIndex?: number;
}

export interface TodayPlan {
  source: PlanSource;
  /** Today's scheduled tasks, local-bucketed. Empty unless source is 'scheduled'. */
  tasks: ScheduleTask[];
  /** Today's completion counts. Both 0 when nothing was scheduled. */
  done: number;
  total: number;
  /** The single thing to put in front of the user, or null when source is 'empty'. */
  suggestion: PlanSuggestion | null;
}

/** A side quest, as `mySideQuests` returns it. */
export interface SideQuestLike {
  id: string;
  title: string;
  category?: string | null;
  xpReward?: number | null;
}

const DAY_MS = 86_400_000;

/** Earliest due first; undated last, so an undated task never wins a "soonest". */
function byDueDate(a: ScheduleTask, b: ScheduleTask): number {
  const av = a.dueDate ? Number(a.dueDate) : Number.POSITIVE_INFINITY;
  const bv = b.dueDate ? Number(b.dueDate) : Number.POSITIVE_INFINITY;
  return av - bv;
}

/**
 * The task's position in its mini-goal, which is how `completeTask` and
 * `resolveOverdueTask` both address it.
 *
 * The API returns it directly. It also encodes it in the composite id
 * `${miniGoalId}-${taskIndex}`, which is what this used to parse — kept as the
 * fallback because a response cached before the client started selecting the
 * field will not have it, and a wrong index completes the wrong task silently.
 */
export function taskIndexOf(task: ScheduleTask): number {
  if (typeof task.taskIndex === 'number' && task.taskIndex >= 0) return task.taskIndex;
  const parsed = Number(String(task.id).split('-').pop());
  return Number.isFinite(parsed) ? parsed : -1;
}

/**
 * Open tasks whose due date is before today, oldest first.
 *
 * Exported so the backlog screen and the empty-day ladder agree on what "late"
 * means. Note the boundary is local midnight, not `Date.now()`: something due at
 * 9am today is still today's work at 2pm, not a backlog item.
 */
export function selectOverdue(tasks: ScheduleTask[] = [], now: Date = new Date()): ScheduleTask[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  return (tasks ?? [])
    .filter((t) => t && !t.completed && t.dueDate && Number(t.dueDate) < startMs)
    .sort(byDueDate);
}

function suggestionFromTask(task: ScheduleTask): PlanSuggestion {
  return {
    kind: 'task',
    id: String(task.id),
    title: String(task.title ?? ''),
    context: task.shardTitle ?? task.miniGoalTitle ?? null,
    xpReward: Number(task.xpReward ?? 0),
    shardId: String(task.shardId ?? ''),
    miniGoalId: String(task.miniGoalId ?? ''),
    taskIndex: taskIndexOf(task),
  };
}

function suggestionFromSideQuest(quest: SideQuestLike): PlanSuggestion {
  return {
    kind: 'sideQuest',
    id: String(quest.id),
    title: String(quest.title ?? ''),
    context: quest.category ?? null,
    xpReward: Number(quest.xpReward ?? 0),
  };
}

/**
 * Resolve today into a plan.
 *
 * `now` is injectable so the ladder is testable without freezing the clock.
 */
export function buildTodayPlan(
  allTasks: ScheduleTask[] = [],
  sideQuests: SideQuestLike[] = [],
  now: Date = new Date()
): TodayPlan {
  const tasks = allTasks ?? [];
  const todays = groupTasksByLocalDate(tasks)[todayKey()] ?? [];

  const done = todays.filter((t) => t?.completed).length;
  const total = todays.length;

  // 1. The planner had something for today.
  if (total > 0) {
    const open = todays.filter((t) => t && !t.completed).sort(byDueDate);
    return {
      source: 'scheduled',
      tasks: todays,
      done,
      total,
      // null once the day is cleared — that is a real state and callers render
      // it as the reward it is.
      suggestion: open.length > 0 ? suggestionFromTask(open[0]) : null,
    };
  }

  // Everything below is the empty-day ladder. Counts stay at zero throughout:
  // nothing was scheduled, and reporting a borrowed task as "1 of 1 today" would
  // be the same lie in a different place.
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayStartMs = startOfToday.getTime();

  const openDated = tasks
    .filter((t) => t && !t.completed && t.dueDate)
    .sort(byDueDate);

  // 2. Work that slipped. Debt outranks everything — offering a fresh task while
  //    something is already late is how a backlog becomes invisible.
  const overdue = selectOverdue(tasks, now);
  if (overdue.length > 0) {
    return {
      source: 'overdue',
      tasks: [],
      done: 0,
      total: 0,
      suggestion: suggestionFromTask(overdue[0]),
    };
  }

  // 3. A side quest, which is what the mechanic is for — helpers/unlocks.ts calls
  //    side quests "the daily-habit mechanic, not an extra". Ranked above pulling
  //    future work forward because doing tomorrow's task today just moves the
  //    empty day to tomorrow.
  const openQuest = (sideQuests ?? []).find((q) => q && q.id);
  if (openQuest) {
    return {
      source: 'sideQuest',
      tasks: [],
      done: 0,
      total: 0,
      suggestion: suggestionFromSideQuest(openQuest),
    };
  }

  // 4. Last resort: the next thing on the plan, whenever it is due.
  const upcoming = openDated.filter((t) => Number(t.dueDate) >= todayStartMs);
  if (upcoming.length > 0) {
    return {
      source: 'upcoming',
      tasks: [],
      done: 0,
      total: 0,
      suggestion: suggestionFromTask(upcoming[0]),
    };
  }

  return { source: 'empty', tasks: [], done: 0, total: 0, suggestion: null };
}

/**
 * Whole local days between today and a due date. Negative means late.
 *
 * Both ends are normalised to local midnight first, so this counts *calendar*
 * days rather than elapsed time: something due tomorrow morning is 1 whether it
 * is now breakfast or midnight. Measuring from the raw timestamps instead makes
 * a task due in three days and twelve hours round to four, and rounding to
 * midnights is also what keeps a DST boundary from shifting the answer.
 */
export function daysFromToday(
  dueDate: string | number | undefined,
  now: Date = new Date()
): number {
  if (!dueDate) return 0;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const due = new Date(Number(dueDate));
  if (Number.isNaN(due.getTime())) return 0;
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - start.getTime()) / DAY_MS);
}
