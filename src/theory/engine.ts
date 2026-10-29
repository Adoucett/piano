import { Scale, Note, Interval, Chord } from "tonal";
import type { Clef, Letter, NoteRole, NoteSpec, ScaleDef } from "@/types";

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
  /** The tonic as spelled (may be the enharmonic of the requested key). */
  tonic: string;
  /** The key that was requested (progress is stored against this). */
  requestedKey: string;
  def: ScaleDef;
  /** Correctly spelled pitch classes, ascending from the tonic. */
  pitchClasses: string[];
  /** Degree label per pitch class, e.g. ["1","2","b3",...]. */
  degreeLabels: string[];
  /** Compact formula string, e.g. "1 2 b3 4 5 6 b7". */
  formula: string;
  /** Home chord suffix, e.g. "m7". */
  chordSuffix: string;
}

function accidentalWeight(pcs: string[]): number {
  return pcs.reduce((n, pc) => n + (pc.slice(1).match(/[#b]/g)?.length ?? 0), 0);
}

/**
 * Pick the enharmonic spelling of a tonic that reads best for this scale
 * (fewest accidentals, never double flats where a sharp key reads cleaner).
 * Gb natural minor becomes F# minor; Db Dorian becomes C# Dorian.
 */
export function preferredTonic(key: string, def: ScaleDef): string {
  const candidates = [key];
  const enh = Note.enharmonic(key);
  if (enh && enh !== key && enh.length <= 2) candidates.push(enh);
  let best = key;
  let bestW = Infinity;
  for (const c of candidates) {
    const s = spellScale(c, def);
    if (!s.notes.length) continue;
    const w = accidentalWeight(s.notes) + 4 * s.notes.filter((n) => AWKWARD.test(n)).length;
    if (w < bestW) {
      best = c;
      bestW = w;
    }
  }
  return best;
}

/** Spellings that read badly on a staff: double accidentals and E#, B#, Cb, Fb. */
const AWKWARD = /##|bb|^(E#|B#|Cb|Fb)$/;

/** Spelled pitch classes and intervals of a scale on a tonic (explicit formula wins over tonal's). */
export function spellScale(tonic: string, def: ScaleDef): { notes: string[]; intervals: string[] } {
  let notes: string[];
  let intervals: string[];
  if (def.intervals) {
    intervals = def.intervals;
    notes = intervals.map((iv) => Note.pitchClass(Note.transpose(tonic, iv)));
  } else {
    const s = Scale.get(`${tonic} ${def.tonalName}`);
    notes = s.notes;
    intervals = s.intervals;
  }
  if (def.respell) notes = notes.map((n, i) => (i > 0 && AWKWARD.test(n) ? Note.enharmonic(n) : n));
  return { notes, intervals };
}

/** Resolve a scale in a key to its spelled pitch classes + degree labels. */
export function getScaleInfo(key: string, def: ScaleDef): ScaleInfo {
  const tonic = preferredTonic(key, def);
  const s = spellScale(tonic, def);
  const pitchClasses = s.notes;
  const degreeLabels = def.degreeLabels ?? s.intervals.map(intervalToDegreeLabel);
  return {
    tonic,
    requestedKey: key,
    def,
    pitchClasses,
    degreeLabels,
    formula: degreeLabels.join(" "),
    chordSuffix: def.chords[0] ?? "",
  };
}

const LETTERS: Letter[] = ["C", "D", "E", "F", "G", "A", "B"];

export function letterOf(name: string): Letter {
  const l = name[0]?.toUpperCase();
  if (LETTERS.includes(l as Letter)) return l as Letter;
  throw new Error(`Bad note name: ${name}`);
}

/** Build a NoteSpec from a full spelled note like "D#4". */
export function spellNote(full: string, extra: Partial<NoteSpec> = {}): NoteSpec {
  const n = Note.get(full);
  if (n.empty || n.midi == null || n.oct == null) throw new Error(`Bad note: ${full}`);
  return {
    midi: n.midi,
    name: n.pc,
    letter: n.letter as Letter,
    octave: n.oct,
    full: n.name,
    ...extra,
  };
}

/** Which clef a midi note is drawn on for a grand staff (split at middle C). */
export function clefForMidi(midi: number): Clef {
  return midi < 60 ? "bass" : "treble";
}

/**
 * Realize a scale as an ascending run of NoteSpec across `octaves` octaves,
 * starting at `startOctave`, and including the final tonic on top.
 */
export function realizeScale(info: ScaleInfo, startOctave = 4, octaves = 1): NoteSpec[] {
  const pcs = info.pitchClasses;
  const out: NoteSpec[] = [];
  let octave = startOctave;
  let prevMidi = -Infinity;

  const pushNote = (pc: string, degree: number) => {
    let m = Note.midi(`${pc}${octave}`);
    while (m == null) m = Note.midi(`${pc}${++octave}`);
    while (m <= prevMidi) {
      octave += 1;
      m = Note.midi(`${pc}${octave}`) ?? m + 12;
    }
    prevMidi = m;
    // Octave of a spelled note follows its letter (B#3 sounds as C4).
    const spelled = Note.get(`${pc}${octave}`);
    out.push({
      midi: m,
      name: pc,
      letter: letterOf(pc),
      octave: spelled.oct ?? octave,
      full: spelled.name || `${pc}${octave}`,
      degree,
      label: info.degreeLabels[(degree - 1) % pcs.length],
    });
  };

  for (let o = 0; o < octaves; o++) {
    for (let i = 0; i < pcs.length; i++) pushNote(pcs[i], i + 1);
  }
  pushNote(pcs[0], 1);
  return out;
}

/** Build the diatonic chords (as pitch-class stacks) for a heptatonic scale. */
export function diatonicChord(info: ScaleInfo, degreeIndex: number, size: 3 | 4): string[] {
  const pcs = info.pitchClasses;
  const n = pcs.length;
  const notes: string[] = [];
  for (let k = 0; k < size; k++) notes.push(pcs[(degreeIndex + k * 2) % n]);
  return notes;
}

/** MIDI number for a pitch class + octave, robust to exotic spellings. */
export function midiFor(pc: string, octave: number): number {
  const m = Note.midi(`${pc}${octave}`);
  if (m != null) return m;
  const chroma = Note.chroma(pc);
  return (octave + 1) * 12 + (chroma ?? 0);
}

/* ------------------------------------------------------------------ */
/* Chords                                                              */
/* ------------------------------------------------------------------ */

const SUFFIX_FALLBACK: Record<string, string> = {
  susb9: "m7",
  "m7b9": "m7",
  "7alt": "7",
};

/**
 * Semitone classes (relative to the root) of a chord's core tones:
 * root, third, fifth, seventh (or 6th). Extensions are tensions.
 */
/** Whether a chord suffix (as used in lesson steps) can be colored and labeled. */
export function isKnownChord(suffix: string): boolean {
  return suffix === "7alt" || !!SUFFIX_FALLBACK[suffix] || !Chord.get(`C${suffix}`).empty;
}

export function chordCore(suffix: string): number[] {
  if (suffix === "7alt") return [0, 4, 10];
  const s = SUFFIX_FALLBACK[suffix] && Chord.get(`C${suffix}`).empty ? SUFFIX_FALLBACK[suffix] : suffix;
  const c = Chord.get(`C${s || "M"}`);
  if (c.empty) return [0, 4, 7];
  return c.intervals.slice(0, 4).map((iv) => ((Interval.semitones(iv) ?? 0) % 12 + 12) % 12);
}

/** Role of a pitch against a chord built on `root`, classified by interval (so 7alt's b7 is a seventh). */
export function roleOf(midi: number, root: string, suffix: string): NoteRole {
  const chroma = Note.chroma(root) ?? 0;
  const rel = (((midi - chroma) % 12) + 12) % 12;
  if (!chordCore(suffix).includes(rel)) return "tension";
  if (rel === 0) return "root";
  if (rel <= 5) return "third";
  if (rel <= 8) return "fifth";
  return "seventh";
}

/** Readable jazz chord symbol: m7 → –7, m7b5 → ø7, b → ♭. */
export function prettyChord(root: string, suffix: string): string {
  const r = root.replace("b", "♭").replace("#", "♯");
  let s = suffix;
  const map: [RegExp, string][] = [
    [/^m7b5$/, "ø7"],
    [/^dim7$/, "°7"],
    [/^dim$/, "°"],
    [/^mMaj7$/, "–Δ7"],
    [/^maj7/, "Δ7"],
    [/^m(?!aj)/, "–"],
    [/^aug$/, "+"],
  ];
  for (const [re, rep] of map) {
    if (re.test(s)) {
      s = s.replace(re, rep);
      break;
    }
  }
  s = s.replace(/b(\d)/g, "♭$1").replace(/#(\d)/g, "♯$1");
  return `${r}${s}`;
}

/** Pitch classes of a chord in close position. */
export function chordPitchClasses(root: string, suffix: string): string[] {
  const s = Chord.get(`${root}${suffix}`);
  if (!s.empty) return s.notes;
  const fb = SUFFIX_FALLBACK[suffix];
  if (fb) return Chord.get(`${root}${fb}`).notes;
  return Chord.get(`${root}M`).notes;
}

/** MIDI voicing of a chord rooted near `rootOctave`, close position, ascending. */
export function chordVoicing(root: string, suffix: string, rootOctave = 3): number[] {
  const pcs = chordPitchClasses(root, suffix).slice(0, 4);
  const out: number[] = [];
  let prev = -Infinity;
  for (const pc of pcs) {
    let m = midiFor(pc, rootOctave);
    while (m <= prev) m += 12;
    out.push(m);
    prev = m;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Key signatures                                                      */
/* ------------------------------------------------------------------ */

/** Major key signatures, -7 (Cb) .. +7 (C#). */
const SIG_KEYS = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
const SHARP_ORDER: Letter[] = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER: Letter[] = ["B", "E", "A", "D", "G", "C", "F"];

/** Accidental each letter carries in a given major key signature. */
export function signatureMap(sigKey: string): Record<Letter, "" | "#" | "b"> {
  const idx = SIG_KEYS.indexOf(sigKey);
  const count = idx - 7;
  const map: Record<Letter, "" | "#" | "b"> = { C: "", D: "", E: "", F: "", G: "", A: "", B: "" };
  if (count > 0) SHARP_ORDER.slice(0, count).forEach((l) => (map[l] = "#"));
  if (count < 0) FLAT_ORDER.slice(0, -count).forEach((l) => (map[l] = "b"));
  return map;
}

export function signatureAccidentalCount(sigKey: string): number {
  return Math.abs(SIG_KEYS.indexOf(sigKey) - 7);
}

/**
 * Choose the key signature that shows the fewest accidentals for a set of
 * spelled pitch classes (ties break toward fewer signature accidentals).
 * D Dorian → C (no signature); G Mixolydian → C; Bb Lydian → F.
 */
export function bestKeySignature(pitchClasses: string[]): string {
  let best = "C";
  let bestScore = Infinity;
  for (const k of SIG_KEYS) {
    const map = signatureMap(k);
    let shown = 0;
    for (const pc of pitchClasses) {
      const letter = pc[0] as Letter;
      const acc = pc.slice(1);
      if (acc !== map[letter]) shown += 1;
    }
    const score = shown * 10 + signatureAccidentalCount(k);
    if (score < bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return best;
}

/** Spell a midi note for a key signature (sharps in sharp keys, flats in flat keys). */
export function spellForKey(midi: number, sigKey: string): NoteSpec {
  const map = signatureMap(sigKey);
  const flatKey = Object.values(map).includes("b");
  const sharps = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const flats = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const pc = ((midi % 12) + 12) % 12;
  // Prefer the spelling that the signature already implies.
  const candidates = [sharps[pc], flats[pc]];
  const inSig = candidates.find((c) => (c.slice(1) as "" | "#" | "b") === map[c[0] as Letter]);
  const name = inSig ?? (flatKey ? flats[pc] : sharps[pc]);
  const octave = Math.floor(midi / 12) - 1;
  return { midi, name, letter: name[0] as Letter, octave, full: `${name}${octave}` };
}
