import type { NoteResult, NoteSpec, NoteStatus, RunSummary } from "@/types";

export type MatchMode = "exact-octave" | "any-octave";
/** How a played note is compared to the written one. */
export type PitchMode = "exact" | "pc" | "any" | "hand";

export interface MatcherOptions {
  mode: "wait" | "tempo";
  pitch: PitchMode;
  /** Tempo mode: audio-clock onset (seconds) of every note. */
  times?: number[];
  /** Written beat position of each note (for swing measurement). */
  beats?: number[];
  /** Half-width of the hit window, seconds. Defaults from the note spacing. */
  window?: number;
  bpm?: number;
  beatsPerBar?: number;
}

export type PressKind = "hit" | "wrong" | "done" | "extra" | "idle";

export interface PressResult {
  kind: PressKind;
  index?: number;
  errorMs?: number;
}

export interface PlayedEvent {
  time: number;
  midi: number;
  kind: "hit" | "wrong" | "extra";
  index?: number;
}

type Slot = "pending" | NoteStatus;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stdev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Default half-window: 45% of the tightest note spacing, clamped to 70–150 ms. */
export function defaultWindow(times: number[]): number {
  let minGap = Infinity;
  for (let i = 1; i < times.length; i++) minGap = Math.min(minGap, times[i] - times[i - 1]);
  if (!isFinite(minGap)) return 0.15;
  return Math.max(0.07, Math.min(0.15, minGap * 0.45));
}

/**
 * Scores a run. In wait mode it walks note by note (no clock). In tempo mode
 * each written note owns a time window on the beat grid; a played note snaps
 * to the nearest open window, and windows that pass unplayed become misses.
 */
export class Matcher {
  private seq: NoteSpec[];
  private opts: MatcherOptions;
  private slots: Slot[];
  private wrongFlag: boolean[];
  private playedMidi: (number | undefined)[];
  private playedTime: (number | undefined)[];
  private velocity: (number | undefined)[];
  private reaction: number[];
  private index = 0;
  private targetSince = 0;
  private startedAt = Date.now();
  private extras = 0;
  readonly events: PlayedEvent[] = [];
  readonly window: number;

  constructor(seq: NoteSpec[], opts: MatcherOptions) {
    this.seq = seq;
    this.opts = opts;
    this.slots = seq.map(() => "pending");
    this.wrongFlag = seq.map(() => false);
    this.playedMidi = seq.map(() => undefined);
    this.playedTime = seq.map(() => undefined);
    this.velocity = seq.map(() => undefined);
    this.reaction = seq.map(() => 0);
    this.window = opts.window ?? (opts.times ? defaultWindow(opts.times) : 0.15);
  }

  get total() {
    return this.seq.length;
  }

  get mode() {
    return this.opts.mode;
  }

  /** Wait mode: index of the current target. Tempo mode: first unresolved note. */
  get currentIndex(): number {
    if (this.opts.mode === "wait") return this.index;
    const i = this.slots.indexOf("pending");
    return i < 0 ? this.seq.length : i;
  }

  get done(): boolean {
    return this.opts.mode === "wait" ? this.index >= this.seq.length : !this.slots.includes("pending");
  }

  status(i: number): Slot {
    return this.slots[i];
  }

  wasWrong(i: number): boolean {
    return this.wrongFlag[i];
  }

  /** Start the reaction clock (wait mode) at `now` (seconds). */
  begin(now: number) {
    this.targetSince = now;
    this.startedAt = Date.now();
  }

  private matches(played: number, expected: NoteSpec): boolean {
    switch (this.opts.pitch) {
      case "exact":
        return played === expected.midi;
      case "pc":
        return ((played % 12) + 12) % 12 === ((expected.midi % 12) + 12) % 12;
      case "any":
        return true;
      case "hand":
        return expected.hand === "L" ? played < 60 : expected.hand === "R" ? played >= 60 : true;
    }
  }

