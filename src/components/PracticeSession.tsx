import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExerciseSpec, NoteSpec, RunSummary } from "@/types";
import { buildExercise } from "@/exercises/patterns";
import { getScaleInfo, chordSymbol } from "@/theory/engine";
import { getScaleDef } from "@/theory/catalog";
import { PATTERN_BY_ID } from "@/exercises/patterns";
import { Matcher } from "@/practice/matcher";
import { metronome } from "@/practice/metronome";
import { inputBus, type NoteEvent } from "@/practice/inputBus";
import { synth } from "@/audio/synth";
import { midiOutput } from "@/midi/midiOutput";
import { useProgress } from "@/store/progress";
import { useHeldNotes } from "@/hooks/useInput";
import { StaffView, type NoteState } from "@/components/StaffView";
import { KeyboardView } from "@/components/KeyboardView";
import { Badge, Button, Card } from "@/components/ui";
import { prettyNote } from "@/lib/notecolor";
import { Note } from "tonal";

interface Props {
  queue: ExerciseSpec[];
  onExit: () => void;
}

export function PracticeSession({ queue, onExit }: Props) {
  const settings = useProgress((s) => s.settings);
  const recordRun = useProgress((s) => s.recordRun);
  const held = useHeldNotes();

  const [qIndex, setQIndex] = useState(0);
  const spec = queue[qIndex];

  const { notes, info, def } = useMemo(() => {
    const def = getScaleDef(spec.scaleId);
    const info = getScaleInfo(spec.key, def);
    const notes = buildExercise(spec);
    return { notes, info, def };
  }, [spec]);

  const matcherRef = useRef<Matcher>(new Matcher(notes, { mode: settings.matchMode }));
  const [version, bump] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongAt, setWrongAt] = useState<number | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [delayedVisible, setDelayedVisible] = useState(false);
  const targetSetAtRef = useRef<number>(performance.now());

  // (Re)create the matcher whenever the exercise or match mode changes.
  useEffect(() => {
    matcherRef.current = new Matcher(notes, { mode: settings.matchMode });
    setCurrentIndex(0);
    setWrongAt(null);
    setSummary(null);
    targetSetAtRef.current = performance.now();
    bump((v) => v + 1);
  }, [notes, settings.matchMode]);

  // Metronome for tempo mode.
  useEffect(() => {
    if (settings.practiceMode === "tempo") {
      metronome.setBpm(settings.bpm);
      metronome.start();
      return () => metronome.stop();
    }
  }, [settings.practiceMode, settings.bpm, qIndex, summary]);

  // Aid level 2: reveal the current note's label after a short delay.
  useEffect(() => {
    if (settings.aidLevel !== 2) return;
    setDelayedVisible(false);
    const t = setTimeout(() => setDelayedVisible(true), 1400);
    return () => clearTimeout(t);
  }, [currentIndex, settings.aidLevel, qIndex]);

  const finalize = useCallback(() => {
    const sum = matcherRef.current.summarize();
    setSummary(sum);
    recordRun(spec, sum);
  }, [recordRun, spec]);

  const handleNote = useCallback(
    (e: NoteEvent) => {
      if (!e.on || summary) return;
      const res = matcherRef.current.press(e.note, e.velocity);
      if (res === "wrong") {
        setWrongAt(matcherRef.current.currentIndex);
        setTimeout(() => setWrongAt(null), 300);
      } else if (res === "correct" || res === "done") {
        setCurrentIndex(matcherRef.current.currentIndex);
        targetSetAtRef.current = performance.now();
        if (res === "done") finalize();
      }
      bump((v) => v + 1);
    },
    [summary, finalize]
  );

  useEffect(() => inputBus.onNote(handleNote), [handleNote]);

  const stateFor = useCallback(
    (i: number): NoteState => {
      const results = matcherRef.current.getResults();
      if (i === wrongAt) return "wrong";
      if (i < currentIndex) return results[i]?.correct ? "correct" : "wrong";
      if (i === currentIndex) return "current";
      return "upcoming";
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [currentIndex, wrongAt, version]
  );

  const labelFor = useCallback(
    (i: number, note: NoteSpec): string | null => {
      switch (settings.aidLevel) {
        case 0:
          return note.name;
        case 1:
          return i === currentIndex ? note.name : null;
        case 2:
          return i === currentIndex && delayedVisible ? note.name : null;
        default:
          return null;
      }
    },
    [settings.aidLevel, currentIndex, delayedVisible]
  );

  const colorByLetter = settings.aidLevel <= 2;
  const scalePCs = useMemo(
    () =>
      settings.aidLevel === 0
        ? new Set(info.pitchClasses.map((pc) => ((Note.chroma(pc) ?? 0) + 12) % 12))
        : undefined,
    [info, settings.aidLevel]
  );
  const pcLabels = useMemo(() => {
    const m: Record<number, string> = {};
    for (const pc of info.pitchClasses) m[((Note.chroma(pc) ?? 0) + 12) % 12] = pc;
    return m;
  }, [info]);

  const expected = notes[currentIndex];
  const chordFit = def.chords[0] ? `fits ${chordSymbol(spec.key, def.chords[0])}` : null;

  const playDemo = async () => {
    const seq = notes.map((n) => n.midi);
    const noteMs = Math.max(140, 60000 / settings.bpm / 2);
    if (settings.preferMidiOutput && midiOutput.available) {
      for (const m of seq) {
        midiOutput.noteOn(m, 70);
        await new Promise((r) => setTimeout(r, noteMs));
        midiOutput.noteOff(m);
      }
    } else {
      await synth.play(seq, noteMs, 70);
    }
  };

  const restart = () => {
    matcherRef.current.reset();
    setCurrentIndex(0);
    setSummary(null);
    setWrongAt(null);
    bump((v) => v + 1);
  };

  const next = () => {
    if (qIndex + 1 < queue.length) setQIndex(qIndex + 1);
    else onExit();
  };

  const clef: "treble" | "bass" | "grand" =
    expected && expected.midi < 57 ? "bass" : "treble";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">
              {prettyNote(spec.key)} {def.name}
            </h2>
            {chordFit && <Badge className="bg-sky-500/20 text-sky-200">{chordFit}</Badge>}
            <Badge>{PATTERN_BY_ID[spec.patternId].name}</Badge>
          </div>
          <div className="mt-1 font-mono text-sm text-slate-400">{prettyNote(info.formula)}</div>
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 1 && (
            <Badge>
              {qIndex + 1} / {queue.length}
            </Badge>
          )}
          <Button variant="outline" onClick={playDemo}>
            Listen
          </Button>
          <Button variant="ghost" onClick={onExit}>
            Exit
          </Button>
        </div>
      </div>

      {spec.source?.instruction && (
        <Card className="border-sky-400/30 bg-sky-500/10 text-sm text-sky-100">
          {spec.source.instruction}
        </Card>
      )}

      <Card className="bg-slate-900/40">
        <StaffView
          notes={notes}
          clef={clef}
          currentIndex={currentIndex}
          stateFor={stateFor}
          labelFor={labelFor}
          colorByLetter={colorByLetter}
        />
      </Card>

      <KeyboardView
        held={held}
        expectedMidi={expected?.midi ?? null}
        scalePitchClasses={scalePCs}
        pcLabels={pcLabels}
        showAllLabels={settings.aidLevel === 0}
        colorByLetter
      />

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{def.tip}</span>
        <div className="flex gap-2">
          <Button variant="subtle" onClick={restart}>
            Restart
          </Button>
        </div>
      </div>

      {summary && (
        <SummaryCard summary={summary} onNext={next} onRepeat={restart} hasNext={qIndex + 1 < queue.length} />
      )}
    </div>
  );
}

