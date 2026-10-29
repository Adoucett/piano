import type { LessonContribution } from "../types";

/** Lines over changes: bebop scale from chord tones, enclosures, then the ii–V–I itself. */
const contribution: LessonContribution = {
  teacherId: "bebop",
  lesson: {
    id: "bebop-251-lines",
    title: "Lines through the ii–V–I",
    summary: "Chord tones on the beat, enclosures into the 3rd, then the whole cadence in every key.",
    order: 5,
    trackId: "vocab",
    difficulty: 4,
    estMinutes: 15,
    steps: [
      {
        scaleId: "bebop-dominant",
        patternId: "bebopFrom7",
        keyOrder: "fourths",
        octaves: 2,
        rhythm: "swing",
        instruction: "Down from the b7. With the passing major 7th, every downbeat is a chord tone. Swing it at 140.",
      },
      {
        scaleId: "bebop-dominant",
        patternId: "enclosures",
        keyOrder: "fourths",
        octaves: 1,
        instruction: "Scale tone above, half step below, land. Target the 3rd hardest: that's the note the band hears.",
      },
      {
        scaleId: "dorian",
        patternId: "ascending",
        progressionId: "ii-V-I-major",
        keyOrder: "fourths",
        instruction: "Up the Dorian, down the bebop dominant, up into the major. One bar each. Keep the eighths long-short.",
      },
      {
        scaleId: "dorian",
        patternId: "guideTones",
        progressionId: "ii-V-I-major",
        keyOrder: "fourths",
        instruction: "Now only the 3rds and 7ths. Hear how the 7th of each chord falls a half step into the 3rd of the next.",
      },
    ],
  },
};

export default contribution;