  /** Feed a played note-on. `time` is audio-clock seconds. */
  press(played: number, velocity: number, time: number): PressResult {
    return this.opts.mode === "wait" ? this.pressWait(played, velocity, time) : this.pressTempo(played, velocity, time);
  }

  private pressWait(played: number, velocity: number, time: number): PressResult {
    const i = this.index;
    const expected = this.seq[i];
    if (!expected) return { kind: "idle" };
    if (this.matches(played, expected)) {
      this.slots[i] = this.wrongFlag[i] ? "wrong" : "hit";
      this.playedMidi[i] = played;
      this.playedTime[i] = time;
      this.velocity[i] = velocity;
      this.reaction[i] = Math.max(0, (time - this.targetSince) * 1000);
      this.events.push({ time, midi: played, kind: "hit", index: i });
      this.index += 1;
      this.targetSince = time;
      return { kind: this.done ? "done" : "hit", index: i };
    }
    this.wrongFlag[i] = true;
    this.playedMidi[i] = played;
    this.events.push({ time, midi: played, kind: "wrong", index: i });
    return { kind: "wrong", index: i };
  }

  private pressTempo(played: number, velocity: number, time: number): PressResult {
    const times = this.opts.times!;
    const w = this.window;
    let bestHit = -1;
    let bestHitDist = Infinity;
    let nearest = -1;
    let nearestDist = Infinity;
    for (let i = 0; i < this.seq.length; i++) {
      if (this.slots[i] !== "pending") continue;
      const d = Math.abs(time - times[i]);
      if (d > w) {
        if (times[i] > time + w) break;
        continue;
      }
      if (d < nearestDist) {
        nearest = i;
        nearestDist = d;
      }
      if (this.matches(played, this.seq[i]) && d < bestHitDist) {
        bestHit = i;
        bestHitDist = d;
      }
    }
    if (bestHit >= 0) {
      const i = bestHit;
      this.slots[i] = this.wrongFlag[i] ? "wrong" : "hit";
      this.playedMidi[i] = played;
      this.playedTime[i] = time;
      this.velocity[i] = velocity;
      const errorMs = (time - times[i]) * 1000;
      this.events.push({ time, midi: played, kind: "hit", index: i });
      return { kind: this.done ? "done" : "hit", index: i, errorMs };
    }
    if (nearest >= 0) {
      this.wrongFlag[nearest] = true;
      this.playedMidi[nearest] = played;
      this.events.push({ time, midi: played, kind: "wrong", index: nearest });
      return { kind: "wrong", index: nearest };
    }
    this.extras += 1;
    this.events.push({ time, midi: played, kind: "extra" });
    return { kind: "extra" };
  }

  /** Tempo mode: close windows that have passed. Returns indices that just resolved as misses. */
  tick(now: number): number[] {
    if (this.opts.mode !== "tempo" || !this.opts.times) return [];
    const out: number[] = [];
    const times = this.opts.times;
    for (let i = 0; i < this.seq.length; i++) {
      if (this.slots[i] !== "pending") continue;
      if (now > times[i] + this.window) {
        this.slots[i] = this.wrongFlag[i] ? "wrong" : "missed";
        out.push(i);
      } else if (times[i] > now) break;
    }
    return out;
  }

