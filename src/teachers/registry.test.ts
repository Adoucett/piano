import { describe, it, expect } from "vitest";
import { TEACHERS, TEACHER_BY_ID } from "./registry";
import { lessonExercises } from "./resolve";
import { buildExercise, buildProgression, PATTERN_BY_ID } from "@/exercises/patterns";
import { PROGRESSION_BY_ID } from "@/exercises/progressions";
import { SCALE_BY_ID } from "@/theory/catalog";

describe("teacher registry", () => {
  it("auto-discovers at least the starter teachers", () => {
    const ids = TEACHERS.map((t) => t.id);
    for (const id of ["bach", "bebop", "gospel", "mehldau", "pop"]) expect(ids).toContain(id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("merges standalone lesson contributions", () => {
    expect(TEACHER_BY_ID["mehldau"].lessons.some((l) => l.id === "mehldau-pentatonic-reharm")).toBe(true);
    expect(TEACHER_BY_ID["bebop"].lessons.some((l) => l.id === "bebop-251-lines")).toBe(true);
  });

  it("lesson ids are unique per teacher", () => {
    for (const t of TEACHERS) {
      const ids = t.lessons.map((l) => l.id);
      expect(new Set(ids).size, t.id).toBe(ids.length);
    }
  });

  it("references only real scales, patterns and progressions", () => {
    for (const t of TEACHERS) {
      for (const id of t.scalarVocab) expect(SCALE_BY_ID[id], `${t.id}:${id}`).toBeTruthy();
      for (const lesson of t.lessons)
        for (const step of lesson.steps) {
          const where = `${t.id}:${lesson.id}`;
          expect(SCALE_BY_ID[step.scaleId], `${where}:${step.scaleId}`).toBeTruthy();
          expect(PATTERN_BY_ID[step.patternId], `${where}:${step.patternId}`).toBeTruthy();
          if (step.progressionId) expect(PROGRESSION_BY_ID[step.progressionId], `${where}:${step.progressionId}`).toBeTruthy();
        }
    }
  });

  it("every lesson resolves to playable exercises", () => {
    for (const t of TEACHERS) {
      for (const lesson of t.lessons) {
        const specs = lessonExercises(t, lesson);
        expect(specs.length).toBeGreaterThan(0);
        for (const spec of specs) {
          const ex = spec.progressionId ? buildProgression(spec) : buildExercise(spec);
          expect(ex.notes.length, `${lesson.id} ${spec.key}`).toBeGreaterThan(0);
          for (const n of ex.notes) expect(Number.isFinite(n.midi)).toBe(true);
        }
      }
    }
  });
});
