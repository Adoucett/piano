import { useEffect, useRef } from "react";
import {
  Accidental,
  Annotation,
  Formatter,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  Voice,
} from "vexflow";
import type { NoteSpec } from "@/types";
import { toVexKey } from "@/lib/vexkey";
import { letterColor, prettyNote, STATE_COLOR } from "@/lib/notecolor";

export type NoteState = "correct" | "wrong" | "current" | "upcoming";

export interface StaffViewProps {
  notes: NoteSpec[];
  clef?: "treble" | "bass" | "grand";
  currentIndex?: number;
  stateFor?: (i: number) => NoteState;
  /** Return a label string for a note, or null for none. */
  labelFor?: (i: number, note: NoteSpec) => string | null;
  /** Color noteheads by their letter. */
  colorByLetter?: boolean;
  height?: number;
}

const NOTE_WIDTH = 46;
const LEFT_PAD = 70;

function stateColor(state: NoteState, note: NoteSpec, colorByLetter: boolean): string {
  switch (state) {
    case "correct":
      return STATE_COLOR.correct;
    case "wrong":
      return STATE_COLOR.wrong;
    case "current":
      return STATE_COLOR.target;
    default:
      return colorByLetter ? letterColor(note.letter) : "hsl(210 20% 90%)";
  }
}

export function StaffView({
  notes,
  clef = "treble",
  currentIndex = -1,
  stateFor,
  labelFor,
  colorByLetter = true,
  height,
}: StaffViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";
    if (!notes.length) return;

    const isGrand = clef === "grand";
    const h = height ?? (isGrand ? 230 : 160);
    const width = Math.max(
      (scrollRef.current?.clientWidth ?? 600),
      LEFT_PAD + notes.length * NOTE_WIDTH + 40
    );

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, h);
    const ctx = renderer.getContext();
    ctx.setFont("Arial", 12);

    const makeNote = (note: NoteSpec, i: number, forcedClef: "treble" | "bass") => {
      const { key, accidental } = toVexKey(note);
      const sn = new StaveNote({
        keys: [key],
        duration: note.duration ?? "q",
        clef: forcedClef,
      });
      if (accidental) sn.addModifier(new Accidental(accidental), 0);
      const state: NoteState = stateFor ? stateFor(i) : "upcoming";
      const color = stateColor(state, note, colorByLetter);
      sn.setStyle({ fillStyle: color, strokeStyle: color });
      const label = labelFor ? labelFor(i, note) : null;
      if (label != null) {
        const ann = new Annotation(prettyNote(label));
        ann.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
        ann.setFont("Arial", 13, "bold");
        sn.addModifier(ann, 0);
      }
      return sn;
    };

    if (isGrand) {
      const treble = new Stave(10, 10, width - 20);
      treble.addClef("treble").setContext(ctx).draw();
      const bass = new Stave(10, 110, width - 20);
      bass.addClef("bass").setContext(ctx).draw();
      new StaveConnector(treble, bass)
        .setType(StaveConnector.type.BRACE)
        .setContext(ctx)
        .draw();
      new StaveConnector(treble, bass)
        .setType(StaveConnector.type.SINGLE_LEFT)
        .setContext(ctx)
        .draw();

      const trebleNotes: StaveNote[] = [];
      const bassNotes: StaveNote[] = [];
      notes.forEach((note, i) => {
        if (note.midi >= 60) {
          trebleNotes.push(makeNote(note, i, "treble"));
          bassNotes.push(ghost(note.duration ?? "q", "bass"));
        } else {
          bassNotes.push(makeNote(note, i, "bass"));
          trebleNotes.push(ghost(note.duration ?? "q", "treble"));
        }
      });
      drawVoice(ctx, treble, trebleNotes, width);
      drawVoice(ctx, bass, bassNotes, width);
    } else {
      const stave = new Stave(10, isGrand ? 10 : 30, width - 20);
      stave.addClef(clef).setContext(ctx).draw();
      const vexNotes = notes.map((note, i) => makeNote(note, i, clef));
      drawVoice(ctx, stave, vexNotes, width);
    }

    // Auto-scroll so the current note stays visible.
    if (currentIndex >= 0 && scrollRef.current) {
      const x = LEFT_PAD + currentIndex * NOTE_WIDTH;
      const el = scrollRef.current;
      if (x < el.scrollLeft + 80 || x > el.scrollLeft + el.clientWidth - 120) {
        el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: "smooth" });
      }
    }
  }, [notes, clef, currentIndex, stateFor, labelFor, colorByLetter, height]);

  return (
    <div
      ref={scrollRef}
      className="w-full overflow-x-auto rounded-xl bg-white/95 py-2 shadow-inner"
    >
      <div ref={hostRef} />
    </div>
  );
}

function ghost(duration: string, clef: "treble" | "bass"): StaveNote {
  const key = clef === "treble" ? "b/4" : "d/3";
  const sn = new StaveNote({ keys: [key], duration, clef });
  sn.setStyle({ fillStyle: "transparent", strokeStyle: "transparent" });
  return sn;
}

function drawVoice(
  ctx: ReturnType<Renderer["getContext"]>,
  stave: Stave,
  notes: StaveNote[],
  width: number
) {
  const voice = new Voice({ num_beats: notes.length, beat_value: 4 });
  voice.setStrict(false);
  voice.addTickables(notes);
  new Formatter()
    .joinVoices([voice])
    .format([voice], width - LEFT_PAD - 40);
  voice.draw(ctx, stave);
}