function SummaryCard({
  summary,
  onNext,
  onRepeat,
  hasNext,
}: {
  summary: RunSummary;
  onNext: () => void;
  onRepeat: () => void;
  hasNext: boolean;
}) {
  const settings = useProgress((s) => s.settings);
  const setSettings = useProgress((s) => s.setSettings);
  const pct = Math.round(summary.accuracy * 100);
  const suggestReduce =
    settings.autoAidDown && settings.aidLevel < 3 && summary.accuracy >= 0.9;

  return (
    <Card className="border-emerald-400/30 bg-emerald-500/10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
          <Stat label="Accuracy" value={`${pct}%`} />
          <Stat label="Avg find time" value={`${Math.round(summary.avgReactionMs)} ms`} />
          {summary.avgTimingErrMs != null && (
            <Stat label="Timing" value={`±${Math.round(summary.avgTimingErrMs)} ms`} />
          )}
          {summary.avgVelocity != null && (
            <Stat
              label="Touch"
              value={`${Math.round(summary.avgVelocity)} ±${Math.round(summary.velocityStdev ?? 0)}`}
            />
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRepeat}>
            Repeat
          </Button>
          <Button onClick={onNext}>{hasNext ? "Next" : "Done"}</Button>
        </div>
      </div>
      {suggestReduce && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-sm">
          <span>Nice reading. Ready to reduce the help?</span>
          <Button
            variant="subtle"
            onClick={() => setSettings({ aidLevel: (settings.aidLevel + 1) as 0 | 1 | 2 | 3 })}
          >
            Reduce aids
          </Button>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}
