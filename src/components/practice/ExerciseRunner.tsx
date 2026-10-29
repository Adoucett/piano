import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Headphones, Play, RotateCcw, Square } from "lucide-react";
import { Note } from "tonal";
import type { Clef, ExerciseSpec, NoteResult, NoteSpec, RunSummary } from "@/types";
import { buildExercise, lineSwing } from "@/exercises/patterns";
import { StaffView, type SlotState } from "@/components/StaffView";
import { KeyboardView } from "@/components/KeyboardView";
import { Button, Kbd, Pill } from "@/components/ui";
import { MiniContour, ResultsSheet, describeRun } from "./ResultsSheet";
import { TimingMeter } from "./TimingMeter";
import { Matcher } from "@/practice/matcher";
import { transport } from "@/practice/transport";
import { swingBeat } from "@/rhythm/drills";
import { audioNow } from "@/audio/context";
import { sound } from "@/audio/sound";
import { inputBus, type NoteEvent } from "@/practice/inputBus";
import { useHeldNotes, useNoteEvents, useInputStatus } from "@/hooks/useInput";
import { aidForRegion, useProgress } from "@/store/progress";
import { regionOf } from "@/exercises/reading";
import { chordVoicing, spellForKey } from "@/theory/engine";
import { prettyNote } from "@/lib/notecolor";
import type { RunOutcome } from "@/practice/mastery";
import { exerciseKey } from "@/types";

type Phase = "ready" | "countin" | "running" | "listening" | "done";

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

