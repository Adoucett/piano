import { describe, it, expect } from "vitest";
import { generateExercise } from "./patterns";
import { getScaleInfo } from "@/theory/engine";
import { getScaleDef } from "@/theory/catalog";

const cMajor = () => getScaleInfo("C", getScaleDef("major"));

describe("generateExercise", () => {
  it("ascending one octave is 8 notes C..C", () => {
    const seq = generateExercise(cMajor(), "ascending", { octaves: 1 });
    expect(seq.map((n) => n.full)).toEqual([
      "C4",
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
      "C5",
    ]);
  });

  it("upDown mirrors without repeating the top", () => {
    const seq = generateExercise(cMajor(), "upDown", { octaves: 1 });
    expect(seq[0].full).toBe("C4");
    expect(seq[seq.length - 1].full).toBe("C4");
    expect(seq.length).toBe(15);
  });

  it("thirds pair tones a third apart", () => {
    const seq = generateExercise(cMajor(), "thirds", { octaves: 1 });
    expect(seq[0].full).toBe("C4");
    expect(seq[1].full).toBe("E4");
    expect(seq[2].full).toBe("D4");
    expect(seq[3].full).toBe("F4");
  });

  it("sevenths build a 4-note arpeggio per degree", () => {
    const seq = generateExercise(cMajor(), "sevenths", { octaves: 1 });
    // First arpeggio: C E G B (Cmaj7)
    expect(seq.slice(0, 4).map((n) => n.name)).toEqual(["C", "E", "G", "B"]);
    expect(seq.length % 4).toBe(0);
  });

  it("enclosures land on a target after above/below", () => {
    const seq = generateExercise(cMajor(), "enclosures");
    expect(seq[2].label).toBe("target");
    expect(seq.length).toBeGreaterThan(0);
  });

  it("every catalog scale generates a non-empty upDown run", () => {
    for (const id of [
      "major",
      "dorian",
      "altered",
      "bebop-dominant",
      "half-whole-dim",
      "whole-tone",
      "minor-blues",
    ]) {
      const seq = generateExercise(getScaleInfo("Eb", getScaleDef(id)), "upDown", {
        octaves: 2,
      });
      expect(seq.length).toBeGreaterThan(4);
      for (let i = 1; i < seq.length; i++) {
        expect(Number.isFinite(seq[i].midi)).toBe(true);
      }
    }
  });
});
