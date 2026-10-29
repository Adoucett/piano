import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Play, Square } from "lucide-react";
import type { RunSummary } from "@/types";
import { buildRhythm, getRhythmDrill } from "@/rhythm/drills";
import { Matcher, type PlayedEvent } from "@/practice/matcher";
import { transport } from "@/practice/transport";
import { audioNow } from "@/audio/context";
import { useNoteEvents } from "@/hooks/useInput";
import type { NoteEvent } from "@/practice/inputBus";
import { rhythmKey, useProgress } from "@/store/progress";
import { Button, Kbd, Pill } from "@/components/ui";
import { RhythmLane, TimingHistogram } from "./RhythmLane";
import { ResultsSheet } from "./ResultsSheet";
import { TimingMeter } from "./TimingMeter";
import { StaffView } from "@/components/StaffView";
import { TIER_NAME, type RunOutcome } from "@/practice/mastery";

type Phase = "ready" | "countin" | "running" | "done";

export function RhythmRunner({ drillId, onNext, nextLabel }: { drillId: string; onNext: () => void; nextLabel: string }) {
  const drill = getRhythmDrill(drillId);
  const settings = useProgress((s) => s.settings);
  const recordRun = useProgress((s) => s.recordRun);
  const [bpm, setBpm] = useState(drill.bpm);
  const built = useMemo(() => buildRhythm(drill, settings.swing), [drill, settings.swing]);
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [events, setEvents] = useState<PlayedEvent[]>([]);
  const [lastErr, setLastErr] = useState<number | null>(null);
  const [clock, setClock] = useState({ t0: 0, spb: 60 / drill.bpm });
  const [result, setResult] = useState<{ summary: RunSummary; outcome: RunOutcome; errors: number[]; accentContrast: number | null; prevAcc: number | null } | null>(null);
  const matcherRef = useRef<Matcher | null>(null);
  const rafRef = useRef<number | null>(null);
  const finished = useRef(false);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    transport.stop();
  }, []);

  const reset = useCallback(() => {
    stop();
    finished.current = false;
    matcherRef.current = null;
    setEvents([]);
    setPlayhead(null);
    setLastErr(null);
    setResult(null);
    setPhaseBoth("ready");
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    stop();
    const m = matcherRef.current;
    if (!m) return;
    m.finish();
    const results = m.getResults();
    const summary = m.summarize();
    const errors = results.map((r) => r.errorMs).filter((e): e is number => e != null);
    const acc = results.filter((r) => r.expected.accent && r.velocity != null).map((r) => r.velocity!);
    const plain = results.filter((r) => !r.expected.accent && r.velocity != null).map((r) => r.velocity!);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    const accentContrast = acc.length && plain.length ? mean(acc) - mean(plain) : null;
    const key = rhythmKey(drill.id);
    const prev = useProgress.getState().items[key];
    const outcome = recordRun(key, "rhythm", summary, { refId: drill.id });
    setPlayhead(null);
    setResult({ summary, outcome, errors, accentContrast, prevAcc: prev?.lastAccuracy ?? null });
    setPhaseBoth("done");
  }, [stop, recordRun, drill.id]);

  const start = useCallback(() => {
    reset();
    const t0 = transport.start({
      bpm,
      countInBeats: 4,
      click: drill.click,
      gapBars: drill.gapBars,
      totalBeats: built.totalBeats,
      calls: built.calls,
      tailBeats: 1,
      onEnd: () => finish(),
    });
    setClock({ t0, spb: transport.spb });
    const times = built.playBeats.map((b) => transport.beatTime(b));
    matcherRef.current = new Matcher(built.notes, {
      mode: "tempo",
      pitch: drill.kind === "poly" ? "hand" : "any",
      times,
      beats: built.notes.map((n) => n.beat ?? 0),
      bpm,
    });
    setPhaseBoth("countin");
    const loop = () => {
      const now = audioNow();
      const beat = (now - t0) / transport.spb;
      if (beat >= 0 && phaseRef.current === "countin") setPhaseBoth("running");
      setPlayhead(beat);
      const m = matcherRef.current;
      if (m) {
        m.tick(now);
        if (m.done) {
          finish();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [reset, bpm, drill, built, finish]);

  const onNote = useCallback((e: NoteEvent) => {
    if (!e.on) return;
    const m = matcherRef.current;
    if (!m || (phaseRef.current !== "running" && phaseRef.current !== "countin")) return;
    const r = m.press(e.note, e.velocity, e.time);
    if (r.errorMs != null) setLastErr(r.errorMs);
    setEvents([...m.events]);
  }, []);
  useNoteEvents(onNote);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") {
        e.preventDefault();
        if (phaseRef.current === "ready" || phaseRef.current === "done") start();
        else reset();
      } else if (e.key === "r" || e.key === "R") reset();
      else if (e.key === "Enter" && phaseRef.current === "done") onNext();
      else if (e.key === "ArrowUp" || e.key === "ArrowRight") setBpm((b) => Math.min(240, b + 4));
      else if (e.key === "ArrowDown" || e.key === "ArrowLeft") setBpm((b) => Math.max(40, b - 4));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start, reset, onNext]);

  const windowBeats = (matcherRef.current?.window ?? 0.12) / clock.spb;
  const s = result?.summary;
  const headline = s
    ? s.accuracy >= 0.95 && (s.meanAbsErrorMs ?? 99) <= 25
      ? `In the pocket. ±${Math.round(s.meanAbsErrorMs ?? 0)} ms.`
      : s.meanAbsErrorMs != null
        ? `±${Math.round(s.meanAbsErrorMs)} ms, ${s.missed} missed.`
        : "No notes landed in the windows."
    : "";
  const lines: string[] = [];
  if (s?.biasMs != null && Math.abs(s.biasMs) >= 8) lines.push(`You sit ${Math.round(Math.abs(s.biasMs))} ms ${s.biasMs < 0 ? "ahead of" : "behind"} the click.`);
  if (s?.driftMsPerBar != null && Math.abs(s.driftMsPerBar) >= 6) lines.push(s.driftMsPerBar < 0 ? `Rushing about ${Math.abs(Math.round(s.driftMsPerBar))} ms per bar.` : `Dragging about ${Math.round(s.driftMsPerBar)} ms per bar.`);
  if (drill.swing && s?.swingRatio != null) lines.push(`Your swing: ${Math.round(s.swingRatio * 100)}:${100 - Math.round(s.swingRatio * 100)} (target ${Math.round(settings.swing * 100)}:${100 - Math.round(settings.swing * 100)}).`);
  if (result?.accentContrast != null) lines.push(result.accentContrast >= 12 ? `Accents clear: +${Math.round(result.accentContrast)} velocity.` : `Accents barely there (+${Math.round(result.accentContrast)}). Lean in.`);
  if (result?.outcome.promotedTo) lines.push(`Now ${TIER_NAME[result.outcome.promotedTo]}: ${drill.title}.`);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-8 pt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-fg-1">{drill.title}</h1>
            <div className="mt-1 text-sm text-fg-3">{drill.description}</div>
          </div>
          <div className="flex items-center gap-3">
            <Pill className="font-mono tabular">{bpm} BPM</Pill>
            {phase === "countin" && <Pill tone="accent">Count-in</Pill>}
            {phase === "running" && <Pill tone="accent">Playing</Pill>}
          </div>
        </div>

        {drill.notated && (
          <div className="mb-5">
            <StaffView
              sheet={{ notes: built.notes, chords: [], layout: "treble", keySignature: "C", beatsPerBar: 4, bars: drill.bars }}
              current={-1}
              rhythmOnly
              showChords={false}
              night={settings.nightSheet}
              playheadBeat={phase === "running" ? playhead : null}
            />
          </div>
        )}

        <div className="rounded-panel border border-line/[0.06] bg-surface-1 p-4 shadow-e1">
          <RhythmLane
            notes={built.notes}
            playBeats={built.playBeats}
            bars={drill.bars}
            windowBeats={windowBeats}
            events={events}
            t0={clock.t0}
            spb={clock.spb}
            playheadBeat={phase === "running" ? playhead : null}
            callBars={drill.callBars}
            poly={drill.kind === "poly"}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-[620px] text-sm text-fg-2">{drill.coach}</div>
          <div className="flex items-center gap-3">
            <TimingMeter errorMs={lastErr} />
            <Button variant={phase === "ready" || phase === "done" ? "primary" : "secondary"} size="sm" onClick={() => (phase === "ready" || phase === "done" ? start() : reset())}>
              {phase === "ready" || phase === "done" ? <Play className="h-3.5 w-3.5" /> : <Square className="h-3 w-3" />}
              {phase === "ready" || phase === "done" ? "Start" : "Stop"} <Kbd className={phase === "ready" ? "border-black/10 bg-black/10 text-accent-on/70" : ""}>Space</Kbd>
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-fg-3">
          {drill.kind === "poly" ? "Left hand: any key below middle C. Right hand: any key from middle C up." : "Any key counts. Only time is scored."} Arrows change tempo.
        </div>
        <div className="flex-1" />
      </div>

      <AnimatePresence>
        {result && s && (
          <ResultsSheet
            score={s.accuracy}
            delta={result.prevAcc != null ? s.accuracy - result.prevAcc : null}
            headline={headline}
            lines={lines}
            stats={[
              { label: "Timing", value: s.meanAbsErrorMs != null ? `${Math.round(s.meanAbsErrorMs)} ms` : "–" },
              { label: "Bias", value: s.biasMs != null ? `${s.biasMs > 0 ? "+" : ""}${Math.round(s.biasMs)} ms` : "–" },
              ...(s.ioiCv != null ? [{ label: "Evenness", value: `${(s.ioiCv * 100).toFixed(1)}%` }] : []),
              { label: "Tempo", value: `${bpm}` },
            ]}
            onRepeat={start}
            onNext={onNext}
            nextLabel={nextLabel}
            onSlower={() => setBpm((b) => Math.max(40, b - 4))}
            onFaster={() => setBpm((b) => Math.min(240, b + 4))}
          >
            <TimingHistogram errors={result.errors} />
          </ResultsSheet>
        )}
      </AnimatePresence>
    </div>
  );
}
