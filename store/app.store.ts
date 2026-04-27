import Toast from "react-native-toast-message";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AlertType = "info" | "success" | "warning" | "error" | "default";

interface AppState {
  isDarkMode: boolean;
  isOnline: boolean;
  addAlert: (params: { str?: string; type?: AlertType; icon?: any }) => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
  setOnline: (online: boolean) => void;
}

const mapToastType = (type: AlertType): "success" | "error" | "info" => {
  const map: Record<AlertType, "success" | "error" | "info"> = {
    success: "success",
    error: "error",
    warning: "error",
    info: "info",
    default: "info",
  };
  return map[type] || "info";
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      isOnline: true,

      setOnline: (online: boolean) => set({ isOnline: online }),

      addAlert: ({ str, type = "default", icon } = {}) => {
        if (!str?.trim()) return;
        Toast.show({
          text1: str,
          position: "top",
          topOffset: 60,
          visibilityTime: 2500,
          type: mapToastType(type),
          props: { icon },
        });
      },

      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (isDark: boolean) => set({ isDarkMode: isDark }),
    }),
    {
      name: "shard-app-prefs",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user preferences — isOnline is runtime state
      partialize: (state) => ({ isDarkMode: state.isDarkMode }),
    }
  )
);
