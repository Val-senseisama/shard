/**
 * The palette. **One source of truth for both styling systems.**
 *
 * Plain CommonJS on purpose: `tailwind.config.js` is loaded by Node and cannot
 * import a `.ts` module, so a TypeScript file cannot be the source. `tokens.ts`
 * imports this and re-exports it typed; `tailwind.config.js` requires it and maps
 * it onto class names.
 *
 * This file exists because the two systems had drifted into different brands.
 * Tailwind's `primary` was `#4135F3` — a blue — while every `hud()` surface used
 * the violet `#8B5CF6`, so ~46 `-primary` class usages (BlockButton,
 * DrawerNavigation, AddImageInput, OnboardingSlides) rendered an accent that
 * appears nowhere else in the app. The light palettes disagreed more quietly:
 * Tailwind had page-background and card-surface the wrong way round relative to
 * the dark side, which is why light mode looked flatter than dark.
 *
 * If you add a colour, add it here.
 */

// Neutral dark — matches the profile/account page, not a blue-tinted obsidian.
// Violet/cyan stay as accents on top.
const dark = {
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

const light = {
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

/**
 * The brand violet, scheme-independent.
 *
 * Tailwind classes here are mostly written without `dark:` variants, so they need
 * one value that holds up on both grounds. The dark-mode violet is the one that
 * already appears in `SHARD_GRADIENT`, the tab bar and several hundred inline
 * `#8b5cf6` literals, so it's the honest choice for "the brand colour".
 */
const brand = {
  violet: '#8B5CF6',
  violetDeep: '#6D28D9',
  violetLight: '#A78BFA',
  cyan: '#48E0EE',
};

module.exports = { dark, light, brand };
