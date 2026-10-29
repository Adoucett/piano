/**
 * Rhythm & time drills. Every drill is a list of onsets on the beat grid; the
 * matcher scores timing only (any key counts, or a hand for polyrhythms).
 */
import type { NoteSpec } from "@/types";
import type { ClickPattern } from "@/practice/transport";

export type RhythmKind = "pulse" | "subdivision" | "swing" | "accents" | "poly" | "tap" | "call";

export interface Onset {
  beat: number;
  hand?: "L" | "R";
  accent?: boolean;
}

export interface RhythmDrill {
  id: string;
  title: string;
  description: string;
  tier: number;
  kind: RhythmKind;
  bpm: number;
  bars: number;
  click: ClickPattern;
  gapBars?: number;
  /** Apply the user's swing ratio to off-beat eighths. */
  swing?: boolean;
  /** Onsets for one bar (beats 0..4), or a generator per bar index. */
  bar: Onset[] | ((barIndex: number) => Onset[]);
  /** Bars where the app plays (woodblock) and you listen: call-and-response. */
  callBars?: (barIndex: number) => boolean;
  /** Show the rhythm in notation (tap drills). */
  notated?: boolean;
  /** Tip shown before starting. */
  coach: string;
}

const range = (n: number, step: number, start = 0) => Array.from({ length: n }, (_, i) => start + i * step);
const ons = (beats: number[], extra: Partial<Onset> = {}): Onset[] => beats.map((beat) => ({ beat, ...extra }));

const CALLS: number[][] = [
  [0, 1, 1.5, 2.5, 3],
  [0.5, 1, 2, 3.5],
  [0, 1.5, 2, 3],
  [0, 0.5, 1.5, 2.5, 3.5],
  [1, 1.5, 2.5, 3],
  [0, 2, 2.5, 3.5],
];

