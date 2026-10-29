import type { NoteResult, NoteSpec, RunSummary } from "@/types";

export type MatchMode = "exact-octave" | "any-octave";

export interface MatcherOptions {
  mode: MatchMode;
  /** If set, each note has an expected time (performance.now ms) for timing error. */
  expectedTimes?: number[];
}

/**
 * Walks an exercise one note at a time, comparing played MIDI notes against the
 * expected sequence. Emits per-note results and a final summary.
 */
export class Matcher {
  private seq: NoteSpec[];
  private mode: MatchMode;
  private expectedTimes?: number[];
  private index = 0;
  private results: NoteResult[] = [];
  private targetSince = performance.now();
  private startedAt = performance.now();
  private wrongOnCurrent = false;

  constructor(seq: NoteSpec[], opts: MatcherOptions) {
    this.seq = seq;
    this.mode = opts.mode;
    this.expectedTimes = opts.expectedTimes;
  }

  get currentIndex(): number {
    return this.index;
  }

  get total(): number {
    return this.seq.length;
  }

  get done(): boolean {
    return this.index >= this.seq.length;
  }

  get expected(): NoteSpec | null {
    return this.seq[this.index] ?? null;
  }

  reset() {
    this.index = 0;
    this.results = [];
    this.startedAt = performance.now();
    this.targetSince = this.startedAt;
    this.wrongOnCurrent = false;
  }

  private matches(played: number, expected: NoteSpec): boolean {
    if (this.mode === "exact-octave") return played === expected.midi;
    return ((played % 12) + 12) % 12 === ((expected.midi % 12) + 12) % 12;
  }

  /**
   * Feed a played note. Returns:
   *  - "correct": advanced to the next note
   *  - "wrong": wrong note (stays on current target)
   *  - "done": this was the final correct note
   *  - "idle": nothing expected
   */
  press(played: number, velocity: number, time = performance.now()):
    | "correct"
    | "wrong"
    | "done"
    | "idle" {
    const expected = this.expected;
    if (!expected) return "idle";

    if (this.matches(played, expected)) {
      const result: NoteResult = {
        expected,
        played,
        correct: !this.wrongOnCurrent,
        reactionMs: time - this.targetSince,
        velocity,
      };
      if (this.expectedTimes && this.expectedTimes[this.index] != null) {
        result.timingErrMs = time - this.expectedTimes[this.index];
      }
      this.results.push(result);
      this.index += 1;
      this.targetSince = time;
      this.wrongOnCurrent = false;
      return this.done ? "done" : "correct";
    }

    this.wrongOnCurrent = true;
    return "wrong";
  }

  getResults(): NoteResult[] {
    return [...this.results];
  }

  summarize(): RunSummary {
    const finishedAt = performance.now();
    const total = this.results.length;
    const correct = this.results.filter((r) => r.correct).length;
    const reactions = this.results.map((r) => r.reactionMs);
    const timings = this.results
      .map((r) => r.timingErrMs)
      .filter((t): t is number => t != null);
    const vels = this.results
      .map((r) => r.velocity)
      .filter((v): v is number => v != null);

    const mean = (xs: number[]) =>
      xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    const avgVel = mean(vels);
    const velStdev = vels.length
      ? Math.sqrt(mean(vels.map((v) => (v - avgVel) ** 2)))
      : 0;

    return {
      total,
      correct,
      accuracy: total ? correct / total : 0,
      avgReactionMs: mean(reactions),
      avgTimingErrMs: timings.length ? mean(timings.map(Math.abs)) : undefined,
      avgVelocity: vels.length ? avgVel : undefined,
      velocityStdev: vels.length ? velStdev : undefined,
      startedAt: this.startedAt,
      finishedAt,
    };
  }
}
