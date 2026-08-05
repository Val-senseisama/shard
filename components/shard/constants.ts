import { hud, RADIUS } from '~/components/hud/tokens';
import { useShimmer } from '~/helpers/motion';

/**
 * The older theme dialect, now **derived from the hud tokens** rather than
 * defining its own values.
 *
 * There were two parallel design systems: `components/hud` (13 files) and this
 * (14 files), each with its own colours, and they had already drifted:
 *
 *   - accent was `#7c3aed` here and `#8B5CF6` in hud — two different purples
 *     depending on which screen you happened to be on
 *   - `textSecondary` was `#B9B9B9` here, `#9B9AA0` there
 *   - `border` was a solid `#484847` here, a translucent
 *     `rgba(255,255,255,0.08)` there
 *
 * Rather than a big-bang rewrite of 14 screens, the names stay and the *values*
 * now come from one place. Existing call sites are untouched and the drift is
 * structurally impossible from here.
 *
 * Where the two disagreed, hud wins: its palette is the one with documented
 * reasoning behind it (see tokens.ts), and it was built in response to the
 * "too AI-generated" and "too robotic" feedback.
 *
 * New code should import from `~/components/hud` directly.
 */

const dark = hud(true);
const light = hud(false);

/** The one accent. Was `#7c3aed`; now hud's documented primary violet. */
export const ACCENT = dark.violet;

/**
 * Categorical colours for shards/goals. First entry is the primary accent so a
 * single-item list matches the rest of the app.
 */
export const ACCENT_COLORS = [dark.violet, '#d946ef', '#6366f1', '#ec4899', dark.violetDeep];

// ─── Theme tokens, mapped onto the hud palette ────────────────────
export const THEME = {
  light: {
    bg: light.bg,
    card: light.panel,
    text: light.text,
    textSecondary: light.textDim,
    trackBg: light.track,
    tabBarBg: light.bgElev,
    border: light.panelBorder,
  },
  dark: {
    bg: dark.bg,
    card: dark.panel,
    text: dark.text,
    textSecondary: dark.textDim,
    trackBg: dark.track,
    tabBarBg: dark.panel,
    border: dark.panelBorder,
  },
};

export const t = (isDark: boolean) => (isDark ? THEME.dark : THEME.light);

/** Re-exported so this dialect can't reintroduce its own corner radii either. */
export { RADIUS };

// Stable object references — safe to use in React.memo prop comparisons
const _SHADOW_LIGHT = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};
const _SHADOW_DARK = {};
export const getCardShadow = (isDark: boolean): object => (isDark ? _SHADOW_DARK : _SHADOW_LIGHT);

/**
 * Skeleton shimmer.
 *
 * Was a fourth hand-rolled copy of the same infinite pulse, and like the other
 * three it ignored the OS "reduce motion" setting. Now the shared hook.
 */
export const useSkeletonOpacity = () => useShimmer(0.3, 0.7, 800);
