import { Interval, Note } from "tonal";
import type { ChordMark, ExerciseSpec, NoteRole, NoteSpec, PatternDef, PatternId, StaffLayout } from "@/types";
import {
  bestKeySignature,
  chordCore,
  diatonicChord,
  getScaleInfo,
  midiFor,
  prettyChord,
  realizeScale,
  roleOf,
  spellNote,
  type ScaleInfo,
} from "@/theory/engine";
import { getScaleDef } from "@/theory/catalog";
import { getProgression, type ProgressionDef } from "./progressions";

export const PATTERNS: PatternDef[] = [
  { id: "ascending", name: "Ascending", description: "Straight up.", group: "scale" },
  { id: "descending", name: "Descending", description: "Straight down from the top.", group: "scale" },
  { id: "upDown", name: "Up & down", description: "Up, then back down.", group: "scale" },
  { id: "downUp", name: "Down & up", description: "From the top down, then back up.", group: "scale" },
  { id: "thirds", name: "In 3rds", description: "1-3 2-4 3-5 … climbing in thirds.", group: "intervals" },
  { id: "thirdsDown", name: "In 3rds, descending", description: "8-6 7-5 6-4 … falling in thirds.", group: "intervals" },
  { id: "fourths", name: "In 4ths", description: "1-4 2-5 3-6 … climbing in fourths.", group: "intervals" },
  { id: "groups3", name: "Groups of 3", description: "1-2-3 2-3-4 3-4-5 …", group: "intervals" },
  { id: "groups3Down", name: "Groups of 3, descending", description: "8-7-6 7-6-5 …", group: "intervals" },
  { id: "groups4", name: "Groups of 4", description: "1-2-3-4 2-3-4-5 …", group: "intervals" },
  { id: "groups4Down", name: "Groups of 4, descending", description: "8-7-6-5 7-6-5-4 …", group: "intervals" },
  { id: "triads", name: "Diatonic triads", description: "A triad on each scale degree.", group: "arpeggio", scaleOnly: true },
  { id: "sevenths", name: "7th arpeggios", description: "A 7th chord on each degree (over changes: 1-3-5-7-9-7-5-3).", group: "arpeggio" },
  { id: "fromThird", name: "From the 3rd", description: "Start on the chord's 3rd, up and back. Barry Harris: start anywhere.", group: "chord-tone", scaleOnly: true },
  { id: "fromFifth", name: "From the 5th", description: "Start on the chord's 5th, up and back.", group: "chord-tone", scaleOnly: true },
  { id: "fromSeventh", name: "From the 7th", description: "Start on the chord's 7th, up and back.", group: "chord-tone", scaleOnly: true },
  { id: "bebopFrom7", name: "Bebop down from 7", description: "Descend from the 7th: chord tones fall on the beat.", group: "chord-tone", bebopOnly: true, scaleOnly: true },
  { id: "bebopFrom5", name: "Bebop down from 5", description: "Descend from the 5th.", group: "chord-tone", bebopOnly: true, scaleOnly: true },
  { id: "bebopFrom3", name: "Bebop down from 3", description: "Descend from the 3rd.", group: "chord-tone", bebopOnly: true, scaleOnly: true },
  { id: "approachBelow", name: "Chromatic from below", description: "Half step below → chord tone, landing on the beat.", group: "chromatic", scaleOnly: true },
  { id: "approachAbove", name: "Scale tone from above", description: "Scale step above → chord tone, landing on the beat.", group: "chromatic", scaleOnly: true },
  { id: "doubleChromatic", name: "Double chromatic", description: "Two half steps up into each chord tone.", group: "chromatic", scaleOnly: true },
  { id: "enclosures", name: "Enclosures", description: "Scale tone above, half step below, then the chord tone.", group: "chromatic", scaleOnly: true },
  { id: "digital1235", name: "Digital 1-2-3-5", description: "Coltrane cells on every degree.", group: "digital", scaleOnly: true },
  { id: "digital3567", name: "Digital 3-5-6-7", description: "The upper cell on every degree.", group: "digital", scaleOnly: true },
  { id: "guideTones", name: "Guide tones", description: "3rds and 7ths voice-led through the changes: 7 falls to 3, 3 holds to 7.", group: "line", progressionOnly: true },
  { id: "sightLine", name: "Sight-reading line", description: "A new four-bar diatonic melody each day, in rhythm, with no chord symbol to lean on.", group: "line", scaleOnly: true, hideChords: true },
];

