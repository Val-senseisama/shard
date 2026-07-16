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
