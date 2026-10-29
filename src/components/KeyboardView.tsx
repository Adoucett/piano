/**
 * A real-looking keyboard: a 3–4 octave window fitted to the exercise, an
 * 88-key minimap, true black-key placement, ivory/ebony gradients and the
 * Nord's red felt strip. Keys depress when held.
 */
import { memo, useMemo } from "react";
import { cn } from "@/lib/cn";
import { prettyNote } from "@/lib/notecolor";

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
/** Black-key centers, in white-key widths from the octave's C. */
const BLACK_CENTER: Record<number, number> = { 1: 0.9, 3: 2.1, 6: 3.857, 8: 5.0, 10: 6.143 };
const LOWEST = 21; // A0
const HIGHEST = 108; // C8

const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);

function whiteIndex(m: number): number {
  // Number of white keys from C-1 up to m (exclusive of m if black).
  const oct = Math.floor(m / 12);
  const pc = m % 12;
  return oct * 7 + WHITE_PCS.filter((p) => p < pc).length;
}

export interface KeyboardViewProps {
  /** Notes the window should fit around. */
  focus?: number[];
  held: Set<number>;
  target?: number | null;
  next?: number | null;
  /** Pitch classes in the current scale (shown as dots). */
  scalePcs?: Set<number>;
  wrong?: { midi: number; at: number } | null;
  finger?: number;
  /** Show letter names on the target (and scale) keys. */
  labels?: "none" | "target" | "scale";
  spell?: (midi: number) => string;
  onPress?: (midi: number) => void;
  onRelease?: (midi: number) => void;
  minimap?: boolean;
  octaves?: number;
  className?: string;
}

function windowFor(focus: number[] | undefined, octaves: number): [number, number] {
  const lo0 = focus?.length ? Math.min(...focus) : 60;
  const hi0 = focus?.length ? Math.max(...focus) : 72;
  let lo = Math.floor(lo0 / 12) * 12; // C below
  let hi = Math.ceil((hi0 + 1) / 12) * 12; // C above
  while ((hi - lo) / 12 < octaves) {
    if (lo > 36 && (hi >= 96 || (60 - lo) < (hi - 72))) lo -= 12;
    else hi += 12;
  }
  lo = Math.max(LOWEST, lo);
  hi = Math.min(HIGHEST, hi);
  return [lo, hi];
}

