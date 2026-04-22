import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  username: string;
  profilePic: string;
  role: "user" | "admin";
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  emailVerified: boolean;
  authProvider: "google" | "password";
  isNewUser: boolean;
  bio?: string;
  level?: number;
  xp?: number;
  achievements?: string[];
  strength?: number;
  intelligence?: number;
  charisma?: number;
  endurance?: number;
  creativity?: number;
  currentStreak?: number;
  longestStreak?: number;
  pendingAchievements?: string[];
  birthdate?: string;
  timezone?: string;
  preferences?: {
    workloadLevel: string;
    maxTasksPerDay: number;
    workingDays: number[];
    preferredTaskDuration: string;
  };
  __typename?: string;
}

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,

  setUser: (user) => set({ user }),

  updateUser: (data) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    })),

  logout: () => set({ user: null }),
}));
