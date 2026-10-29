import type { Teacher } from "../types";

const bach: Teacher = {
  id: "bach",
  name: "J.S. Bach",
  style: "Baroque",
  era: "1685-1750",
  color: "hsl(38 38% 60%)",
  tagline: "Every key, even hands, voice-leading above all.",
  bio: `Built on the well-tempered keyboard: be at home in all twenty-four keys, with both hands equally fluent. Scales here aren't finger exercises. They're the raw material of counterpoint, so play them cleanly and evenly, and listen to how each voice moves.`,
  philosophy: `Work slowly and evenly. Keep the hands balanced; the left hand is not a passenger. Learn a scale in a key only once you can hear each degree resolve. Then take it through the circle of fifths so no key feels foreign.`,
  scalarVocab: [
    "major",
    "natural-minor",
    "harmonic-minor",
    "melodic-minor",
    "dorian",
    "phrygian",
    "lydian",
    "mixolydian",
    "chromatic",
  ],
  favoriteKeys: ["C", "G", "D", "A", "E", "B", "F", "Bb", "Eb", "Ab"],
  signatureTips: [
    "Even tone, even time. A scale that rushes has no counterpoint in it.",
    "Both hands must be equally able. Practice the weaker hand alone.",
    "Hear the leading tone pull to the tonic before you play it.",
  ],
  lessons: [
    {
      id: "bach-major-fifths",
      title: "Major scales around the circle",
      summary:
        "The foundation: major scales, two octaves, up and down, moving through the circle of fifths.",
      order: 1,
      steps: [
        {
          scaleId: "major",
          patternId: "upDown",
          keyOrder: "fifths",
          octaves: 2,
          instruction:
            "Two octaves, up and down, perfectly even. Begin at a slow tempo and let no note stick out.",
        },
        {
          scaleId: "major",
          patternId: "thirds",
          keyOrder: "fifths",
          octaves: 2,
          instruction:
            "Now in thirds. This trains the ear to hear two voices at once - the beginning of counterpoint.",
        },
      ],
    },
    {
      id: "bach-three-minors",
      title: "The three minors",
      summary:
        "Natural, harmonic and melodic minor in the same key, so the ear learns how the 6th and 7th change.",
      order: 2,
      steps: [
        {
          scaleId: "natural-minor",
          patternId: "upDown",
          keys: ["A", "E", "D", "G", "C"],
          octaves: 2,
          instruction: "Natural minor first - the plain form, borrowed from the relative major.",
        },
        {
          scaleId: "harmonic-minor",
          patternId: "upDown",
          keys: ["A", "E", "D", "G", "C"],
          octaves: 2,
          instruction:
            "Harmonic minor. Feel the raised 7th leading home, and the wide step from the b6.",
        },
        {
          scaleId: "melodic-minor",
          patternId: "upDown",
          keys: ["A", "E", "D", "G", "C"],
          octaves: 2,
          instruction:
            "Melodic minor. Classically the 6 and 7 are raised ascending and lowered descending; here play it even both ways and simply hear the colour.",
        },
      ],
    },
    {
      id: "bach-modal-study",
      title: "Modal study",
      summary: "The church modes from a common tonic, to hear each colour against one root.",
      order: 3,
      steps: [
        {
          scaleId: "dorian",
          patternId: "upDown",
          keys: ["D", "G", "C"],
          octaves: 1,
          instruction: "Dorian - the minor with a bright 6th.",
        },
        {
          scaleId: "phrygian",
          patternId: "upDown",
          keys: ["E", "A", "D"],
          octaves: 1,
          instruction: "Phrygian - the dark b2 colours everything.",
        },
        {
          scaleId: "lydian",
          patternId: "upDown",
          keys: ["F", "C", "G"],
          octaves: 1,
          instruction: "Lydian - the raised 4th floats.",
        },
        {
          scaleId: "mixolydian",
          patternId: "upDown",
          keys: ["G", "C", "F"],
          octaves: 1,
          instruction: "Mixolydian - major with a lowered 7th.",
        },
      ],
    },
    {
      id: "bach-chromatic",
      title: "Chromatic finger independence",
      summary: "The chromatic scale for evenness and independence of the fingers.",
      order: 4,
      steps: [
        {
          scaleId: "chromatic",
          patternId: "upDown",
          keys: ["C", "G", "D"],
          octaves: 2,
          instruction:
            "All twelve notes, two octaves. Keep the thumb-unders smooth and the rhythm machine-even.",
        },
      ],
    },
  ],
};

export default bach;
