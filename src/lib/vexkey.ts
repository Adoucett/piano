import type { NoteSpec } from "@/types";

/** Convert a NoteSpec into a VexFlow key + accidental token. */
export function toVexKey(note: NoteSpec): { key: string; accidental: string | null } {
  // name like "Eb", "F#", "C", "Ebb", "F##"
  const letter = note.name[0].toLowerCase();
  const accPart = note.name.slice(1); // "", "b", "#", "bb", "##"
  let accidental: string | null = null;
  if (accPart === "b" || accPart === "bb" || accPart === "#" || accPart === "##") {
    accidental = accPart;
  }
  const key = `${letter}${accPart}/${note.octave}`;
  return { key, accidental };
}
