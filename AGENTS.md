# AGENTS.md - guide for AI agents (and humans) extending Étude

This file tells an automated agent everything needed to **add content** (teachers,
lessons, scales, progressions, exercise patterns, rhythm drills) to Étude
**without breaking the build**. Most additions are pure data files you can drop
in - no UI or wiring changes required. You can do it entirely from the GitHub web
UI; every push to `main` triggers type-check + tests + build + deploy to GitHub
Pages.

> Live site: https://adoucett.github.io/piano/ (Chrome/Edge for live MIDI)

## TL;DR for "add a lesson right now"

1. Create a new file in `src/teachers/lessons/` named `<something>.lesson.ts`.
2. Default-export a `LessonContribution` (`{ teacherId, lesson }`). Use only
   valid `scaleId`, `patternId` and `progressionId` values (lists below).
3. Commit to `main`. CI type-checks, tests, builds and deploys. Done.

No central registry edit is needed - files are auto-discovered via
`import.meta.glob` in [`src/teachers/registry.ts`](src/teachers/registry.ts).

## Architecture map

| Path | Responsibility |
| --- | --- |
| `src/theory/catalog.ts` | Scale catalog (`SCALES`), key lists, key orders. |
| `src/theory/engine.ts` | Spelling (`spellScale`, respelling of awkward notes), octave/clef layout, degree labels, chord-tone roles. |
| `src/exercises/patterns.ts` | Pattern generators, `buildExercise()`, progression lines, `lineSwing()`. |
| `src/exercises/progressions.ts` | Chord progressions (ii-V-I etc.) used by progression patterns. |
| `src/exercises/tracks.ts` | The curriculum: four tracks (scales, reading, rhythm, vocab) x five tiers, with cross-track gates. |
| `src/exercises/reading.ts` | Reading drills (landmarks, intervals, chords, shells/rootless voicings) with a Leitner box per staff region. |
| `src/exercises/session.ts` | Builds the daily session (time, reading, focus, review). |
| `src/rhythm/drills.ts` | Rhythm & time drills (pulse, subdivision, swing, polyrhythm, ...). |
| `src/practice/*` | Input bus (MIDI/QWERTY on the audio clock), lookahead transport, matcher (wait/tempo modes), mastery tiers + SM-2 review + tempo ladder. |
| `src/audio/*` | Shared AudioContext, sampled grand (smplr) + synth fallback, backing (bass/click). |
| `src/teachers/types.ts` | `Teacher`, `Lesson`, `LessonStep`, `LessonContribution`. |
| `src/teachers/registry.ts` | Auto-discovery + validation of teachers and lesson contributions. |
| `src/teachers/registry/*.teacher.ts` | One file per teacher (default export `Teacher`). |
| `src/teachers/lessons/*.lesson.ts` | Standalone lessons merged onto a teacher. |
| `src/teachers/resolve.ts` | Expands a lesson into concrete `ExerciseSpec[]`. |
| `src/components/StaffView.tsx` | VexFlow engraving, letter lane, chord-tone coloring, playhead. |
| `src/components/KeyboardView.tsx` | Zoomable keyboard with scale/role labels. |
| `src/components/practice/*` | Exercise, reading and rhythm runners; results sheet; timing meter. |
| `src/pages/*` | Today, Courses, Library, Rhythm, Progress, Settings, Practice (full screen). |
| `src/store/progress.ts` | Zustand store (persisted, versioned): mastery, review, settings, `unlockAll`. |

Data flow: `catalog + key` -> `engine` (spelling) -> `patterns` (note sequence)
-> staff/keyboard + `matcher` (compares your MIDI against the transport clock)
-> `mastery` -> `progress` store.

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

Scale patterns (work on any scale):

```
ascending, descending, upDown, downUp, thirds, thirdsDown, fourths,
groups3, groups3Down, groups4, groups4Down, triads, sevenths,
fromThird, fromFifth, fromSeventh,
bebopFrom7, bebopFrom5, bebopFrom3,
approachBelow, approachAbove, doubleChromatic, enclosures,
sightLine            (seeded 4-bar reading line; 7-note major/minor/modes only)
```

Progression-only patterns (require `progressionId`):

```
digital1235, digital3567, guideTones
```

Any scale pattern can also be used with a `progressionId` - the line then runs
over each chord in turn.

### Progression ids (`progressionId`) - from `src/exercises/progressions.ts`

```
ii-V-I-major, ii-V-I-altered, ii-V-i-minor, V-i-spanish
```

### Track ids (`trackId`)

```
scales, reading, rhythm, vocab
```

### Keys and key orders

- Keys (tonics): `C Db D Eb E F Gb G Ab A Bb B` (sharp spellings like `F#` are
  accepted). Use flats for flat keys so spelling stays correct.
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
    order: 5,          // sort order within the teacher's lessons
    trackId: "vocab",  // optional: which track it reinforces
    difficulty: 3,     // optional: 1..5
    estMinutes: 12,    // optional: shown on the card
    steps: [
      {
        scaleId: "lydian-dominant",
        patternId: "sevenths",
        keyOrder: "fourths", // or keys: ["Db","Gb","B"]
        octaves: 2,
        chord: "7#11", // optional: chord suffix on the key; sets the symbol and chord-tone coloring
        instruction: "What this step is for, in plain direct language.",
      },
      {
        // A step over a progression: scaleId is the first chord's scale.
        scaleId: "dorian",
        patternId: "guideTones",
        progressionId: "ii-V-I-major",
        keys: ["C", "F", "Bb"],
        rhythm: "swing", // optional: "straight" | "swing" (overrides the auto swing policy)
        bpm: 120,        // optional: sets the tempo when the step opens
        instruction: "3rds and 7ths only; move each voice by the nearest step.",
      },
    ],
  },
};

