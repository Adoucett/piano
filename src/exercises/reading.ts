/**
 * Sight-reading drills. Every answer must be the exact written pitch (octave
 * included). Notes are spelled for the key, and drawn from landmarks first,
 * then weighted toward the notes you miss (Leitner boxes).
 */
import { Note, Scale } from "tonal";
import type { Clef, NoteSpec, StaffLayout } from "@/types";
import { prettyChord, signatureMap, spellForKey, spellNote, diatonicChord, getScaleInfo } from "@/theory/engine";
import { getScaleDef } from "@/theory/catalog";

export type ReadingMode = "landmarks" | "notes" | "key" | "intervals" | "chords";

export interface ReadingDrillSpec {
  id: string;
  title: string;
  mode: ReadingMode;
  layout: StaffLayout;
  /** Key signatures to rotate through ("C" = none). */
  keys?: string[];
  /** Number of prompts in one sprint. */
  count: number;
  /** Lowest/highest midi to draw from. */
  range?: [number, number];
  /** Chord stacks: root position, 3-7 shells, or rootless A/B voicings (3-5-7-9 / 7-9-3-5). */
  voicing?: "root" | "shell" | "rootless";
}

export interface ReadingPrompt {
  /** Notes to play: in order (intervals) or together (chords). */
  notes: NoteSpec[];
  together: boolean;
  layout: StaffLayout;
  keySignature: string;
  /** Revealed after a chord stack is played. */
  symbol?: string;
  /** Leitner id(s) for weighting. */
  ids: string[];
}

export const LANDMARKS: Record<Clef, string[]> = {
  treble: ["C4", "G4", "C5", "G5", "C6"],
  bass: ["C2", "F2", "C3", "F3", "C4"],
};

export const LANDMARK_NAMES: Record<string, string> = {
  C4: "Middle C",
  G4: "Treble G (the clef's curl)",
  C5: "Treble C (3rd space)",
  G5: "High G (above the staff)",
  C6: "High C (2 ledger lines)",
  F3: "Bass F (between the dots)",
  C3: "Bass C (2nd space)",
  F2: "Low F (below the staff)",
  C2: "Low C (2 ledger lines)",
};

const DEFAULT_RANGE: Record<StaffLayout, [number, number]> = {
  treble: [60, 84],
  bass: [36, 62],
  grand: [40, 81],
};

export function leitnerId(layout: StaffLayout, midi: number, name: string): string {
  return `${layout}|${name}${Math.floor(midi / 12) - 1}`;
}

