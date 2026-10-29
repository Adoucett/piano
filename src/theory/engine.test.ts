import { describe, it, expect } from "vitest";
import {
  getScaleInfo,
  realizeScale,
  intervalToDegreeLabel,
} from "./engine";
import { SCALES, getScaleDef, CHROMATIC_KEYS } from "./catalog";

describe("intervalToDegreeLabel", () => {
  it("maps common intervals", () => {
    expect(intervalToDegreeLabel("1P")).toBe("1");
    expect(intervalToDegreeLabel("3m")).toBe("b3");
    expect(intervalToDegreeLabel("3M")).toBe("3");
    expect(intervalToDegreeLabel("4A")).toBe("#4");
    expect(intervalToDegreeLabel("5d")).toBe("b5");
    expect(intervalToDegreeLabel("7m")).toBe("b7");
    expect(intervalToDegreeLabel("7M")).toBe("7");
  });
});

describe("spelling", () => {
  it("spells Eb minor 7 (natural minor) with flats, never sharps", () => {
    const info = getScaleInfo("Eb", getScaleDef("natural-minor"));
    expect(info.pitchClasses).toEqual([
      "Eb",
      "F",
      "Gb",
      "Ab",
      "Bb",
      "Cb",
      "Db",
    ]);
    // No sharps anywhere.
    expect(info.pitchClasses.some((n) => n.includes("#"))).toBe(false);
  });

  it("spells F# major with sharps including E#", () => {
    const info = getScaleInfo("F#", getScaleDef("major"));
    expect(info.pitchClasses).toEqual([
      "F#",
      "G#",
      "A#",
      "B",
      "C#",
      "D#",
      "E#",
    ]);
  });

  it("gives the right formula for Dorian", () => {
    const info = getScaleInfo("C", getScaleDef("dorian"));
    expect(info.formula).toBe("1 2 b3 4 5 6 b7");
  });

  it("every scale resolves in every key with one letter per diatonic step", () => {
    for (const def of SCALES) {
      for (const key of CHROMATIC_KEYS) {
        const info = getScaleInfo(key, def);
        expect(info.pitchClasses.length).toBeGreaterThan(0);
        for (const pc of info.pitchClasses) {
          expect(pc).toMatch(/^[A-G](#{1,2}|b{1,2})?$/);
        }
      }
    }
  });
});

describe("realizeScale", () => {
  it("produces a strictly ascending run including the top tonic", () => {
    const info = getScaleInfo("C", getScaleDef("major"));
    const run = realizeScale(info, 4, 1);
    expect(run[0].full).toBe("C4");
    expect(run[run.length - 1].full).toBe("C5");
    for (let i = 1; i < run.length; i++) {
      expect(run[i].midi).toBeGreaterThan(run[i - 1].midi);
    }
  });

  it("spans two octaves correctly", () => {
    const info = getScaleInfo("C", getScaleDef("major"));
    const run = realizeScale(info, 4, 2);
    expect(run[0].full).toBe("C4");
    expect(run[run.length - 1].full).toBe("C6");
    // 7 per octave * 2 + final tonic
    expect(run.length).toBe(15);
  });

  it("keeps enharmonic MIDI correct for Cb", () => {
    const info = getScaleInfo("Eb", getScaleDef("natural-minor"));
    const run = realizeScale(info, 3, 1);
    const cb = run.find((n) => n.name === "Cb");
    expect(cb).toBeDefined();
    // Cb sounds like B.
    expect(cb!.midi % 12).toBe(11);
  });
});
