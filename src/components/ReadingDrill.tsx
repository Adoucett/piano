import { useCallback, useEffect, useMemo, useState } from "react";
import type { NoteSpec } from "@/types";
import { inputBus, type NoteEvent } from "@/practice/inputBus";
import { useProgress, type ReadingKind } from "@/store/progress";
import { useHeldNotes } from "@/hooks/useInput";
import { StaffView } from "@/components/StaffView";
import { KeyboardView } from "@/components/KeyboardView";
import { Badge, Button, Card } from "@/components/ui";

const SHARP = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

function randomNote(kind: ReadingKind): NoteSpec {
  // Comfortable ranges per clef.
  const range =
    kind === "bass"
      ? [43, 60] // G2..C4
      : kind === "treble"
        ? [60, 81] // C4..A5
        : [43, 81]; // grand
  const midi = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
  const name = SHARP[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return {
    midi,
    name,
    letter: name[0] as NoteSpec["letter"],
    octave,
    full: `${name}${octave}`,
    duration: "w",
  };
}

interface Props {
  kind: ReadingKind;
  onExit: () => void;
}

export function ReadingDrill({ kind, onExit }: Props) {
  const held = useHeldNotes();
  const settings = useProgress((s) => s.settings);
  const recordReading = useProgress((s) => s.recordReading);
  const readingMastery = useProgress((s) => s.readingMastery);

  const [target, setTarget] = useState<NoteSpec>(() => randomNote(kind));
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");
  const [count, setCount] = useState({ seen: 0, correct: 0 });
  const [firstTry, setFirstTry] = useState(true);

  useEffect(() => {
    setTarget(randomNote(kind));
  }, [kind]);

  const nextNote = useCallback(() => {
    setTarget(randomNote(kind));
    setFeedback("none");
    setFirstTry(true);
  }, [kind]);

  const handleNote = useCallback(
    (e: NoteEvent) => {
      if (!e.on) return;
      const match = e.note % 12 === target.midi % 12;
      if (match) {
        setFeedback("correct");
        setCount((c) => ({ seen: c.seen + 1, correct: c.correct + (firstTry ? 1 : 0) }));
        recordReading(kind, firstTry);
        setTimeout(nextNote, 550);
      } else {
        setFeedback("wrong");
        setFirstTry(false);
      }
    },
    [target, firstTry, kind, recordReading, nextNote]
  );

  useEffect(() => inputBus.onNote(handleNote), [handleNote]);

  const clef = kind;
  const mastery = Math.round(readingMastery(kind) * 100);

  const labelFor = () =>
    settings.aidLevel === 0 || (settings.aidLevel <= 2 && feedback !== "none")
      ? target.name
      : null;

  const scalePCs = useMemo(() => undefined, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold capitalize">{kind} reading</h2>
          <Badge>mastery {mastery}%</Badge>
          <Badge>
            {count.correct}/{count.seen} first-try
          </Badge>
        </div>
        <Button variant="ghost" onClick={onExit}>
          Exit
        </Button>
      </div>

      <Card className="bg-slate-900/40">
        <StaffView
          notes={[target]}
          clef={clef}
          currentIndex={0}
          stateFor={() => (feedback === "correct" ? "correct" : feedback === "wrong" ? "wrong" : "current")}
          labelFor={labelFor}
          colorByLetter={settings.aidLevel <= 2}
        />
      </Card>

      <div className="text-center text-sm text-slate-400">
        {feedback === "wrong"
          ? "Not quite - try again. That note is " + (settings.aidLevel < 3 ? target.name : "...")
          : "Play the note shown."}
      </div>

      <KeyboardView
        held={held}
        expectedMidi={settings.aidLevel === 0 ? target.midi : null}
        scalePitchClasses={scalePCs}
        showAllLabels={settings.aidLevel === 0}
        colorByLetter
      />

      <div className="flex justify-end">
        <Button variant="subtle" onClick={nextNote}>
          Skip
        </Button>
      </div>
    </div>
  );
}
