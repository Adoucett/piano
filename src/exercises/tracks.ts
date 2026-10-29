/**
 * The curriculum: four parallel tracks, each with five tiers. Tracks advance
 * independently (an ear player can be deep in Scales and early in Reading).
 * A Vocabulary tier opens once the Rhythm tier below it is "Secure" (lines need time, not reading).
 */
import type { ExerciseSpec, KeyOrder, PatternId } from "@/types";
import type { ReadingDrillSpec } from "./reading";
import { keysForOrder } from "@/theory/catalog";

export type TrackId = "scales" | "reading" | "rhythm" | "vocab";

export type UnitDef =
  | { kind: "scale"; id: string; title: string; scaleIds: string[]; patternIds: PatternId[]; keyOrder: KeyOrder; octaves: number }
  | { kind: "progression"; id: string; title: string; progressionId: string; patternIds: PatternId[]; keyOrder: KeyOrder }
  | { kind: "reading"; id: string; title: string; drill: ReadingDrillSpec }
  | { kind: "rhythm"; id: string; title: string; drillId: string };

export interface Tier {
  id: string;
  track: TrackId;
  n: number;
  title: string;
  description: string;
  units: UnitDef[];
}

export interface Track {
  id: TrackId;
  title: string;
  blurb: string;
  tiers: Tier[];
}

const T = (track: TrackId, n: number, title: string, description: string, units: UnitDef[]): Tier => ({
  id: `${track}-${n}`,
  track,
  n,
  title,
  description,
  units,
});

const reading = (id: string, title: string, drill: Omit<ReadingDrillSpec, "id" | "title">): UnitDef => ({
  kind: "reading",
  id,
  title,
  drill: { id, title, ...drill },
});

