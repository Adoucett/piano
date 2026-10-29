import { describe, it, expect } from "vitest";
import { Matcher, defaultWindow, timingStats } from "./matcher";
import { buildExercise } from "@/exercises/patterns";
import { applyRun, runTier } from "./mastery";
import type { NoteSpec, RunSummary } from "@/types";

const cMajor = () =>
  buildExercise({ scaleId: "major", key: "C", patternId: "ascending", octaves: 1, source: { kind: "library" } }).notes;

describe("Matcher, wait mode", () => {
  it("advances on correct notes and flags wrong ones", () => {
    const seq = cMajor();
    const m = new Matcher(seq, { mode: "wait", pitch: "exact" });
    m.begin(0);
    expect(m.press(60, 80, 0.5).kind).toBe("hit");
    expect(m.press(63, 80, 1.0).kind).toBe("wrong");
    expect(m.press(62, 80, 1.2).kind).toBe("hit");
    expect(m.currentIndex).toBe(2);
    seq.slice(2).forEach((n, i) => m.press(n.midi, 80, 2 + i));
    expect(m.done).toBe(true);
    const s = m.summarize();
    expect(s.correct).toBe(seq.length - 1);
    expect(s.wrong).toBe(1);
  });

  it("pitch-class mode accepts any octave", () => {
    const m = new Matcher(cMajor(), { mode: "wait", pitch: "pc" });
    expect(m.press(48, 80, 0).kind).toBe("hit");
  });
});

describe("Matcher, tempo mode", () => {
  const seq: NoteSpec[] = cMajor();
  const spb = 0.5;
  const times = seq.map((_, i) => 1 + i * spb * 0.5);

  it("snaps presses to the nearest open window and reports signed error", () => {
    const m = new Matcher(seq, { mode: "tempo", pitch: "exact", times, bpm: 120 });
    const r = m.press(60, 80, times[0] + 0.02);
    expect(r.kind).toBe("hit");
    expect(Math.round(r.errorMs!)).toBe(20);
  });

  it("marks passed windows as missed", () => {
    const m = new Matcher(seq, { mode: "tempo", pitch: "exact", times, bpm: 120 });
    const missed = m.tick(times[1] + m.window + 0.001);
    expect(missed).toEqual([0, 1]);
    expect(m.status(0)).toBe("missed");
  });

  it("an unexpected press outside any window is an extra", () => {
    const m = new Matcher(seq, { mode: "tempo", pitch: "exact", times, bpm: 120 });
    expect(m.press(60, 80, 0).kind).toBe("extra");
  });

  it("window is 45% of the tightest gap, clamped", () => {
    expect(defaultWindow([0, 0.2, 0.4])).toBeCloseTo(0.09);
    expect(defaultWindow([0, 0.05])).toBeCloseTo(0.07);
    expect(defaultWindow([0, 1])).toBeCloseTo(0.15);
  });
});

describe("timingStats", () => {
  it("measures bias, swing ratio and drift", () => {
    const beats = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
    const spb = 0.5;
    const times = beats.map((b) => b * spb);
    // Played swung at 2:1 and 10 ms late on everything.
    const played = beats.map((b) => {
      const off = b % 1 ? (Math.floor(b) + 2 / 3) * spb : b * spb;
      return off + 0.01;
    });
    const results = beats.map((_, i) => ({
      index: i,
      expected: { midi: 60 } as NoteSpec,
      status: "hit" as const,
      played: 60,
      correct: true,
      reactionMs: 0,
      errorMs: (played[i] - times[i]) * 1000,
      time: played[i],
    }));
    const st = timingStats(results, times, beats, 120, 4);
    expect(st.swingRatio!).toBeCloseTo(2 / 3, 2);
    expect(st.biasMs!).toBeGreaterThan(10);
  });
});

describe("mastery", () => {
  const summary = (over: Partial<RunSummary>): RunSummary => ({
    total: 16,
    correct: 16,
    accuracy: 1,
    wrong: 0,
    missed: 0,
    extras: 0,
    mode: "tempo",
    bpm: 132,
    avgReactionMs: 0,
    meanAbsErrorMs: 18,
    ioiCv: 0.05,
    startedAt: 0,
    finishedAt: 1,
    ...over,
  });

  it("wait-mode accuracy only reaches Learned", () => {
    expect(runTier("exercise", summary({ mode: "wait", meanAbsErrorMs: undefined }))).toBe(1);
  });

  it("an accurate, tight run at tempo is Secure", () => {
    expect(runTier("exercise", summary({}))).toBe(2);
  });

  it("Fluent needs a second qualifying run later", () => {
    const fast = summary({ bpm: 168, meanAbsErrorMs: 15, ioiCv: 0.04 });
    const first = applyRun(undefined, "exercise", fast, 0);
    expect(first.next.tier).toBeLessThan(3);
    expect(first.fluentPending).toBe(true);
    const later = applyRun(first.next, "exercise", fast, 49 * 3_600_000);
    expect(later.next.tier).toBe(3);
  });
});
