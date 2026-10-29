import type { ScaleDef } from "@/types";

/**
 * The scale catalog. `tonalName` must be a scale type known to tonal's
 * Scale.get(); everything else (spelling, intervals, formula) is derived
 * from tonal at runtime so the catalog stays small and correct.
 */
export const SCALES: ScaleDef[] = [
  // --- Major ---
  {
    id: "major",
    name: "Major (Ionian)",
    tonalName: "major",
    aka: ["Ionian"],
    family: "major",
    chords: ["maj7", "6"],
    tip: "The home base. Bright, resolved. Avoid leaning on the 4th over a maj7 chord.",
  },

  // --- Minor family ---
  {
    id: "natural-minor",
    name: "Natural Minor (Aeolian)",
    tonalName: "aeolian",
    aka: ["Aeolian", "Pure minor"],
    family: "minor",
    chords: ["m7", "m"],
    tip: "The plain minor scale. 6th mode of the relative major.",
  },
  {
    id: "harmonic-minor",
    name: "Harmonic Minor",
    tonalName: "harmonic minor",
    family: "minor",
    chords: ["mMaj7", "m"],
    tip: "Raised 7th gives a leading tone and that exotic b6-to-7 jump.",
  },
  {
    id: "melodic-minor",
    name: "Melodic Minor (jazz)",
    tonalName: "melodic minor",
    aka: ["Jazz minor"],
    family: "minor",
    chords: ["mMaj7", "m6"],
    tip: "Jazz players use the ascending form both ways. The parent of a whole family of modes.",
  },

  // --- Modes of major ---
  {
    id: "dorian",
    name: "Dorian",
    tonalName: "dorian",
    family: "modes-major",
    chords: ["m7"],
    tip: "Minor with a natural 6. The default sound over a ii chord.",
  },
  {
    id: "phrygian",
    name: "Phrygian",
    tonalName: "phrygian",
    family: "modes-major",
    chords: ["m7", "susb9"],
    tip: "Minor with a b2. Spanish, dark.",
  },
  {
    id: "lydian",
    name: "Lydian",
    tonalName: "lydian",
    family: "modes-major",
    chords: ["maj7#11"],
    tip: "Major with a #4. Floating, modern. Great over a maj7#11.",
  },
  {
    id: "mixolydian",
    name: "Mixolydian",
    tonalName: "mixolydian",
    family: "modes-major",
    chords: ["7"],
    tip: "Major with a b7. The basic dominant-7th sound.",
  },
  {
    id: "locrian",
    name: "Locrian",
    tonalName: "locrian",
    family: "modes-major",
    chords: ["m7b5"],
    tip: "b2 and b5. The half-diminished sound.",
  },

  // --- Pentatonics & blues ---
  {
    id: "major-pentatonic",
    name: "Major Pentatonic",
    tonalName: "major pentatonic",
    family: "pentatonic-blues",
    chords: ["maj7", "6"],
    tip: "Five notes, no tension. Safe over major harmony.",
  },
  {
    id: "minor-pentatonic",
    name: "Minor Pentatonic",
    tonalName: "minor pentatonic",
    family: "pentatonic-blues",
    chords: ["m7"],
    tip: "The workhorse. Relative to its major pentatonic a minor third down.",
  },
  {
    id: "minor-blues",
    name: "Minor Blues",
    tonalName: "minor blues",
    family: "pentatonic-blues",
    chords: ["m7", "7"],
    tip: "Minor pentatonic plus the b5 'blue note'.",
  },
  {
    id: "major-blues",
    name: "Major Blues",
    tonalName: "major blues",
    family: "pentatonic-blues",
    chords: ["7", "6"],
    tip: "Major pentatonic plus the b3 passing tone.",
  },

  // --- Modes of melodic minor ---
  {
    id: "dorian-b2",
    name: "Dorian b2",
    tonalName: "dorian b2",
    aka: ["Phrygian #6", "Assyrian"],
    family: "melodic-minor-modes",
    chords: ["m7", "susb9"],
    tip: "2nd mode of melodic minor.",
  },
  {
    id: "lydian-augmented",
    name: "Lydian Augmented",
    tonalName: "lydian augmented",
    family: "melodic-minor-modes",
    chords: ["maj7#5"],
    tip: "3rd mode of melodic minor. #4 and #5.",
  },
  {
    id: "lydian-dominant",
    name: "Lydian Dominant",
    tonalName: "lydian dominant",
    aka: ["Mixolydian #11", "Acoustic"],
    family: "melodic-minor-modes",
    chords: ["7#11"],
    tip: "4th mode of melodic minor. Dominant with a #11. Great on a bVII7 or a tritone sub.",
  },
  {
    id: "mixolydian-b6",
    name: "Mixolydian b6",
    tonalName: "mixolydian b6",
    aka: ["Melodic major", "Hindu"],
    family: "melodic-minor-modes",
    chords: ["7", "7b13"],
    tip: "5th mode of melodic minor.",
  },
  {
    id: "locrian-sharp2",
    name: "Locrian #2",
    tonalName: "locrian #2",
    aka: ["Half-diminished", "Aeolian b5"],
    family: "melodic-minor-modes",
    chords: ["m7b5"],
    tip: "6th mode of melodic minor. The preferred half-diminished sound in jazz.",
  },
  {
    id: "altered",
    name: "Altered (Super Locrian)",
    tonalName: "altered",
    aka: ["Super Locrian", "Diminished whole-tone"],
    family: "melodic-minor-modes",
    chords: ["7alt"],
    tip: "7th mode of melodic minor. Every tension on a dominant: b9 #9 #11 b13. The go-to V7 sound.",
  },

  // --- Modes of harmonic minor ---
  {
    id: "phrygian-dominant",
    name: "Phrygian Dominant",
    tonalName: "phrygian dominant",
    aka: ["Spanish", "Freygish"],
    family: "harmonic-minor-modes",
    chords: ["7b9"],
    tip: "5th mode of harmonic minor. Dominant with b9 and b13. Classic over a V going to minor.",
  },
  {
    id: "ultralocrian",
    name: "Ultralocrian",
    tonalName: "ultralocrian",
    aka: ["Super Locrian bb7"],
    family: "harmonic-minor-modes",
    chords: ["dim7"],
    tip: "7th mode of harmonic minor.",
  },

  // --- Symmetric ---
  {
    id: "whole-tone",
    name: "Whole Tone",
    tonalName: "whole tone",
    family: "symmetric",
    chords: ["7#5", "aug"],
    tip: "Six notes, all whole steps. Only two of them exist. Dreamy augmented sound.",
  },
  {
    id: "half-whole-dim",
    name: "Half-Whole Diminished",
    tonalName: "half-whole diminished",
    aka: ["Dominant diminished"],
    family: "symmetric",
    chords: ["7b9", "13b9"],
    tip: "Starts with a half step. Use over a dominant 7 with b9/#9/#11/13.",
  },
  {
    id: "whole-half-dim",
    name: "Whole-Half Diminished",
    tonalName: "diminished",
    family: "symmetric",
    chords: ["dim7"],
    tip: "Starts with a whole step. Use over a diminished 7 chord.",
  },
  {
    id: "chromatic",
    name: "Chromatic",
    tonalName: "chromatic",
    family: "symmetric",
    chords: [],
    tip: "All twelve notes. For connecting and for finger independence.",
  },

  // --- Bebop ---
  {
    id: "bebop-dominant",
    name: "Bebop Dominant",
    tonalName: "bebop",
    family: "bebop",
    chords: ["7"],
    tip: "Mixolydian + a passing major 7. Eighth notes land chord tones on the beat.",
  },
  {
    id: "bebop-major",
    name: "Bebop Major",
    tonalName: "bebop major",
    family: "bebop",
    chords: ["maj7", "6"],
    tip: "Major scale + a passing #5 between the 5 and 6.",
  },
  {
    id: "bebop-minor",
    name: "Bebop Minor (Dorian)",
    tonalName: "bebop minor",
    family: "bebop",
    chords: ["m7"],
    tip: "Dorian + a passing major 3 between b3 and 4.",
  },
  {
    id: "bebop-melodic-minor",
    name: "Bebop Melodic Minor",
    tonalName: "bebop locrian",
    family: "bebop",
    chords: ["m6", "mMaj7"],
    tip: "Melodic-minor flavored bebop scale with a passing tone keeping chord tones on the beat.",
  },
];

export const SCALE_BY_ID: Record<string, ScaleDef> = Object.fromEntries(
  SCALES.map((s) => [s.id, s])
);

export function getScaleDef(id: string): ScaleDef {
  const def = SCALE_BY_ID[id];
  if (!def) throw new Error(`Unknown scale id: ${id}`);
  return def;
}

/** The twelve keys, with preferred spelling of the tonic. */
export const KEYS_SHARP = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
] as const;

/** Circle-of-fifths order using practical jazz spellings. */
export const CIRCLE_OF_FIFTHS = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "Gb",
  "Db",
  "Ab",
  "Eb",
  "Bb",
  "F",
] as const;

/** Circle-of-fourths order (how jazz standards tend to move). */
export const CIRCLE_OF_FOURTHS = [
  "C",
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Db",
  "Gb",
  "B",
  "E",
  "A",
  "D",
  "G",
] as const;

export const CHROMATIC_KEYS = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

export function keysForOrder(order: "fifths" | "fourths" | "chromatic"): readonly string[] {
  switch (order) {
    case "fifths":
      return CIRCLE_OF_FIFTHS;
    case "fourths":
      return CIRCLE_OF_FOURTHS;
    case "chromatic":
      return CHROMATIC_KEYS;
  }
}
