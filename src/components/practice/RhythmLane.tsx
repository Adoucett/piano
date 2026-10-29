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
  const barsPerRow = Math.min(4, bars);
  const rowBeats = barsPerRow * 4;
  const rows = Math.ceil(bars / barsPerRow);
  const W = 1000;
  const laneH = poly ? 56 : 96;
  const lanes = poly ? ["R", "L"] : ["any"];
  const rowH = lanes.length * laneH + 26;
  const H = rows * rowH + 4;
  const rowOf = (beat: number) => Math.max(0, Math.min(rows - 1, Math.floor(beat / rowBeats)));
  const xIn = (beatInRow: number) => 16 + (beatInRow / rowBeats) * (W - 32);
  const x = (beat: number, row = rowOf(beat)) => xIn(beat - row * rowBeats);
  const top = (row: number) => row * rowH + 18;
  const laneOf = (n: { hand?: "L" | "R" }) => (poly ? (n.hand === "L" ? 1 : 0) : 0);
  const midY = (lane: number, row: number) => top(row) + lane * laneH + laneH / 2;
  const bw = xIn(4) - xIn(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
      {Array.from({ length: bars }).map((_, b) => {
        const row = Math.floor(b / barsPerRow);
        const bx = xIn((b % barsPerRow) * 4);
        return (
          <g key={`bar-${b}`}>
            {callBars?.(b) && <rect x={bx} y={top(row)} width={bw} height={lanes.length * laneH} fill="rgb(var(--info) / 0.06)" />}
            <text x={bx + 4} y={top(row) - 5} fontSize={11} fill={callBars?.(b) ? "rgb(var(--info))" : "rgb(var(--text-3))"} fontFamily="Geist Mono, monospace">
              {b + 1}
              {callBars?.(b) ? "  listen" : ""}
            </text>
            {Array.from({ length: 4 }).map((_, k) => (
              <line
                key={k}
                x1={bx + (k * bw) / 4}
                x2={bx + (k * bw) / 4}
                y1={top(row)}
                y2={top(row) + lanes.length * laneH}
                stroke={k === 0 ? "rgb(var(--line) / 0.22)" : "rgb(var(--line) / 0.07)"}
                strokeWidth={k === 0 ? 1.2 : 1}
              />
            ))}
            {(b + 1) % barsPerRow === 0 || b === bars - 1 ? (
              <line x1={bx + bw} x2={bx + bw} y1={top(row)} y2={top(row) + lanes.length * laneH} stroke="rgb(var(--line) / 0.22)" strokeWidth={1.2} />
            ) : null}
          </g>
        );
      })}
      {poly &&
        Array.from({ length: rows }).map((_, r) =>
          lanes.map((l, i) => (
            <text key={`${r}-${l}`} x={2} y={midY(i, r) + 4} fontSize={10} fill="rgb(var(--text-3))" fontFamily="Geist Variable, sans-serif">
              {l}
            </text>
          ))
        )}
      {notes.map((n, i) => {
        const b = playBeats[i];
        const row = rowOf(b);
        const y = midY(laneOf(n), row);
        return (
          <g key={i}>
            <rect x={x(b - windowBeats, row) + 1} y={y + laneH * 0.32} width={Math.max(2, xIn(windowBeats * 2) - xIn(0) - 2)} height={3} rx={1.5} fill="rgb(var(--line) / 0.12)" />
            <line
              x1={x(b, row)}
              x2={x(b, row)}
              y1={y - laneH * 0.26}
              y2={y + laneH * 0.26}
              stroke={n.accent ? "rgb(var(--text-1))" : "rgb(var(--text-3))"}
              strokeOpacity={n.accent ? 1 : 0.6}
              strokeWidth={n.accent ? 2.4 : 1.4}
            />
          </g>
        );
      })}
      {events.map((e, i) => {
        const beat = (e.time - t0) / spb;
        if (beat < -1 || beat > beatsTotal + 1) return null;
        const n = e.index != null ? notes[e.index] : undefined;
        const row = n && e.index != null ? rowOf(playBeats[e.index]) : rowOf(beat);
        const lane = n ? laneOf(n) : poly ? (e.midi < 60 ? 1 : 0) : 0;
        const err = e.index != null ? (e.time - (t0 + playBeats[e.index] * spb)) * 1000 : null;
        const fill =
          e.kind !== "hit" ? "rgb(var(--error))" : err != null && Math.abs(err) <= 20 ? "rgb(var(--success))" : err != null && Math.abs(err) <= 40 ? "rgb(var(--accent))" : "rgb(var(--error))";
        return <circle key={i} cx={x(beat, row)} cy={midY(lane, row)} r={5} fill={fill} opacity={e.kind === "extra" ? 0.5 : 0.95} />;
      })}
      {playheadBeat != null && playheadBeat >= 0 && playheadBeat <= beatsTotal && (() => {
        const row = rowOf(Math.min(playheadBeat, beatsTotal - 0.001));
        return <line x1={x(playheadBeat, row)} x2={x(playheadBeat, row)} y1={top(row) - 2} y2={top(row) + lanes.length * laneH + 2} stroke="rgb(var(--accent))" strokeWidth={2} />;
      })()}
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
