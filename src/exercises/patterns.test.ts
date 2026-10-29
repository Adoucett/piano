import { describe, it, expect } from "vitest";
import { Note } from "tonal";
import { buildExercise, buildProgression, patternsFor, PATTERNS } from "./patterns";
import { SCALES, CHROMATIC_KEYS, getScaleDef } from "@/theory/catalog";
import { bestKeySignature, getScaleInfo, preferredTonic, roleOf } from "@/theory/engine";
import { PROGRESSIONS } from "./progressions";
import type { ExerciseSpec, PatternId } from "@/types";

const spec = (scaleId: string, key: string, patternId: PatternId, octaves = 1): ExerciseSpec => ({
  scaleId,
  key,
  patternId,
  octaves,
  source: { kind: "library" },
});

describe("buildExercise", () => {
  it("C major ascending is C4..C5 on the treble staff", () => {
    const ex = buildExercise(spec("major", "C", "ascending"));
    expect(ex.notes.map((n) => n.midi)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
    expect(ex.layout).toBe("treble");
    expect(ex.keySignature).toBe("C");
  });

  it("beats increase monotonically and fit the bar count", () => {
    const ex = buildExercise(spec("dorian", "D", "thirds", 2));
    for (let i = 1; i < ex.notes.length; i++) expect(ex.notes[i].beat!).toBeGreaterThan(ex.notes[i - 1].beat!);
    expect(ex.bars * ex.beatsPerBar).toBeGreaterThanOrEqual(ex.totalBeats);
  });

  it("every scale x key x applicable pattern builds finite, in-range notes", () => {
    for (const s of SCALES) {
      for (const key of CHROMATIC_KEYS) {
        for (const p of patternsFor(s.id)) {
          const ex = buildExercise(spec(s.id, key, p.id));
          expect(ex.notes.length, `${key} ${s.id} ${p.id}`).toBeGreaterThan(0);
          for (const n of ex.notes) {
            expect(Number.isFinite(n.midi)).toBe(true);
            expect(n.midi).toBeGreaterThanOrEqual(21);
            expect(n.midi).toBeLessThanOrEqual(108);
            expect(Note.midi(n.full)).toBe(n.midi);
          }
        }
      }
    }
  });

  it("scale-only patterns stay inside the scale", () => {
    const def = getScaleDef("melodic-minor");
    const info = getScaleInfo("Eb", def);
    const pcs = new Set(info.pitchClasses.map((n) => Note.chroma(n)));
    for (const p of ["upDown", "thirds", "groups4", "sevenths"] as PatternId[]) {
      const ex = buildExercise(spec("melodic-minor", "Eb", p));
      for (const n of ex.notes) expect(pcs.has(n.midi % 12), `${p} ${n.full}`).toBe(true);
    }
  });

  it("approach patterns land on chord tones", () => {
    const ex = buildExercise(spec("mixolydian", "G", "approachBelow"));
    const targets = ex.notes.filter((n) => n.role && n.role !== "approach" && n.role !== "tension");
    expect(targets.length).toBeGreaterThan(0);
  });

  it("every pattern id is unique", () => {
    expect(new Set(PATTERNS.map((p) => p.id)).size).toBe(PATTERNS.length);
  });
});

describe("spelling and key signatures", () => {
  it("prefers the enharmonic tonic with fewer accidentals", () => {
    expect(preferredTonic("Gb", getScaleDef("natural-minor"))).toBe("F#");
    expect(preferredTonic("Db", getScaleDef("major"))).toBe("Db");
  });

  it("chooses a sensible key signature", () => {
    expect(bestKeySignature(["Bb", "C", "D", "Eb", "F", "G", "A"])).toBe("Bb");
    expect(bestKeySignature(["D", "E", "F#", "G", "A", "B", "C#"])).toBe("D");
  });

  it("labels chord roles", () => {
    expect(roleOf(64, "C", "maj7")).toBe("third");
    expect(roleOf(71, "C", "maj7")).toBe("seventh");
  });
});

describe("jazz correctness (pedagogy review)", () => {
  const pcs = (ex: ReturnType<typeof buildExercise>) => ex.notes.map((n) => n.name);
  const onBeat = (ex: ReturnType<typeof buildExercise>) => ex.notes.filter((n) => Number.isInteger(n.beat)).map((n) => n.name);

  it("altered is spelled as a dominant and respelled away from double accidentals", () => {
    expect(pcs(buildExercise(spec("altered", "G", "ascending")))).toEqual(["G", "Ab", "Bb", "B", "Db", "Eb", "F", "G"]);
    expect(pcs(buildExercise(spec("altered", "Db", "ascending")))).toEqual(["Db", "D", "E", "F", "G", "A", "B", "Db"]);
    expect(buildExercise(spec("altered", "G", "ascending")).keySignature).toBe("C");
  });

  it("bebop minor descends with chord tones on the beat (Dorian + natural 7)", () => {
    expect(onBeat(buildExercise(spec("bebop-minor", "D", "descending")))).toEqual(["D", "C", "A", "F", "D"]);
  });

  it("bebop melodic minor is melodic minor + b6", () => {
    expect(pcs(buildExercise(spec("bebop-melodic-minor", "C", "ascending")))).toEqual(["C", "D", "Eb", "F", "G", "Ab", "A", "B", "C"]);
  });

  it("bebop major lands 1-6-5-3 on the beat over a 6 chord", () => {
    expect(onBeat(buildExercise(spec("bebop-major", "C", "descending")))).toEqual(["C", "A", "G", "E", "C"]);
  });

  it("the b7 of 7alt is a seventh, not a fifth", () => {
    expect(roleOf(65, "G", "7alt")).toBe("seventh");
    expect(roleOf(71, "G", "7alt")).toBe("third");
  });

  it("guide tones voice-lead 7 to 3 by half step", () => {
    const ex = buildProgression({ ...spec("dorian", "F", "guideTones"), progressionId: "ii-V-I-major" });
    expect(ex.notes.map((n) => n.name)).toEqual(["F", "E", "E", "Bb", "Bb", "A"]);
  });

  it("7th arpeggios over changes come from the chord (G7alt: 1-3-b13-b7-b9)", () => {
    const ex = buildProgression({ ...spec("dorian", "C", "sevenths"), progressionId: "ii-V-I-altered" });
    const v = ex.notes.filter((n) => n.beat! >= 4 && n.beat! < 6).map((n) => n.name);
    expect(v).toEqual(["G", "B", "Eb", "F"]);
  });

  it("minor progressions use the minor key signature", () => {
    expect(buildProgression({ ...spec("dorian", "D", "ascending"), progressionId: "ii-V-i-minor" }).keySignature).toBe("F");
  });

  it("enclosures never use the bebop passing tone as the upper neighbor", () => {
    const ex = buildExercise(spec("bebop-dominant", "G", "enclosures"));
    const beforeF = ex.notes.findIndex((n, i) => n.name === "F" && ex.notes[i - 2]);
    expect(ex.notes[beforeF - 2].name).toBe("G");
  });

  it("sight-reading lines stay in a readable treble range and end on the tonic", () => {
    const ex = buildExercise(spec("major", "Bb", "sightLine"));
    expect(ex.chords).toHaveLength(0);
    for (const n of ex.notes) expect(n.midi).toBeGreaterThanOrEqual(62), expect(n.midi).toBeLessThanOrEqual(81);
    expect(ex.notes[ex.notes.length - 1].name).toBe("Bb");
  });
});

describe("buildProgression", () => {
  it("ii-V-I in C has three chord symbols, one per bar", () => {
    const ex = buildProgression({ ...spec("dorian", "C", "ascending"), progressionId: "ii-V-I-major" });
    expect(ex.chords.map((c) => c.root)).toEqual(["D", "G", "C"]);
    expect(ex.bars).toBeGreaterThanOrEqual(3);
  });

  it("every progression builds in every key with every progression pattern", () => {
    for (const p of PROGRESSIONS) {
      for (const key of CHROMATIC_KEYS) {
        for (const pat of patternsFor(null, true)) {
          const ex = buildProgression({ ...spec(p.chords[0].scaleId, key, pat.id), progressionId: p.id });
          expect(ex.notes.length, `${p.id} ${key} ${pat.id}`).toBeGreaterThan(0);
          for (const n of ex.notes) expect(Note.midi(n.full)).toBe(n.midi);
        }
      }
    }
  });
});
