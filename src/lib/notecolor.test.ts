import { describe, it, expect } from "vitest";
import { prettyNote } from "./notecolor";

describe("prettyNote", () => {
  it("converts accidentals on notes and degrees", () => {
    expect(prettyNote("Eb")).toBe("E♭");
    expect(prettyNote("F# Bbb C##")).toBe("F♯ B𝄫 C𝄪");
    expect(prettyNote("1 2 b3 4 5 6 b7")).toBe("1 2 ♭3 4 5 6 ♭7");
    expect(prettyNote("maj7#11 and 7b9")).toBe("maj7♯11 and 7♭9");
  });

  it("leaves prose alone", () => {
    expect(prettyNote("Bebop dominant, built on the beat")).toBe("Bebop dominant, built on the beat");
    expect(prettyNote("Abandon Debussy")).toBe("Abandon Debussy");
  });
});
