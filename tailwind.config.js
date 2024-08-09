/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "custom-gradient":
          "linear-gradient(125.751deg, #4135F3 0%, #7168F6 100%)",
      },
      colors: {
        primary: "#616161",
        secondary: {
          DEFAULT: "#F0E9E9",
          100: "#FF9001",
          200: "#FF8E01",
        },
        darkmode: {
           primary: "#0F0E0E",
            secondary: "#1E1E1E",
          },
        black: {
          DEFAULT: "#000",
          100: "#1E1E2D",
          200: "#232533",
        },
        gray: {
          100: "#736B6B",
          120: "#CDCDE0",
          150: "#B9B9B9",
          180:"#5e6978",
        },
        dark: {
          default: "#0F0E0E",
        },
        blue: {
          DEFAULT: "#7168F6",
        },
      },
      fontFamily: {
        Ithin: ["Inter-Thin", "sans-serif"],
        Iextralight: ["Inter-ExtraLight", "sans-serif"],
        Ilight: ["Inter-Light", "sans-serif"],
        Aregular: ["Acme-Regular", "sans-serif"],
        Iregular: ["Inter-Regular", "sans-serif"],
        Imedium: ["Inter-Medium", "sans-serif"],
        Isemibold: ["Inter-SemiBold", "sans-serif"],
        Iextrabold: ["Inter-ExtraBold", "sans-serif"],
        Iblack: ["Inter-Black", "sans-serif"],
        Ibold: ["Inter-Bold", "sans-serif"],
        IboldItalic: ["Inter-VariableFont_slnt,wght", "sans-serif"],
      },
    },
  },
  plugins: [],
};

