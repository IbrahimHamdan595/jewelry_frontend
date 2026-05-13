import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#C9A84C",
          dark: "#8B6914",
          light: "#FFF8DC",
        },
        pos: {
          bg: "#0D0C0A",
          cream: "#FAF6EF",
          gray: "#AAAAAA",
        },
        admin: {
          canvas: "#FAFAFA",
          card: "#FFFFFF",
          sidebar: "#0D0C0A",
        },
        status: {
          completed: "#2D6A4F",
          refunded: "#B8860B",
          voided: "#8B2020",
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ["Jost", "Inter", "sans-serif"],
      },
      fontSize: {
        "rate-hero": ["52px", { lineHeight: "1" }],
        kpi: ["36px", { lineHeight: "1.1" }],
      },
      keyframes: {
        "check-draw": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        "scale-in": {
          "0%": { transform: "scale(0)" },
          "80%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(24px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        "check-draw": "check-draw 0.5s ease forwards",
        "scale-in": "scale-in 0.4s ease forwards",
        "slide-in": "slide-in 0.25s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
