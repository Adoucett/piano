export type Clef = "treble" | "bass";
export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";

export type ScaleFamily =
  | "major"
  | "minor"
  | "modes-major"
  | "pentatonic-blues"
  | "melodic-minor-modes"
  | "harmonic-minor-modes"
  | "symmetric"
  | "bebop"
  | "advanced";

/** A single realized note: a specific pitch at a specific octave. */
export interface NoteSpec {
  /** MIDI note number (middle C = 60). */
  midi: number;
  /** Spelled pitch class, e.g. "Eb", "F#", "Cb". */
  name: string;
  /** Diatonic letter of the spelling. */
  letter: Letter;
  /** Octave number (scientific pitch notation). */
  octave: number;
  /** Full spelled note with octave, e.g. "Eb4" (VexFlow / tonal key). */
  full: string;
  /** Scale degree 1..n within its scale (if applicable). */
  degree?: number;
  /** Human degree label, e.g. "b3", or a pattern label like "enclosure". */
  label?: string;
  /** VexFlow duration token, e.g. "q", "8". */
  duration?: string;
}

/** A scale definition in the catalog (key-independent). */
export interface ScaleDef {
  id: string;
  name: string;
  /** Name understood by tonal's Scale.get(), e.g. "dorian". */
  tonalName: string;
  aka?: string[];
  family: ScaleFamily;
  /** Chord symbols (suffixes) this scale is commonly played over. */
  chords: string[];
  /** Short practical tip. */
  tip: string;
}

export type PatternId =
  | "ascending"
  | "descending"
  | "upDown"
  | "thirds"
  | "fourths"
  | "groups3"
  | "groups4"
  | "triads"
  | "sevenths"
  | "enclosures";

export interface PatternDef {
  id: PatternId;
  name: string;
  description: string;
}

export type KeyOrder = "fifths" | "fourths" | "chromatic";

export interface Unit {
  id: string;
  title: string;
  /** Scale ids this unit drills. */
  scaleIds: string[];
  /** Pattern ids offered (first is the default). */
  patternIds: PatternId[];
  keyOrder: KeyOrder;
  octaves: number;
  /** Optional note-reading drill instead of a scale run. */
  readingDrill?: Clef | "grand";
}

export interface Level {
  id: string;
  title: string;
  description: string;
  units: Unit[];
}

/** Per-note practice result. */
export interface NoteResult {
  expected: NoteSpec;
  played?: number; // midi actually played
  correct: boolean;
  /** ms from when the note became target to when it was answered. */
  reactionMs: number;
  /** ms timing error vs metronome grid (tempo mode). */
  timingErrMs?: number;
  velocity?: number;
}

export interface RunSummary {
  total: number;
  correct: number;
  accuracy: number; // 0..1
  avgReactionMs: number;
  avgTimingErrMs?: number;
  avgVelocity?: number;
  velocityStdev?: number;
  /** mastery delta applied, for display */
  startedAt: number;
  finishedAt: number;
}

/** Reading-aid levels, from most help (0) to none (3). */
export type AidLevel = 0 | 1 | 2 | 3;

/** A fully-specified practice item: one scale, in one key, with one pattern. */
export interface ExerciseSpec {
  scaleId: string;
  key: string;
  patternId: PatternId;
  octaves: number;
  startOctave?: number;
  /** Optional provenance for UI/progress (curriculum unit or teacher lesson). */
  source?: {
    kind: "library" | "curriculum" | "teacher";
    teacherId?: string;
    lessonId?: string;
    unitId?: string;
    instruction?: string;
  };
}

/** Stable key for storing progress about a single exercise item. */
export function exerciseKey(spec: {
  scaleId: string;
  key: string;
  patternId: PatternId;
}): string {
  return `${spec.scaleId}|${spec.key}|${spec.patternId}`;
}
