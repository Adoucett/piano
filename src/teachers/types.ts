import type { KeyOrder, PatternId } from "@/types";
import type { TrackId } from "@/exercises/tracks";

/**
 * A single step within a lesson. It points at a scale in the catalog (or a
 * progression) and a pattern, plus the teacher's own words. Keys are either
 * an explicit list or derived from `keyOrder`.
 */
export interface LessonStep {
  /** Scale id from the catalog (src/theory/catalog.ts). For progression steps, the scale of the first chord. */
  scaleId: string;
  patternId: PatternId;
  /** Optional: play over a chord progression instead (src/exercises/progressions.ts). */
  progressionId?: string;
  /** Explicit keys (tonics), e.g. ["C","F","Bb"]. */
  keys?: string[];
  /** Or derive the key list from an order (used when `keys` is absent). */
  keyOrder?: KeyOrder;
  octaves?: number;
  startOctave?: number;
  /** Optional chord to play the line over, as a suffix on the key (e.g. "7alt", "m6", "maj7#11"). Sets the chord symbol and chord-tone coloring. */
  chord?: string;
  /** Optional rhythmic feel the teacher wants for this step. */
  rhythm?: "straight" | "swing";
  /** Optional suggested tempo. */
  bpm?: number;
  /** What the teacher says for this step. */
  instruction: string;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  steps: LessonStep[];
  /** Sort order within the teacher's lesson list. Lower first. */
  order?: number;
  /** Which curriculum track this lesson reinforces. */
  trackId?: TrackId;
  /** 1 (approachable) .. 5 (demanding). */
  difficulty?: 1 | 2 | 3 | 4 | 5;
  /** Rough time for one pass, in minutes. */
  estMinutes?: number;
}

export interface Teacher {
  id: string;
  name: string;
  /** Short style tag, e.g. "Modern jazz", "Baroque". */
  style: string;
  era?: string;
  /** Accent color (any CSS color). Keep it muted; it is used as a thin accent. */
  color: string;
  /** One-line tagline shown on the card. */
  tagline: string;
  /** Full internal bio / backstory in the teacher's voice-informing text. */
  bio: string;
  /** Teaching philosophy and the voice they coach in. */
  philosophy: string;
  /** Scale ids this teacher loves to work from (their "scalar vocabulary"). */
  scalarVocab: string[];
  /** Keys they gravitate toward. */
  favoriteKeys?: string[];
  /** Signature pointers they repeat a lot. */
  signatureTips: string[];
  /** Lessons. More can be appended later (see registry). */
  lessons: Lesson[];
}

/** A lesson contributed separately and merged onto an existing teacher. */
export interface LessonContribution {
  teacherId: string;
  lesson: Lesson;
}
