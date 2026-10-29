import type { Letter } from "@/types";

/** Per-letter colors shared by the staff and the keyboard (boomwhacker-ish). */
export const LETTER_COLOR: Record<Letter, string> = {
  C: "hsl(0 84% 60%)",
  D: "hsl(24 95% 53%)",
  E: "hsl(48 96% 53%)",
  F: "hsl(142 71% 45%)",
  G: "hsl(199 89% 48%)",
  A: "hsl(243 75% 59%)",
  B: "hsl(280 75% 60%)",
};

export function letterColor(letter: string): string {
  return LETTER_COLOR[letter?.[0]?.toUpperCase() as Letter] ?? "hsl(210 10% 70%)";
}

/** Practice-state colors. */
export const STATE_COLOR = {
  target: "hsl(43 96% 56%)",
  correct: "hsl(142 71% 45%)",
  wrong: "hsl(351 95% 60%)",
  scale: "hsl(174 72% 56%)",
  idle: "hsl(210 16% 76%)",
};

/** Pretty-print a note name with proper flat/sharp glyphs. */
export function prettyNote(name: string): string {
  return name.replace(/bb/g, "\uD834\uDD2B").replace(/b/g, "\u266D").replace(/##/g, "\uD834\uDD2A").replace(/#/g, "\u266F");
}