export default contribution;
```

Working examples:
[`mehldau-pentatonic-reharm.lesson.ts`](src/teachers/lessons/mehldau-pentatonic-reharm.lesson.ts),
[`bebop-251-lines.lesson.ts`](src/teachers/lessons/bebop-251-lines.lesson.ts).

## Recipe 2 - Add a whole new teacher

Create `src/teachers/registry/<name>.teacher.ts` with a default-exported
`Teacher`. Full field reference is in
[`src/teachers/types.ts`](src/teachers/types.ts) and
[`src/teachers/README.md`](src/teachers/README.md). Teachers are *style
programs*: write bios in the third person ("This program works ..."), not as
an impersonation of a real musician. The teacher page shows a footnote saying
programs are written in the style of the musicians named, not endorsed by them.

```ts
import type { Teacher } from "../types";

const teacher: Teacher = {
  id: "mcoy",                 // unique, lowercase
  name: "McCoy Tyner",
  style: "Modal jazz",
  color: "hsl(265 22% 64%)",  // keep it muted; used as a thin accent
  tagline: "Quartal voicings and pentatonic power.",
  bio: "Third-person description of the program...",
  philosophy: "How the program is structured...",
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

Append an entry to `SCALES` in `src/theory/catalog.ts`. Either `tonalName` must
be a scale type known to `tonal` (`Scale.get("C <tonalName>").notes` returns
notes), or give an explicit `intervals` formula.

```ts
{
  id: "neapolitan-minor",
  name: "Neapolitan Minor",
  tonalName: "neapolitan minor",
  family: "harmonic-minor-modes", // see ScaleFamily union in src/types.ts
  chords: ["m"],
  tip: "Short practical tip.",
  // Optional:
  // intervals: ["1P","2m","3m","4P","5P","6m","7M"],
  // degreeLabels: ["1","b2","b3","4","5","b6","7"], // how a player names them
  // respell: true,     // respell double accidentals / E#, B#, Cb, Fb per note
  // passingTone: 11,   // semitone of a bebop passing tone (kept off the beat)
}
```

New scale ids are immediately usable by teachers, lessons, the library and the
command palette.

## Recipe 4 - Add an exercise pattern

Add a `PatternDef` to `PATTERNS` and a `case` in the generator in
`src/exercises/patterns.ts`, plus the id to the `PatternId` union in
`src/types.ts`. A pattern is a pure function of the `ScaleInfo` returning
`NoteSpec[]`. Set `progressionOnly` for patterns that need a progression and
`hideChords` for pure reading lines.

## Recipe 5 - Add a progression or rhythm drill

- Progressions: append to `src/exercises/progressions.ts` (chord roots relative
  to the key, chord suffix, scale id per chord, beats).
- Rhythm drills: append a `RhythmDrill` to `src/rhythm/drills.ts` and reference
  its id from a rhythm unit in `src/exercises/tracks.ts` if it belongs to the
  curriculum.

## Deep links

Useful for docs, lessons and testing:

| Route | Opens |
| --- | --- |
| `#/today` | Today page |
| `#/courses`, `#/courses/track/<trackId>`, `#/courses/teacher/<teacherId>` | Courses |
| `#/library/<scaleId>` | Scale detail |
| `#/practice/ex/<scaleId>/<key>/<patternId>/<octaves>` | One exercise, full screen |
| `#/practice/prog/<progressionId>/<key>/<patternId>` | A progression exercise |
| `#/practice/read/<unitId>` | A reading unit |
| `#/practice/rhythm/<drillId>` | A rhythm drill |
| `?unlock=1` | Unlocks everything (also in Settings > Progress) |

## Doing it from the GitHub web UI (drag & drop, no local setup)

1. Go to the repo, navigate to `src/teachers/lessons/` (or the relevant folder).
2. **Add file -> Create new file** (or **Upload files** to drag and drop).
3. Name it `*.lesson.ts` and paste the contribution from Recipe 1.
4. **Commit directly to `main`.**
5. The **Deploy to GitHub Pages** Action type-checks, runs tests, builds and
   publishes. On green, the change is live within about a minute.

If the Action turns red, it is almost always one of:

- an unknown `scaleId` / `patternId` / `progressionId` (typo - check the lists above),
- a progression-only pattern used without a `progressionId`,
- a `chord` suffix that tonal does not recognise (e.g. use `"m7b5"`, not `"half-dim"`),
- a duplicate `id`,
- a TypeScript syntax error in the new file.

`src/teachers/registry.test.ts` validates that every teacher and lesson
references real scales, patterns and progressions and resolves to playable
exercises, so these mistakes fail fast in CI with a clear message.

## Local workflow (optional)

```bash
npm install
npm run dev     # http://127.0.0.1:5174
npm test        # theory, patterns, matcher, curriculum, teachers
npx tsc --noEmit -p tsconfig.app.json   # type-check
npm run build   # production build
```

## Conventions

- Ids are unique, lowercase, hyphenated (`teacherId-topic`).
- Copy is direct and adult: say what the exercise trains and what to listen
  for. No exclamation marks, no gamified praise.
- Prefer flat spellings for flat keys so the staff reads correctly.
- Keep lessons focused (2-4 steps); add more lessons rather than giant ones.
- Do not commit secrets. `.env` is gitignored; use `.env.example` as the template.
