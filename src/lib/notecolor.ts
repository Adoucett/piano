import type { Letter } from "@/types";

/**
 * Muted per-letter colors (optional "letter" coloring mode). Deliberately
 * low-chroma so the sheet stays calm; they are a crutch that fades first.
 */
export const LETTER_COLOR: Record<Letter, string> = {
  C: "rgb(176, 92, 84)",
  D: "rgb(178, 124, 70)",
  E: "rgb(160, 140, 64)",
  F: "rgb(98, 140, 96)",
  G: "rgb(78, 128, 150)",
  A: "rgb(104, 106, 168)",
  B: "rgb(140, 96, 150)",
};

export function letterColor(letter: string): string {
  return LETTER_COLOR[letter?.[0]?.toUpperCase() as Letter] ?? "rgb(120,120,120)";
}

/**
 * Pretty-print accidentals with proper glyphs. Safe on prose: only touches
 * accidentals attached to a note letter (Eb, F#, Bbb) or a degree (b3, #11).
 */
export function prettyNote(text: string): string {
  return text
    .replace(/\b([A-G])(bb|b|##|#)(?![a-z])/g, (_, l: string, acc: string) => l + ACC[acc])
    .replace(/(^|[\s(/,·–\-\d])(bb|b|#)(?=\d)/g, (_, pre: string, acc: string) => pre + ACC[acc]);
}

const ACC: Record<string, string> = { bb: "𝄫", b: "♭", "##": "𝄪", "#": "♯" };

/** Read a CSS custom property (an "r g b" triplet) as an rgb() color string. */
export function cssRgb(el: Element, name: string, alpha = 1): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  const parts = v.split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((x) => Number.isNaN(x))) return alpha < 1 ? `rgba(0,0,0,${alpha})` : "rgb(0,0,0)";
  return alpha < 1 ? `rgba(${parts.join(",")},${alpha})` : `rgb(${parts.join(",")})`;
}
