/**
 * Obsidian HUD design system.
 *
 * The app's identity: a crystalline RPG quest log. Surfaces are cut-obsidian
 * panels; violet is the core accent, cyan is the crystal "refraction" highlight
 * used sparingly, ember is reserved for streak/XP warmth. Typography pairs heavy
 * tight-tracked Inter (display) with a mono UPPERCASE utility face (HUD labels,
 * stats, quest codes) — that contrast is the signature.
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

const dark: HudPalette = {
  bg: '#0B0B10',
  bgElev: '#101017',
  panel: '#14141E',
  panelBorder: 'rgba(140,124,200,0.16)',
  panelBorderStrong: 'rgba(140,124,200,0.30)',
  text: '#F3F2F8',
  textDim: '#8E8CA0',
  textFaint: '#585767',
  violet: '#8B5CF6',
  violetDeep: '#6D28D9',
  cyan: '#48E0EE',
  ember: '#F5A524',
  track: '#20202C',
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

/** Crystalline accent ramp — violet into cyan refraction. Used for the shard/create marks. */
export const SHARD_GRADIENT = ['#A78BFA', '#7C3AED', '#4C1D95'] as const;
export const REFRACT_GRADIENT = ['#8B5CF6', '#48E0EE'] as const;
