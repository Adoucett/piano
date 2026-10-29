/**
 * Chord progressions for "lines over changes" exercises. Each chord names the
 * scale played over it; the exercise key is the key of the final chord.
 */

export interface ProgressionChord {
  /** Interval from the key (tonal notation), e.g. "2M" for ii, "5P" for V. */
  interval: string;
  suffix: string;
  scaleId: string;
}

export interface ProgressionDef {
  id: string;
  name: string;
  description: string;
  chords: ProgressionChord[];
  barsPerChord: number;
  minor?: boolean;
}

export const PROGRESSIONS: ProgressionDef[] = [
  {
    id: "ii-V-I-major",
    name: "ii–V–I",
    description: "Dorian up, bebop dominant down, major up. The line every standard is built from.",
    barsPerChord: 1,
    chords: [
      { interval: "2M", suffix: "m7", scaleId: "dorian" },
      { interval: "5P", suffix: "7", scaleId: "bebop-dominant" },
      { interval: "1P", suffix: "maj7", scaleId: "major" },
    ],
  },
  {
    id: "ii-V-I-altered",
    name: "ii–V(alt)–I",
    description: "Same ii and I, but the V turns altered: b9, #9, #11, b13 resolving inward.",
    barsPerChord: 1,
    chords: [
      { interval: "2M", suffix: "m7", scaleId: "dorian" },
      { interval: "5P", suffix: "7alt", scaleId: "altered" },
      { interval: "1P", suffix: "maj7", scaleId: "major" },
    ],
  },
  {
    id: "ii-V-i-minor",
    name: "Minor ii–V–i",
    description: "Locrian #2 up, altered down, melodic minor up.",
    barsPerChord: 1,
    minor: true,
    chords: [
      { interval: "2M", suffix: "m7b5", scaleId: "locrian-sharp2" },
      { interval: "5P", suffix: "7alt", scaleId: "altered" },
      { interval: "1P", suffix: "m6", scaleId: "melodic-minor" },
    ],
  },
  {
    id: "V-i-spanish",
    name: "V7♭9–i",
    description: "Phrygian dominant into harmonic minor: the classic minor-key dominant.",
    barsPerChord: 1,
    minor: true,
    chords: [
      { interval: "5P", suffix: "7b9", scaleId: "phrygian-dominant" },
      { interval: "1P", suffix: "mMaj7", scaleId: "harmonic-minor" },
    ],
  },
];

export const PROGRESSION_BY_ID: Record<string, ProgressionDef> = Object.fromEntries(
  PROGRESSIONS.map((p) => [p.id, p])
);

export function getProgression(id: string): ProgressionDef {
  const p = PROGRESSION_BY_ID[id];
  if (!p) throw new Error(`Unknown progression id: ${id}`);
  return p;
}
