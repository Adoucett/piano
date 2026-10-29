import type { Lesson, LessonContribution, Teacher } from "./types";
import { SCALE_BY_ID } from "@/theory/catalog";
import { PROGRESSION_BY_ID } from "@/exercises/progressions";
import { PATTERN_BY_ID } from "@/exercises/patterns";

/**
 * Teacher registry with zero-wiring extensibility.
 *
 * To add a TEACHER: create `src/teachers/registry/<name>.teacher.ts` whose
 * default export is a `Teacher`. It is picked up automatically.
 *
 * To add LESSONS to an existing teacher later: create
 * `src/teachers/lessons/<anything>.lesson.ts` whose default export is a
 * `LessonContribution` ({ teacherId, lesson }). It is merged automatically,
 * so the original teacher file never needs to change.
 */

// Eagerly import every teacher and lesson module. Vite resolves these globs at
// build time; dropping a new matching file in is all it takes.
const teacherModules = import.meta.glob<{ default: Teacher }>(
  "./registry/*.teacher.ts",
  { eager: true }
);
const lessonModules = import.meta.glob<{ default: LessonContribution }>(
  "./lessons/*.lesson.ts",
  { eager: true }
);

function collectTeachers(): Teacher[] {
  const byId = new Map<string, Teacher>();

  for (const mod of Object.values(teacherModules)) {
    const t = mod.default;
    if (!t) continue;
    // Clone lessons so merged contributions don't mutate module state.
    byId.set(t.id, { ...t, lessons: [...t.lessons] });
  }

  // Merge standalone lesson contributions.
  for (const mod of Object.values(lessonModules)) {
    const contrib = mod.default;
    if (!contrib) continue;
    const teacher = byId.get(contrib.teacherId);
    if (!teacher) {
      if (import.meta.env?.DEV) {
        console.warn(
          `[teachers] lesson "${contrib.lesson.id}" references unknown teacher "${contrib.teacherId}"`
        );
      }
      continue;
    }
    if (teacher.lessons.some((l) => l.id === contrib.lesson.id)) continue;
    teacher.lessons.push(contrib.lesson);
  }

  // Sort lessons by `order` then title; validate scale ids in dev.
  for (const teacher of byId.values()) {
    teacher.lessons.sort(
      (a, b) => (a.order ?? 999) - (b.order ?? 999) || a.title.localeCompare(b.title)
    );
    if (import.meta.env?.DEV) validateTeacher(teacher);
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function validateTeacher(teacher: Teacher) {
  const check = (id: string, where: string) => {
    if (!SCALE_BY_ID[id]) {
      console.warn(
        `[teachers] ${teacher.id}: unknown scale id "${id}" in ${where}`
      );
    }
  };
  teacher.scalarVocab.forEach((id) => check(id, "scalarVocab"));
  teacher.lessons.forEach((lesson) =>
    lesson.steps.forEach((step, i) => {
      check(step.scaleId, `${lesson.id} step ${i}`);
      if (step.progressionId && !PROGRESSION_BY_ID[step.progressionId]) {
        console.warn(`[teachers] ${teacher.id}: unknown progression "${step.progressionId}" in ${lesson.id} step ${i}`);
      }
      if (!PATTERN_BY_ID[step.patternId]) {
        console.warn(`[teachers] ${teacher.id}: unknown pattern "${step.patternId}" in ${lesson.id} step ${i}`);
      }
    })
  );
}

export const TEACHERS: Teacher[] = collectTeachers();

export const TEACHER_BY_ID: Record<string, Teacher> = Object.fromEntries(
  TEACHERS.map((t) => [t.id, t])
);

export function getTeacher(id: string): Teacher | undefined {
  return TEACHER_BY_ID[id];
}

export function getLesson(
  teacherId: string,
  lessonId: string
): Lesson | undefined {
  return getTeacher(teacherId)?.lessons.find((l) => l.id === lessonId);
}