export function ExerciseRunner({
  spec,
  onNext,
  nextLabel,
}: {
  spec: ExerciseSpec;
  onNext: () => void;
  nextLabel: string;
}) {
  const ex = useMemo(() => buildExercise(spec), [spec]);
  const settings = useProgress((s) => s.settings);
  const regions = useProgress((s) => s.regions);
  const items = useProgress((s) => s.items);
  const setSettings = useProgress((s) => s.setSettings);
  const recordExercise = useProgress((s) => s.recordExercise);
  const recordRegion = useProgress((s) => s.recordRegion);
  const held = useHeldNotes();
  const status = useInputStatus();

  const [phase, setPhase] = useState<Phase>("ready");
  const [statuses, setStatuses] = useState<SlotState[]>(() => ex.notes.map(() => "pending"));
  const [current, setCurrent] = useState(0);
  const [wrong, setWrong] = useState<{ index: number; midi: number; at: number } | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [lastErr, setLastErr] = useState<number | null>(null);
  const [countBeat, setCountBeat] = useState<number | null>(null);
  const [result, setResult] = useState<{ summary: RunSummary; outcome: RunOutcome; results: NoteResult[]; prevAcc: number | null } | null>(null);

  const matcherRef = useRef<Matcher | null>(null);
  const phaseRef = useRef<Phase>("ready");
  const rafRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const startedRef = useRef(false);

  const mode = settings.practiceMode;
  const pitchMode = settings.matchMode === "exact-octave" ? "exact" : "pc";

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const aidFor = useCallback(
    (n: NoteSpec, clef: Clef) => aidForRegion({ items, settings, practiceDays: [], regions }, regionOf(n.midi, clef)),
    [items, settings, regions]
  );
  const clefOf = (n: NoteSpec): Clef => (ex.layout === "grand" ? (n.midi >= 60 ? "treble" : "bass") : ex.layout === "bass" ? "bass" : "treble");

  const stopLoop = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const reset = useCallback(() => {
    stopLoop();
    transport.stop();
    finishedRef.current = false;
    startedRef.current = false;
    matcherRef.current = new Matcher(ex.notes, { mode: "wait", pitch: pitchMode, bpm: settings.bpm });
    setStatuses(ex.notes.map(() => "pending"));
    setCurrent(0);
    setWrong(null);
    setRevealed(new Set());
    setPlayhead(null);
    setLastErr(null);
    setCountBeat(null);
    setResult(null);
    setPhaseBoth("ready");
  }, [ex, pitchMode, settings.bpm]);

  useEffect(() => {
    reset();
    return () => {
      stopLoop();
      transport.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex, mode, pitchMode]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopLoop();
    transport.stop();
    const m = matcherRef.current;
    if (!m) return;
    m.finish();
    const results = m.getResults();
    const summary = m.summarize();
    const prev = useProgress.getState().items[exerciseKey(spec)];
    const outcome = recordExercise(spec, summary);
    if (summary.mode === "wait") {
      results.forEach((r) => recordRegion(regionOf(r.expected.midi, clefOf(r.expected)), r.correct));
    }
    if (settings.cadenceOnClean && summary.accuracy >= 0.97 && ex.chords[0]) {
      const c = ex.chords[ex.chords.length - 1];
      const v = chordVoicing(c.root, c.suffix, 3).map((x) => (x > 66 ? x - 12 : x));
      sound.chord(v, audioNow() + 0.12, 1.8, 58);
    }
    setStatuses(results.map((r) => r.status));
    setPlayhead(null);
    setResult({ summary, outcome, results, prevAcc: prev?.lastAccuracy ?? null });
    setPhaseBoth("done");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, ex, settings.cadenceOnClean, recordExercise, recordRegion]);

  const startTempo = useCallback(() => {
    reset();
    const bpm = settings.bpm;
    const swing = lineSwing(ex, settings);
    const t0 = transport.start({
      bpm,
      countInBeats: settings.countIn ? 4 : 0,
      click: settings.click,
      totalBeats: ex.totalBeats,
      chords: ex.chords,
      drone: settings.drone,
      walkingBass: settings.walkingBass,
      tailBeats: 1,
      onEnd: () => finish(),
    });
    const playBeats = ex.notes.map((n) => swingBeat(n.beat ?? 0, swing));
    const times = playBeats.map((b) => transport.beatTime(b));
    matcherRef.current = new Matcher(ex.notes, {
      mode: "tempo",
      pitch: pitchMode,
      times,
      beats: ex.notes.map((n) => n.beat ?? 0),
      bpm,
    });
    finishedRef.current = false;
    setPhaseBoth(settings.countIn ? "countin" : "running");
    const loop = () => {
      const now = audioNow();
      const beat = (now - t0) / transport.spb;
      if (beat < 0) setCountBeat(Math.floor(beat) + 5);
      else {
        if (phaseRef.current === "countin") {
          setCountBeat(null);
          setPhaseBoth("running");
        }
        setPlayhead(beat);
      }
      const m = matcherRef.current;
      if (m) {
        const missed = m.tick(now);
        if (missed.length) {
          setStatuses((prev) => {
            const next = [...prev];
            missed.forEach((i) => (next[i] = m.status(i) as SlotState));
            return next;
          });
          setCurrent(m.currentIndex);
        }
        if (m.done) {
          finish();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [reset, settings, ex, pitchMode, finish]);

  const listen = useCallback(() => {
    reset();
    const bpm = settings.bpm;
    const swing = lineSwing(ex, settings);
    const t0 = transport.start({
      bpm,
      countInBeats: 0,
      click: "off",
      totalBeats: ex.totalBeats,
      chords: ex.chords,
      drone: settings.drone,
      walkingBass: settings.walkingBass,
      onEnd: () => {
        stopLoop();
        setPlayhead(null);
        setPhaseBoth("ready");
      },
    });
    ex.notes.forEach((n) => sound.play(n.midi, transport.beatTime(swingBeat(n.beat ?? 0, swing)), (n.beats ?? 0.5) * transport.spb * 0.92, 74));
    setPhaseBoth("listening");
    const loop = () => {
      setPlayhead((audioNow() - t0) / transport.spb);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [reset, settings, ex]);

  // ---------- Note input ----------
  const onNote = useCallback(
    (e: NoteEvent) => {
      if (!e.on) return;
      const m = matcherRef.current;
      const ph = phaseRef.current;
      if (!m || ph === "done" || ph === "listening") return;
      if (m.mode === "tempo" && ph !== "running" && ph !== "countin") return;
      if (m.mode === "wait" && !startedRef.current) {
        startedRef.current = true;
        m.begin(e.time);
        setPhaseBoth("running");
      }
      const r = m.press(e.note, e.velocity, e.time);
      if ((r.kind === "hit" || r.kind === "done") && r.index != null) {
        const i = r.index;
        setStatuses((prev) => {
          const next = [...prev];
          next[i] = m.status(i) as SlotState;
          return next;
        });
        setCurrent(m.currentIndex);
        setWrong(null);
        if (r.errorMs != null) setLastErr(r.errorMs);
        if (r.kind === "done" && m.mode === "wait") finish();
      } else if (r.kind === "wrong" && r.index != null) {
        const i = r.index;
        setWrong({ index: i, midi: e.note, at: performance.now() });
        setRevealed((prev) => new Set(prev).add(i));
      }
    },
    [finish]
  );
  useNoteEvents(onNote);

  // ---------- Shortcuts ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      const qwerty = status.qwerty;
      if (k === " ") {
        e.preventDefault();
        if (phaseRef.current === "done") reset();
        else if (mode === "tempo" && phaseRef.current === "ready") startTempo();
        else if (phaseRef.current !== "ready") reset();
      } else if (k === "r" || k === "R") {
        e.preventDefault();
        reset();
      } else if ((k === "l" && !qwerty) || k === "L") {
        e.preventDefault();
        if (phaseRef.current === "listening") reset();
        else listen();
      } else if (k === "Enter" && phaseRef.current === "done") {
        e.preventDefault();
        onNext();
      } else if (k === "ArrowUp" || k === "ArrowRight") {
        e.preventDefault();
        setSettings({ bpm: Math.min(320, settings.bpm + 4) });
      } else if (k === "ArrowDown" || k === "ArrowLeft") {
        e.preventDefault();
        setSettings({ bpm: Math.max(30, settings.bpm - 4) });
      } else if (["1", "2", "3", "4"].includes(k) && !qwerty) {
        setSettings({ aidMode: "manual", aidLevel: (Number(k) - 1) as 0 | 1 | 2 | 3 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, reset, startTempo, listen, onNext, setSettings, settings.bpm, status.qwerty]);

  // ---------- Derived view state ----------
  const curNote = ex.notes[Math.min(current, ex.notes.length - 1)];
  const nextNote = ex.notes[current + 1];
  const target = phase === "done" || phase === "listening" ? null : curNote?.midi ?? null;
  const scalePcs = useMemo(() => new Set((ex.info?.pitchClasses ?? []).map((pc) => Note.chroma(pc) ?? 0)), [ex]);
  const focus = useMemo(() => ex.notes.map((n) => n.midi), [ex]);
  const curAid = curNote ? aidFor(curNote, clefOf(curNote)) : 3;
  const spell = useCallback(
    (m: number) => (curNote && m === curNote.midi ? curNote.name : spellForKey(m, ex.keySignature).name),
    [curNote, ex.keySignature]
  );
  const finger = settings.showFingering ? ex.fingers?.[current] : undefined;

  const instruction = spec.source?.instruction;
  const desc = result ? describeRun(result.summary, result.outcome, ex.title) : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-center px-8 py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-fg-1">{prettyNote(ex.title)}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-3">
              <span>{ex.subtitle}</span>
              {ex.info && <span className="font-mono text-xs text-fg-3">{ex.info.formula}</span>}
              {ex.progression && <span>{ex.progression.description}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PhaseHint phase={phase} mode={mode} countBeat={countBeat} />
          </div>
        </div>

        <StaffView
          sheet={ex}
          current={phase === "listening" ? -1 : current}
          statuses={statuses}
          wrong={wrong}
          aidFor={aidFor}
          revealed={revealed}
          coloring={settings.noteColoring}
          night={settings.nightSheet}
          playheadBeat={phase === "running" || phase === "listening" ? playhead : null}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-[640px] text-sm text-fg-2">
            {instruction ?? ex.info?.def.tip ?? ex.progression?.description}
          </div>
          <div className="flex items-center gap-3">
            {mode === "tempo" && <TimingMeter errorMs={lastErr} />}
            <Button size="sm" variant="ghost" onClick={() => (phase === "listening" ? reset() : listen())}>
              <Headphones className="h-3.5 w-3.5" /> {phase === "listening" ? "Stop" : "Listen"} <Kbd>L</Kbd>
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Restart <Kbd>R</Kbd>
            </Button>
            {mode === "tempo" && (
              <Button size="sm" variant={phase === "ready" ? "primary" : "secondary"} onClick={() => (phase === "ready" || phase === "done" ? startTempo() : reset())}>
                {phase === "ready" || phase === "done" ? <Play className="h-3.5 w-3.5" /> : <Square className="h-3 w-3" />}
                {phase === "ready" || phase === "done" ? "Start" : "Stop"} <Kbd className={phase === "ready" ? "border-black/10 bg-black/10 text-accent-on/70" : ""}>Space</Kbd>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-10">
          <KeyboardView
            octaves={4}
            focus={focus}
            held={held}
            target={target}
            next={phase === "done" ? null : nextNote?.midi ?? null}
            scalePcs={scalePcs}
            wrong={wrong ? { midi: wrong.midi, at: wrong.at } : null}
            finger={finger}
            labels={curAid <= 1 ? "target" : "none"}
            spell={spell}
            onPress={(m) => inputBus.virtualOn(m, 84)}
            onRelease={(m) => inputBus.virtualOff(m)}
          />
        </div>
      </div>

      <AnimatePresence>
        {result && desc && (
          <ResultsSheet
            score={result.summary.accuracy}
            delta={result.prevAcc != null ? result.summary.accuracy - result.prevAcc : null}
            headline={desc.headline}
            lines={desc.lines}
            stats={desc.stats}
            onRepeat={reset}
            onNext={onNext}
            nextLabel={nextLabel}
            onSlower={result.summary.mode === "tempo" ? () => { setSettings({ bpm: Math.max(30, settings.bpm - 4) }); reset(); } : undefined}
            onFaster={result.summary.mode === "tempo" ? () => { setSettings({ bpm: Math.min(320, settings.bpm + 4) }); reset(); } : undefined}
          >
            <MiniContour results={result.results} />
          </ResultsSheet>
        )}
      </AnimatePresence>
    </div>
  );
}

function PhaseHint({ phase, mode, countBeat }: { phase: Phase; mode: string; countBeat: number | null }) {
  if (phase === "countin") return <Pill tone="accent" className="font-mono tabular">Count-in · {countBeat ?? ""}</Pill>;
  if (phase === "running") return <Pill tone="accent">Playing</Pill>;
  if (phase === "listening") return <Pill tone="info">Listening</Pill>;
  if (phase === "done") return <Pill>Finished</Pill>;
  return <Pill>{mode === "tempo" ? "Space to count in" : "Play the first note to begin"}</Pill>;
}
