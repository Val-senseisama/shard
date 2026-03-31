import { useEffect } from 'react';
import { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export const ACCENT = '#7c3aed';
export const ACCENT_COLORS = ['#7c3aed', '#d946ef', '#6366f1', '#ec4899', '#8b5cf6'];

// ─── Theme tokens (mirrors tailwind.config.js) ────────────────────
export const THEME = {
  light: {
    bg: '#f6f7fb',            // background-paper
    card: '#FFFFFF',           // background-default
    text: '#1A1A1A',           // text-primary
    textSecondary: '#666666',  // text-secondary
    trackBg: '#e5e7eb',
    tabBarBg: '#eae6f2',
    border: '#d1d5db',
  },
  dark: {
    bg: '#0F0E0E',            // background-dark-default
    card: '#1E1E1E',           // background-dark-paper
    text: '#FFFFFF',           // text-dark
    textSecondary: '#B9B9B9',  // text-grey-100
    trackBg: '#2a2a2a',
    tabBarBg: '#1E1E1E',
    border: '#484847',
  },
};

export const t = (isDark: boolean) => isDark ? THEME.dark : THEME.light;

// Stable object references — safe to use in React.memo prop comparisons
const _SHADOW_LIGHT = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};
const _SHADOW_DARK = {};
export const getCardShadow = (isDark: boolean): object =>
  isDark ? _SHADOW_DARK : _SHADOW_LIGHT;

/** Single shimmer animation shared across all Skeleton instances in a subtree. */
export const useSkeletonOpacity = () => {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 800 }), withTiming(0.3, { duration: 800 })),
      -1,
      true
    );
  }, []);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
};
