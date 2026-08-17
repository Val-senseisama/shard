import { create } from 'zustand';

export interface ScheduleTask {
  id: string;
  shardId: string;
  miniGoalId: string;
  shardTitle?: string;
  miniGoalTitle?: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  /** Epoch-millis string. Drives the undo window; null once undone. */
  completedAt?: string | null;
  xpReward: number;
  /**
   * 0-based position within the parent mini-goal.
   *
   * `completeTask` and `resolveOverdueTask` both address a task by this index.
   * The schedule API has always returned it; the client used to re-derive it by
   * splitting the composite `${miniGoalId}-${taskIndex}` id instead, which works
   * but is a second source of truth for the same fact.
   */
  taskIndex?: number;
  /** Past due and still open, as marked by the server's nightly sweep. */
  overdue?: boolean;
}

interface ScheduleStore {
  tasks: ScheduleTask[];
  todaysTasks: ScheduleTask[];
  tasksByDate: Record<string, ScheduleTask[]>;
  setSchedule: (data: {
    tasks: ScheduleTask[];
    todaysTasks: ScheduleTask[];
    tasksByDate: Record<string, ScheduleTask[]>;
  }) => void;
  markTaskComplete: (taskId: string) => void;
  markTaskIncomplete: (taskId: string) => void;
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  tasks: [],
  todaysTasks: [],
  tasksByDate: {},

  setSchedule: ({ tasks, todaysTasks, tasksByDate }) =>
    set({ tasks, todaysTasks, tasksByDate }),

  markTaskComplete: (taskId) =>
    set((state) => {
      const now = Date.now().toString();
      const update = (list: ScheduleTask[]) =>
        list.map((t) => (t.id === taskId ? { ...t, completed: true, completedAt: now } : t));

      const nextTasksByDate = Object.fromEntries(
        Object.entries(state.tasksByDate).map(([k, v]) => [k, update(v)])
      );

      return {
        tasks: update(state.tasks),
        todaysTasks: update(state.todaysTasks),
        tasksByDate: nextTasksByDate,
      };
    }),

  markTaskIncomplete: (taskId) =>
    set((state) => {
      const update = (list: ScheduleTask[]) =>
        list.map((t) => (t.id === taskId ? { ...t, completed: false, completedAt: null } : t));

      const nextTasksByDate = Object.fromEntries(
        Object.entries(state.tasksByDate).map(([k, v]) => [k, update(v)])
      );

      return {
        tasks: update(state.tasks),
        todaysTasks: update(state.todaysTasks),
        tasksByDate: nextTasksByDate,
      };
    }),
}));