export const RHYTHM_DRILLS: RhythmDrill[] = [
  // Tier 1: pulse
  {
    id: "pulse-quarters",
    title: "Quarter-note pulse",
    description: "Lock to the click. Any key.",
    tier: 1,
    kind: "pulse",
    bpm: 80,
    bars: 4,
    click: "all",
    bar: ons(range(4, 1)),
    coach: "Play with the click, not after it. Aim for the sound of one note.",
  },
  {
    id: "pulse-eighths",
    title: "Straight eighths",
    description: "Two even notes per click.",
    tier: 1,
    kind: "pulse",
    bpm: 80,
    bars: 4,
    click: "all",
    bar: ons(range(8, 0.5)),
    coach: "Evenness first: the 'and' sits exactly halfway.",
  },
  {
    id: "pulse-2-4",
    title: "Click on 2 & 4",
    description: "Quarters with the click only on the backbeat.",
    tier: 1,
    kind: "pulse",
    bpm: 96,
    bars: 8,
    click: "2&4",
    bar: ons(range(4, 1)),
    coach: "Feel the click as the hi-hat. Beat 1 is yours.",
  },
  // Tier 2: subdivisions
  {
    id: "triplets",
    title: "Eighth-note triplets",
    description: "Three per beat.",
    tier: 2,
    kind: "subdivision",
    bpm: 72,
    bars: 4,
    click: "all",
    bar: ons(range(12, 1 / 3)),
    coach: "Count 'tri-pl-et'. Don't let the third one rush into the beat.",
  },
  {
    id: "sixteenths",
    title: "Sixteenths",
    description: "Four per beat.",
    tier: 2,
    kind: "subdivision",
    bpm: 66,
    bars: 4,
    click: "all",
    bar: ons(range(16, 0.25)),
    coach: "Light and even. Let the wrist do less than you think.",
  },
  {
    id: "subdivision-ladder",
    title: "Subdivision ladder",
    description: "Quarters → eighths → triplets → sixteenths, one bar each.",
    tier: 2,
    kind: "subdivision",
    bpm: 72,
    bars: 8,
    click: "all",
    bar: (b) => ons(range([4, 8, 12, 16][b % 4], [1, 0.5, 1 / 3, 0.25][b % 4])),
    coach: "The beat never moves; only the grid inside it does.",
  },
  // Tier 3: swing and space
  {
    id: "swing-eighths",
    title: "Swung eighths",
    description: "Long-short, click on 2 & 4. Uses your swing setting.",
    tier: 3,
    kind: "swing",
    bpm: 132,
    bars: 8,
    click: "2&4",
    swing: true,
    bar: ons(range(8, 0.5)),
    coach: "Swing is a ratio, not a rhythm. Keep the downbeats dead on the grid.",
  },
  {
    id: "click-on-4",
    title: "Click on 4 only",
    description: "Quarter notes, with a single click on beat 4 of each bar.",
    tier: 3,
    kind: "swing",
    bpm: 120,
    bars: 8,
    click: "4",
    bar: ons(range(4, 1)),
    coach: "Hear the whole bar between clicks. Don't drift ahead of it.",
  },
  {
    id: "ballad-swing",
    title: "Ballad swing",
    description: "Swung eighths at 60. The space is the hard part.",
    tier: 3,
    kind: "swing",
    bpm: 60,
    bars: 4,
    click: "2&4",
    swing: true,
    bar: ons(range(8, 0.5)),
    coach: "At a slow tempo the triplet feel has to come from you. Subdivide in threes.",
  },
  {
    id: "gap-click",
    title: "Disappearing click",
    description: "Two bars with the click, two bars without.",
    tier: 3,
    kind: "pulse",
    bpm: 100,
    bars: 8,
    click: "gap",
    gapBars: 2,
    bar: ons(range(8, 0.5)),
    coach: "When the click drops out, you are the time. Land the return exactly.",
  },
  // Tier 4: displacement and groupings
  {
    id: "offbeats",
    title: "Off-beats only",
    description: "Play only the 'ands'.",
    tier: 4,
    kind: "accents",
    bpm: 100,
    bars: 4,
    click: "all",
    bar: ons(range(4, 1, 0.5)),
    coach: "Hear the click as the downbeat and answer it. Don't flip the beat.",
  },
  {
    id: "groups-of-3",
    title: "3 over 4 accents",
    description: "Eighths, accenting every third note.",
    tier: 4,
    kind: "accents",
    bpm: 96,
    bars: 6,
    click: "all",
    bar: (b) => range(8, 0.5).map((beat, i) => ({ beat, accent: (b * 8 + i) % 3 === 0 })),
    coach: "The accents cycle against the bar and come home every three bars.",
  },
  {
    id: "groups-of-5",
    title: "Groupings of 5",
    description: "Sixteenths accented in fives.",
    tier: 4,
    kind: "accents",
    bpm: 66,
    bars: 5,
    click: "all",
    bar: (b) => range(16, 0.25).map((beat, i) => ({ beat, accent: (b * 16 + i) % 5 === 0 })),
    coach: "Count 1-2-3-4-5 against the click. The accent should be louder, not earlier.",
  },
  {
    id: "charleston",
    title: "Charleston",
    description: "Beat 1 and the 'and' of 2. The comping rhythm.",
    tier: 4,
    kind: "accents",
    bpm: 120,
    bars: 8,
    click: "2&4",
    bar: ons([0, 1.5]),
    coach: "Short and placed. This is the rhythm under half the standards you know.",
  },
  // Tier 5: polyrhythm, tapping, call-and-response
  {
    id: "poly-3-2",
    title: "3 against 2",
    description: "Left hand three, right hand two, per half bar.",
    tier: 5,
    kind: "poly",
    bpm: 60,
    bars: 4,
    click: "all",
    bar: [
      ...[0, 1, 2, 3].map((beat) => ({ beat, hand: "R" as const })),
      ...[0, 2 / 3, 4 / 3, 2, 8 / 3, 10 / 3].map((beat) => ({ beat, hand: "L" as const })),
    ],
    coach: "Say 'not diff-i-cult'. Left hand below middle C, right above.",
  },
  {
    id: "poly-4-3",
    title: "4 against 3",
    description: "Right hand four, left hand three, per bar.",
    tier: 5,
    kind: "poly",
    bpm: 54,
    bars: 4,
    click: "all",
    bar: [
      ...[0, 1, 2, 3].map((beat) => ({ beat, hand: "R" as const })),
      ...[0, 4 / 3, 8 / 3].map((beat) => ({ beat, hand: "L" as const })),
    ],
    coach: "The left hand plays half-note triplets: three even notes across the bar. Left below middle C, right above.",
  },
  {
    id: "uptempo-swing",
    title: "Up-tempo swing",
    description: "Eighths at 220, click on 2 & 4. The ratio flattens as it gets faster.",
    tier: 5,
    kind: "swing",
    bpm: 220,
    bars: 8,
    click: "2&4",
    swing: true,
    bar: ons(range(8, 0.5)),
    coach: "Relax the hand and accent the off-beats lightly. Evenness beats swing ratio up here.",
  },
  {
    id: "tap-notated",
    title: "Read and tap",
    description: "Tap the written rhythm.",
    tier: 5,
    kind: "tap",
    bpm: 84,
    bars: 4,
    click: "all",
    notated: true,
    bar: (b) => ons([[0, 1, 1.5, 3], [0, 1.5, 2, 3], [0.5, 1, 2, 3.5], [0, 1, 2]][b % 4]),
    coach: "Read a bar ahead. Rests are as exact as notes.",
  },
  {
    id: "call-response",
    title: "Call and response",
    description: "The woodblock plays a bar; you answer it.",
    tier: 5,
    kind: "call",
    bpm: 100,
    bars: 8,
    click: "2&4",
    callBars: (b) => b % 2 === 0,
    bar: (b) => ons(CALLS[Math.floor(b / 2) % CALLS.length]),
    coach: "Listen once, play it back in the next bar. Copy the placement exactly.",
  },
];

