export type Clef = "treble" | "bass";
export type StaffLayout = "treble" | "bass" | "grand";
export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";

export type ScaleFamily =
  | "major"
  | "minor"
  | "modes-major"
  | "pentatonic-blues"
  | "melodic-minor-modes"
  | "harmonic-minor-modes"
  | "harmonic-major-modes"
  | "symmetric"
  | "bebop"
  | "advanced";

/** How a note functions against the chord of the moment (drives note coloring). */
export type NoteRole = "root" | "third" | "fifth" | "seventh" | "tension" | "approach";

/** A single realized note: a specific pitch at a specific octave and time. */
export interface NoteSpec {
  /** MIDI note number (middle C = 60). */
  midi: number;
  /** Spelled pitch class, e.g. "Eb", "F#", "Cb". */
  name: string;
  /** Diatonic letter of the spelling. */
  letter: Letter;
  /** Octave number (scientific pitch notation). */
  octave: number;
  /** Full spelled note with octave, e.g. "Eb4". */
  full: string;
  /** Scale degree 1..n within its scale (if applicable). */
  degree?: number;
  /** Human degree label, e.g. "b3", or a pattern label like "enclosure". */
  label?: string;
  /** Start position in beats from the start of the exercise (quarter = 1). */
  beat?: number;
  /** Length in beats (eighth = 0.5). */
  beats?: number;
  /** Function against the current chord. */
  role?: NoteRole;
  /** Which hand should play it (rhythm drills / polyrhythms). */
  hand?: "L" | "R";
  /** Accent marking (rhythm drills). */
  accent?: boolean;
}

/** A chord symbol placed on the beat grid. */
export interface ChordMark {
  beat: number;
  root: string;
  suffix: string;
  /** Display symbol, e.g. "D–7", "G7♭9". */
  symbol: string;
}

/** A scale definition in the catalog (key-independent). */
export interface ScaleDef {
  id: string;
  name: string;
  /** Name understood by tonal's Scale.get(), e.g. "dorian". */
  tonalName: string;
  aka?: string[];
  family: ScaleFamily;
  /** Chord symbols (suffixes) this scale is commonly played over. First one is the "home" chord. */
  chords: string[];
  /** Short practical tip. */
  tip: string;
  /** Degree labels as a jazz player names them (e.g. altered: b9 #9 3 #11 b13 b7). */
  degreeLabels?: string[];
  /** Explicit interval formula; overrides tonalName when tonal's spelling or definition is wrong for jazz use. */
  intervals?: string[];
  /** Respell double accidentals and E#/B#/Cb/Fb enharmonically, and drop the key signature (symmetric/altered scales). */
  respell?: boolean;
  /** Bebop scales: semitones above the root of the chromatic passing tone (never used as an approach "scale tone"). */
  passingTone?: number;
}

export type PatternId =
  | "ascending"
  | "descending"
  | "upDown"
  | "downUp"
  | "thirds"
  | "thirdsDown"
  | "fourths"
  | "groups3"
  | "groups3Down"
  | "groups4"
  | "groups4Down"
  | "triads"
  | "sevenths"
  | "fromThird"
  | "fromFifth"
  | "fromSeventh"
  | "bebopFrom3"
  | "bebopFrom5"
  | "bebopFrom7"
  | "approachBelow"
  | "approachAbove"
  | "doubleChromatic"
  | "enclosures"
  | "digital1235"
  | "digital3567"
  | "guideTones"
  | "sightLine";

export type PatternGroup = "scale" | "intervals" | "arpeggio" | "chord-tone" | "chromatic" | "digital" | "line";

export interface PatternDef {
  id: PatternId;
  name: string;
  description: string;
  group: PatternGroup;
  /** Only meaningful for 8-note bebop scales. */
  bebopOnly?: boolean;
  /** Only meaningful over a progression. */
  progressionOnly?: boolean;
  /** Not available for progressions. */
  scaleOnly?: boolean;
  /** Reading drill: no chord symbol, no drone, so the line has to be read. */
  hideChords?: boolean;
}

export type KeyOrder = "fifths" | "fourths" | "chromatic";

/** Reading-aid levels, from most help (0) to none (3). */
export type AidLevel = 0 | 1 | 2 | 3;

/** A fully-specified practice item: one scale (or progression), in one key, with one pattern. */
export interface ExerciseSpec {
  scaleId: string;
  key: string;
  patternId: PatternId;
  octaves: number;
  startOctave?: number;
  /** When set, the exercise runs over a chord progression instead of one scale. */
  progressionId?: string;
  /** Chord the line is played over (suffix such as "7alt", "m6"); defaults to the scale's chord. */
  chord?: string;
  /** Feel requested by a lesson; overrides the "auto" swing policy. */
  feel?: "straight" | "swing";
  /** Suggested tempo from a lesson. */
  bpm?: number;
  /** Optional provenance for UI/progress (curriculum unit or teacher lesson). */
  source?: {
    kind: "library" | "curriculum" | "teacher" | "review" | "session";
    teacherId?: string;
    lessonId?: string;
    unitId?: string;
    tierId?: string;
    instruction?: string;
  };
}

/** Stable key for storing progress about a single exercise item. */
export function exerciseKey(spec: {
  scaleId: string;
  key: string;
  patternId: PatternId;
  progressionId?: string;
}): string {
  if (spec.progressionId) return `prog:${spec.progressionId}|${spec.key}|${spec.patternId}`;
  return `${spec.scaleId}|${spec.key}|${spec.patternId}`;
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

export type NoteStatus = "hit" | "wrong" | "missed";

/** Per-note practice result. */
export interface NoteResult {
  index: number;
  expected: NoteSpec;
  status: NoteStatus;
  /** midi actually played (the last attempt for this note). */
  played?: number;
  /** True if the note was hit cleanly (no wrong attempt first). */
  correct: boolean;
  /** ms from when the note became the target to when it was answered (wait mode). */
  reactionMs: number;
  /** Signed ms timing error vs the beat grid (tempo mode). Positive = late. */
  errorMs?: number;
  velocity?: number;
  /** Audio-clock time (seconds) the note was played. */
  time?: number;
}

export interface RunSummary {
  total: number;
  correct: number;
  /** 0..1 */
  accuracy: number;
  wrong: number;
  missed: number;
  extras: number;
  mode: "wait" | "tempo";
  bpm: number;
  avgReactionMs: number;
  /** Mean absolute timing error (ms). */
  meanAbsErrorMs?: number;
  /** Mean signed timing error (ms). Negative = ahead of the beat. */
  biasMs?: number;
  /** Coefficient of variation of inter-onset intervals vs the written ones (0.05 = 5%). */
  ioiCv?: number;
  /** Measured swing ratio of eighth pairs (0.5 = straight, 0.67 = triplet swing). */
  swingRatio?: number;
  /** Tempo drift in ms of timing error per bar. Negative = rushing. */
  driftMsPerBar?: number;
  avgVelocity?: number;
  velocityStdev?: number;
  startedAt: number;
  finishedAt: number;
}
