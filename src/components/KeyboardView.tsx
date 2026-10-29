import { useMemo } from "react";
import { letterColor } from "@/lib/notecolor";

export interface KeyboardViewProps {
  /** MIDI notes currently held down. */
  held?: Iterable<number>;
  /** The target note to light up. */
  expectedMidi?: number | null;
  /** Pitch classes (0..11) that belong to the current scale, to tint. */
  scalePitchClasses?: Set<number>;
  /** How each scale pitch class should be spelled, for labels. */
  pcLabels?: Record<number, string>;
  /** Show letter labels on every white key. */
  showAllLabels?: boolean;
  colorByLetter?: boolean;
  /** Click handler (for mouse input / preview). */
  onPress?: (midi: number) => void;
  onRelease?: (midi: number) => void;
  height?: number;
}

const WHITE_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);
const WHITE_W = 22;
const BLACK_W = 13;
const FIRST = 21; // A0
const LAST = 108; // C8

const WHITE_LETTER: Record<number, string> = {
  0: "C",
  2: "D",
  4: "E",
  5: "F",
  7: "G",
  9: "A",
  11: "B",
};

interface KeyGeom {
  midi: number;
  x: number;
  white: boolean;
}

export function KeyboardView({
  held,
  expectedMidi,
  scalePitchClasses,
  pcLabels,
  showAllLabels = false,
  colorByLetter = true,
  onPress,
  onRelease,
  height = 120,
}: KeyboardViewProps) {
  const { keys, width, whiteH, blackH } = useMemo(() => {
    const whites: KeyGeom[] = [];
    const blacks: KeyGeom[] = [];
    let wi = 0;
    for (let midi = FIRST; midi <= LAST; midi++) {
      const pc = midi % 12;
      if (WHITE_PCS.has(pc)) {
        whites.push({ midi, x: wi * WHITE_W, white: true });
        wi += 1;
      } else {
        blacks.push({ midi, x: wi * WHITE_W - BLACK_W / 2, white: false });
      }
    }
    return {
      keys: [...whites, ...blacks],
      width: wi * WHITE_W,
      whiteH: height,
      blackH: Math.round(height * 0.62),
    };
  }, [height]);

  const heldSet = useMemo(() => new Set(held ?? []), [held]);

  const renderKey = (k: KeyGeom) => {
    const pc = k.midi % 12;
    const inScale = scalePitchClasses?.has(pc) ?? false;
    const isHeld = heldSet.has(k.midi);
    const isTarget = expectedMidi === k.midi;

    let fill: string;
    let stroke = "hsl(220 15% 35%)";
    if (k.white) {
      fill = "#f8fafc";
      if (inScale && colorByLetter) fill = tint(letterColor(WHITE_LETTER[pc]));
    } else {
      fill = "#1e293b";
      if (inScale && colorByLetter) fill = shade(letterColor(blackLetter(pc)));
    }
    if (isHeld) {
      fill = "hsl(142 71% 45%)";
      stroke = "hsl(142 71% 30%)";
    }
    if (isTarget) {
      fill = "hsl(43 96% 56%)";
      stroke = "hsl(43 96% 40%)";
    }

    const label = k.white
      ? showAllLabels
        ? WHITE_LETTER[pc]
        : isTarget || (inScale && pcLabels?.[pc])
          ? pcLabels?.[pc] ?? WHITE_LETTER[pc]
          : null
      : isTarget
        ? pcLabels?.[pc] ?? null
        : null;

    return (
      <g key={k.midi}>
        <rect
          x={k.x}
          y={0}
          width={k.white ? WHITE_W : BLACK_W}
          height={k.white ? whiteH : blackH}
          rx={3}
          fill={fill}
          stroke={stroke}
          strokeWidth={1}
          onMouseDown={() => onPress?.(k.midi)}
          onMouseUp={() => onRelease?.(k.midi)}
          onMouseLeave={() => isHeld && onRelease?.(k.midi)}
          style={{ cursor: onPress ? "pointer" : "default" }}
        />
        {label && (
          <text
            x={k.x + (k.white ? WHITE_W / 2 : BLACK_W / 2)}
            y={k.white ? whiteH - 6 : blackH - 5}
            textAnchor="middle"
            fontSize={k.white ? 9 : 7}
            fontWeight="bold"
            fill={k.white ? "#0f172a" : "#e2e8f0"}
            pointerEvents="none"
          >
            {label}
          </text>
        )}
      </g>
    );
  };

  // Draw white keys first, then black keys on top.
  const whiteKeys = keys.filter((k) => k.white);
  const blackKeys = keys.filter((k) => !k.white);

  return (
    <div className="w-full overflow-x-auto rounded-xl bg-slate-900/60 p-2">
      <svg width={width} height={height} className="block">
        {whiteKeys.map(renderKey)}
        {blackKeys.map(renderKey)}
      </svg>
    </div>
  );
}

function blackLetter(pc: number): string {
  // Spell with sharps for tint lookup only.
  return { 1: "C", 3: "D", 6: "F", 8: "G", 10: "A" }[pc] ?? "C";
}

/** Light tint of a letter color for white keys. */
function tint(hsl: string): string {
  return hsl.replace(/(\d+)%\)$/, (_m, l) => `${Math.min(92, Number(l) + 30)}%)`).replace(
    /(\d+)%\s/,
    "85% "
  );
}

/** Darker shade for black keys. */
function shade(hsl: string): string {
  return hsl.replace(/(\d+)%\)$/, (_m, l) => `${Math.max(20, Number(l) - 15)}%)`);
}