function weightedPick<T>(items: T[], weight: (t: T) => number, rand: () => number): T {
  const ws = items.map(weight);
  const sum = ws.reduce((a, b) => a + b, 0);
  let r = rand() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Box 1 (weak) notes come up 16x as often as box 5 (solid). */
export function leitnerWeight(box: number | undefined): number {
  const b = Math.max(1, Math.min(5, box ?? 2));
  return Math.pow(2, 5 - b);
}

function naturalsIn([lo, hi]: [number, number]): NoteSpec[] {
  const out: NoteSpec[] = [];
  for (let m = lo; m <= hi; m++) {
    const pc = m % 12;
    if ([1, 3, 6, 8, 10].includes(pc)) continue;
    out.push(spellForKey(m, "C"));
  }
  return out;
}

function keyNotesIn(key: string, [lo, hi]: [number, number]): NoteSpec[] {
  const pcs = Scale.get(`${key} major`).notes;
  const out: NoteSpec[] = [];
  for (let o = 1; o <= 7; o++) {
    for (const pc of pcs) {
      const n = Note.get(`${pc}${o}`);
      if (n.midi != null && n.midi >= lo && n.midi <= hi) out.push(spellNote(n.name));
    }
  }
  return out.sort((a, b) => a.midi - b.midi);
}

function landmarkPool(layout: StaffLayout, withNeighbors: boolean): NoteSpec[] {
  const names = layout === "treble" ? LANDMARKS.treble : layout === "bass" ? LANDMARKS.bass : [...LANDMARKS.bass, ...LANDMARKS.treble.slice(1)];
  const set = new Map<number, NoteSpec>();
  for (const nm of names) {
    const n = spellNote(nm);
    set.set(n.midi, n);
    if (withNeighbors) {
      for (const step of ["2M", "-2M", "2m", "-2m"]) {
        const nb = spellNote(Note.transpose(nm, step));
        if (!/[#b]/.test(nb.name)) set.set(nb.midi, nb);
      }
    }
  }
  return [...set.values()];
}

/** Generate the prompts for one sprint. */
export function generateReading(
  spec: ReadingDrillSpec,
  boxes: Record<string, number>,
  rand: () => number = Math.random
): ReadingPrompt[] {
  const range = spec.range ?? DEFAULT_RANGE[spec.layout];
  const out: ReadingPrompt[] = [];
  let prevMidi = -1;
  for (let i = 0; i < spec.count; i++) {
    const key = spec.keys?.length ? spec.keys[Math.floor(i / Math.max(1, Math.ceil(spec.count / spec.keys.length))) % spec.keys.length] : "C";
    const layout = spec.layout;
    if (spec.mode === "chords") {
      out.push(chordPrompt(key, layout, rand, spec.voicing ?? "root"));
      continue;
    }
    const pool =
      spec.mode === "landmarks"
        ? landmarkPool(layout, i >= spec.count / 2)
        : spec.mode === "key"
          ? keyNotesIn(key, range)
          : naturalsIn(range);
    const candidates = pool.filter((n) => n.midi !== prevMidi);
    const pick = weightedPick(candidates, (n) => leitnerWeight(boxes[leitnerId(layout, n.midi, n.name)]), rand);
    prevMidi = pick.midi;
    if (spec.mode === "intervals") {
      const ivs = ["2M", "3M", "3m", "4P", "5P", "6M", "6m", "8P"];
      const iv = ivs[Math.floor(rand() * ivs.length)];
      const down = rand() < 0.4;
      const second = spellNote(Note.transpose(pick.full, down ? `-${iv}` : iv));
      const sig = signatureMap(key);
      const fits = second.midi >= range[0] - 3 && second.midi <= range[1] + 3 && (second.name.slice(1) === sig[second.letter]);
      const b = fits ? second : spellNote(Note.transpose(pick.full, down ? iv : `-${iv}`));
      out.push({
        notes: [pick, b],
        together: false,
        layout,
        keySignature: key,
        ids: [leitnerId(layout, pick.midi, pick.name), leitnerId(layout, b.midi, b.name)],
      });
      continue;
    }
    out.push({ notes: [pick], together: false, layout, keySignature: key, ids: [leitnerId(layout, pick.midi, pick.name)] });
  }
  return out;
}

const STACK_SUFFIX = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"];

/** ii, V, I, IV, vi: the degrees whose diatonic 9th is a natural 9. */
const VOICING_DEGREES = [1, 4, 0, 3, 5];

function voicingPcs(info: ReturnType<typeof getScaleInfo>, deg: number, voicing: "root" | "shell" | "rootless", rand: () => number): string[] {
  const p = (k: number) => info.pitchClasses[(deg + k) % 7];
  if (voicing === "shell") return rand() < 0.5 ? [p(2), p(6)] : [p(6), p(2)];
  if (voicing === "rootless") return rand() < 0.5 ? [p(2), p(4), p(6), p(1)] : [p(6), p(1), p(2), p(4)];
  return diatonicChord(info, deg, 4);
}

function chordPrompt(key: string, layout: StaffLayout, rand: () => number, voicing: "root" | "shell" | "rootless"): ReadingPrompt {
  const info = getScaleInfo(key, getScaleDef("major"));
  const deg = voicing === "root" ? Math.floor(rand() * 7) : VOICING_DEGREES[Math.floor(rand() * VOICING_DEGREES.length)];
  const pcs = voicingPcs(info, deg, voicing, rand);
  const baseOct = layout === "bass" ? 2 : layout === "grand" ? 3 : 4;
  const notes: NoteSpec[] = [];
  let prev = -Infinity;
  for (const pc of pcs) {
    let o = baseOct;
    let n = spellNote(`${pc}${o}`);
    while (n.midi <= prev) n = spellNote(`${pc}${++o}`);
    notes.push(n);
    prev = n.midi;
  }
  return {
    notes,
    together: true,
    layout,
    keySignature: key,
    symbol: prettyChord(info.pitchClasses[deg], STACK_SUFFIX[deg]),
    ids: notes.map((n) => leitnerId(layout, n.midi, n.name)),
  };
}

/** Which part of the staff a note sits on (reading aids are tracked per region). */
export type Region = "treble" | "treble-high" | "middle" | "bass" | "bass-low";

export function regionOf(midi: number, clef: Clef): Region {
  if (clef === "treble") return midi > 77 ? "treble-high" : midi >= 64 ? "treble" : "middle";
  return midi < 43 ? "bass-low" : midi <= 57 ? "bass" : "middle";
}

export const REGION_LABEL: Record<Region, string> = {
  "treble-high": "Above the treble staff",
  treble: "Treble staff",
  middle: "Around middle C",
  bass: "Bass staff",
  "bass-low": "Below the bass staff",
};