export const TRACKS: Track[] = [
  {
    id: "scales",
    title: "Scales & Modes",
    blurb: "Four parent scales, then every mode against the chord it lives on.",
    tiers: [
      T("scales", 1, "Parent scales", "Major, melodic minor, harmonic minor, harmonic major. Every mode comes from one of these four.", [
        { kind: "scale", id: "major", title: "Major", scaleIds: ["major"], patternIds: ["upDown", "thirds", "groups4"], keyOrder: "fifths", octaves: 2 },
        { kind: "scale", id: "melodic-minor", title: "Melodic minor", scaleIds: ["melodic-minor"], patternIds: ["upDown", "thirds", "sevenths"], keyOrder: "fourths", octaves: 2 },
        { kind: "scale", id: "harmonic-minor", title: "Harmonic minor", scaleIds: ["harmonic-minor"], patternIds: ["upDown", "thirds"], keyOrder: "fourths", octaves: 2 },
        { kind: "scale", id: "harmonic-major", title: "Harmonic major", scaleIds: ["harmonic-major"], patternIds: ["upDown", "thirds"], keyOrder: "fourths", octaves: 1 },
      ]),
      T("scales", 2, "Modes against their chord", "Dorian on m7, Mixolydian on 7, Lydian on maj7♯11. Played from the chord's tones, not just from the root.", [
        { kind: "scale", id: "dorian", title: "Dorian · –7", scaleIds: ["dorian"], patternIds: ["upDown", "fromThird", "sevenths"], keyOrder: "fourths", octaves: 2 },
        { kind: "scale", id: "mixolydian", title: "Mixolydian · 7", scaleIds: ["mixolydian"], patternIds: ["upDown", "fromSeventh", "sevenths"], keyOrder: "fourths", octaves: 2 },
        { kind: "scale", id: "lydian", title: "Lydian · Δ7♯11", scaleIds: ["lydian"], patternIds: ["upDown", "fromFifth"], keyOrder: "fourths", octaves: 2 },
        { kind: "scale", id: "locrian2", title: "Locrian ♯2 · ø7", scaleIds: ["locrian-sharp2"], patternIds: ["upDown", "fromThird"], keyOrder: "fourths", octaves: 1 },
      ]),
      T("scales", 3, "Bebop scales", "The passing tone that puts chord tones on the beat. Descend from 7, 5 and 3.", [
        { kind: "scale", id: "bebop-dominant", title: "Bebop dominant", scaleIds: ["bebop-dominant"], patternIds: ["descending", "bebopFrom7", "bebopFrom5", "bebopFrom3"], keyOrder: "fourths", octaves: 2 },
        { kind: "scale", id: "bebop-major", title: "Bebop major", scaleIds: ["bebop-major"], patternIds: ["descending", "bebopFrom5", "bebopFrom3"], keyOrder: "fourths", octaves: 2 },
        { kind: "scale", id: "bebop-minor", title: "Bebop minor", scaleIds: ["bebop-minor", "bebop-melodic-minor"], patternIds: ["descending", "bebopFrom7"], keyOrder: "fourths", octaves: 2 },
      ]),
      T("scales", 4, "Altered & symmetric", "The tension scales over dominants: altered, both diminished, whole tone, Lydian dominant.", [
        { kind: "scale", id: "altered", title: "Altered · 7alt", scaleIds: ["altered"], patternIds: ["upDown", "thirds", "fromThird"], keyOrder: "fourths", octaves: 2 },
        { kind: "scale", id: "lydian-dominant", title: "Lydian dominant · 7♯11", scaleIds: ["lydian-dominant"], patternIds: ["upDown", "thirds"], keyOrder: "fourths", octaves: 2 },
        { kind: "scale", id: "diminished", title: "Diminished, both", scaleIds: ["half-whole-dim", "whole-half-dim"], patternIds: ["upDown", "groups4"], keyOrder: "chromatic", octaves: 2 },
        { kind: "scale", id: "whole-tone", title: "Whole tone · 7♯5", scaleIds: ["whole-tone"], patternIds: ["upDown", "thirds"], keyOrder: "chromatic", octaves: 2 },
      ]),
      T("scales", 5, "Colors", "Phrygian, Phrygian dominant, Mixolydian ♭6, Lydian augmented, pentatonics and blues.", [
        { kind: "scale", id: "phrygian", title: "Phrygian & Phrygian dominant", scaleIds: ["phrygian", "phrygian-dominant"], patternIds: ["upDown", "thirds"], keyOrder: "fourths", octaves: 1 },
        { kind: "scale", id: "mm-colors", title: "Mixolydian ♭6 & Lydian augmented", scaleIds: ["mixolydian-b6", "lydian-augmented", "dorian-b2"], patternIds: ["upDown", "thirds"], keyOrder: "fourths", octaves: 1 },
        { kind: "scale", id: "pentatonics", title: "Pentatonics & blues", scaleIds: ["minor-pentatonic", "major-pentatonic", "minor-blues"], patternIds: ["upDown", "groups4"], keyOrder: "fourths", octaves: 2 },
      ]),
    ],
  },
  {
    id: "reading",
    title: "Reading",
    blurb: "Exact pitch, exact octave. Landmarks first, then everything between them.",
    tiers: [
      T("reading", 1, "Landmarks", "Middle C, treble G, bass F and the Cs. Everything else is read relative to these.", [
        reading("read-landmarks-treble", "Treble landmarks", { mode: "landmarks", layout: "treble", count: 20 }),
        reading("read-landmarks-bass", "Bass landmarks", { mode: "landmarks", layout: "bass", count: 20 }),
      ]),
      T("reading", 2, "Every note, both clefs", "Naturals across the staff and the first ledger lines, then intervals by shape.", [
        reading("read-treble", "Treble notes", { mode: "notes", layout: "treble", count: 24 }),
        reading("read-bass", "Bass notes", { mode: "notes", layout: "bass", count: 24 }),
        reading("read-intervals", "Intervals by shape", { mode: "intervals", layout: "treble", count: 16 }),
      ]),
      T("reading", 3, "Reading in a key", "Key signatures stay in your head; the staff doesn't remind you.", [
        reading("read-key-flats", "Flat keys", { mode: "key", layout: "treble", keys: ["F", "Bb", "Eb", "Ab"], count: 24 }),
        reading("read-key-sharps", "Sharp keys", { mode: "key", layout: "treble", keys: ["G", "D", "A", "E"], count: 24 }),
        reading("read-key-bass", "Keys in the bass", { mode: "key", layout: "bass", keys: ["Bb", "Eb", "D", "A"], count: 20 }),
      ]),
      T("reading", 4, "Grand staff & chord stacks", "Both clefs at once, then read a stacked chord and play the voicing.", [
        reading("read-grand", "Grand staff notes", { mode: "notes", layout: "grand", count: 24 }),
        reading("read-chords-treble", "Chord stacks", { mode: "chords", layout: "treble", keys: ["C", "F", "Bb", "G"], count: 12 }),
        reading("read-chords-bass", "Chord stacks, bass", { mode: "chords", layout: "bass", keys: ["C", "F", "Bb", "G"], count: 12 }),
        reading("read-shells", "Shells and rootless voicings", { mode: "chords", layout: "treble", keys: ["F", "Bb", "Eb", "C"], count: 12, voicing: "rootless" }),
      ]),
      T("reading", 5, "Reading lines in time", "A new melody every day, in rhythm and in tempo, with no chord symbol to play from instead.", [
        reading("read-key-all", "All keys", { mode: "key", layout: "treble", keys: ["Db", "Gb", "B", "F#", "Ab", "E"], count: 24 }),
        { kind: "scale", id: "read-lines-major", title: "Sight-read: major keys", scaleIds: ["major"], patternIds: ["sightLine"], keyOrder: "fifths", octaves: 1 },
        { kind: "scale", id: "read-lines-minor", title: "Sight-read: Dorian and minor", scaleIds: ["dorian", "natural-minor"], patternIds: ["sightLine"], keyOrder: "fourths", octaves: 1 },
      ]),
    ],
  },
  {
    id: "rhythm",
    title: "Rhythm & Time",
    blurb: "Measured in milliseconds. Pulse, subdivision, swing, displacement, polyrhythm.",
    tiers: [
      T("rhythm", 1, "Pulse", "Quarters, eighths, and the click moved to 2 & 4.", [
        { kind: "rhythm", id: "pulse-quarters", title: "Quarter pulse", drillId: "pulse-quarters" },
        { kind: "rhythm", id: "pulse-eighths", title: "Straight eighths", drillId: "pulse-eighths" },
        { kind: "rhythm", id: "pulse-2-4", title: "Click on 2 & 4", drillId: "pulse-2-4" },
      ]),
      T("rhythm", 2, "Subdivision", "Triplets, sixteenths, and switching between grids.", [
        { kind: "rhythm", id: "triplets", title: "Triplets", drillId: "triplets" },
        { kind: "rhythm", id: "sixteenths", title: "Sixteenths", drillId: "sixteenths" },
        { kind: "rhythm", id: "subdivision-ladder", title: "Subdivision ladder", drillId: "subdivision-ladder" },
      ]),
      T("rhythm", 3, "Swing & space", "Swung eighths, the click on 4, and the click that disappears.", [
        { kind: "rhythm", id: "swing-eighths", title: "Swung eighths", drillId: "swing-eighths" },
        { kind: "rhythm", id: "click-on-4", title: "Click on 4", drillId: "click-on-4" },
        { kind: "rhythm", id: "gap-click", title: "Disappearing click", drillId: "gap-click" },
        { kind: "rhythm", id: "ballad-swing", title: "Ballad swing", drillId: "ballad-swing" },
      ]),
      T("rhythm", 4, "Displacement & groupings", "Off-beats, 3 over 4, groups of 5, the Charleston.", [
        { kind: "rhythm", id: "offbeats", title: "Off-beats", drillId: "offbeats" },
        { kind: "rhythm", id: "groups-of-3", title: "3 over 4", drillId: "groups-of-3" },
        { kind: "rhythm", id: "groups-of-5", title: "Groups of 5", drillId: "groups-of-5" },
        { kind: "rhythm", id: "charleston", title: "Charleston", drillId: "charleston" },
      ]),
      T("rhythm", 5, "Polyrhythm & dialogue", "3:2 and 4:3 between the hands, reading rhythms, call and response.", [
        { kind: "rhythm", id: "poly-3-2", title: "3 against 2", drillId: "poly-3-2" },
        { kind: "rhythm", id: "poly-4-3", title: "4 against 3", drillId: "poly-4-3" },
        { kind: "rhythm", id: "tap-notated", title: "Read and tap", drillId: "tap-notated" },
        { kind: "rhythm", id: "call-response", title: "Call and response", drillId: "call-response" },
        { kind: "rhythm", id: "uptempo-swing", title: "Up-tempo swing", drillId: "uptempo-swing" },
      ]),
    ],
  },
  {
    id: "vocab",
    title: "Jazz Vocabulary",
    blurb: "Lines, not scales: chord tones, approaches, cells and guide tones over changes.",
    tiers: [
      T("vocab", 1, "Arpeggios from every chord tone", "Start on the 3rd, 5th or 7th. The chord, not the root, is the point of departure.", [
        { kind: "scale", id: "v-arp-dorian", title: "Dorian from chord tones", scaleIds: ["dorian"], patternIds: ["sevenths", "fromThird", "fromFifth", "fromSeventh"], keyOrder: "fourths", octaves: 1 },
        { kind: "scale", id: "v-arp-mixo", title: "Mixolydian from chord tones", scaleIds: ["mixolydian"], patternIds: ["sevenths", "fromThird", "fromSeventh"], keyOrder: "fourths", octaves: 1 },
        { kind: "scale", id: "v-arp-major", title: "Major from chord tones", scaleIds: ["major"], patternIds: ["sevenths", "fromThird", "fromFifth"], keyOrder: "fourths", octaves: 1 },
      ]),
      T("vocab", 2, "Approach notes & enclosures", "Chromatic from below, scale tone from above, double chromatic, and the full enclosure.", [
        { kind: "scale", id: "v-approach-dom", title: "Approaches on a dominant", scaleIds: ["mixolydian"], patternIds: ["approachBelow", "approachAbove", "doubleChromatic"], keyOrder: "fourths", octaves: 1 },
        { kind: "scale", id: "v-enclose", title: "Enclosures", scaleIds: ["bebop-dominant", "dorian", "major"], patternIds: ["enclosures"], keyOrder: "fourths", octaves: 1 },
      ]),
      T("vocab", 3, "Cells & guide tones", "Digital 1-2-3-5 and 3-5-6-7 cells, and 3rds and 7ths through the changes.", [
        { kind: "scale", id: "v-digital", title: "Digital patterns", scaleIds: ["dorian", "mixolydian", "major"], patternIds: ["digital1235", "digital3567"], keyOrder: "fourths", octaves: 1 },
        { kind: "progression", id: "v-guide", title: "Guide tones: ii–V–I", progressionId: "ii-V-I-major", patternIds: ["guideTones"], keyOrder: "fourths" },
      ]),
      T("vocab", 4, "ii–V–I lines", "Scale lines and arpeggios through the cadence in every key.", [
        { kind: "progression", id: "v-251", title: "ii–V–I", progressionId: "ii-V-I-major", patternIds: ["ascending", "sevenths"], keyOrder: "fourths" },
        { kind: "progression", id: "v-251-alt", title: "ii–V(alt)–I", progressionId: "ii-V-I-altered", patternIds: ["ascending", "sevenths"], keyOrder: "fourths" },
      ]),
      T("vocab", 5, "Minor cadences", "Minor ii–V–i with the altered V, and the Phrygian dominant V.", [
        { kind: "progression", id: "v-minor-251", title: "Minor ii–V–i", progressionId: "ii-V-i-minor", patternIds: ["ascending", "sevenths", "guideTones"], keyOrder: "fourths" },
        { kind: "progression", id: "v-spanish", title: "V7♭9–i", progressionId: "V-i-spanish", patternIds: ["ascending", "sevenths"], keyOrder: "fourths" },
      ]),
    ],
  },
];

