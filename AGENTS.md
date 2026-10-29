# AGENTS.md - guide for AI agents (and humans) extending this app

This file tells an automated agent everything needed to **add content** (teachers,
lessons, scales, exercise patterns) to the Jazz Scale Trainer **without breaking
the build**. Most additions are pure data files you can drop in - no UI or wiring
changes required. You can even do it entirely from the GitHub web UI; every push
to `main` triggers a build + test + deploy to GitHub Pages.

> Live site: https://adoucett.github.io/piano/ (Chrome/Edge for live MIDI)

## TL;DR for "add a lesson right now"

1. Create a new file in `src/teachers/lessons/` named `<something>.lesson.ts`.
2. Default-export a `LessonContribution` (`{ teacherId, lesson }`). Use only
   valid `scaleId` and `patternId` values (lists below).
3. Commit to `main`. CI builds, tests, and deploys automatically. Done.

No central registry edit is needed - files are auto-discovered via
`import.meta.glob` in [`src/teachers/registry.ts`](src/teachers/registry.ts).

## Architecture map

| Path | Responsibility |
| --- | --- |
| `src/theory/catalog.ts` | The scale catalog (`SCALES`), key lists, key orders. |
| `src/theory/engine.ts` | Spelling, octave/clef layout, degree labels (uses `tonal`). |
| `src/exercises/patterns.ts` | Exercise pattern generators + `buildExercise()`. |
| `src/exercises/curriculum.ts` | The 10-level curriculum. |
| `src/teachers/types.ts` | `Teacher`, `Lesson`, `LessonStep`, `LessonContribution`. |
| `src/teachers/registry.ts` | Auto-discovery of teachers + lesson contributions. |
| `src/teachers/registry/*.teacher.ts` | One file per teacher (default export `Teacher`). |
| `src/teachers/lessons/*.lesson.ts` | Standalone lessons merged onto a teacher. |
| `src/teachers/resolve.ts` | Expands a lesson into concrete `ExerciseSpec[]`. |
| `src/components/*` | Staff (VexFlow), keyboard, practice session, UI. |
| `src/pages/*` | Curriculum, Library, Teachers, Dashboard, Settings. |
| `src/store/progress.ts` | Zustand store: mastery, review queue, streak, settings. |

Data flows: `catalog + key` -> `engine` (spelling) -> `patterns` (note sequence)
-> staff/keyboard + `matcher` (compares your MIDI) -> `progress` store.

## Valid values (use these exact strings)

### Scale ids (`scaleId`) - from `src/theory/catalog.ts`

```
major, natural-minor, harmonic-minor, melodic-minor,
dorian, phrygian, lydian, mixolydian, locrian,
major-pentatonic, minor-pentatonic, minor-blues, major-blues,
dorian-b2, lydian-augmented, lydian-dominant, mixolydian-b6, locrian-sharp2, altered,
phrygian-dominant, ultralocrian,
whole-tone, half-whole-dim, whole-half-dim, chromatic,
bebop-dominant, bebop-major, bebop-minor, bebop-melodic-minor
```

### Pattern ids (`patternId`) - from `src/exercises/patterns.ts`

```
ascending, descending, upDown, thirds, fourths,
groups3, groups4, triads, sevenths, enclosures
```

### Keys and key orders

- Keys (tonics): `C Db D Eb E F Gb G Ab A Bb B` (and sharp spellings like `F#`,
  `C#` are accepted). Use flats for flat keys so spelling stays correct.
- `keyOrder`: `"fifths" | "fourths" | "chromatic"` (see `keysForOrder()`).

A `LessonStep` picks keys either with an explicit `keys: [...]` array **or** a
`keyOrder`. If both are omitted it defaults to `["C"]`.

## Recipe 1 - Add lessons to an existing teacher (most common)

Teacher ids: `bach`, `mehldau`, `pop`, `bebop`, `gospel`.

Create `src/teachers/lessons/my-new-lesson.lesson.ts`:

```ts
import type { LessonContribution } from "../types";

const contribution: LessonContribution = {
  teacherId: "mehldau", // must match an existing teacher id
  lesson: {
    id: "mehldau-tritone-subs", // globally unique
    title: "Tritone sub lines",
    summary: "One-line description shown on the card.",
    order: 5, // sort order within the teacher's lessons
    steps: [
      {
        scaleId: "lydian-dominant",
        patternId: "sevenths",
        keyOrder: "fourths", // or keys: ["Db","Gb","B"]
        octaves: 2,
        instruction: "What the teacher says for this step, in their voice.",
      },
    ],
  },
};

export default contribution;
```

