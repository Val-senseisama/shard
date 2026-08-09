import Toast from "react-native-toast-message";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AlertType = "info" | "success" | "warning" | "error" | "default";

/**
 * Theme preference.
 *
 * This is deliberately NOT a boolean. It used to be `isDarkMode: boolean`
 * defaulting to `false`, which cannot express "follow the system" — so the OS
 * setting was read in `app/_layout.tsx` and then discarded, and the app rendered
 * two themes at once: the `hud()` palette followed the OS while NativeWind's
 * `dark:` variants, the navigation theme and the StatusBar followed this flag.
 * A user on a dark phone who never opened Settings got half a dark app.
 *
 * Read it through `useColorScheme()` in `~/hooks/useColorScheme` — never here
 * directly — so there is exactly one place that resolves preference against the
 * system value.
 */
export type ThemePref = "system" | "light" | "dark";

interface AppState {
  themePref: ThemePref;
  isOnline: boolean;
  addAlert: (params: { str?: string; type?: AlertType; icon?: any }) => void;
  setThemePref: (pref: ThemePref) => void;
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
      themePref: "system",
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

      setThemePref: (pref: ThemePref) => set({ themePref: pref }),
    }),
    {
      name: "shard-app-prefs",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user preferences — isOnline is runtime state
      partialize: (state) => ({ themePref: state.themePref }),

      version: 1,
      /**
       * v0 stored `isDarkMode: boolean`.
       *
       * `true` was only ever reachable by tapping the Settings toggle, so it's a
       * real choice and is preserved as an explicit `'dark'`. `false` is
       * ambiguous — it's both "chose light" and "never touched it", and the
       * latter is almost everyone — so it becomes `'system'`. That restores the
       * OS setting for users who never opted in, and costs a user who did
       * deliberately pick light on a light phone nothing visible.
       */
      migrate: (persisted: any, version: number) => {
        if (version === 0) {
          return { themePref: persisted?.isDarkMode === true ? "dark" : "system" };
        }
        return persisted;
      },
    }
  )
);
