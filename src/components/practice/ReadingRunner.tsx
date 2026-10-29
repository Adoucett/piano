import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Clef, NoteSpec, RunSummary } from "@/types";
import { StaffView, type SheetData, type SlotState } from "@/components/StaffView";
import { KeyboardView } from "@/components/KeyboardView";
import { Bar, Pill } from "@/components/ui";
import { ResultsSheet } from "./ResultsSheet";
import { generateReading, regionOf, REGION_LABEL, LANDMARK_NAMES, type ReadingDrillSpec, type ReadingPrompt, type Region } from "@/exercises/reading";
import { useHeldNotes, useNoteEvents } from "@/hooks/useInput";
import { inputBus, type NoteEvent } from "@/practice/inputBus";
import { readingKey, useProgress } from "@/store/progress";
import { prettyNote } from "@/lib/notecolor";
import type { RunOutcome } from "@/practice/mastery";
import { TIER_NAME } from "@/practice/mastery";

interface PromptResult {
  prompt: ReadingPrompt;
  firstTry: boolean;
  ms: number;
}

function toSheet(p: ReadingPrompt): SheetData {
  const notes: NoteSpec[] = p.together
    ? p.notes.map((n) => ({ ...n, beat: 0, beats: 4, role: "root" }))
    : p.notes.length === 1
      ? [{ ...p.notes[0], beat: 0, beats: 4, role: "root" }]
      : p.notes.map((n, i) => ({ ...n, beat: i * 2, beats: 2, role: "root" }));
  return { notes, chords: [], layout: p.layout, keySignature: p.keySignature, beatsPerBar: 4, bars: 1 };
}

