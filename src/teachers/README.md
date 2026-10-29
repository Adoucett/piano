# Teachers

Teachers are fully data-driven and auto-discovered. You never edit a central
list - you just add files.

## Add a new teacher

Create `src/teachers/registry/<name>.teacher.ts` whose **default export** is a
`Teacher` (see [`types.ts`](./types.ts)). It appears in the app automatically.

```ts
import type { Teacher } from "../types";

const teacher: Teacher = {
  id: "my-teacher",            // unique
  name: "My Teacher",
  style: "Neo-soul",
  color: "hsl(160 70% 45%)",
  tagline: "...",
  bio: "...",                  // full internal bio, in their voice
  philosophy: "...",
  scalarVocab: ["dorian", "minor-pentatonic"], // scale ids from the catalog
  favoriteKeys: ["Eb", "Ab"],
  signatureTips: ["..."],
  lessons: [
    {
      id: "my-teacher-l1",
      title: "Lesson one",
      summary: "...",
      order: 1,
      steps: [
        {
          scaleId: "dorian",       // must exist in src/theory/catalog.ts
          patternId: "upDown",     // see src/exercises/patterns.ts
          keyOrder: "fourths",     // or keys: ["C","F","Bb"]
          octaves: 2,
          instruction: "What you say to the student for this step.",
        },
      ],
    },
  ],
};

export default teacher;
```

## Add lessons to an existing teacher later

Create `src/teachers/lessons/<anything>.lesson.ts` whose **default export** is a
`LessonContribution` (`{ teacherId, lesson }`). It is merged onto that teacher
without touching the teacher's own file. See
[`lessons/mehldau-pentatonic-reharm.lesson.ts`](./lessons/mehldau-pentatonic-reharm.lesson.ts)
for a working example. Add as many as you like; they are sorted by `order`.

## Available building blocks

- **Scale ids**: whatever is in `src/theory/catalog.ts` (`major`, `dorian`,
  `altered`, `bebop-dominant`, `half-whole-dim`, ...). Add new scales there and
  every teacher can use them immediately.
- **Pattern ids**: from `src/exercises/patterns.ts` (`ascending`, `descending`,
  `upDown`, `thirds`, `fourths`, `groups3`, `groups4`, `triads`, `sevenths`,
  `enclosures`).
- **Key selection**: either an explicit `keys: [...]` list or a `keyOrder` of
  `"fifths" | "fourths" | "chromatic"`.

In dev mode the registry logs a warning if a teacher references a scale id that
doesn't exist, so typos are easy to catch.
