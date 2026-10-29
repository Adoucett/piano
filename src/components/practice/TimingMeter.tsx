import { cn } from "@/lib/cn";

/** Live early/late meter: a ±60 ms track with the last note's position. */
export function TimingMeter({ errorMs, className }: { errorMs: number | null; className?: string }) {
  const clamp = errorMs == null ? 0 : Math.max(-60, Math.min(60, errorMs));
  const pct = 50 + (clamp / 60) * 50;
  const tone =
    errorMs == null ? "bg-fg-3" : Math.abs(errorMs) <= 20 ? "bg-success" : Math.abs(errorMs) <= 40 ? "bg-accent" : "bg-error";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-2xs uppercase tracking-[0.08em] text-fg-3">Early</span>
      <div className="relative h-1.5 w-40 rounded-full bg-line/[0.07]">
        <div className="absolute inset-y-0 left-1/2 w-px bg-line/[0.25]" />
        <div className="absolute inset-y-0 rounded-full bg-success/[0.12]" style={{ left: `${50 - (20 / 60) * 50}%`, right: `${50 - (20 / 60) * 50}%` }} />
        <div
          className={cn("absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left] duration-120 ease-out", tone)}
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="text-2xs uppercase tracking-[0.08em] text-fg-3">Late</span>
      <span className="w-14 text-right font-mono text-xs tabular text-fg-2">
        {errorMs == null ? "" : `${errorMs > 0 ? "+" : ""}${Math.round(errorMs)} ms`}
      </span>
    </div>
  );
}
