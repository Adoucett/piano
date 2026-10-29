import type { Config } from "tailwindcss";

const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist Variable"', "Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        serif: ['"Instrument Serif"', "ui-serif", "Georgia", "serif"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "20px" }],
        base: ["14px", { lineHeight: "22px" }],
        md: ["16px", { lineHeight: "24px" }],
        lg: ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        xl: ["24px", { lineHeight: "32px", letterSpacing: "-0.01em" }],
        "2xl": ["32px", { lineHeight: "40px", letterSpacing: "-0.015em" }],
        "3xl": ["48px", { lineHeight: "52px", letterSpacing: "-0.02em" }],
        "4xl": ["72px", { lineHeight: "72px", letterSpacing: "-0.02em" }],
      },
      colors: {
        bg: { 0: c("bg-0"), 1: c("bg-1") },
        surface: { 1: c("surface-1"), 2: c("surface-2"), 3: c("surface-3") },
        line: c("line"),
        fg: { 1: c("text-1"), 2: c("text-2"), 3: c("text-3"), 4: c("text-4") },
        accent: { DEFAULT: c("accent"), hover: c("accent-hover"), on: c("on-accent") },
        success: c("success"),
        error: c("error"),
        info: c("info"),
        tension: c("tension"),
        paper: c("paper"),
        ink: c("ink"),
      },
      borderRadius: {
        ctrl: "6px",
        card: "10px",
        panel: "14px",
      },
      boxShadow: {
        e1: "inset 0 1px 0 rgb(255 255 255 / 0.04)",
        e2: "inset 0 1px 0 rgb(255 255 255 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.6)",
        e3: "0 16px 48px -16px rgb(0 0 0 / 0.7), 0 0 0 1px rgb(255 255 255 / 0.06)",
        sheet: "0 1px 0 rgb(255 255 255 / 0.5) inset, 0 24px 60px -30px rgb(0 0 0 / 0.8), 0 2px 6px -2px rgb(0 0 0 / 0.4)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        120: "120ms",
        180: "180ms",
        280: "280ms",
        420: "420ms",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        shake: "shake 180ms cubic-bezier(0.22, 1, 0.36, 1) 2",
        "fade-in": "fade-in 280ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