export const KeyboardView = memo(function KeyboardView({
  focus,
  held,
  target,
  next,
  scalePcs,
  wrong,
  finger,
  labels = "target",
  spell,
  onPress,
  onRelease,
  minimap = true,
  octaves = 3,
  className,
}: KeyboardViewProps) {
  const [lo, hi] = useMemo(() => windowFor(focus, octaves), [focus, octaves]);

  const W = 24;
  const H = 132;
  const BW = W * 0.58;
  const BH = H * 0.63;
  const FELT = 5;

  const whites: number[] = [];
  const blacks: number[] = [];
  for (let m = lo; m <= hi; m++) (isBlack(m) ? blacks : whites).push(m);
  const baseWhite = whiteIndex(lo);
  const xWhite = (m: number) => (whiteIndex(m) - baseWhite) * W;
  const xBlack = (m: number) => {
    const oct = Math.floor(m / 12);
    const cWhite = oct * 7 - baseWhite;
    return (cWhite + BLACK_CENTER[m % 12]) * W - BW / 2;
  };
  const width = whites.length * W;
  const total = H + FELT + 2;

  const handlers = (m: number) =>
    onPress
      ? {
          onPointerDown: (e: React.PointerEvent) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            onPress(m);
          },
          onPointerUp: () => onRelease?.(m),
          onPointerCancel: () => onRelease?.(m),
        }
      : {};

  const label = (m: number) => (spell ? prettyNote(spell(m)) : "");

  const keyState = (m: number) => {
    const isHeld = held.has(m);
    const isTarget = target === m;
    return { isHeld, isTarget, isNext: next === m && !isTarget, inScale: scalePcs?.has(((m % 12) + 12) % 12) ?? false };
  };

  return (
    <div className={cn("select-none", className)}>
      {minimap && <Minimap lo={lo} hi={hi} held={held} target={target ?? null} />}
      <svg viewBox={`0 0 ${width} ${total}`} className="block w-full" style={{ maxHeight: 250 }} preserveAspectRatio="xMidYMin meet">
        <defs>
          <linearGradient id="kb-ivory" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F6F1E6" />
            <stop offset="0.85" stopColor="#ECE5D6" />
            <stop offset="1" stopColor="#DCD3C2" />
          </linearGradient>
          <linearGradient id="kb-ivory-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E2DACA" />
            <stop offset="1" stopColor="#D2C8B4" />
          </linearGradient>
          <linearGradient id="kb-ebony" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1A1A1C" />
            <stop offset="0.9" stopColor="#2C2C30" />
            <stop offset="1" stopColor="#3B3B40" />
          </linearGradient>
          <linearGradient id="kb-ebony-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#101012" />
            <stop offset="1" stopColor="#222226" />
          </linearGradient>
          <linearGradient id="kb-shadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="1" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <filter id="kb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Felt strip */}
        <rect x={0} y={0} width={width} height={FELT} fill="#7A2626" />
        <rect x={0} y={FELT - 1} width={width} height={1} fill="#000" opacity={0.35} />

        {whites.map((m) => {
          const s = keyState(m);
          const x = xWhite(m);
          const dy = s.isHeld ? 2 : 0;
          return (
            <g key={m} transform={`translate(0 ${dy})`} {...handlers(m)} style={{ cursor: onPress ? "pointer" : undefined }}>
              <rect
                x={x + 0.5}
                y={FELT}
                width={W - 1}
                height={H - dy}
                rx={2.5}
                fill={s.isHeld ? "url(#kb-ivory-down)" : "url(#kb-ivory)"}
                stroke="#00000033"
                strokeWidth={0.6}
              />
              {s.isTarget && (
                <>
                  <rect x={x + 2} y={FELT + H * 0.45} width={W - 4} height={H * 0.55 - 4} rx={3} fill="rgb(var(--accent))" opacity={0.35} filter="url(#kb-glow)" />
                  <rect x={x + 2.5} y={FELT + H - 10} width={W - 5} height={4} rx={2} fill="rgb(var(--accent))" />
                </>
              )}
              {s.isHeld && !s.isTarget && <rect x={x + 2.5} y={FELT + H - 10} width={W - 5} height={4} rx={2} fill="#00000030" />}
              {s.isNext && <rect x={x + W / 2 - 4} y={FELT + H - 9} width={8} height={2} rx={1} fill="rgb(var(--accent))" opacity={0.55} />}
              {s.inScale && !s.isTarget && <circle cx={x + W / 2} cy={FELT + H - 20} r={2.2} fill="#6E6A60" opacity={0.6} />}
              {(s.isTarget && labels !== "none") || (labels === "scale" && s.inScale) ? (
                <text x={x + W / 2} y={FELT + H - 26} textAnchor="middle" fontSize={9} fontWeight={600} fill={s.isTarget ? "#7A5A1E" : "#6E6A60"} fontFamily="Geist Variable, sans-serif">
                  {label(m)}
                </text>
              ) : null}
              {s.isTarget && finger != null && (
                <g>
                  <circle cx={x + W / 2} cy={FELT + H * 0.5} r={7} fill="rgb(var(--accent))" />
                  <text x={x + W / 2} y={FELT + H * 0.5 + 3.2} textAnchor="middle" fontSize={9} fontWeight={700} fill="#1A1408" fontFamily="Geist Mono, monospace">
                    {finger}
                  </text>
                </g>
              )}
              {wrong?.midi === m && (
                <rect key={wrong.at} x={x + 0.5} y={FELT} width={W - 1} height={H} rx={2.5} fill="rgb(var(--error))" className="kb-flash" />
              )}
            </g>
          );
        })}

        {blacks.map((m) => {
          const s = keyState(m);
          const x = xBlack(m);
          const dy = s.isHeld ? 1.5 : 0;
          return (
            <g key={m} transform={`translate(0 ${dy})`} {...handlers(m)} style={{ cursor: onPress ? "pointer" : undefined }}>
              <rect x={x} y={FELT} width={BW} height={BH} rx={2} fill={s.isHeld ? "url(#kb-ebony-down)" : "url(#kb-ebony)"} />
              <rect x={x + 1.5} y={FELT} width={BW - 3} height={BH - 7} rx={1.5} fill="#ffffff" opacity={s.isHeld ? 0.02 : 0.05} />
              {s.isTarget && (
                <>
                  <rect x={x - 2} y={FELT + BH * 0.35} width={BW + 4} height={BH * 0.65} rx={3} fill="rgb(var(--accent))" opacity={0.45} filter="url(#kb-glow)" />
                  <rect x={x + 2} y={FELT + BH - 9} width={BW - 4} height={4} rx={2} fill="rgb(var(--accent))" />
                </>
              )}
              {s.isNext && <rect x={x + BW / 2 - 3} y={FELT + BH - 8} width={6} height={2} rx={1} fill="rgb(var(--accent))" opacity={0.6} />}
              {s.inScale && !s.isTarget && <circle cx={x + BW / 2} cy={FELT + BH - 16} r={1.8} fill="#BDB7A8" opacity={0.55} />}
              {((s.isTarget && labels !== "none") || (labels === "scale" && s.inScale)) && (
                <text x={x + BW / 2} y={FELT + BH - 22} textAnchor="middle" fontSize={7.5} fontWeight={600} fill={s.isTarget ? "rgb(var(--accent))" : "#BDB7A8"} fontFamily="Geist Variable, sans-serif">
                  {label(m)}
                </text>
              )}
              {s.isTarget && finger != null && (
                <g>
                  <circle cx={x + BW / 2} cy={FELT + BH * 0.42} r={6} fill="rgb(var(--accent))" />
                  <text x={x + BW / 2} y={FELT + BH * 0.42 + 3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#1A1408" fontFamily="Geist Mono, monospace">
                    {finger}
                  </text>
                </g>
              )}
              {wrong?.midi === m && <rect key={wrong.at} x={x} y={FELT} width={BW} height={BH} rx={2} fill="rgb(var(--error))" className="kb-flash" />}
            </g>
          );
        })}
        <rect x={0} y={FELT} width={width} height={6} fill="url(#kb-shadow)" opacity={0.25} />
      </svg>
    </div>
  );
});

