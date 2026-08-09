/** @type {import('tailwindcss').Config} */
const { dark, light, brand } = require('./components/hud/palette');

/**
 * NativeWind theme.
 *
 * Colour values are NOT defined here — they come from `components/hud/palette.js`,
 * the same module `components/hud/tokens.ts` reads. This file only maps them onto
 * class names.
 *
 * Before that, the two systems were separate brands: `primary` was `#4135F3`, a
 * blue, against the violet every `hud()` surface uses, so ~46 `-primary` class
 * usages rendered an accent found nowhere else in the app. The light ramps also
 * had page-background and card-surface inverted relative to the dark ramp, which
 * is why light mode read flatter than dark.
 *
 * Class names are all preserved — this is a value change, not a rename, so the
 * ~33 files using these classes keep working.
 */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  // Driven by `setColorScheme()` in app/_layout.tsx, from the resolved theme.
  // Nothing else turns these variants on.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          gradient: `linear-gradient(to right, ${brand.violet} 0%, ${brand.violetLight} 100%)`,
          start: brand.violet,
          end: brand.violetDeep,
          light: brand.violetLight,
          DEFAULT: brand.violet,
        },
        /**
         * ⚠️ The light names are inverted relative to the dark names. Read the
         * call sites, not the names:
         *
         *   bg-background-paper   dark:bg-background-dark-default   ← page ground
         *   bg-background-default dark:bg-background-dark-paper     ← card surface
         *
         * So light `paper` pairs with dark `default`, and light `default` pairs
         * with dark `paper`. The values below preserve that, because it is what
         * the ~25 existing call sites rely on: white cards on a tinted ground.
         * "Fixing" the names to match their pairs inverts light mode — grey cards
         * on a white page — which is exactly the trap this comment exists to stop.
         *
         * Prefer `ground` / `surface` in new code; they say what they mean.
         */
        background: {
          ground: light.bg,
          surface: light.panel,
          default: light.panel, // card surface, despite the name
          paper: light.bg, // page ground, despite the name
          dark: {
            ground: dark.bg,
            surface: dark.panel,
            default: dark.bg,
            paper: dark.panel,
          },
        },
        text: {
          light: light.text,
          dark: dark.text,
          DEFAULT: light.text,
          primary: light.text,
          secondary: light.textDim,
          faint: light.textFaint,
          grey: {
            100: light.textFaint,
          },
        },
        border: {
          primary: brand.violet,
          default: light.panelBorder,
          strong: light.panelBorderStrong,
          dark: dark.panelBorder,
        },
        // The rest of the palette, so new classes don't have to reach for a hex.
        accent: {
          cyan: brand.cyan,
          ember: light.ember,
          danger: light.danger,
        },
        track: {
          DEFAULT: light.track,
          dark: dark.track,
        },
      },
      fontFamily: {
        sans: ['Inter-Regular', 'sans-serif'],
        inter: ['Inter-Regular', 'sans-serif'],
        ithin: ['Inter-Thin', 'sans-serif'],
        ilight: ['Inter-Light', 'sans-serif'],
        iregular: ['Inter-Regular', 'sans-serif'],
        imedium: ['Inter-Medium', 'sans-serif'],
        isemibold: ['Inter-SemiBold', 'sans-serif'],
        ibold: ['Inter-Bold', 'sans-serif'],
        iextrabold: ['Inter-ExtraBold', 'sans-serif'],
        iblack: ['Inter-Black', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
