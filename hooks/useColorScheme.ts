import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useAppStore } from '~/store/app.store';

/**
 * The app's colour scheme — **the only correct way to ask**.
 *
 * This used to be a bare re-export of React Native's hook, which meant every
 * screen read the OS setting directly while NativeWind's `dark:` variants, the
 * navigation theme and the StatusBar were driven by a separate persisted
 * `isDarkMode` boolean that defaulted to `false` and was only ever written by the
 * Settings toggle. The two disagreed by default: a user on a dark phone who never
 * opened Settings saw Home, the tab bar and every `hud()` screen in dark, and
 * chat, shard-info and edit in light, under a light-mode StatusBar. Flipping the
 * toggle swapped which half was wrong rather than fixing it.
 *
 * Resolving preference against the system value in one place is the whole fix.
 * Import from here, never from `react-native` — see the note in
 * `store/app.store.ts` for why the preference is a tri-state and not a boolean.
 *
 * Returns a concrete `'light' | 'dark'`, never `null`: RN's hook can return null
 * before the native module reports in, and ~54 call sites compare it with
 * `=== 'dark'`, so a null would silently render light rather than fail loudly.
 */
export function useColorScheme(): 'light' | 'dark' {
  const pref = useAppStore((s) => s.themePref);
  const system = useSystemColorScheme();

  if (pref === 'system') return system === 'dark' ? 'dark' : 'light';
  return pref;
}