export const RHYTHM_BY_ID: Record<string, RhythmDrill> = Object.fromEntries(RHYTHM_DRILLS.map((d) => [d.id, d]));

export function getRhythmDrill(id: string): RhythmDrill {
  const d = RHYTHM_BY_ID[id];
  if (!d) throw new Error(`Unknown rhythm drill: ${id}`);
  return d;
}

/** Apply swing to an off-beat eighth: beat x.5 → x + ratio. */
export function swingBeat(beat: number, ratio: number): number {
  const frac = beat - Math.floor(beat);
  if (Math.abs(frac - 0.5) < 1e-6) return Math.floor(beat) + ratio;
  return beat;
}

export interface BuiltRhythm {
  notes: NoteSpec[];
  /** Expected (possibly swung) beat positions, aligned with notes. */
  playBeats: number[];
  /** Woodblock calls the app plays. */
  calls: { beat: number; accent?: boolean }[];
  totalBeats: number;
}

/** Expand a drill into timed notes (only the bars you play) and the app's calls. */
export function buildRhythm(drill: RhythmDrill, swingRatio: number): BuiltRhythm {
  const notes: NoteSpec[] = [];
  const playBeats: number[] = [];
  const calls: { beat: number; accent?: boolean }[] = [];
  for (let b = 0; b < drill.bars; b++) {
    const bar = typeof drill.bar === "function" ? drill.bar(b) : drill.bar;
    const isCall = drill.callBars?.(b) ?? false;
    const sorted = [...bar].sort((x, y) => x.beat - y.beat);
    for (let i = 0; i < sorted.length; i++) {
      const o = sorted[i];
      const beat = b * 4 + o.beat;
      if (isCall) {
        calls.push({ beat: drill.swing ? swingBeat(beat, swingRatio) : beat, accent: o.accent });
        continue;
      }
      const next = sorted[i + 1]?.beat ?? 4;
      notes.push({
        midi: o.hand === "L" ? 48 : 72,
        name: "B",
        letter: "B",
        octave: 4,
        full: "B4",
        beat,
        beats: Math.max(0.25, next - o.beat),
        hand: o.hand,
        accent: o.accent,
      });
      playBeats.push(drill.swing ? swingBeat(beat, swingRatio) : beat);
    }
  }
  // Sort by expected time (polyrhythm hands interleave).
  const order = notes.map((_, i) => i).sort((a, b) => playBeats[a] - playBeats[b]);
  return {
    notes: order.map((i) => notes[i]),
    playBeats: order.map((i) => playBeats[i]),
    calls,
    totalBeats: drill.bars * 4,
  };
}