That's it. See the working example
[`src/teachers/lessons/mehldau-pentatonic-reharm.lesson.ts`](src/teachers/lessons/mehldau-pentatonic-reharm.lesson.ts).

## Recipe 2 - Add a whole new teacher

Create `src/teachers/registry/<name>.teacher.ts` with a default-exported
`Teacher`. Full field reference is in
[`src/teachers/types.ts`](src/teachers/types.ts) and
[`src/teachers/README.md`](src/teachers/README.md). Minimum viable teacher:

```ts
import type { Teacher } from "../types";

const teacher: Teacher = {
  id: "mcoy",                 // unique, lowercase
  name: "McCoy Tyner",
  style: "Modal jazz",
  color: "hsl(265 70% 55%)",  // any CSS color; used for the avatar
  tagline: "Quartal voicings and pentatonic power.",
  bio: "Full internal bio in their voice...",
  philosophy: "How they teach...",
  scalarVocab: ["minor-pentatonic", "dorian", "major-pentatonic"],
  favoriteKeys: ["C", "F", "Bb"],
  signatureTips: ["Stack the scale in 4ths.", "..."],
  lessons: [
    {
      id: "mcoy-pentatonic-power",
      title: "Pentatonic power",
      summary: "...",
      order: 1,
      steps: [
        { scaleId: "minor-pentatonic", patternId: "groups4", keyOrder: "fourths", octaves: 2, instruction: "..." },
      ],
    },
  ],
};

export default teacher;
```

## Recipe 3 - Add a new scale

Append an entry to `SCALES` in `src/theory/catalog.ts`. The only hard requirement
is that `tonalName` is a scale type understood by `tonal`'s `Scale.get()` (run
`Scale.get("C <tonalName>").notes` mentally - it must return notes). Spelling,
intervals, and the formula are derived automatically.

```ts
{
  id: "neapolitan-minor",
  name: "Neapolitan Minor",
  tonalName: "neapolitan minor", // must be known to tonal
  family: "harmonic-minor-modes", // see ScaleFamily union in src/types.ts
  chords: ["m"],
  tip: "Short practical tip.",
}
```

New scale ids are immediately usable by teachers, lessons, the library, and the
curriculum.

## Recipe 4 - Add an exercise pattern

Add a `PatternDef` to `PATTERNS` and a `case` in `generateExercise()` in
`src/exercises/patterns.ts`, plus the id to the `PatternId` union in
`src/types.ts`. A pattern is a pure function `(ScaleInfo) => NoteSpec[]`.

## Doing it from the GitHub web UI (drag & drop, no local setup)

1. Go to the repo, navigate to `src/teachers/lessons/` (or the relevant folder).
2. **Add file -> Create new file** (or **Upload files** to drag-and-drop).
3. Name it `*.lesson.ts` and paste the contribution from Recipe 1.
4. **Commit directly to `main`.**
5. The **Deploy to GitHub Pages** Action runs automatically: it type-checks,
   runs the test suite, builds, and publishes. Watch it under the repo's
   **Actions** tab. On green, the change is live at the site URL within ~1 minute.

If a push turns the Action red, it is almost always one of:
- an unknown `scaleId`/`patternId` (typo - check the lists above),
- a duplicate `id`,
- a TypeScript/JSON syntax error in the new file.

The test suite (`src/teachers/registry.test.ts`) validates that every teacher
and lesson references real scales and resolves to playable exercises, so these
mistakes fail fast in CI with a clear message.

## Local workflow (optional)

```bash
npm install
npm run dev     # http://127.0.0.1:5174
npm test        # theory spelling, patterns, matcher, teachers pipeline
npm run build   # production build
```

## Conventions

- Ids are unique, lowercase, hyphenated (`teacherId-topic`).
- Instructions are written in the teacher's own voice.
- Prefer flat spellings for flat keys so the staff reads correctly.
- Keep lessons focused (a few steps); add more lessons rather than giant ones.
- Do not commit secrets. `.env` is gitignored; use `.env.example` as the template.
