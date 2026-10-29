import type { ExerciseSpec, NoteSpec, PatternDef, PatternId } from "@/types";
import {
  diatonicChord,
  getScaleInfo,
  midiFor,
  realizeScale,
  type ScaleInfo,
} from "@/theory/engine";
import { getScaleDef } from "@/theory/catalog";

export const PATTERNS: PatternDef[] = [
  { id: "ascending", name: "Ascending", description: "Straight up." },
  { id: "descending", name: "Descending", description: "Straight down." },
  { id: "upDown", name: "Up & Down", description: "Up, then back down." },
  { id: "thirds", name: "In 3rds", description: "1-3 2-4 3-5 ... climbing in thirds." },
  { id: "fourths", name: "In 4ths", description: "1-4 2-5 3-6 ... climbing in fourths." },
  { id: "groups3", name: "Groups of 3", description: "1-2-3 2-3-4 3-4-5 ..." },
  { id: "groups4", name: "Groups of 4", description: "1-2-3-4 2-3-4-5 ..." },
  { id: "triads", name: "Diatonic Triads", description: "A triad built on each scale degree." },
  { id: "sevenths", name: "Diatonic 7ths", description: "A 7th arpeggio on each scale degree." },
  {
    id: "enclosures",
    name: "Enclosures",
    description: "Approach each chord tone from a half step above and below.",
  },
];

export const PATTERN_BY_ID: Record<PatternId, PatternDef> = Object.fromEntries(
  PATTERNS.map((p) => [p.id, p])
) as Record<PatternId, PatternDef>;

function reversed(notes: NoteSpec[]): NoteSpec[] {
  return [...notes].reverse();
}

/** Up then down without repeating the top note. */
function upDown(ascending: NoteSpec[]): NoteSpec[] {
  const down = reversed(ascending).slice(1);
  return [...ascending, ...down];
}

/** Climb the scale picking every `step`-th scale tone (thirds=2, fourths=3). */
function intervalPattern(ascending: NoteSpec[], step: number): NoteSpec[] {
  const out: NoteSpec[] = [];
  for (let i = 0; i + step < ascending.length; i++) {
    out.push(ascending[i], ascending[i + step]);
  }
  return out;
}

/** Moving groups of `size` consecutive scale tones. */
function groups(ascending: NoteSpec[], size: number): NoteSpec[] {
  const out: NoteSpec[] = [];
  for (let i = 0; i + size <= ascending.length; i++) {
    for (let k = 0; k < size; k++) out.push(ascending[i + k]);
  }
  return out;
}

/** Realize a diatonic chord (triad/7th) stacked above `rootOctave`. */
function chordNotes(
  info: ScaleInfo,
  degreeIndex: number,
  size: 3 | 4,
  rootOctave: number,
  labelPrefix: string
): NoteSpec[] {
  const pcs = diatonicChord(info, degreeIndex, size);
  const out: NoteSpec[] = [];
  let prevMidi = -Infinity;
  let octave = rootOctave;
  for (const pc of pcs) {
    let m = midiFor(pc, octave);
    while (m <= prevMidi) {
      octave += 1;
      m = midiFor(pc, octave);
    }
    prevMidi = m;
    out.push({
      midi: m,
      name: pc,
      letter: pc[0]!.toUpperCase() as NoteSpec["letter"],
      octave,
      full: `${pc}${octave}`,
      label: `${labelPrefix}`,
    });
    octave = Math.floor(m / 12) - 1;
  }
  return out;
}

/** Diatonic chords across the whole scale. */
function diatonicArpeggios(info: ScaleInfo, size: 3 | 4): NoteSpec[] {
  const n = info.pitchClasses.length;
  const out: NoteSpec[] = [];
  for (let deg = 0; deg < n; deg++) {
    out.push(...chordNotes(info, deg, size, 4, info.degreeLabels[deg]));
  }
  return out;
}

/**
 * Bebop-style enclosures: for each chord tone (1,3,5,7) approach it from a
 * chromatic note above and a diatonic/chromatic note below, then land on it.
 */
function enclosures(info: ScaleInfo): NoteSpec[] {
  const targets = diatonicChord(info, 0, 4); // 1,3,5,7
  const out: NoteSpec[] = [];
  let octave = 4;
  for (const pc of targets) {
    const target = midiFor(pc, octave);
    const above = target + 1;
    const below = target - 1;
    const mk = (midi: number, label: string): NoteSpec => {
      const nm = midiToName(midi, pc);
      return {
        midi,
        name: nm.pc,
        letter: nm.letter,
        octave: nm.octave,
        full: `${nm.pc}${nm.octave}`,
        label,
      };
    };
    out.push(mk(above, "above"), mk(below, "below"), mk(target, "target"));
    if (target < 60) octave += 1; // drift upward across the run
  }
  return out;
}

/** Cheap midi -> name, biased toward the target's accidental style. */
function midiToName(
  midi: number,
  near: string
): { pc: string; letter: NoteSpec["letter"]; octave: number } {
  const sharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const flat = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const useFlat = near.includes("b");
  const table = useFlat ? flat : sharp;
  const pc = table[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { pc, letter: pc[0] as NoteSpec["letter"], octave };
}

export interface GenerateOptions {
  startOctave?: number;
  octaves?: number;
  duration?: string;
}

/** Generate the note sequence for a scale + pattern. */
export function generateExercise(
  info: ScaleInfo,
  pattern: PatternId,
  opts: GenerateOptions = {}
): NoteSpec[] {
  const startOctave = opts.startOctave ?? 4;
  const octaves = opts.octaves ?? 1;
  const ascending = realizeScale(info, startOctave, octaves);

  let seq: NoteSpec[];
  switch (pattern) {
    case "ascending":
      seq = ascending;
      break;
    case "descending":
      seq = reversed(ascending);
      break;
    case "upDown":
      seq = upDown(ascending);
      break;
    case "thirds":
      seq = intervalPattern(ascending, 2);
      break;
    case "fourths":
      seq = intervalPattern(ascending, 3);
      break;
    case "groups3":
      seq = groups(ascending, 3);
      break;
    case "groups4":
      seq = groups(ascending, 4);
      break;
    case "triads":
      seq = diatonicArpeggios(info, 3);
      break;
    case "sevenths":
      seq = diatonicArpeggios(info, 4);
      break;
    case "enclosures":
      seq = enclosures(info);
      break;
    default:
      seq = ascending;
  }

  const duration = opts.duration ?? "8";
  return seq.map((n) => ({ ...n, duration }));
}

/** Build the note sequence for a fully-specified exercise. */
export function buildExercise(spec: ExerciseSpec): NoteSpec[] {
  const info = getScaleInfo(spec.key, getScaleDef(spec.scaleId));
  return generateExercise(info, spec.patternId, {
    octaves: spec.octaves,
    startOctave: spec.startOctave,
  });
}
