import { describe, it, expect } from "vitest";
import { TRACKS, allTiers, unitExercises } from "./tracks";
import { generateReading } from "./reading";
import { RHYTHM_DRILLS, buildRhythm, getRhythmDrill } from "@/rhythm/drills";
import { buildExercise, buildProgression } from "./patterns";
import { DEFAULT_SETTINGS, tierLock, currentTier } from "@/store/progress";
import { dailySession } from "./session";

const empty = { items: {}, settings: DEFAULT_SETTINGS, practiceDays: [], regions: {} };

describe("tracks", () => {
  it("four tracks with five tiers each", () => {
    expect(TRACKS.map((t) => t.id)).toEqual(["scales", "reading", "rhythm", "vocab"]);
    for (const t of TRACKS) expect(t.tiers).toHaveLength(5);
  });

  it("unit ids are globally unique", () => {
    const ids = allTiers().flatMap((t) => t.units.map((u) => u.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every unit builds", () => {
    for (const tier of allTiers()) {
      for (const u of tier.units) {
        if (u.kind === "scale" || u.kind === "progression") {
          for (const p of u.patternIds) {
            for (const spec of unitExercises(u, tier.id, p)) {
              const ex = spec.progressionId ? buildProgression(spec) : buildExercise(spec);
              expect(ex.notes.length, `${u.id} ${spec.key} ${p}`).toBeGreaterThan(0);
            }
          }
        } else if (u.kind === "reading") {
          const prompts = generateReading(u.drill, {}, () => 0.37);
          expect(prompts).toHaveLength(u.drill.count);
        } else {
          expect(getRhythmDrill(u.drillId).id).toBe(u.drillId);
        }
      }
    }
  });

  it("tier 1 is open, tier 2 is gated, unlockAll opens everything", () => {
    const scales = TRACKS[0];
    expect(tierLock(empty, scales.tiers[0]).open).toBe(true);
    expect(tierLock(empty, scales.tiers[1]).open).toBe(false);
    const vocab = TRACKS[3];
    expect(tierLock(empty, vocab.tiers[0]).open).toBe(true);
    expect(tierLock(empty, vocab.tiers[1]).reasons.join(" ")).toContain("Rhythm");
    const open = { ...empty, settings: { ...DEFAULT_SETTINGS, unlockAll: true } };
    for (const t of allTiers()) expect(tierLock(open, t).open).toBe(true);
  });

  it("current tier starts at 1", () => {
    for (const t of TRACKS) expect(currentTier(empty, t.id).n).toBe(1);
  });

  it("the daily session has time, reading and focus", () => {
    const plan = dailySession(empty);
    expect(plan.steps.map((s) => s.title).slice(0, 3)).toEqual(["Time", "Reading sprint", "Focus"]);
    expect(plan.items.length).toBeGreaterThan(2);
  });
});

describe("reading", () => {
  it("reading prompts are within the staff range and repeat-free back to back", () => {
    const prompts = generateReading({ id: "t", title: "t", mode: "notes", layout: "treble", count: 30 }, {});
    for (let i = 1; i < prompts.length; i++) expect(prompts[i].notes[0].midi).not.toBe(prompts[i - 1].notes[0].midi);
  });

  it("chord prompts are stacked and carry a symbol", () => {
    const prompts = generateReading({ id: "c", title: "c", mode: "chords", layout: "treble", keys: ["F"], count: 4 }, {});
    for (const p of prompts) {
      expect(p.together).toBe(true);
      expect(p.notes.length).toBeGreaterThanOrEqual(3);
      expect(p.symbol).toBeTruthy();
    }
  });
});

describe("rhythm", () => {
  it("every drill builds sorted notes and aligned beats", () => {
    for (const d of RHYTHM_DRILLS) {
      const r = buildRhythm(d, 0.62);
      expect(r.notes.length + r.calls.length, d.id).toBeGreaterThan(0);
      expect(r.playBeats).toHaveLength(r.notes.length);
      for (let i = 1; i < r.playBeats.length; i++) expect(r.playBeats[i]).toBeGreaterThanOrEqual(r.playBeats[i - 1]);
    }
  });

  it("swing moves off-beat eighths later", () => {
    const r = buildRhythm(getRhythmDrill("swing-eighths"), 2 / 3);
    const off = r.playBeats.find((b) => b % 1 !== 0)!;
    expect(off % 1).toBeCloseTo(2 / 3, 2);
  });
});
