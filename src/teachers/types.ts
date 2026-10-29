import type { KeyOrder, PatternId } from "@/types";

/**
 * A single step within a lesson. It points at a scale in the catalog and a
 * pattern, plus the teacher's own words. Keys are either an explicit list or
 * derived from `keyOrder`.
 */
export interface LessonStep {
  /** Scale id from the catalog (src/theory/catalog.ts). */
  scaleId: string;
  patternId: PatternId;
  /** Explicit keys (tonics), e.g. ["C","F","Bb"]. */
  keys?: string[];
  /** Or derive the key list from an order (used when `keys` is absent). */
  keyOrder?: KeyOrder;
  octaves?: number;
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
}

export interface Teacher {
  id: string;
  name: string;
  /** Short style tag, e.g. "Modern jazz", "Baroque". */
  style: string;
  era?: string;
  /** Accent color (any CSS color / hsl string). */
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