function Minimap({ lo, hi, held, target }: { lo: number; hi: number; held: Set<number>; target: number | null }) {
  const whites: number[] = [];
  for (let m = LOWEST; m <= HIGHEST; m++) if (!isBlack(m)) whites.push(m);
  const W = 4;
  const base = whiteIndex(LOWEST);
  const x = (m: number) => (whiteIndex(m) - base) * W + (isBlack(m) ? -1 : 0);
  const width = whites.length * W;
  return (
    <svg viewBox={`0 0 ${width} 12`} className="mb-2 block h-3 w-full opacity-80" preserveAspectRatio="none">
      <rect x={0} y={2} width={width} height={8} rx={2} fill="rgb(var(--line) / 0.06)" />
      {whites.map((m) => m % 12 === 0 && <rect key={m} x={x(m)} y={3} width={0.6} height={6} fill="rgb(var(--line) / 0.18)" />)}
      <rect x={x(lo)} y={1} width={x(hi) - x(lo) + W} height={10} rx={2.5} fill="rgb(var(--accent) / 0.08)" stroke="rgb(var(--accent) / 0.55)" strokeWidth={0.8} />
      {[...held].map((m) => (
        <circle key={m} cx={x(m) + W / 2} cy={6} r={1.6} fill="rgb(var(--text-1))" />
      ))}
      {target != null && <circle cx={x(target) + W / 2} cy={6} r={1.8} fill="rgb(var(--accent))" />}
    </svg>
  );
}
