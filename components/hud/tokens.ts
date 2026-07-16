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

// Neutral dark — matches the profile/account page (#0F0E0E bg, #1E1E1E cards),
// not a blue-tinted obsidian. Violet/cyan stay as accents on top.
const dark: HudPalette = {
  bg: '#0F0E0E',
  bgElev: '#181818',
  panel: '#1E1E1E',
  panelBorder: 'rgba(255,255,255,0.08)',
  panelBorderStrong: 'rgba(255,255,255,0.16)',
  text: '#FFFFFF',
  textDim: '#9B9AA0',
  textFaint: '#6B6A70',
  violet: '#8B5CF6',
  violetDeep: '#6D28D9',
  cyan: '#48E0EE',
  ember: '#F5A524',
  track: '#2A2A2A',
  danger: '#F0616D',
};

const light: HudPalette = {
  bg: '#F3F2F8',
  bgElev: '#FFFFFF',
  panel: '#FFFFFF',
  panelBorder: 'rgba(92,70,150,0.14)',
  panelBorderStrong: 'rgba(92,70,150,0.26)',
  text: '#15131C',
  textDim: '#6A6678',
  textFaint: '#A6A2B4',
  violet: '#7C3AED',
  violetDeep: '#6D28D9',
  cyan: '#0E9DAE',
  ember: '#C2740A',
  track: '#E6E3F0',
  danger: '#D64550',
};

export const hud = (isDark: boolean): HudPalette => (isDark ? dark : light);

/** Font families (registered in app/_layout.tsx). */
export const FONT = {
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
 * Role-based type scale. Encodes the mono rule: only `num` is SpaceMono.
 * Heavy tight-tracked Inter reads as confident; wide-tracked uppercase reads as
 * a machine, so labels are sentence case with near-zero tracking.
 */
export const TYPE = {
  display: { fontFamily: FONT.extrabold, letterSpacing: -0.4 },
  title: { fontFamily: FONT.bold, letterSpacing: -0.2 },
  body: { fontFamily: FONT.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: FONT.semibold, fontSize: 12, letterSpacing: 0.2 },
  num: { fontFamily: FONT.mono, fontVariant: ['tabular-nums'] as const },
} as const;

/** Crystalline accent ramp — violet into cyan refraction. Used for the shard/create marks. */
export const SHARD_GRADIENT = ['#A78BFA', '#7C3AED', '#4C1D95'] as const;
export const REFRACT_GRADIENT = ['#8B5CF6', '#48E0EE'] as const;
