import type { Teacher } from "../types";

const bebop: Teacher = {
  id: "bebop",
  name: "Dizzy Powell",
  style: "Bebop",
  era: "post-war jazz",
  color: "hsl(16 90% 55%)",
  tagline: "Eighth-note lines, chord tones on the beat, enclosures everywhere.",
  bio: `Bebop is a language and the grammar is simple: run eighth notes, land your chord tones on the downbeats, and decorate everything with chromatic approaches. I live on the bebop scales and ii-V-I. Learn the vocabulary, then forget it and just talk.`,
  philosophy: `Drill the bebop scales until the passing tone falls automatically and the chord tones hit the beat. Add enclosures - approach every target from above and below. Then string it over ii-V-I moving around the horn. Swing the eighths; this music has to breathe.`,
  scalarVocab: [
    "bebop-dominant",
    "bebop-major",
    "bebop-minor",
    "mixolydian",
    "dorian",
    "altered",
  ],
  favoriteKeys: ["F", "Bb", "Eb", "Ab", "C", "G"],
  signatureTips: [
    "The whole point of a bebop scale: chord tones land on the beat, passing tones on the up-beat.",
    "Enclose your target - one note above, one below, then nail it.",
    "Practice ii-V-I around the circle of fourths until it's reflex.",
  ],
  lessons: [
    {
      id: "bebop-dominant-scale",
      title: "The bebop dominant scale",
      summary: "The core bebop sound: Mixolydian plus the passing major 7.",
      order: 1,
      steps: [
        {
          scaleId: "bebop-dominant",
          patternId: "ascending",
          keyOrder: "fourths",
          octaves: 2,
          instruction:
            "Ascending, swung eighths. Start on the root on beat 1 and feel the chord tones land on the beats.",
        },
        {
          scaleId: "bebop-dominant",
          patternId: "descending",
          keyOrder: "fourths",
          octaves: 2,
          instruction:
            "Descending from the root. This is where the passing tone really pays off.",
        },
      ],
    },
    {
      id: "bebop-enclosures",
      title: "Enclosures on chord tones",
      summary: "Approach each chord tone from a half step above and below.",
      order: 2,
      steps: [
        {
          scaleId: "bebop-dominant",
          patternId: "enclosures",
          keyOrder: "fourths",
          octaves: 1,
          instruction:
            "Above, below, target - for the root, 3rd, 5th and 7th. This is the sound of the bebop line.",
        },
      ],
    },
    {
      id: "bebop-ii-v",
      title: "ii-V vocabulary",
      summary: "Dorian, Mixolydian and altered strung together as a ii-V.",
      order: 3,
      steps: [
        {
          scaleId: "dorian",
          patternId: "sevenths",
          keyOrder: "fourths",
          octaves: 1,
          instruction: "The ii chord: Dorian 7th arpeggios.",
        },
        {
          scaleId: "altered",
          patternId: "sevenths",
          keyOrder: "fourths",
          octaves: 1,
          instruction: "The V chord: altered arpeggios, resolving a half step down into the I.",
        },
      ],
    },
  ],
};

export default bebop;
