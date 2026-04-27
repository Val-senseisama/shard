import { create } from 'zustand';

export interface ShardProgress {
  completion: number;
  xpEarned: number;
  level: number;
}

export interface ShardTask {
  title: string;
  dueDate?: string;
  completed: boolean;
  assignedTo?: string;
  xpReward?: number;
}

export interface MiniGoal {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  progress: number;
  completed: boolean;
  version: number;
  tasks: ShardTask[];
}

export interface ShardParticipant {
  user: string;
  username?: string;
  profilePic?: string;
  role: 'collaborator' | 'accountability_partner';
}

export interface Shard {
  id: string;
  title: string;
  image?: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'expired';
  questType: 'standard' | 'habit';
  progress: ShardProgress;
}

export interface ShardDetail extends Shard {
  chatId?: string;
  cadence?: string;
  habitStreak: number;
  isPrivate: boolean;
  isAnonymous: boolean;
  version: number;
  timeline: { startDate?: string; endDate?: string };
  owner: { id: string; username?: string; profilePic?: string };
  participants: ShardParticipant[];
  participantsCount: number;
  rewards: { type: string; value: string }[];
  minigoals: MiniGoal[];
}

interface ShardStore {
  shards: Shard[];
  currentShard: ShardDetail | null;
  setShards: (shards: Shard[]) => void;
  setCurrentShard: (shard: ShardDetail | null) => void;
  applyTaskCompletion: (miniGoalId: string, taskIndex: number) => void;
  applyMiniGoalCompletion: (miniGoalId: string) => void;
}

export const useShardStore = create<ShardStore>((set) => ({
  shards: [],
  currentShard: null,

  setShards: (shards) => set({ shards }),

  setCurrentShard: (currentShard) => set({ currentShard }),

  applyTaskCompletion: (miniGoalId, taskIndex) =>
    set((state) => {
      if (!state.currentShard) return state;
      return {
        currentShard: {
          ...state.currentShard,
          minigoals: state.currentShard.minigoals.map((mg) => {
            if (mg.id !== miniGoalId) return mg;
            return {
              ...mg,
              tasks: mg.tasks.map((t, i) =>
                i === taskIndex ? { ...t, completed: true } : t
              ),
            };
          }),
        },
      };
    }),

  applyMiniGoalCompletion: (miniGoalId) =>
    set((state) => {
      if (!state.currentShard) return state;
      return {
        currentShard: {
          ...state.currentShard,
          minigoals: state.currentShard.minigoals.map((mg) =>
            mg.id === miniGoalId ? { ...mg, completed: true, progress: 100 } : mg
          ),
        },
      };
    }),
}));
