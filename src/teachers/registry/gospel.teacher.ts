import type { Teacher } from "../types";

const gospel: Teacher = {
  id: "gospel",
  name: "Mabel Hightower",
  style: "Gospel",
  era: "contemporary",
  color: "hsl(272 22% 66%)",
  tagline: "Blues, Mixolydian and diminished passing tones that testify.",
  bio: `Church piano has to preach. The gospel sound is the blues sitting on top of rich major harmony, with diminished chords sliding everything together. This program works the blue notes and the chromatic and diminished passing runs that connect it all.`,
  philosophy: `Start from the major blues and Mixolydian - that's the gospel palette. Then use the diminished scale to connect your chord tones with those sliding passing runs. Play with feeling and a strong, even left hand; the groove is the gospel.`,
  scalarVocab: [
    "major-blues",
    "mixolydian",
    "major-pentatonic",
    "bebop-major",
    "half-whole-dim",
    "major",
  ],
  favoriteKeys: ["Ab", "Eb", "Bb", "F", "Db", "C"],
  signatureTips: [
    "The major blues scale (with its b3 passing tone) is the heart of the gospel run.",
    "Use the diminished scale to slide between your chord tones.",
    "Keep that left hand strong and even - the groove carries the feeling.",
  ],
  lessons: [
    {
      id: "gospel-major-blues",
      title: "The gospel run (major blues)",
      summary: "Major blues scale in the flat keys gospel lives in.",
      order: 1,
      steps: [
        {
          scaleId: "major-blues",
          patternId: "upDown",
          keys: ["Ab", "Eb", "Bb", "F", "Db"],
          octaves: 2,
          instruction:
            "Major blues, up and down. Lean into that b3 passing tone - that's the cry.",
        },
      ],
    },
    {
      id: "gospel-mixolydian",
      title: "Mixolydian testimony",
      summary: "The flat-7 major sound that drives gospel and soul.",
      order: 2,
      steps: [
        {
          scaleId: "mixolydian",
          patternId: "groups4",
          keys: ["Ab", "Eb", "Bb", "F"],
          octaves: 2,
          instruction: "Groups of four, with a strong backbeat feel. Make it groove.",
        },
        {
          scaleId: "bebop-major",
          patternId: "ascending",
          keys: ["Ab", "Eb", "Bb"],
          octaves: 2,
          instruction:
            "Bebop major adds the #5 passing tone - a staple of the gospel right-hand run.",
        },
      ],
    },
    {
      id: "gospel-diminished",
      title: "Diminished passing runs",
      summary: "Use the half-whole diminished scale to connect chord tones.",
      order: 3,
      steps: [
        {
          scaleId: "half-whole-dim",
          patternId: "sevenths",
          keys: ["Ab", "Eb", "Bb", "C"],
          octaves: 1,
          instruction:
            "Diminished 7th arpeggios. These are the sliding passing chords between your changes.",
        },
      ],
    },
  ],
};

export default gospel;
