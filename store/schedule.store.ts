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
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  tasks: [],
  todaysTasks: [],
  tasksByDate: {},

  setSchedule: ({ tasks, todaysTasks, tasksByDate }) =>
    set({ tasks, todaysTasks, tasksByDate }),

  markTaskComplete: (taskId) =>
    set((state) => {
      const update = (list: ScheduleTask[]) =>
        list.map((t) => (t.id === taskId ? { ...t, completed: true } : t));

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