export function ReadingRunner({
  drill,
  unitId,
  onNext,
  nextLabel,
}: {
  drill: ReadingDrillSpec;
  unitId: string;
  onNext: () => void;
  nextLabel: string;
}) {
  const settings = useProgress((s) => s.settings);
  const recordReadingNote = useProgress((s) => s.recordReadingNote);
  const recordRun = useProgress((s) => s.recordRun);
  const held = useHeldNotes();

  const [seed, setSeed] = useState(0);
  const prompts = useMemo(
    () => generateReading(drill, useProgress.getState().leitner),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drill, seed]
  );
  const [i, setI] = useState(0);
  const [sub, setSub] = useState(0); // position within an interval
  const [pressed, setPressed] = useState<Set<number>>(() => new Set());
  const [missedThis, setMissedThis] = useState(false);
  const [wrong, setWrong] = useState<{ index: number; midi: number; at: number } | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<PromptResult[]>([]);
  const [done, setDone] = useState<{ summary: RunSummary; outcome: RunOutcome; prevAcc: number | null } | null>(null);
  const shownAt = useRef(performance.now());
  const busy = useRef(false);

  const prompt = prompts[i];
  const sheet = useMemo(() => (prompt ? toSheet(prompt) : null), [prompt]);
  const clefOf = (n: NoteSpec): Clef => (prompt?.layout === "grand" ? (n.midi >= 60 ? "treble" : "bass") : prompt?.layout === "bass" ? "bass" : "treble");

  useEffect(() => {
    shownAt.current = performance.now();
    setSub(0);
    setPressed(new Set());
    setMissedThis(false);
    setWrong(null);
    setReveal(null);
    busy.current = false;
  }, [i, seed]);

  const restart = useCallback(() => {
    setSeed((s) => s + 1);
    setI(0);
    setResults([]);
    setDone(null);
  }, []);

  const finishSprint = useCallback(
    (all: PromptResult[]) => {
      const total = all.length;
      const correct = all.filter((r) => r.firstTry).length;
      const mean = all.reduce((a, r) => a + r.ms, 0) / Math.max(1, total);
      const summary: RunSummary = {
        total,
        correct,
        accuracy: total ? correct / total : 0,
        wrong: total - correct,
        missed: 0,
        extras: 0,
        mode: "wait",
        bpm: 0,
        avgReactionMs: mean,
        startedAt: Date.now() - all.reduce((a, r) => a + r.ms, 0),
        finishedAt: Date.now(),
      };
      const key = readingKey(unitId);
      const prev = useProgress.getState().items[key];
      const outcome = recordRun(key, "reading", summary, { refId: unitId });
      setDone({ summary, outcome, prevAcc: prev?.lastAccuracy ?? null });
    },
    [recordRun, unitId]
  );

  const complete = useCallback(
    (firstTry: boolean) => {
      if (!prompt || busy.current) return;
      busy.current = true;
      const ms = performance.now() - shownAt.current;
      prompt.notes.forEach((n, k) => recordReadingNote(prompt.ids[k], regionOf(n.midi, clefOf(n)), firstTry));
      const all = [...results, { prompt, firstTry, ms }];
      setResults(all);
      if (prompt.symbol) setReveal(prompt.symbol);
      const delay = prompt.symbol ? 900 : firstTry ? 180 : 420;
      window.setTimeout(() => {
        if (i + 1 >= prompts.length) finishSprint(all);
        else setI(i + 1);
      }, delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prompt, results, i, prompts.length, finishSprint, recordReadingNote]
  );

  const onNote = useCallback(
    (e: NoteEvent) => {
      if (!e.on || !prompt || done || busy.current) return;
      if (prompt.together) {
        const want = new Set(prompt.notes.map((n) => n.midi));
        if (!want.has(e.note)) {
          setMissedThis(true);
          setWrong({ index: 0, midi: e.note, at: performance.now() });
          return;
        }
        const next = new Set(pressed).add(e.note);
        setPressed(next);
        if ([...want].every((m) => next.has(m))) complete(!missedThis);
        return;
      }
      const expected = prompt.notes[sub];
      if (e.note === expected.midi) {
        setWrong(null);
        if (sub + 1 >= prompt.notes.length) complete(!missedThis);
        else setSub(sub + 1);
      } else {
        setMissedThis(true);
        setWrong({ index: sub, midi: e.note, at: performance.now() });
      }
    },
    [prompt, done, pressed, missedThis, sub, complete]
  );
  useNoteEvents(onNote);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter" && done) {
        e.preventDefault();
        onNext();
      } else if ((e.key === "r" || e.key === "R") && done) {
        e.preventDefault();
        restart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, onNext, restart]);

  const statuses: SlotState[] = useMemo(() => {
    if (!prompt) return [];
    if (prompt.together) return prompt.notes.map((n) => (pressed.has(n.midi) ? "hit" : "pending"));
    return prompt.notes.map((_, k) => (k < sub ? "hit" : "pending"));
  }, [prompt, pressed, sub]);

  const revealed = useMemo(() => (missedThis ? new Set(prompt?.notes.map((_, k) => k) ?? []) : new Set<number>()), [missedThis, prompt]);
  const running = results.length ? results.filter((r) => r.firstTry).length / results.length : null;
  const medianMs = useMemo(() => {
    const xs = results.map((r) => r.ms).sort((a, b) => a - b);
    return xs.length ? xs[Math.floor(xs.length / 2)] : null;
  }, [results]);

  const landmarkHint = missedThis && prompt && prompt.notes.length === 1 ? LANDMARK_NAMES[prompt.notes[0].full] : undefined;

  // Region breakdown for results.
  const regionLines = useMemo(() => {
    const by = new Map<Region, { ok: number; n: number; ms: number }>();
    for (const r of results) {
      const n = r.prompt.notes[0];
      const reg = regionOf(n.midi, r.prompt.layout === "bass" || (r.prompt.layout === "grand" && n.midi < 60) ? "bass" : "treble");
      const v = by.get(reg) ?? { ok: 0, n: 0, ms: 0 };
      v.n += 1;
      v.ok += r.firstTry ? 1 : 0;
      v.ms += r.ms;
      by.set(reg, v);
    }
    return [...by.entries()].map(([reg, v]) => ({ label: REGION_LABEL[reg], value: `${Math.round((v.ok / v.n) * 100)}% · ${(v.ms / v.n / 1000).toFixed(1)}s` }));
  }, [results]);

  const slowest = useMemo(
    () =>
      [...results]
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 4)
        .map((r) => r.prompt.notes.map((n) => prettyNote(n.full)).join("–")),
    [results]
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-center px-8 py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-fg-1">{drill.title}</h1>
            <div className="mt-1 text-sm text-fg-3">
              {drill.mode === "chords" ? "Play the stacked chord. The symbol appears once you've voiced it." : drill.mode === "intervals" ? "Play both notes, left to right. Exact octave." : "Play the written note. Exact octave."}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {running != null && <span className="font-mono text-xs tabular text-fg-3">{Math.round(running * 100)}% · {medianMs != null ? `${(medianMs / 1000).toFixed(1)}s` : "–"}</span>}
            <Pill className="font-mono tabular">
              {Math.min(i + 1, prompts.length)} / {prompts.length}
            </Pill>
          </div>
        </div>
        <Bar value={results.length / Math.max(1, prompts.length)} className="mb-5" />

        <div className="mx-auto w-full max-w-[720px]">
          {sheet && (
            <div className="relative">
              <StaffView
                sheet={sheet}
                current={prompt.together ? -1 : sub}
                statuses={statuses}
                wrong={wrong && !prompt.together ? wrong : null}
                aidFor={() => 2}
                revealed={revealed}
                coloring="ink"
                night={settings.nightSheet}
                showChords={false}
                timeSignature={false}
                compact
                zoom={1.9}
              />
              <AnimatePresence>
                {reveal && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 font-serif text-2xl italic text-ink"
                  >
                    {reveal}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <div className="mt-3 h-5 text-center text-sm text-fg-3">{landmarkHint ? `Landmark: ${landmarkHint}` : ""}</div>
        </div>

        <div className="mt-8">
          <KeyboardView
            focus={drill.layout === "bass" ? [36, 62] : drill.layout === "grand" ? [40, 81] : [57, 86]}
            held={held}
            target={null}
            wrong={wrong ? { midi: wrong.midi, at: wrong.at } : null}
            labels="none"
            onPress={(m) => inputBus.virtualOn(m, 84)}
            onRelease={(m) => inputBus.virtualOff(m)}
            octaves={4}
          />
        </div>
      </div>

      <AnimatePresence>
        {done && (
          <ResultsSheet
            score={done.summary.accuracy}
            delta={done.prevAcc != null ? done.summary.accuracy - done.prevAcc : null}
            headline={
              done.summary.accuracy >= 0.95
                ? `Read cleanly. ${(done.summary.avgReactionMs / 1000).toFixed(1)}s per note.`
                : `${done.summary.wrong} misread${done.summary.wrong === 1 ? "" : "s"}. Those notes will come back more often.`
            }
            lines={[
              ...(done.outcome.promotedTo ? [`Now ${TIER_NAME[done.outcome.promotedTo]}: ${drill.title}.`] : []),
              ...(slowest.length ? [`Slowest: ${slowest.join(", ")}`] : []),
            ]}
            stats={[
              { label: "Time to find", value: `${(done.summary.avgReactionMs / 1000).toFixed(2)} s` },
              { label: "First try", value: `${done.summary.correct}/${done.summary.total}` },
              ...regionLines,
            ]}
            onRepeat={restart}
            onNext={onNext}
            nextLabel={nextLabel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
