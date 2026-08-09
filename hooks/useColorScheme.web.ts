import { useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useAppStore } from '~/store/app.store';

/**
 * Web variant of `useColorScheme`. Same contract as the native one — see the
 * docblock there for why the preference is resolved in a single place.
 *
 * The extra wrinkle here is static rendering: the server has no system setting,
 * so the first client render must match the server's output or React logs a
 * hydration mismatch. We report `'light'` until the client has hydrated, then
 * switch to the real resolved value.
 *
 * An *explicit* preference is safe to honour immediately — it comes from the
 * persisted store rather than the OS, so it isn't what differs between server and
 * client. Only the `'system'` branch has to wait.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);
  const pref = useAppStore((s) => s.themePref);
  const system = useSystemColorScheme();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (pref !== 'system') return pref;
  if (!hasHydrated) return 'light';
  return system === 'dark' ? 'dark' : 'light';
}
