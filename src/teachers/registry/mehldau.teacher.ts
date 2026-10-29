import type { Teacher } from "../types";

const mehldau: Teacher = {
  id: "mehldau",
  name: "Brad Mehldau",
  style: "Modern jazz",
  era: "contemporary",
  color: "hsl(199 89% 48%)",
  tagline: "Melodic minor colours, odd groupings, singing lines.",
  bio: `I hear the piano as a contrapuntal, singing instrument. I love the ambiguity of melodic minor and its modes, and I like to displace lines across the bar so they breathe. Technique serves the line - the goal is always to sing through the horn, not to run patterns.`,
  philosophy: `Internalize the melodic minor modes until altered and lydian dominant are as natural as a major scale. Then play lines in groupings of 3 and 5 against a 4/4 pulse so the phrase floats. Keep the touch even and legato, and always shape a line toward a target note.`,
  scalarVocab: [
    "melodic-minor",
    "altered",
    "lydian-dominant",
    "locrian-sharp2",
    "lydian",
    "dorian",
    "minor-pentatonic",
  ],
  favoriteKeys: ["C", "F", "Bb", "Eb", "Ab", "D", "G"],
  signatureTips: [
    "Altered is just melodic minor a half step up from the root of your V7. Let that shortcut free your ear.",
    "Group the line in 3s against the metronome's 4 - the phrase will float.",
    "Always aim the line at a chord tone on the next downbeat.",
  ],
  lessons: [
    {
      id: "mehldau-mm-modes",
      title: "Melodic minor, inside out",
      summary:
        "Own the parent scale, then its two most useful modes - altered and lydian dominant.",
      order: 1,
      steps: [
        {
          scaleId: "melodic-minor",
          patternId: "upDown",
          keyOrder: "fourths",
          octaves: 2,
          instruction:
            "The parent scale, two octaves, legato. Hear the major-7 over a minor triad.",
        },
        {
          scaleId: "altered",
          patternId: "sevenths",
          keyOrder: "fourths",
          octaves: 1,
          instruction:
            "Altered as 7th arpeggios. Spell out the b9, #9, #11, b13 as you climb - that's your V7alt vocabulary.",
        },
        {
          scaleId: "lydian-dominant",
          patternId: "upDown",
          keyOrder: "fourths",
          octaves: 2,
          instruction:
            "Lydian dominant - the #11 over a dominant. Perfect for a bVII7 or a tritone sub.",
        },
      ],
    },
    {
      id: "mehldau-odd-groupings",
      title: "Odd groupings over a 4 pulse",
      summary: "Play lines in 3s and let them phase against the metronome.",
      order: 2,
      steps: [
        {
          scaleId: "dorian",
          patternId: "groups3",
          keyOrder: "fourths",
          octaves: 2,
          instruction:
            "Groups of 3 up the Dorian scale against a steady 4. Feel the accent move around the beat.",
        },
        {
          scaleId: "melodic-minor",
          patternId: "groups3",
          keyOrder: "fourths",
          octaves: 2,
          instruction: "Same idea on melodic minor. Keep it singing, not mechanical.",
        },
      ],
    },
    {
      id: "mehldau-lydian-float",
      title: "The Lydian float",
      summary: "Lydian over maj7#11 for a weightless, modern major sound.",
      order: 3,
      steps: [
        {
          scaleId: "lydian",
          patternId: "thirds",
          keyOrder: "fourths",
          octaves: 2,
          instruction:
            "Lydian in thirds. Lean on the #4 - that's the note that lifts the whole scale.",
        },
      ],
    },
  ],
};

export default mehldau;