  /** Resolve everything still pending (e.g. the user stopped early). */
  finish() {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] === "pending") this.slots[i] = this.wrongFlag[i] ? "wrong" : "missed";
    }
  }

  getResults(): NoteResult[] {
    const times = this.opts.times;
    return this.seq.map((expected, i) => {
      const slot = this.slots[i];
      const status: NoteStatus = slot === "pending" ? "missed" : slot;
      const t = this.playedTime[i];
      return {
        index: i,
        expected,
        status,
        played: this.playedMidi[i],
        correct: status === "hit",
        reactionMs: this.reaction[i],
        errorMs: times && t != null && status !== "missed" ? (t - times[i]) * 1000 : undefined,
        velocity: this.velocity[i],
        time: t,
      };
    });
  }

  summarize(): RunSummary {
    const results = this.getResults();
    const total = results.length;
    const correct = results.filter((r) => r.correct).length;
    const wrong = results.filter((r) => r.status === "wrong").length;
    const missed = results.filter((r) => r.status === "missed").length;
    const vels = results.map((r) => r.velocity).filter((v): v is number => v != null);
    const bpm = this.opts.bpm ?? 0;
    const base: RunSummary = {
      total,
      correct,
      accuracy: total ? correct / total : 0,
      wrong,
      missed,
      extras: this.extras,
      mode: this.opts.mode,
      bpm,
      avgReactionMs: mean(results.filter((r) => r.time != null).map((r) => r.reactionMs)),
      avgVelocity: vels.length ? mean(vels) : undefined,
      velocityStdev: vels.length ? stdev(vels) : undefined,
      startedAt: this.startedAt,
      finishedAt: Date.now(),
    };
    if (this.opts.mode !== "tempo" || !this.opts.times) return base;
    return { ...base, ...timingStats(results, this.opts.times, this.opts.beats, bpm, this.opts.beatsPerBar ?? 4) };
  }
}

/** Timing statistics for a tempo-mode run. Exported for tests and the rhythm trainer. */
export function timingStats(
  results: NoteResult[],
  times: number[],
  beats: number[] | undefined,
  bpm: number,
  beatsPerBar = 4
): Pick<RunSummary, "meanAbsErrorMs" | "biasMs" | "ioiCv" | "swingRatio" | "driftMsPerBar"> {
  const timed = results.filter((r) => r.errorMs != null && r.time != null);
  const errs = timed.map((r) => r.errorMs!);
  const out: ReturnType<typeof timingStats> = {};
  if (!errs.length) return out;
  out.meanAbsErrorMs = mean(errs.map(Math.abs));
  out.biasMs = mean(errs);

  // Evenness: ratio of played to written inter-onset intervals.
  const ratios: number[] = [];
  for (let i = 0; i + 1 < results.length; i++) {
    const a = results[i];
    const b = results[i + 1];
    if (a.time == null || b.time == null || a.errorMs == null || b.errorMs == null) continue;
    const written = times[i + 1] - times[i];
    if (written <= 0) continue;
    ratios.push((b.time - a.time) / written);
  }
  if (ratios.length >= 3) {
    const m = mean(ratios);
    out.ioiCv = m > 0 ? stdev(ratios) / m : undefined;
  }

  // Swing: on-beat, off-beat, next on-beat triples.
  if (beats) {
    const sw: number[] = [];
    for (let i = 0; i + 2 < results.length; i++) {
      const b0 = beats[i];
      if (Math.abs(b0 - Math.round(b0)) > 1e-6) continue;
      if (Math.abs(beats[i + 1] - (b0 + 0.5)) > 1e-6 || Math.abs(beats[i + 2] - (b0 + 1)) > 1e-6) continue;
      const [x, y, z] = [results[i].time, results[i + 1].time, results[i + 2].time];
      if (x == null || y == null || z == null || z <= x) continue;
      if (results[i + 1].errorMs == null) continue;
      sw.push((y - x) / (z - x));
    }
    if (sw.length >= 2) out.swingRatio = median(sw);
  }

  // Drift: slope of signed error over time, in ms per bar.
  if (timed.length >= 4 && bpm > 0) {
    const xs = timed.map((r) => times[r.index]);
    const ys = errs;
    const mx = mean(xs);
    const my = mean(ys);
    let num = 0;
    let den = 0;
    for (let i = 0; i < xs.length; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    if (den > 0) {
      const msPerSec = num / den;
      out.driftMsPerBar = msPerSec * (60 / bpm) * beatsPerBar;
    }
  }
  return out;
}
