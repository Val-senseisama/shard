/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          gradient: 'linear-gradient(to right, #4135F3 0%, #7168F6 100%)',
          start: '#4135F3',
          end: '#7168F6',
          DEFAULT: '#4135F3',
        },
        background: {
          default: '#FFFFFF',
          paper: '#f6f7fb',
          dark: {
            default: '#0F0E0E',
            paper: '#1E1E1E'
          }
        },
        text: {
          light: '#1A1A1A',
          dark: '#FFFFFF',
          DEFAULT: '#1A1A1A',
          primary: '#1A1A1A',
          secondary: '#666666',
          grey: {
            100: "#B9B9B9"
          }
        },
        border: {
          primary: '#4135F3',
          default: '#B9B9B9',
          dark: '#FFFFFF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        ithin:['Inter-Thin', 'sans-serif'],
        ilight:['Inter-Light', 'sans-serif'],
        iregular:['Inter-Regular', 'sans-serif'],
        imedium:['Inter-Medium', 'sans-serif'],
        isemibold:['Inter-SemiBold', 'sans-serif'],
        ibold:['Inter-Bold', 'sans-serif'],
        iextrabold:['Inter-ExtraBold', 'sans-serif'],
        iblack:['Inter-Black', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
