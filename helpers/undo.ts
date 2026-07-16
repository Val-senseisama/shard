import type { ScheduleTask } from '~/store/schedule.store';

/**
 * How long after completing a task you can still take it back.
 * MUST match UNDO_WINDOW_MINUTES in shard-server/src/schema/resolvers/XP.ts —
 * the server is the authority and will reject a late undo; this only decides
 * whether the UI offers one.
 */
export const UNDO_WINDOW_MS = 5 * 60 * 1000;

export const canUndo = (task: Pick<ScheduleTask, 'completed' | 'completedAt'>) =>
  task.completed && !!task.completedAt && Date.now() - Number(task.completedAt) < UNDO_WINDOW_MS;
