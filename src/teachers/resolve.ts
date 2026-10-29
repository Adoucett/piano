import type { ExerciseSpec } from "@/types";
import { keysForOrder } from "@/theory/catalog";
import type { Lesson, LessonStep, Teacher } from "./types";

/** The list of keys a step covers. */
export function stepKeys(step: LessonStep): string[] {
  if (step.keys && step.keys.length) return step.keys;
  if (step.keyOrder) return [...keysForOrder(step.keyOrder)];
  return ["C"];
}

/** Expand a lesson into a flat, ordered list of concrete exercises. */
export function lessonExercises(teacher: Teacher, lesson: Lesson): ExerciseSpec[] {
  const out: ExerciseSpec[] = [];
  for (const step of lesson.steps) {
    for (const key of stepKeys(step)) {
      out.push({
        scaleId: step.scaleId,
        key,
        patternId: step.patternId,
        octaves: step.octaves ?? 1,
        startOctave: step.startOctave,
        progressionId: step.progressionId,
        chord: step.chord,
        feel: step.rhythm,
        bpm: step.bpm,
        source: {
          kind: "teacher",
          teacherId: teacher.id,
          lessonId: lesson.id,
          instruction: step.instruction,
        },
      });
    }
  }
  return out;
}

/** Total number of concrete exercises a lesson contains. */
export function lessonLength(lesson: Lesson): number {
  return lesson.steps.reduce((n, s) => n + stepKeys(s).length, 0);
}
