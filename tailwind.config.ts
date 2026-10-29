import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        // Note-letter colors (shared by staff + keyboard). Boomwhacker-ish.
        note: {
          c: "hsl(0 84% 60%)",
          d: "hsl(24 95% 53%)",
          e: "hsl(48 96% 53%)",
          f: "hsl(142 71% 45%)",
          g: "hsl(199 89% 48%)",
          a: "hsl(243 75% 59%)",
          b: "hsl(280 75% 60%)",
        },
        // Practice state colors
        scale: "hsl(174 72% 56%)",
        target: "hsl(43 96% 56%)",
        correct: "hsl(142 71% 45%)",
        wrong: "hsl(351 95% 60%)",
      },
      keyframes: {
        "wrong-flash": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "wrong-flash": "wrong-flash 300ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
