import type { Level, Unit } from "@/types";

/**
 * The curriculum: 10 levels, each covering all 12 keys. Units reference scale
 * ids from the catalog and the patterns they offer. Unlocking is computed in
 * the progress store (a level opens once the previous level is mostly mastered).
 */
export const CURRICULUM: Level[] = [
  {
    id: "l1-reading",
    title: "1. Staff Reading Basics",
    description:
      "Learn where the notes live. A note appears; play it. Letter-name labels start ON and fade as you improve.",
    units: [
      {
        id: "read-treble",
        title: "Treble clef notes",
        scaleIds: [],
        patternIds: ["ascending"],
        keyOrder: "chromatic",
        octaves: 1,
        readingDrill: "treble",
      },
      {
        id: "read-bass",
        title: "Bass clef notes",
        scaleIds: [],
        patternIds: ["ascending"],
        keyOrder: "chromatic",
        octaves: 1,
        readingDrill: "bass",
      },
      {
        id: "read-grand",
        title: "Grand staff notes",
        scaleIds: [],
        patternIds: ["ascending"],
        keyOrder: "chromatic",
        octaves: 1,
        readingDrill: "grand",
      },
    ],
  },
  {
    id: "l2-major",
    title: "2. Major Scales",
    description: "The foundation. One octave, then two, with fingering hints.",
    units: [
      {
        id: "major-1oct",
        title: "Major, one octave",
        scaleIds: ["major"],
        patternIds: ["ascending", "descending", "upDown"],
        keyOrder: "fifths",
        octaves: 1,
      },
      {
        id: "major-2oct",
        title: "Major, two octaves",
        scaleIds: ["major"],
        patternIds: ["upDown", "thirds", "groups4"],
        keyOrder: "fifths",
        octaves: 2,
      },
    ],
  },
  {
    id: "l3-minor",
    title: "3. The Minor Family",
    description: "Natural, harmonic and melodic (jazz) minor.",
    units: [
      {
        id: "natural-minor",
        title: "Natural minor",
        scaleIds: ["natural-minor"],
        patternIds: ["upDown", "thirds"],
        keyOrder: "fifths",
        octaves: 1,
      },
      {
        id: "harmonic-minor",
        title: "Harmonic minor",
        scaleIds: ["harmonic-minor"],
        patternIds: ["upDown", "thirds"],
        keyOrder: "fifths",
        octaves: 1,
      },
      {
        id: "melodic-minor",
        title: "Melodic (jazz) minor",
        scaleIds: ["melodic-minor"],
        patternIds: ["upDown", "thirds", "sevenths"],
        keyOrder: "fifths",
        octaves: 2,
      },
    ],
  },
  {
    id: "l4-modes",
    title: "4. Modes of the Major Scale",
    description:
      "Ionian through Locrian, each shown with the chord it fits over.",
    units: [
      {
        id: "dorian",
        title: "Dorian (m7)",
        scaleIds: ["dorian"],
        patternIds: ["upDown", "thirds", "sevenths"],
        keyOrder: "fourths",
        octaves: 2,
      },
      {
        id: "mixolydian",
        title: "Mixolydian (7)",
        scaleIds: ["mixolydian"],
        patternIds: ["upDown", "thirds", "sevenths"],
        keyOrder: "fourths",
        octaves: 2,
      },
      {
        id: "lydian",
        title: "Lydian (maj7#11)",
        scaleIds: ["lydian"],
        patternIds: ["upDown", "thirds"],
        keyOrder: "fourths",
        octaves: 2,
      },
      {
        id: "phrygian-locrian",
        title: "Phrygian & Locrian",
        scaleIds: ["phrygian", "locrian"],
        patternIds: ["upDown", "thirds"],
        keyOrder: "fourths",
        octaves: 1,
      },
    ],
  },
  {
    id: "l5-pentatonic",
    title: "5. Pentatonics & Blues",
    description: "Five-note scales and the blues.",
    units: [
      {
        id: "pentatonics",
        title: "Major & minor pentatonic",
        scaleIds: ["major-pentatonic", "minor-pentatonic"],
        patternIds: ["upDown", "groups4"],
        keyOrder: "fourths",
        octaves: 2,
      },
      {
        id: "blues",
        title: "Minor & major blues",
        scaleIds: ["minor-blues", "major-blues"],
        patternIds: ["upDown", "groups4"],
        keyOrder: "fourths",
        octaves: 2,
      },
    ],
  },
  {
    id: "l6-mm-modes",
    title: "6. Modes of Melodic Minor",
    description:
      "The jazz workhorses: Lydian dominant, altered, Locrian #2 and friends.",
    units: [
      {
        id: "altered",
        title: "Altered (7alt)",
        scaleIds: ["altered"],
        patternIds: ["upDown", "thirds", "sevenths"],
        keyOrder: "fourths",
        octaves: 2,
      },
      {
        id: "lydian-dominant",
        title: "Lydian dominant (7#11)",
        scaleIds: ["lydian-dominant"],
        patternIds: ["upDown", "thirds", "sevenths"],
        keyOrder: "fourths",
        octaves: 2,
      },
      {
        id: "locrian2-rest",
        title: "Locrian #2 & the rest",
        scaleIds: [
          "locrian-sharp2",
          "dorian-b2",
          "lydian-augmented",
          "mixolydian-b6",
        ],
        patternIds: ["upDown", "thirds"],
        keyOrder: "fourths",
        octaves: 1,
      },
    ],
  },
  {
    id: "l7-hm-modes",
    title: "7. Modes of Harmonic Minor",
    description: "Phrygian dominant and the ultralocrian.",
    units: [
      {
        id: "phrygian-dominant",
        title: "Phrygian dominant (7b9)",
        scaleIds: ["phrygian-dominant"],
        patternIds: ["upDown", "thirds", "sevenths"],
        keyOrder: "fourths",
        octaves: 2,
      },
      {
        id: "ultralocrian",
        title: "Ultralocrian",
        scaleIds: ["ultralocrian"],
        patternIds: ["upDown", "thirds"],
        keyOrder: "fourths",
        octaves: 1,
      },
    ],
  },
  {
    id: "l8-symmetric",
    title: "8. Symmetric Scales",
    description: "Whole tone, both diminished scales, and chromatic.",
    units: [
      {
        id: "whole-tone",
        title: "Whole tone (7#5)",
        scaleIds: ["whole-tone"],
        patternIds: ["upDown", "thirds"],
        keyOrder: "chromatic",
        octaves: 2,
      },
      {
        id: "diminished",
        title: "Diminished (both)",
        scaleIds: ["half-whole-dim", "whole-half-dim"],
        patternIds: ["upDown", "groups4", "sevenths"],
        keyOrder: "chromatic",
        octaves: 2,
      },
      {
        id: "chromatic",
        title: "Chromatic",
        scaleIds: ["chromatic"],
        patternIds: ["upDown"],
        keyOrder: "chromatic",
        octaves: 1,
      },
    ],
  },
  {
    id: "l9-bebop",
    title: "9. Bebop Scales",
    description:
      "Eight-note scales whose passing tone keeps chord tones on the beat.",
    units: [
      {
        id: "bebop-dominant",
        title: "Bebop dominant",
        scaleIds: ["bebop-dominant"],
        patternIds: ["ascending", "descending", "upDown"],
        keyOrder: "fourths",
        octaves: 2,
      },
      {
        id: "bebop-major",
        title: "Bebop major",
        scaleIds: ["bebop-major"],
        patternIds: ["ascending", "descending", "upDown"],
        keyOrder: "fourths",
        octaves: 2,
      },
      {
        id: "bebop-minor",
        title: "Bebop minor & melodic",
        scaleIds: ["bebop-minor", "bebop-melodic-minor"],
        patternIds: ["ascending", "descending", "upDown"],
        keyOrder: "fourths",
        octaves: 2,
      },
    ],
  },
  {
    id: "l10-advanced",
    title: "10. Advanced Jazz Lines",
    description:
      "Enclosures, digital patterns and arpeggios over dominant harmony.",
    units: [
      {
        id: "enclosures",
        title: "Enclosures on chord tones",
        scaleIds: ["bebop-dominant", "altered"],
        patternIds: ["enclosures"],
        keyOrder: "fourths",
        octaves: 1,
      },
      {
        id: "digital-patterns",
        title: "Digital patterns (1235 / 1357)",
        scaleIds: ["dorian", "mixolydian", "major"],
        patternIds: ["groups4", "sevenths"],
        keyOrder: "fourths",
        octaves: 2,
      },
    ],
  },
];

export const LEVEL_BY_ID: Record<string, Level> = Object.fromEntries(
  CURRICULUM.map((l) => [l.id, l])
);

export function allUnits(): { level: Level; unit: Unit }[] {
  return CURRICULUM.flatMap((level) =>
    level.units.map((unit) => ({ level, unit }))
  );
}

/** Mastery threshold (0..1) a level must reach to unlock the next one. */
export const UNLOCK_THRESHOLD = 0.6;
