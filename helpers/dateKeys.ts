import type { ScheduleTask } from '~/store/schedule.store';

/**
 * The device's IANA timezone (e.g. `America/Los_Angeles`), or `undefined` if the
 * platform won't tell us. Sent up at signup and on every foreground; the server
 * schedules all reminders and evaluates quiet hours against it.
 */
export const deviceTimeZone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

/** `YYYY-MM-DD` in the device's own timezone. */
export const toLocalDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Bucket tasks by the day the USER sees them on.
 *
 * The server builds `getMySchedule.tasksByDate` (and `todaysTasks`) with
 * `toISOString()`, i.e. UTC keys — but the app looks them up with a local key.
 * For anyone not on UTC that's an off-by-one day: a task due 9pm on the 4th in
 * UTC-8 lands under the 5th. So we ignore the server's buckets entirely and
 * re-bucket from `tasks[].dueDate` (epoch millis) against the local clock.
 */
export const groupTasksByLocalDate = (tasks: ScheduleTask[] = []): Record<string, ScheduleTask[]> => {
  const byDate: Record<string, ScheduleTask[]> = {};
  for (const task of tasks) {
    if (!task?.dueDate) continue;
    const ms = Number(task.dueDate);
    if (!Number.isFinite(ms)) continue;
    const key = toLocalDateKey(new Date(ms));
    (byDate[key] ??= []).push(task);
  }
  return byDate;
};

export const todayKey = () => toLocalDateKey(new Date());
