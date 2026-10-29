/**
 * The transport: a lookahead scheduler on the shared audio clock that drives
 * the count-in, the click, the backing (pad / walking bass / hi-hat), and any
 * scripted "call" hits. Everything that scores timing reads `beatTime()`.
 */
import { Note } from "tonal";
import { getAudioContext } from "@/audio/context";
import { bass, hat, pad, ride, woodblock } from "@/audio/backing";
import { chordVoicing, chordPitchClasses } from "@/theory/engine";
import type { ChordMark } from "@/types";

export type ClickPattern = "all" | "2&4" | "4" | "gap" | "off";

export interface TransportConfig {
  bpm: number;
  beatsPerBar?: number;
  /** Count-in beats before beat 0 (always clicked). */
  countInBeats?: number;
  click: ClickPattern;
  /** For the "gap" pattern: bars on, then the same number of bars off. */
  gapBars?: number;
  /** Exercise length in beats. The transport stops itself after this. */
  totalBeats: number;
  chords?: ChordMark[];
  drone?: boolean;
  walkingBass?: boolean;
  /** Scripted woodblock hits (call-and-response, demo rhythms), in beats. */
  calls?: { beat: number; accent?: boolean; high?: boolean }[];
  /** Extra beats to keep running after the exercise (to catch late notes). */
  tailBeats?: number;
  onEnd?: () => void;
}

type BeatListener = (beat: number, time: number) => void;

export function clickOnBeat(pattern: ClickPattern, beat: number, beatsPerBar: number, gapBars = 2): boolean {
  if (beat < 0) return true;
  const inBar = ((beat % beatsPerBar) + beatsPerBar) % beatsPerBar;
  switch (pattern) {
    case "all":
      return true;
    case "2&4":
      return inBar === 1 || inBar === 3;
    case "4":
      return inBar === 3;
    case "gap": {
      const bar = Math.floor(beat / beatsPerBar);
      return Math.floor(bar / gapBars) % 2 === 0;
    }
    case "off":
      return false;
  }
}

/** Build a simple walking bass line (one note per beat) over chord marks. */
export function walkingLine(chords: ChordMark[], totalBeats: number): (number | null)[] {
  const line: (number | null)[] = new Array(Math.ceil(totalBeats)).fill(null);
  if (!chords.length) return line;
  const sorted = [...chords].sort((a, b) => a.beat - b.beat);
  const toBass = (pc: string) => {
    const chroma = Note.chroma(pc) ?? 0;
    let m = 36 + chroma; // C2..B2
    if (m < 40) m += 12; // keep above E2
    return m;
  };
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    const start = Math.max(0, Math.floor(c.beat));
    const end = Math.min(line.length, Math.floor(sorted[i + 1]?.beat ?? totalBeats));
    const pcs = chordPitchClasses(c.root, c.suffix);
    const root = toBass(c.root);
    const tones = pcs.map(toBass).map((m) => (m < root ? m + 12 : m));
    const nextRoot = sorted[i + 1] ? toBass(sorted[i + 1].root) : root;
    for (let b = start; b < end; b++) {
      const k = b - start;
      const last = b === end - 1 && end - start > 1;
      if (k === 0) line[b] = root;
      else if (last) line[b] = nextRoot + (nextRoot > root ? -1 : 1);
      else line[b] = tones[(k % (tones.length - 1)) + 1] ?? root + 7;
    }
  }
  return line;
}

class Transport {
  private running = false;
  private timer: number | null = null;
  private cfg: TransportConfig | null = null;
  private nextBeat = 0;
  private callIdx = 0;
  private bassLine: (number | null)[] = [];
  private beatListeners = new Set<BeatListener>();
  private visualTimers: number[] = [];
  t0 = 0;
  spb = 0.75;

  get isRunning() {
    return this.running;
  }

  /** Audio-clock time of a (possibly fractional) beat. */
  beatTime(beat: number): number {
    return this.t0 + beat * this.spb;
  }

  onBeat(l: BeatListener): () => void {
    this.beatListeners.add(l);
    return () => this.beatListeners.delete(l);
  }

  /** Start; returns the audio time of beat 0 (after the count-in). */
  start(cfg: TransportConfig): number {
    this.stop();
    const ctx = getAudioContext();
    this.cfg = cfg;
    this.spb = 60 / cfg.bpm;
    const countIn = cfg.countInBeats ?? 4;
    this.t0 = ctx.currentTime + 0.12 + countIn * this.spb;
    this.nextBeat = -countIn;
    this.callIdx = 0;
    this.bassLine = cfg.walkingBass && cfg.chords ? walkingLine(cfg.chords, cfg.totalBeats) : [];
    this.running = true;
    this.schedulePads();
    this.tick();
    return this.t0;
  }

  stop() {
    this.running = false;
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = null;
    this.visualTimers.forEach((t) => clearTimeout(t));
    this.visualTimers = [];
  }

  private schedulePads() {
    const cfg = this.cfg!;
    if (!cfg.drone || !cfg.chords?.length) return;
    const sorted = [...cfg.chords].sort((a, b) => a.beat - b.beat);
    sorted.forEach((c, i) => {
      const startB = c.beat;
      const endB = sorted[i + 1]?.beat ?? cfg.totalBeats;
      const voicing = chordVoicing(c.root, c.suffix, 3).map((m) => (m > 64 ? m - 12 : m));
      pad(voicing, this.beatTime(startB), this.beatTime(endB), 1);
    });
  }

  private tick = () => {
    if (!this.running || !this.cfg) return;
    const cfg = this.cfg;
    const ctx = getAudioContext();
    const bpb = cfg.beatsPerBar ?? 4;
    const horizon = ctx.currentTime + 0.12;
    const endBeat = cfg.totalBeats + (cfg.tailBeats ?? 1);

    while (this.running && this.beatTime(this.nextBeat) < horizon) {
      const b = this.nextBeat;
      const t = this.beatTime(b);
      if (b >= endBeat) {
        this.running = false;
        const done = cfg.onEnd;
        const wait = Math.max(0, (t - ctx.currentTime) * 1000);
        this.timer = window.setTimeout(() => done?.(), wait);
        return;
      }
      const inBar = ((b % bpb) + bpb) % bpb;
      if (b < cfg.totalBeats || b < 0) {
        if (clickOnBeat(cfg.click, b, bpb, cfg.gapBars)) woodblock(t, inBar === 0 && (b < 0 || cfg.click === "all" || cfg.click === "gap"));
        if (b >= 0 && cfg.walkingBass) {
          ride(t, 0.8);
          if (inBar === 1 || inBar === 3) hat(t);
          const n = this.bassLine[b];
          if (n != null) bass(n, t, this.spb * 0.95);
        }
      }
      const wait = Math.max(0, (t - ctx.currentTime) * 1000);
      this.visualTimers.push(
        window.setTimeout(() => this.beatListeners.forEach((l) => l(b, t)), wait)
      );
      if (this.visualTimers.length > 64) this.visualTimers.splice(0, 32);
      this.nextBeat += 1;
    }

    const calls = cfg.calls ?? [];
    while (this.callIdx < calls.length && this.beatTime(calls[this.callIdx].beat) < horizon) {
      const c = calls[this.callIdx];
      woodblock(this.beatTime(c.beat), !!c.high || !!c.accent, c.accent ? 1.2 : 0.9);
      this.callIdx += 1;
    }

    this.timer = window.setTimeout(this.tick, 25);
  };
}

export const transport = new Transport();
