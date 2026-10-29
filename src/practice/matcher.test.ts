import { describe, it, expect } from "vitest";
import { Matcher } from "./matcher";
import { generateExercise } from "@/exercises/patterns";
import { getScaleInfo } from "@/theory/engine";
import { getScaleDef } from "@/theory/catalog";

const cMajorAsc = () =>
  generateExercise(getScaleInfo("C", getScaleDef("major")), "ascending", {
    octaves: 1,
  });

describe("Matcher", () => {
  it("advances on correct notes and finishes", () => {
    const seq = cMajorAsc();
    const m = new Matcher(seq, { mode: "exact-octave" });
    let last = "";
    for (const n of seq) last = m.press(n.midi, 80);
    expect(last).toBe("done");
    expect(m.done).toBe(true);
    const sum = m.summarize();
    expect(sum.accuracy).toBe(1);
    expect(sum.total).toBe(seq.length);
  });

  it("flags wrong notes but stays on target", () => {
    const seq = cMajorAsc();
    const m = new Matcher(seq, { mode: "exact-octave" });
    expect(m.press(seq[0].midi + 1, 80)).toBe("wrong");
    expect(m.currentIndex).toBe(0);
    // correct it
    expect(m.press(seq[0].midi, 80)).toBe("correct");
    expect(m.currentIndex).toBe(1);
    // the first note should be marked incorrect in results
    expect(m.getResults()[0].correct).toBe(false);
  });

  it("any-octave mode matches by pitch class", () => {
    const seq = cMajorAsc();
    const m = new Matcher(seq, { mode: "any-octave" });
    // play C in a different octave
    expect(m.press(seq[0].midi + 12, 80)).toBe("correct");
  });
});
