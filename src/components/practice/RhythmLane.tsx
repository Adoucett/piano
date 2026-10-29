/**
 * Beat-grid lanes for rhythm drills: bar and beat lines, a shaded timing window
 * around every written onset, your hits as dots placed where you played them.
 */
import type { NoteSpec } from "@/types";
import type { PlayedEvent } from "@/practice/matcher";

export function RhythmLane({
  notes,
  playBeats,
  bars,
  windowBeats,
  events,
  t0,
  spb,
  playheadBeat,
  callBars,
  poly,
}: {
  notes: NoteSpec[];
  playBeats: number[];
  bars: number;
  windowBeats: number;
  events: PlayedEvent[];
  t0: number;
  spb: number;
  playheadBeat: number | null;
  callBars?: (b: number) => boolean;
  poly?: boolean;
}) {
  const beatsTotal = bars * 4;
  const W = 1000;
  const laneH = poly ? 44 : 64;
  const lanes = poly ? ["R", "L"] : ["any"];
  const H = lanes.length * laneH + 28;
  const x = (beat: number) => 12 + (beat / beatsTotal) * (W - 24);
  const laneOf = (n: { hand?: "L" | "R" }) => (poly ? (n.hand === "L" ? 1 : 0) : 0);
  const midY = (lane: number) => 20 + lane * laneH + laneH / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
      {Array.from({ length: bars }).map((_, b) =>
        callBars?.(b) ? (
          <g key={`call-${b}`}>
            <rect x={x(b * 4)} y={16} width={x(4) - x(0)} height={H - 20} fill="rgb(var(--info) / 0.06)" />
            <text x={x(b * 4) + 8} y={13} fontSize={11} fill="rgb(var(--info))" fontFamily="Geist Variable, sans-serif">
              Listen
            </text>
          </g>
        ) : null
      )}
      {Array.from({ length: beatsTotal + 1 }).map((_, b) => (
        <line
          key={b}
          x1={x(b)}
          x2={x(b)}
          y1={18}
          y2={H - 6}
          stroke={b % 4 === 0 ? "rgb(var(--line) / 0.22)" : "rgb(var(--line) / 0.07)"}
          strokeWidth={b % 4 === 0 ? 1.2 : 1}
        />
      ))}
      {Array.from({ length: bars }).map((_, b) => (
        <text key={`n-${b}`} x={x(b * 4) + 4} y={H - 8} fontSize={10} fill="rgb(var(--text-3))" fontFamily="Geist Mono, monospace">
          {b + 1}
        </text>
      ))}
      {poly &&
        lanes.map((l, i) => (
          <text key={l} x={2} y={midY(i) + 4} fontSize={10} fill="rgb(var(--text-3))" fontFamily="Geist Variable, sans-serif">
            {l}
          </text>
        ))}
      {notes.map((n, i) => {
        const b = playBeats[i];
        const lane = laneOf(n);
        const y = midY(lane);
        return (
          <g key={i}>
            <rect
              x={x(b - windowBeats)}
              y={y - laneH * 0.32}
              width={x(windowBeats * 2) - x(0)}
              height={laneH * 0.64}
              rx={4}
              fill="rgb(var(--line) / 0.05)"
            />
            <line x1={x(b)} x2={x(b)} y1={y - laneH * 0.3} y2={y + laneH * 0.3} stroke="rgb(var(--text-2))" strokeWidth={n.accent ? 2.6 : 1.4} />
          </g>
        );
      })}
      {events.map((e, i) => {
        const beat = (e.time - t0) / spb;
        if (beat < -1 || beat > beatsTotal + 1) return null;
        const n = e.index != null ? notes[e.index] : undefined;
        const lane = n ? laneOf(n) : poly ? (e.midi < 60 ? 1 : 0) : 0;
        const err = e.index != null ? (e.time - (t0 + playBeats[e.index] * spb)) * 1000 : null;
        const fill =
          e.kind !== "hit" ? "rgb(var(--error))" : err != null && Math.abs(err) <= 20 ? "rgb(var(--success))" : err != null && Math.abs(err) <= 40 ? "rgb(var(--accent))" : "rgb(var(--error))";
        return <circle key={i} cx={x(beat)} cy={midY(lane)} r={4.5} fill={fill} opacity={e.kind === "extra" ? 0.5 : 0.95} />;
      })}
      {playheadBeat != null && playheadBeat >= 0 && playheadBeat <= beatsTotal && (
        <line x1={x(playheadBeat)} x2={x(playheadBeat)} y1={14} y2={H - 4} stroke="rgb(var(--accent))" strokeWidth={2} />
      )}
    </svg>
  );
}

/** Histogram of signed timing errors (ms), early on the left. */
export function TimingHistogram({ errors }: { errors: number[] }) {
  const bins = 17;
  const span = 85; // ±85 ms
  const width = (2 * span) / bins;
  const counts = new Array(bins).fill(0);
  errors.forEach((e) => {
    const k = Math.max(0, Math.min(bins - 1, Math.floor((e + span) / width)));
    counts[k] += 1;
  });
  const max = Math.max(1, ...counts);
  const W = 340;
  const H = 64;
  const bw = W / bins;
  return (
    <svg width={W} height={H + 14} className="block">
      {counts.map((c, k) => {
        const center = -span + (k + 0.5) * width;
        const h = (c / max) * H;
        const tone = Math.abs(center) <= 20 ? "rgb(var(--success))" : Math.abs(center) <= 40 ? "rgb(var(--accent))" : "rgb(var(--error))";
        return <rect key={k} x={k * bw + 1} y={H - h} width={bw - 2} height={h} rx={1.5} fill={tone} opacity={0.85} />;
      })}
      <line x1={W / 2} x2={W / 2} y1={0} y2={H} stroke="rgb(var(--line) / 0.3)" />
      <text x={0} y={H + 12} fontSize={10} fill="rgb(var(--text-3))" fontFamily="Geist Mono, monospace">
        early
      </text>
      <text x={W / 2} y={H + 12} fontSize={10} textAnchor="middle" fill="rgb(var(--text-3))" fontFamily="Geist Mono, monospace">
        0
      </text>
      <text x={W} y={H + 12} fontSize={10} textAnchor="end" fill="rgb(var(--text-3))" fontFamily="Geist Mono, monospace">
        late
      </text>
    </svg>
  );
}
