import { motion } from "motion/react";
import { ArrowRight, Minus, Plus, RotateCcw } from "lucide-react";
import type { NoteResult, RunSummary } from "@/types";
import { Button, Kbd } from "@/components/ui";
import { cn } from "@/lib/cn";
import { TIER_NAME, type RunOutcome } from "@/practice/mastery";

export interface ResultStat {
  label: string;
  value: string;
  hint?: string;
}

export function ResultsSheet({
  score,
  delta,
  headline,
  lines,
  stats,
  children,
  onRepeat,
  onNext,
  onSlower,
  onFaster,
  nextLabel = "Next",
}: {
  score: number;
  delta?: number | null;
  headline: string;
  lines: string[];
  stats: ResultStat[];
  children?: React.ReactNode;
  onRepeat: () => void;
  onNext: () => void;
  onSlower?: () => void;
  onFaster?: () => void;
  nextLabel?: string;
}) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className="absolute inset-x-0 bottom-0 z-20 border-t border-line/[0.08] bg-surface-1/95 px-8 pb-6 pt-6 shadow-e3 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-start gap-x-10 gap-y-5">
        <div className="min-w-[160px]">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-[64px] leading-none tracking-tight text-fg-1">{Math.round(score * 100)}</span>
            <span className="font-serif text-2xl text-fg-3">%</span>
          </div>
          {delta != null && Math.abs(delta) >= 0.005 && (
            <div className={cn("mt-1 font-mono text-xs tabular", delta > 0 ? "text-success" : "text-fg-3")}>
              {delta > 0 ? "+" : ""}
              {Math.round(delta * 100)} since last run
            </div>
          )}
        </div>

        <div className="min-w-[260px] flex-1">
          <div className="text-md font-medium text-fg-1">{headline}</div>
          {lines.map((l) => (
            <div key={l} className="mt-0.5 text-sm text-fg-2">
              {l}
            </div>
          ))}
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-2xs uppercase tracking-[0.08em] text-fg-3">{s.label}</div>
                <div className="font-mono text-base tabular text-fg-1" title={s.hint}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
          {children && <div className="mt-4">{children}</div>}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onRepeat}>
              <RotateCcw className="h-3.5 w-3.5" /> Repeat <Kbd>R</Kbd>
            </Button>
            <Button variant="primary" onClick={onNext}>
              {nextLabel} <ArrowRight className="h-3.5 w-3.5" /> <Kbd className="border-black/10 bg-black/10 text-accent-on/70">↵</Kbd>
            </Button>
          </div>
          {(onSlower || onFaster) && (
            <div className="flex gap-1">
              {onSlower && (
                <Button size="sm" variant="ghost" onClick={onSlower}>
                  <Minus className="h-3 w-3" /> 4 BPM
                </Button>
              )}
              {onFaster && (
                <Button size="sm" variant="ghost" onClick={onFaster}>
                  <Plus className="h-3 w-3" /> 4 BPM
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** Pitch contour of the run, each note tinted by timing (tempo) or correctness (wait). */
export function MiniContour({ results }: { results: NoteResult[] }) {
  if (!results.length) return null;
  const mids = results.map((r) => r.expected.midi);
  const lo = Math.min(...mids);
  const hi = Math.max(...mids);
  const W = Math.min(560, Math.max(200, results.length * 9));
  const H = 44;
  const x = (i: number) => (results.length === 1 ? W / 2 : (i / (results.length - 1)) * (W - 8) + 4);
  const y = (m: number) => (hi === lo ? H / 2 : H - 5 - ((m - lo) / (hi - lo)) * (H - 10));
  const color = (r: NoteResult) => {
    if (r.status !== "hit") return "rgb(var(--error))";
    if (r.errorMs == null) return "rgb(var(--success))";
    const e = Math.abs(r.errorMs);
    return e <= 20 ? "rgb(var(--success))" : e <= 40 ? "rgb(var(--accent))" : "rgb(var(--error))";
  };
  return (
    <svg width={W} height={H} className="block">
      <polyline
        points={results.map((r, i) => `${x(i)},${y(r.expected.midi)}`).join(" ")}
        fill="none"
        stroke="rgb(var(--line) / 0.14)"
        strokeWidth={1.2}
      />
      {results.map((r, i) => (
        <circle key={i} cx={x(i)} cy={y(r.expected.midi)} r={2.6} fill={color(r)} />
      ))}
    </svg>
  );
}

const fmtMs = (v?: number) => (v == null ? "–" : `${Math.round(v)} ms`);

/** Adult, specific copy for an exercise run. */
export function describeRun(s: RunSummary, outcome: RunOutcome | null, title: string): { headline: string; lines: string[]; stats: ResultStat[] } {
  const slips = s.wrong + s.missed;
  const lines: string[] = [];
  let headline: string;
  if (s.accuracy >= 0.97 && slips <= 1) headline = s.meanAbsErrorMs != null ? `Clean run. Timing ±${Math.round(s.meanAbsErrorMs)} ms.` : "Clean run.";
  else if (slips <= 3) headline = `${slips === 1 ? "One slip" : `${slips} slips`}; the rest held.`;
  else if (s.accuracy >= 0.75) headline = `${slips} notes to tidy up.`;
  else headline = "Worth a slower pass.";

  if (s.biasMs != null && Math.abs(s.biasMs) >= 12) lines.push(`Sitting ${Math.round(Math.abs(s.biasMs))} ms ${s.biasMs < 0 ? "ahead of" : "behind"} the beat.`);
  if (s.driftMsPerBar != null && Math.abs(s.driftMsPerBar) >= 8) lines.push(s.driftMsPerBar < 0 ? "Rushing as the line goes on." : "Dragging as the line goes on.");
  if (outcome?.promotedTo) lines.push(`Now ${TIER_NAME[outcome.promotedTo]}: ${title}.`);
  if (outcome?.fluentPending) lines.push("Fluent pending: pass this again after 48 hours.");
  if (outcome?.suggestBpm) lines.push(`Two clean runs at ${s.bpm}. Try ${outcome.suggestBpm}.`);

  const stats: ResultStat[] = [];
  if (s.mode === "tempo") {
    stats.push({ label: "Timing", value: fmtMs(s.meanAbsErrorMs), hint: "Mean absolute distance from the grid" });
    if (s.ioiCv != null) stats.push({ label: "Evenness", value: `${(s.ioiCv * 100).toFixed(1)}%`, hint: "Variation of note spacing (lower is more even)" });
    if (s.swingRatio != null && s.swingRatio > 0.53) stats.push({ label: "Swing", value: `${Math.round(s.swingRatio * 100)}:${100 - Math.round(s.swingRatio * 100)}` });
    stats.push({ label: "Tempo", value: `${s.bpm}` });
  } else {
    stats.push({ label: "Time to find", value: fmtMs(s.avgReactionMs), hint: "Average time from target to key" });
  }
  if (s.velocityStdev != null) stats.push({ label: "Touch", value: `±${s.velocityStdev.toFixed(0)}`, hint: "Velocity spread (lower is more even)" });
  stats.push({ label: "Notes", value: `${s.correct}/${s.total}` });
  return { headline, lines, stats };
}
