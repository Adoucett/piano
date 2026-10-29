import type { Teacher } from "../types";

const pop: Teacher = {
  id: "pop",
  name: "Remi Vale",
  style: "Pop / songwriter",
  era: "contemporary",
  color: "hsl(342 28% 66%)",
  tagline: "Four chords, big hooks, scales you can actually sing.",
  bio: `Songwriter's piano: what sounds good, fast. You don't need twelve exotic scales to make people feel something. You need the major scale, its pentatonics, and enough Mixolydian and Dorian to add colour. Simple and groovy.`,
  philosophy: `Learn the shapes that show up in real songs and get them smooth in the five or six keys everyone actually plays in. Pentatonics are your safety net; major and its modes are your palette. Keep good time above all - a pop line lives and dies by the groove.`,
  scalarVocab: [
    "major",
    "major-pentatonic",
    "minor-pentatonic",
    "natural-minor",
    "mixolydian",
    "dorian",
  ],
  favoriteKeys: ["C", "G", "D", "A", "E", "F"],
  signatureTips: [
    "If you're unsure, a pentatonic almost never sounds wrong.",
    "Groove first. A simple line in perfect time beats a fancy one that drags.",
    "Mixolydian is your 'classic rock / gospel-pop' sound - major with a flat 7.",
  ],
  lessons: [
    {
      id: "pop-pentatonics",
      title: "Pentatonics that fit everything",
      summary: "Major and minor pentatonic in the guitar-friendly keys.",
      order: 1,
      steps: [
        {
          scaleId: "major-pentatonic",
          patternId: "upDown",
          keys: ["C", "G", "D", "A", "E"],
          octaves: 2,
          instruction: "Major pentatonic. Bright, happy, impossible to mess up.",
        },
        {
          scaleId: "minor-pentatonic",
          patternId: "upDown",
          keys: ["A", "E", "D", "G", "C"],
          octaves: 2,
          instruction: "Minor pentatonic. The riff scale. Same shapes, different mood.",
        },
      ],
    },
    {
      id: "pop-mixo-groove",
      title: "The Mixolydian groove",
      summary: "The flat-7 major sound behind countless pop and gospel-pop tracks.",
      order: 2,
      steps: [
        {
          scaleId: "mixolydian",
          patternId: "groups4",
          keys: ["G", "C", "D", "A"],
          octaves: 2,
          instruction:
            "Groups of four, in time with the click. Lock the groove before you speed up.",
        },
      ],
    },
    {
      id: "pop-major-keys",
      title: "Major scales for singers",
      summary: "The major scale in the keys songs are actually written in.",
      order: 3,
      steps: [
        {
          scaleId: "major",
          patternId: "upDown",
          keys: ["C", "G", "D", "F", "A"],
          octaves: 1,
          instruction: "One octave, clean and even. These are the keys you'll see most.",
        },
      ],
    },
  ],
};

export default pop;