export const TRACK_BY_ID: Record<TrackId, Track> = Object.fromEntries(TRACKS.map((t) => [t.id, t])) as Record<TrackId, Track>;

export const TIER_BY_ID: Record<string, Tier> = Object.fromEntries(TRACKS.flatMap((t) => t.tiers).map((t) => [t.id, t]));

export function allTiers(): Tier[] {
  return TRACKS.flatMap((t) => t.tiers);
}

/** Within a track, a tier opens once the one before it reaches this progress. */
export const UNLOCK_THRESHOLD = 0.6;
/** A tier counts as "Secure" at this progress (used for Vocabulary cross-gating). */
export const TIER_SECURE = 0.85;

/**
 * Tier ids that must be Secure (across tracks) before this tier opens.
 * Vocabulary is played by ear first, so only time gates it: tier n needs Rhythm tier n-1.
 */
export function crossRequirements(tier: Tier): string[] {
  if (tier.track !== "vocab" || tier.n < 2) return [];
  return [`rhythm-${tier.n - 1}`];
}

/** Concrete exercise specs for a scale/progression unit (one per key, per scale, first pattern). */
export function unitExercises(unit: UnitDef, tierId?: string, patternId?: PatternId): ExerciseSpec[] {
  if (unit.kind === "scale") {
    const p = patternId ?? unit.patternIds[0];
    return unit.scaleIds.flatMap((scaleId) =>
      keysForOrder(unit.keyOrder).map((key) => ({
        scaleId,
        key,
        patternId: p,
        octaves: unit.octaves,
        source: { kind: "curriculum" as const, unitId: unit.id, tierId },
      }))
    );
  }
  if (unit.kind === "progression") {
    const p = patternId ?? unit.patternIds[0];
    return keysForOrder(unit.keyOrder).map((key) => ({
      scaleId: "major",
      key,
      patternId: p,
      octaves: 1,
      progressionId: unit.progressionId,
      source: { kind: "curriculum" as const, unitId: unit.id, tierId },
    }));
  }
  return [];
}
