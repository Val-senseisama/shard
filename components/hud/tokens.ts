/**
 * Obsidian HUD design system.
 *
 * The app's identity: a crystalline RPG quest log. Surfaces are cut-obsidian
 * panels; violet is the core accent, cyan is the crystal "refraction" highlight
 * used sparingly, ember is reserved for streak/XP warmth.
 *
 * THE MONO RULE: SpaceMono is for NUMERALS ONLY — digits and their units (XP,
 * %, counts, rank, streak, levels), where tabular figures keep columns from
 * jittering as values tick up. Never for words, labels, buttons or tab names.
 * The identity lives in the color, the shard motif and the XP bars — not in the
 * font and not in the corners.
 */

import { dark, light, brand } from './palette';

export type HudPalette = {
  bg: string;
  bgElev: string;
  panel: string;
  panelBorder: string;
  panelBorderStrong: string;
  text: string;
  textDim: string;
  textFaint: string;
  violet: string;
  violetDeep: string;
  cyan: string;
  ember: string;
  track: string;
  danger: string;
};

/**
 * The colour values live in `./palette.js`, not here — `tailwind.config.js` is
 * loaded by Node and can't import TypeScript, so a plain JS module has to be the
 * source if the two styling systems are to share one. See the note there.
 */
export const hud = (isDark: boolean): HudPalette => (isDark ? dark : light);

export { brand };

/**
 * Font families (registered in app/_layout.tsx).
 *
 * Use these, never `fontWeight`. A named custom family doesn't synthesise
 * weights on Android, so `fontFamily: 'Inter-Regular', fontWeight: '700'` renders
 * regular there and the screen silently falls back to the system face — which is
 * how the app came to be running two typefaces at once.
 */
export const FONT = {
  thin: 'Inter-Thin',
  black: 'Inter-Black',
  extrabold: 'Inter-ExtraBold',
  bold: 'Inter-Bold',
  semibold: 'Inter-SemiBold',
  medium: 'Inter-Medium',
  regular: 'Inter-Regular',
  light: 'Inter-Light',
  mono: 'SpaceMono',
} as const;

/**
 * Corner radii. Replaces the old ad-hoc 2/4/5/6/8 band, which read as "blocky".
 * cards/panels → md · buttons/inputs → sm..md · chips/badges/bars/avatars → pill
 */
export const RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

/**
 * Tracking as a function of size — never a constant.
 *
 * Letters read too far apart as type grows and too tight as it shrinks, so one
 * `letterSpacing` value is wrong everywhere except the size it was picked for.
 * `HudLabel` took a `size` prop and applied a flat `0.2` at any of them.
 *
 * `heavy` compensates for an asset limitation as much as an optical one: the only
 * Bold/ExtraBold/Black files in `assets/fonts` are Inter's **24pt** optical cuts,
 * which are drawn tighter and finer than a text cut because they're meant for
 * display sizes. Used at button-label size they set too tight, so heavy weights
 * below ~16px get a little air back. The real fix is shipping the 18pt bold cuts
 * — see the note in `app/_layout.tsx`.
 */
export function tracking(size: number, heavy = false): number {
  let t: number;
  if (size >= 32) t = -0.6;
  else if (size >= 24) t = -0.4;
  else if (size >= 20) t = -0.3;
  else if (size >= 17) t = -0.2;
  else if (size >= 14) t = 0;
  else if (size >= 12) t = 0.1;
  else t = 0.2; // small text needs air to stay legible

  // The 24pt cut is already tight; give it back a fraction at text sizes.
  if (heavy && size < 16) t += 0.15;
  return t;
}

/**
 * Role-based type scale. Encodes the mono rule: only `num` is SpaceMono.
 * Heavy tight-tracked Inter reads as confident; wide-tracked uppercase reads as
 * a machine, so labels are sentence case with near-zero tracking.
 *
 * Each role is a function of size so tracking and leading stay tied to it — the
 * skill's point that hierarchy is weight + size + leading as a set, not size
 * alone. Leading tightens as type grows.
 */
export const TYPE = {
  display: (size = 26) => ({
    fontFamily: FONT.extrabold,
    fontSize: size,
    lineHeight: Math.round(size * 1.12),
    letterSpacing: tracking(size, true),
  }),
  title: (size = 17) => ({
    fontFamily: FONT.bold,
    fontSize: size,
    lineHeight: Math.round(size * 1.25),
    letterSpacing: tracking(size, true),
  }),
  body: (size = 15) => ({
    fontFamily: FONT.regular,
    fontSize: size,
    lineHeight: Math.round(size * 1.47),
    letterSpacing: tracking(size),
  }),
  label: (size = 12) => ({
    fontFamily: FONT.semibold,
    fontSize: size,
    letterSpacing: tracking(size),
  }),
  num: (size = 12) => ({
    fontFamily: FONT.mono,
    fontSize: size,
    // Not `as const` on the array: React Native's `TextStyle.fontVariant` is a
    // mutable `FontVariant[]`, so a readonly tuple isn't assignable to it.
    fontVariant: ['tabular-nums' as const],
    // SpaceMono is a single optical cut and sets wide already; it only needs the
    // small-size bump, never the negative tracking a proportional face wants.
    letterSpacing: Math.max(0, tracking(size)),
  }),
} as const;

/** Crystalline accent ramp — violet into cyan refraction. Used for the shard/create marks. */
export const SHARD_GRADIENT = ['#A78BFA', '#7C3AED', '#4C1D95'] as const;
export const REFRACT_GRADIENT = ['#8B5CF6', '#48E0EE'] as const;
