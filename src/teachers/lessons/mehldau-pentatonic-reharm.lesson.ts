import type { LessonContribution } from "../types";

/**
 * EXAMPLE of the "add lessons later" extensibility path.
 *
 * This file adds a brand-new lesson to the existing Brad Mehldau teacher
 * WITHOUT editing his teacher file. Drop more `*.lesson.ts` files like this in
 * and they are merged automatically by the registry (matched on teacherId).
 */
const contribution: LessonContribution = {
  teacherId: "mehldau",
  lesson: {
    id: "mehldau-pentatonic-reharm",
    title: "Pentatonic superimposition",
    summary:
      "Pull unexpected colours out of a chord by playing a minor pentatonic from a different root.",
    order: 4,
    steps: [
      {
        scaleId: "minor-pentatonic",
        patternId: "groups4",
        keyOrder: "fourths",
        octaves: 2,
        instruction:
          "Play the minor pentatonic a whole step above the root of a major chord - instant lydian colour (9, #11, 13).",
      },
      {
        scaleId: "minor-pentatonic",
        patternId: "upDown",
        keyOrder: "fourths",
        octaves: 2,
        instruction:
          "Now from the 5th of a minor chord for a lush, open sound. Let the shapes become automatic so your ear can lead.",
      },
    ],
  },
};

export default contribution;
