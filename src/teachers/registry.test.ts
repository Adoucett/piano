import { describe, it, expect } from "vitest";
import { TEACHERS, TEACHER_BY_ID } from "./registry";
import { lessonExercises } from "./resolve";
import { buildExercise } from "@/exercises/patterns";
import { SCALE_BY_ID } from "@/theory/catalog";

describe("teacher registry", () => {
  it("auto-discovers the starter teachers", () => {
    const ids = TEACHERS.map((t) => t.id).sort();
    expect(ids).toEqual(["bach", "bebop", "gospel", "mehldau", "pop"]);
  });

  it("merged the standalone lesson contribution onto Mehldau", () => {
    const mehldau = TEACHER_BY_ID["mehldau"];
    expect(mehldau.lessons.some((l) => l.id === "mehldau-pentatonic-reharm")).toBe(true);
  });

  it("every teacher references only real scale ids", () => {
    for (const t of TEACHERS) {
      for (const id of t.scalarVocab) expect(SCALE_BY_ID[id], `${t.id}:${id}`).toBeTruthy();
      for (const lesson of t.lessons)
        for (const step of lesson.steps)
          expect(SCALE_BY_ID[step.scaleId], `${t.id}:${lesson.id}:${step.scaleId}`).toBeTruthy();
    }
  });

  it("every lesson resolves to playable exercises", () => {
    for (const t of TEACHERS) {
      for (const lesson of t.lessons) {
        const specs = lessonExercises(t, lesson);
        expect(specs.length).toBeGreaterThan(0);
        for (const spec of specs) {
          const notes = buildExercise(spec);
          expect(notes.length).toBeGreaterThan(0);
          for (const n of notes) expect(Number.isFinite(n.midi)).toBe(true);
        }
      }
    }
  });
});
