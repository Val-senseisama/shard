import Toast from "react-native-toast-message";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from '@react-native-async-storage/async-storage';

type AlertType = 'info' | 'success' | 'warning' | 'error' | 'default';

interface AlertItem {
  str: string;
  icon?: any;
};


interface AppState {
  alerts: Record<AlertType, AlertItem[]>;
  isDarkMode: boolean;

  addAlert: (params: { str?: string; type?: AlertType; icon?: any }) => void;
  countAlert: () => number;

  mapToastType: (type: AlertType) => 'success' | 'error' | 'info';

  clearAlerts: () => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
};


export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      alerts: {
        info: [],
        success: [],
        warning: [],
        error: [],
        default: [],
      },
      isDarkMode: false,
      addAlert: ({ str, type = 'default', icon }: { str?: string; type?: AlertType; icon?: any }) => {
        const alertsCopy = { ...get().alerts };
        if (!str?.trim()) return;
        alertsCopy[type] = [...alertsCopy[type], { str, icon }];

        set({ alerts: alertsCopy });

        if (str?.trim()) {
          Toast.show({
            text1: str,
            position: 'top',
            topOffset: 60,
            visibilityTime: 2500,
            type: get().mapToastType(type),
            props: { icon },
          });
        }
      },

      countAlert: () => {
        const alerts = get().alerts;
        return Object.values(alerts).reduce(
          (acc, arr) => acc + arr.length,
          0
        );
      },

      mapToastType: (type) => {
        const map: Record<AlertType, 'success' | 'error' | 'info'> = {
          success: 'success',
          error: 'error',
          warning: 'error',
          info: 'info',
          default: 'info',
        };
        return map[type] || 'info';
      },

      clearAlerts: () => {
        set({
          alerts: {
            info: [],
            success: [],
            warning: [],
            error: [],
            default: [],
          },
        });
      },

      toggleDarkMode: () => {
        set({ isDarkMode: !get().isDarkMode });
      },

      setDarkMode: (isDark: boolean) => {
        set({ isDarkMode: isDark });
      },
    }),
    {
      name: 'shard-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);