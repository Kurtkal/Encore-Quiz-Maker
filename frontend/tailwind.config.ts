import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        muted: "#667085",
        line: "#D8DEE4",
        panel: "#FFFFFF",
        canvas: "#F6F7F9",
        teal: "#0F766E",
        gold: "#B7791F",
        danger: "#B42318",
      },
      boxShadow: {
        soft: "0 12px 30px rgba(23, 32, 38, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