export const PATTERN_BY_ID: Record<PatternId, PatternDef> = Object.fromEntries(
  PATTERNS.map((p) => [p.id, p])
) as Record<PatternId, PatternDef>;

/** Patterns that make sense for a given scale (or a progression). */
export function patternsFor(scaleId: string | null, progression = false): PatternDef[] {
  if (progression) return PATTERNS.filter((p) => !p.scaleOnly && ["ascending", "sevenths", "guideTones"].includes(p.id));
  const def = scaleId ? getScaleDef(scaleId) : null;
  const len = def ? getScaleInfo("C", def).pitchClasses.length : 7;
  return PATTERNS.filter((p) => {
    if (p.progressionOnly) return false;
    if (p.id === "sightLine" && (len !== 7 || !def || !["major", "minor", "modes-major"].includes(def.family))) return false;
    if (p.bebopOnly && len !== 8) return false;
    if ((p.group === "arpeggio" || p.group === "digital") && len < 6) return false;
    if (def?.id === "chromatic" && p.group !== "scale") return false;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Pattern generators (pitch only, no rhythm)                          */
/* ------------------------------------------------------------------ */

type Cell = { notes: NoteSpec[]; /** durations in beats */ dur?: number[] };

function intervalPattern(asc: NoteSpec[], step: number): NoteSpec[] {
  const out: NoteSpec[] = [];
  for (let i = 0; i + step < asc.length; i++) out.push(asc[i], asc[i + step]);
  out.push(asc[asc.length - 1]);
  return out;
}

function intervalPatternDown(asc: NoteSpec[], step: number): NoteSpec[] {
  const out: NoteSpec[] = [];
  for (let i = asc.length - 1; i - step >= 0; i--) out.push(asc[i], asc[i - step]);
  out.push(asc[0]);
  return out;
}

function groups(asc: NoteSpec[], size: number): NoteSpec[] {
  const out: NoteSpec[] = [];
  for (let i = 0; i + size <= asc.length; i++) for (let k = 0; k < size; k++) out.push(asc[i + k]);
  return out;
}

function groupsDown(asc: NoteSpec[], size: number): NoteSpec[] {
  const out: NoteSpec[] = [];
  for (let i = asc.length - 1; i - size + 1 >= 0; i--) for (let k = 0; k < size; k++) out.push(asc[i - k]);
  return out;
}

function chordNotes(info: ScaleInfo, degreeIndex: number, size: 3 | 4, rootOctave: number, label: string, prevFloor: number): NoteSpec[] {
  const pcs = diatonicChord(info, degreeIndex, size);
  const out: NoteSpec[] = [];
  let prev = prevFloor;
  for (const pc of pcs) {
    let oct = rootOctave;
    let m = midiFor(pc, oct);
    while (m <= prev) m = midiFor(pc, ++oct);
    prev = m;
    out.push(spellNote(`${pc}${oct}`, { label }));
  }
  return out;
}

function diatonicArpeggios(info: ScaleInfo, size: 3 | 4, startOctave: number): NoteSpec[] {
  const asc = realizeScale(info, startOctave, 1);
  const n = info.pitchClasses.length;
  const out: NoteSpec[] = [];
  for (let deg = 0; deg < n; deg++) {
    out.push(...chordNotes(info, deg, size, startOctave, info.degreeLabels[deg], asc[deg].midi - 1));
  }
  out.push(asc[asc.length - 1]);
  return out;
}

/** Index of the first scale tone with a given role against the home chord. */
function roleIndex(info: ScaleInfo, role: NoteRole): number {
  const pcs = info.pitchClasses;
  for (let i = 0; i < pcs.length; i++) {
    const m = midiFor(pcs[i], 4);
    if (roleOf(m, info.tonic, info.chordSuffix) === role) return i;
  }
  return role === "third" ? 2 : role === "fifth" ? 4 : 6;
}

function fromChordTone(info: ScaleInfo, role: NoteRole, startOctave: number, octaves: number): NoteSpec[] {
  const n = info.pitchClasses.length;
  const ext = realizeScale(info, startOctave, octaves + 1);
  const k = roleIndex(info, role);
  const up = ext.slice(k, k + n * octaves + 1);
  return [...up, ...[...up].reverse().slice(1)];
}

function bebopFrom(info: ScaleInfo, role: NoteRole, startOctave: number, octaves: number): NoteSpec[] {
  const n = info.pitchClasses.length;
  const ext = realizeScale(info, startOctave, octaves + 1);
  const k = role === "root" ? 0 : roleIndex(info, role);
  const top = k + n * octaves;
  const down = ext.slice(k, top + 1).reverse();
  return down;
}

function transposeSpelled(n: NoteSpec, iv: string, extra: Partial<NoteSpec>): NoteSpec {
  return spellNote(Note.transpose(n.full, iv), extra);
}

function chordToneTargets(info: ScaleInfo, startOctave: number, octaves: number): NoteSpec[] {
  const asc = realizeScale(info, startOctave, octaves);
  return asc.filter((n) => roleOf(n.midi, info.tonic, info.chordSuffix) !== "tension");
}

/** Next scale tone strictly above a note (spelled from the scale; a bebop passing tone doesn't count). */
function scaleToneAbove(info: ScaleInfo, n: NoteSpec): NoteSpec {
  const ext = realizeScale(info, n.octave - 1, 3);
  const rootChroma = Note.chroma(info.tonic) ?? 0;
  const passing = info.def.passingTone;
  const above = ext.find((x) => x.midi > n.midi && (passing == null || (((x.midi - rootChroma) % 12) + 12) % 12 !== passing));
  return above ? { ...above } : transposeSpelled(n, "2M", {});
}

function approachCells(info: ScaleInfo, kind: PatternId, startOctave: number, octaves: number): Cell[] {
  const targets = chordToneTargets(info, startOctave, octaves);
  return targets.map((t) => {
    const target = { ...t, label: t.label };
    switch (kind) {
      case "approachBelow":
        return { notes: [transposeSpelled(t, "-2m", { label: "♮↑", role: "approach" }), target], dur: [0.5, 0.5] };
      case "approachAbove":
        return { notes: [{ ...scaleToneAbove(info, t), role: "approach" as const, label: "↓" }, target], dur: [0.5, 0.5] };
      case "doubleChromatic":
        return {
          notes: [
            transposeSpelled(t, "-2M", { role: "approach", label: "↑" }),
            transposeSpelled(t, "-2m", { role: "approach", label: "↑" }),
            target,
          ],
          dur: [0.5, 0.5, 1],
        };
      default:
        return {
          notes: [
            { ...scaleToneAbove(info, t), role: "approach" as const, label: "↓" },
            transposeSpelled(t, "-2m", { role: "approach", label: "↑" }),
            target,
          ],
          dur: [0.5, 0.5, 1],
        };
    }
  });
}

function digital(info: ScaleInfo, cell: number[], startOctave: number, octaves: number): NoteSpec[] {
  const n = info.pitchClasses.length;
  const ext = realizeScale(info, startOctave, octaves + 1);
  const out: NoteSpec[] = [];
  for (let d = 0; d < n * octaves; d++) {
    const idx = cell.map((c) => d + c);
    if (idx[idx.length - 1] >= ext.length) break;
    idx.forEach((i) => out.push(ext[i]));
  }
  out.push(ext[n * octaves]);
  return out;
}

/** Small deterministic PRNG so a "random" line is stable for a given seed. */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIGHT_RHYTHMS: number[][] = [
  [1, 1, 1, 1],
  [0.5, 0.5, 1, 1, 1],
  [1, 0.5, 0.5, 1, 1],
  [1.5, 0.5, 1, 1],
  [0.5, 0.5, 0.5, 0.5, 1, 1],
  [1, 1, 0.5, 0.5, 1],
  [2, 1, 1],
];

/** Four bars of stepwise-with-skips diatonic melody, ending on the tonic. New each day. */
function sightLine(info: ScaleInfo, startOctave: number, seed: string): { notes: NoteSpec[]; durations: number[] } {
  const rand = seeded(seed);
  const lo = (startOctave + 1) * 12 + 2;
  const pool = realizeScale(info, startOctave - 1, 3).filter((x) => x.midi >= lo && x.midi <= lo + 19);
  const tonics = pool.map((x, i) => (x.degree === 1 ? i : -1)).filter((i) => i >= 0);
  let idx = tonics[0] ?? 0;
  const notes: NoteSpec[] = [];
  const durations: number[] = [];
  for (let bar = 0; bar < 4; bar++) {
    const rhythm = bar === 3 ? [1, 1, 2] : SIGHT_RHYTHMS[Math.floor(rand() * SIGHT_RHYTHMS.length)];
    rhythm.forEach((d, k) => {
      const last = bar === 3 && k === rhythm.length - 1;
      if (last) {
        idx = tonics.reduce((b, t) => (Math.abs(t - idx) < Math.abs(b - idx) ? t : b), tonics[0] ?? idx);
      } else if (notes.length) {
        const r = rand();
        const step = r < 0.55 ? 1 : r < 0.85 ? 2 : r < 0.95 ? 3 : 4;
        const dir = idx <= 1 ? 1 : idx >= pool.length - 2 ? -1 : rand() < 0.5 ? 1 : -1;
        idx = Math.max(0, Math.min(pool.length - 1, idx + dir * step));
      }
      notes.push(pool[idx]);
      durations.push(d);
    });
  }
  return { notes, durations };
}

export interface GenerateOptions {
  startOctave?: number;
  octaves?: number;
  /** Seed for generated (sight-reading) lines. */
  seed?: string;
}

/** Note sequence + optional per-note durations (beats) for a scale + pattern. */
export function generateLine(info: ScaleInfo, pattern: PatternId, opts: GenerateOptions = {}): { notes: NoteSpec[]; durations?: number[]; pickup?: number } {
  const so = opts.startOctave ?? 4;
  const oct = opts.octaves ?? 1;
  const asc = () => realizeScale(info, so, oct);
  switch (pattern) {
    case "ascending":
      return { notes: asc() };
    case "descending":
      return { notes: asc().reverse() };
    case "upDown": {
      const a = asc();
      return { notes: [...a, ...[...a].reverse().slice(1)] };
    }
    case "downUp": {
      const a = asc().reverse();
      return { notes: [...a, ...[...a].reverse().slice(1)] };
    }
    case "thirds":
      return { notes: intervalPattern(asc(), 2) };
    case "thirdsDown":
      return { notes: intervalPatternDown(asc(), 2) };
    case "fourths":
      return { notes: intervalPattern(asc(), 3) };
    case "groups3":
      return { notes: groups(asc(), 3) };
    case "groups3Down":
      return { notes: groupsDown(asc(), 3) };
    case "groups4":
      return { notes: groups(asc(), 4) };
    case "groups4Down":
      return { notes: groupsDown(asc(), 4) };
    case "triads":
      return { notes: diatonicArpeggios(info, 3, so) };
    case "sevenths":
      return { notes: diatonicArpeggios(info, 4, so) };
    case "fromThird":
      return { notes: fromChordTone(info, "third", so, oct) };
    case "fromFifth":
      return { notes: fromChordTone(info, "fifth", so, oct) };
    case "fromSeventh":
      return { notes: fromChordTone(info, "seventh", so, oct) };
    case "bebopFrom7":
      return { notes: bebopFrom(info, "seventh", so, oct) };
    case "bebopFrom5":
      return { notes: bebopFrom(info, "fifth", so, oct) };
    case "bebopFrom3":
      return { notes: bebopFrom(info, "third", so, oct) };
    case "approachBelow":
    case "approachAbove":
    case "doubleChromatic":
    case "enclosures": {
      const cells = approachCells(info, pattern, so, oct);
      const notes = cells.flatMap((c) => c.notes);
      const durations = cells.flatMap((c) => c.dur ?? c.notes.map(() => 0.5));
      // Two-note cells start on the "and" so the target lands on the beat.
      const pickup = pattern === "approachBelow" || pattern === "approachAbove" ? 0.5 : 0;
      return { notes, durations, pickup };
    }
    case "digital1235":
      return { notes: digital(info, [0, 1, 2, 4], so, oct) };
    case "digital3567":
      return { notes: digital(info, [2, 4, 5, 6], so, oct) };
    case "guideTones":
      return { notes: fromChordTone(info, "third", so, 1) };
    case "sightLine":
      return sightLine(info, so, opts.seed ?? info.tonic);
  }
}

/* ------------------------------------------------------------------ */
/* Built exercise                                                      */
/* ------------------------------------------------------------------ */

export interface Exercise {
  spec: ExerciseSpec;
  notes: NoteSpec[];
  chords: ChordMark[];
  layout: StaffLayout;
  /** Major key name for the key signature, e.g. "Bb". */
  keySignature: string;
  beatsPerBar: number;
  totalBeats: number;
  bars: number;
  title: string;
  subtitle: string;
  /** Scale info for single-scale exercises. */
  info?: ScaleInfo;
  progression?: ProgressionDef;
  /** Right-hand finger per note (major scale runs only). */
  fingers?: (number | undefined)[];
}

/** Swing ratio for a line: bebop scales, vocabulary and progressions swing in "auto". */
export function lineSwing(ex: Exercise, s: { swingLines: "auto" | "on" | "off"; swing: number }): number {
  if (s.swingLines === "off") return 0.5;
  if (s.swingLines === "on") return s.swing;
  if (ex.spec.feel) return ex.spec.feel === "swing" ? s.swing : 0.5;
  const src = ex.spec.source;
  const jazz =
    !!ex.progression ||
    ex.info?.def.family === "bebop" ||
    (src?.kind === "curriculum" && src.tierId?.startsWith("vocab")) ||
    (src?.kind === "teacher" && src.teacherId === "bebop");
  return jazz && ex.spec.patternId !== "sightLine" ? s.swing : 0.5;
}

/** Pick a staff layout that never switches clefs mid-run. */
export function chooseLayout(notes: NoteSpec[]): StaffLayout {
  const min = Math.min(...notes.map((n) => n.midi));
  const max = Math.max(...notes.map((n) => n.midi));
  if (min >= 57) return "treble";
  if (max <= 64) return "bass";
  return "grand";
}

/** Assign beat positions from durations (default: straight eighths). */
export function assignBeats(notes: NoteSpec[], durations?: number[], pickup = 0): NoteSpec[] {
  let beat = pickup;
  return notes.map((n, i) => {
    const beats = durations?.[i] ?? 0.5;
    const out = { ...n, beat, beats };
    beat += beats;
    return out;
  });
}

/** Ending note rings to the end of its beat at least (a quarter). */
function finalize(notes: NoteSpec[], beatsPerBar: number): { notes: NoteSpec[]; totalBeats: number; bars: number } {
  if (!notes.length) return { notes, totalBeats: 0, bars: 1 };
  const last = notes[notes.length - 1];
  const out = [...notes];
  const lastBeat = last.beat ?? 0;
  // Let the final note ring a quarter (or to the next beat boundary if it falls on an offbeat).
  const frac = lastBeat - Math.floor(lastBeat);
  const ring = frac === 0 ? Math.max(1, last.beats ?? 1) : 1 - frac;
  out[out.length - 1] = { ...last, beats: ring };
  const end = lastBeat + ring;
  const bars = Math.max(1, Math.ceil(end / beatsPerBar - 1e-9));
  return { notes: out, totalBeats: end, bars };
}

const RH_MAJOR_FINGERS: Record<string, { cycle: number[]; top: number }> = {
  C: { cycle: [1, 2, 3, 1, 2, 3, 4], top: 5 },
  G: { cycle: [1, 2, 3, 1, 2, 3, 4], top: 5 },
  D: { cycle: [1, 2, 3, 1, 2, 3, 4], top: 5 },
  A: { cycle: [1, 2, 3, 1, 2, 3, 4], top: 5 },
  E: { cycle: [1, 2, 3, 1, 2, 3, 4], top: 5 },
  B: { cycle: [1, 2, 3, 1, 2, 3, 4], top: 5 },
  F: { cycle: [1, 2, 3, 4, 1, 2, 3], top: 4 },
  Bb: { cycle: [4, 1, 2, 3, 1, 2, 3], top: 4 },
  Eb: { cycle: [3, 1, 2, 3, 4, 1, 2], top: 3 },
  Ab: { cycle: [3, 4, 1, 2, 3, 1, 2], top: 3 },
  Db: { cycle: [2, 3, 1, 2, 3, 4, 1], top: 2 },
  "C#": { cycle: [2, 3, 1, 2, 3, 4, 1], top: 2 },
  Gb: { cycle: [2, 3, 4, 1, 2, 3, 1], top: 2 },
  "F#": { cycle: [2, 3, 4, 1, 2, 3, 1], top: 2 },
};

/** Standard right-hand fingering for major-scale runs (scale patterns only). */
export function majorFingering(info: ScaleInfo, notes: NoteSpec[], patternId: PatternId): (number | undefined)[] | undefined {
  if (info.def.id !== "major") return undefined;
  if (!["ascending", "descending", "upDown", "downUp"].includes(patternId)) return undefined;
  const f = RH_MAJOR_FINGERS[info.tonic];
  if (!f) return undefined;
  const top = Math.max(...notes.map((n) => n.midi));
  return notes.map((n) => (n.midi === top && n.degree === 1 ? f.top : f.cycle[((n.degree ?? 1) - 1) % 7]));
}

function withRoles(notes: NoteSpec[], root: string, suffix: string): NoteSpec[] {
  return notes.map((n) => (n.role === "approach" ? n : { ...n, role: roleOf(n.midi, root, suffix) }));
}

/** Build a fully-timed exercise from a spec. */
export function buildExercise(spec: ExerciseSpec): Exercise {
  if (spec.progressionId) return buildProgression(spec);
  const def = getScaleDef(spec.scaleId);
  const info = getScaleInfo(spec.key, def);
  const pattern = PATTERN_BY_ID[spec.patternId];
  const seed = `${spec.key}|${spec.scaleId}|${new Date().toDateString()}`;
  const line = generateLine(info, spec.patternId, { octaves: spec.octaves, startOctave: spec.startOctave, seed });
  const beatsPerBar = 4;
  const suffix = spec.chord ?? info.chordSuffix;
  const timed = assignBeats(withRoles(line.notes, info.tonic, suffix), line.durations, line.pickup);
  const { notes, totalBeats, bars } = finalize(timed, beatsPerBar);
  const chords: ChordMark[] =
    !pattern?.hideChords && suffix && def.id !== "chromatic"
      ? [{ beat: 0, root: info.tonic, suffix, symbol: prettyChord(info.tonic, suffix) }]
      : [];
  return {
    spec,
    notes,
    chords,
    layout: chooseLayout(notes),
    keySignature: def.respell ? "C" : bestKeySignature(info.pitchClasses),
    beatsPerBar,
    totalBeats,
    bars,
    title: `${info.tonic} ${def.name}`,
    subtitle: PATTERN_BY_ID[spec.patternId]?.name ?? spec.patternId,
    info,
    fingers: majorFingering(info, notes, spec.patternId),
  };
}

/* ------------------------------------------------------------------ */
/* Progressions                                                        */
/* ------------------------------------------------------------------ */

/** A run of `count` scale tones starting on the root nearest `target`, going up or down. */
function rootRun(info: ScaleInfo, target: number, count: number, dir: 1 | -1): NoteSpec[] {
  const n = info.pitchClasses.length;
  let best: NoteSpec[] = [];
  let bestD = Infinity;
  for (let o = 2; o <= 5; o++) {
    const ext = realizeScale(info, o, 2);
    const run = dir === 1 ? ext.slice(0, count) : ext.slice(n - count + 1, n + 1).reverse();
    if (run.length < count) continue;
    const d = Math.abs(run[0].midi - target) + (run.some((x) => x.midi < 55 || x.midi > 88) ? 30 : 0);
    if (d < bestD) {
      bestD = d;
      best = run;
    }
  }
  return best;
}

function nearestPitch(pc: string, target: number): NoteSpec {
  let best = spellNote(`${pc}4`);
  for (let o = 3; o <= 6; o++) {
    const n = spellNote(`${pc}${o}`);
    if (Math.abs(n.midi - target) < Math.abs(best.midi - target)) best = n;
  }
  return best;
}

/** Spelled 3rd and 7th of a chord, taken from its scale when the scale has them. */
function guidePair(info: ScaleInfo, root: string, suffix: string): [string, string] {
  const pcs = info.pitchClasses;
  const find = (role: NoteRole) => pcs.find((pc) => roleOf(midiFor(pc, 4), root, suffix) === role);
  return [find("third") ?? pcs[2], find("seventh") ?? pcs[6] ?? pcs[pcs.length - 1]];
}

/** 1-3-5-7-9 from the chord itself (alt: 1-3-b13-b7-b9), spelled from the scale, starting near `prev`. */
function chordToneArpeggio(info: ScaleInfo, root: string, suffix: string, prev: number): NoteSpec[] {
  const rc = Note.chroma(root) ?? 0;
  const byRel = new Map(info.pitchClasses.map((pc) => [(((Note.chroma(pc) ?? 0) - rc) % 12 + 12) % 12, pc]));
  const core = suffix === "7alt" ? [0, 4, 8, 10] : chordCore(suffix);
  const ninth = [2, 1, 3].map((r) => byRel.get(r)).find(Boolean);
  const pcs = [...core.map((r) => byRel.get(r) ?? Note.pitchClass(Note.transpose(root, Interval.fromSemitones(r)))), ninth].filter(Boolean) as string[];
  let best: NoteSpec[] = [];
  let bestD = Infinity;
  for (let o = 3; o <= 5; o++) {
    const out: NoteSpec[] = [];
    let floor = -Infinity;
    for (const pc of pcs) {
      let oct = o;
      while (midiFor(pc, oct) <= floor) oct++;
      const n = spellNote(`${pc}${oct}`);
      floor = n.midi;
      out.push(n);
    }
    const d = Math.abs(out[0].midi - prev) + (out[out.length - 1].midi > 88 || out[0].midi < 55 ? 40 : 0);
    if (d < bestD) {
      bestD = d;
      best = out;
    }
  }
  return best;
}

/** Guide tones: two passes, each voice moving by the smallest step (7 falls to 3, 3 holds as 7). */
function buildGuideTones(spec: ExerciseSpec, prog: ProgressionDef): Exercise {
  const beatsPerBar = 4;
  const infos = prog.chords.map((c) => {
    const rootRaw = Note.simplify(Note.transpose(spec.key, c.interval));
    const info = getScaleInfo(rootRaw, getScaleDef(c.scaleId));
    return { c, info, root: info.tonic, pair: guidePair(info, info.tonic, c.suffix) };
  });
  const notes: NoteSpec[] = [];
  const chords: ChordMark[] = [];
  let beat = 0;
  const pass = (startRole: 0 | 1) => {
    let prev = -1;
    infos.forEach(({ c, root, pair }, i) => {
      chords.push({ beat, root, suffix: c.suffix, symbol: prettyChord(root, c.suffix) });
      let n: NoteSpec;
      if (i === 0) n = nearestPitch(pair[startRole === 0 ? 1 : 0], startRole === 0 ? 72 : 67);
      else {
        const a = nearestPitch(pair[0], prev);
        const b = nearestPitch(pair[1], prev);
        n = Math.abs(a.midi - prev) <= Math.abs(b.midi - prev) ? a : b;
      }
      prev = n.midi;
      notes.push({ ...n, role: roleOf(n.midi, root, c.suffix), beat, beats: beatsPerBar * prog.barsPerChord });
      beat += beatsPerBar * prog.barsPerChord;
    });
  };
  pass(0);
  pass(1);
  const last = infos[infos.length - 1];
  return {
    spec,
    notes,
    chords,
    layout: chooseLayout(notes),
    keySignature: progressionSignature(prog, spec.key),
    beatsPerBar,
    totalBeats: beat,
    bars: Math.ceil(beat / beatsPerBar),
    title: `${prog.name} in ${last.root}`,
    subtitle: PATTERN_BY_ID.guideTones.name,
    progression: prog,
  };
}

/** Key signature for a progression: the home major key, or the relative major of a minor home. */
function progressionSignature(prog: ProgressionDef, key: string): string {
  const last = prog.chords[prog.chords.length - 1];
  const home = Note.simplify(Note.transpose(key, last.interval));
  const def = getScaleDef(prog.minor ? "natural-minor" : "major");
  return bestKeySignature(getScaleInfo(home, def).pitchClasses);
}

export function buildProgression(spec: ExerciseSpec): Exercise {
  const prog = getProgression(spec.progressionId!);
  if (spec.patternId === "guideTones") return buildGuideTones(spec, prog);
  const beatsPerBar = 4;
  const key = spec.key;
  const notes: NoteSpec[] = [];
  const chords: ChordMark[] = [];
  let prev = 67; // G4: comfortable RH register
  let beat = 0;

  prog.chords.forEach((c, ci) => {
    const rootRaw = Note.simplify(Note.transpose(key, c.interval));
    const def = getScaleDef(c.scaleId);
    const info = getScaleInfo(rootRaw, def);
    const root = info.tonic;
    chords.push({ beat, root, suffix: c.suffix, symbol: prettyChord(root, c.suffix) });
    const n = info.pitchClasses.length;
    let seg: NoteSpec[] = [];
    let durs: number[] | undefined;

    if (spec.patternId === "sevenths") {
      const up = chordToneArpeggio(info, root, c.suffix, prev);
      seg = [...up, ...up.slice(1, -1).reverse()];
    } else {
      // Scale line: odd chords ascend from the root, even chords descend from it.
      const dir: 1 | -1 = ci % 2 === 0 ? 1 : -1;
      seg = rootRun(info, prev, Math.min(8, n + 1), dir);
    }

    const timed = seg.map((x, i) => ({
      ...x,
      role: roleOf(x.midi, root, c.suffix),
      beat: beat + (durs ? durs.slice(0, i).reduce((s, d) => s + d, 0) : i * 0.5),
      beats: durs?.[i] ?? 0.5,
    }));
    notes.push(...timed);
    prev = seg[seg.length - 1]?.midi ?? prev;
    beat += prog.barsPerChord * beatsPerBar;
  });

  // Land on the tonic of the final chord.
  const last = prog.chords[prog.chords.length - 1];
  const finalRoot = Note.simplify(Note.transpose(key, last.interval));
  const landInfo = getScaleInfo(finalRoot, getScaleDef(last.scaleId));
  const land = nearestPitch(landInfo.tonic, prev);
  notes.push({ ...land, role: "root", beat, beats: 2 });
  const totalBeats = beat + 2;
  const bars = Math.ceil(totalBeats / beatsPerBar);

  return {
    spec,
    notes,
    chords,
    layout: chooseLayout(notes),
    keySignature: progressionSignature(prog, key),
    beatsPerBar,
    totalBeats,
    bars,
    title: `${prog.name} in ${landInfo.tonic}`,
    subtitle: PATTERN_BY_ID[spec.patternId]?.name ?? "",
    progression: prog,
  };
}
