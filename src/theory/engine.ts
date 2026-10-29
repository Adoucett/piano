import { Scale, Note, Interval } from "tonal";
import type { Clef, Letter, NoteSpec, ScaleDef } from "@/types";

/** Convert a tonal interval (e.g. "3m", "4A") into a degree label ("b3", "#4"). */
export function intervalToDegreeLabel(iv: string): string {
  const info = Interval.get(iv);
  if (info.empty || info.num == null) return iv;
  const simple = ((Math.abs(info.num) - 1) % 7) + 1;
  const perfectClass = simple === 1 || simple === 4 || simple === 5;
  const q = info.q ?? "P";
  let acc = "";
  if (perfectClass) {
    if (q === "A") acc = "#";
    else if (q === "AA") acc = "##";
    else if (q === "d") acc = "b";
    else if (q === "dd") acc = "bb";
  } else {
    if (q === "M" || q === "P") acc = "";
    else if (q === "m") acc = "b";
    else if (q === "A") acc = "#";
    else if (q === "AA") acc = "##";
    else if (q === "d") acc = "bb";
    else if (q === "dd") acc = "bbb";
  }
  return `${acc}${simple}`;
}

export interface ScaleInfo {
  tonic: string;
  def: ScaleDef;
  /** Correctly spelled pitch classes, ascending from the tonic. */
  pitchClasses: string[];
  /** Degree label per pitch class, e.g. ["1","2","b3",...]. */
  degreeLabels: string[];
  /** Compact formula string, e.g. "1 2 b3 4 5 6 b7". */
  formula: string;
}

/** Resolve a scale in a key to its spelled pitch classes + degree labels. */
export function getScaleInfo(tonic: string, def: ScaleDef): ScaleInfo {
  const s = Scale.get(`${tonic} ${def.tonalName}`);
  const pitchClasses = s.notes;
  const degreeLabels = s.intervals.map(intervalToDegreeLabel);
  return {
    tonic,
    def,
    pitchClasses,
    degreeLabels,
    formula: degreeLabels.join(" "),
  };
}

const LETTERS: Letter[] = ["C", "D", "E", "F", "G", "A", "B"];

function letterOf(name: string): Letter {
  const l = name[0]?.toUpperCase();
  if (LETTERS.includes(l as Letter)) return l as Letter;
  throw new Error(`Bad note name: ${name}`);
}

/** Which clef a midi note is drawn on for a grand staff (split at middle C). */
export function clefForMidi(midi: number): Clef {
  return midi < 60 ? "bass" : "treble";
}

/**
 * Realize a scale as an ascending run of NoteSpec across `octaves` octaves,
 * starting at `startOctave`, and including the final tonic on top.
 */
export function realizeScale(
  info: ScaleInfo,
  startOctave = 4,
  octaves = 1
): NoteSpec[] {
  const pcs = info.pitchClasses;
  const out: NoteSpec[] = [];
  let octave = startOctave;
  let prevMidi = -Infinity;

  const pushNote = (pc: string, degree: number) => {
    // Find the octave that keeps the run strictly ascending.
    let m = Note.midi(`${pc}${octave}`);
    while (m == null) m = Note.midi(`${pc}${++octave}`);
    while (m <= prevMidi) {
      octave += 1;
      m = Note.midi(`${pc}${octave}`) ?? m + 12;
    }
    prevMidi = m;
    out.push({
      midi: m,
      name: pc,
      letter: letterOf(pc),
      octave,
      full: `${pc}${octave}`,
      degree,
      label: info.degreeLabels[(degree - 1) % pcs.length],
    });
  };

  for (let o = 0; o < octaves; o++) {
    for (let i = 0; i < pcs.length; i++) {
      pushNote(pcs[i], i + 1);
    }
  }
  // Final tonic on top.
  pushNote(pcs[0], 1);
  return out;
}

/** Build the diatonic chords (as pitch-class stacks) for a heptatonic scale. */
export function diatonicChord(
  info: ScaleInfo,
  degreeIndex: number,
  size: 3 | 4
): string[] {
  const pcs = info.pitchClasses;
  const n = pcs.length;
  const notes: string[] = [];
  for (let k = 0; k < size; k++) {
    notes.push(pcs[(degreeIndex + k * 2) % n]);
  }
  return notes;
}

/** MIDI number for a pitch class + octave, robust to exotic spellings. */
export function midiFor(pc: string, octave: number): number {
  const m = Note.midi(`${pc}${octave}`);
  if (m != null) return m;
  // Fallback via chroma.
  const chroma = Note.chroma(pc);
  return (octave + 1) * 12 + (chroma ?? 0);
}

/** Pretty chord symbol combining tonic + a suffix from the catalog. */
export function chordSymbol(tonic: string, suffix: string): string {
  if (!suffix) return tonic;
  return `${tonic}${suffix}`;
}
