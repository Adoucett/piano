/**
 * The sheet. VexFlow engraves one page (up to 4 bars) at a time: clef, key
 * signature, time signature, bar lines, beams, per-bar accidentals. A separate
 * absolutely-positioned layer handles everything that moves (playhead band,
 * halo, look-ahead tick, letters, wrong-note ghost) so the engraving is never
 * redrawn while you play.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Accidental,
  BarlineType,
  Beam,
  Dot,
  Formatter,
  GhostNote,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  Flow,
  Voice,
} from "vexflow/bravura";
import type { AidLevel, ChordMark, Clef, NoteSpec, StaffLayout } from "@/types";
import { signatureMap, spellForKey } from "@/theory/engine";
import { cssRgb, letterColor, prettyNote } from "@/lib/notecolor";
import { cn } from "@/lib/cn";
import type { NoteColoring } from "@/store/progress";

export type SlotState = "pending" | "hit" | "wrong" | "missed";

export interface SheetData {
  notes: NoteSpec[];
  chords: ChordMark[];
  layout: StaffLayout;
  keySignature: string;
  beatsPerBar: number;
  bars: number;
}

export interface StaffViewProps {
  sheet: SheetData;
  /** Index of the current target note (-1 for none). */
  current: number;
  statuses?: SlotState[];
  /** A wrong pitch to ghost on the staff (changing `at` re-triggers the shake). */
  wrong?: { index: number; midi: number; at: number } | null;
  /** Reading-aid level for a note. */
  aidFor?: (note: NoteSpec, clef: Clef) => AidLevel;
  /** Indices whose letter is revealed after a mistake (aid level 2). */
  revealed?: Set<number>;
  coloring?: NoteColoring;
  night?: boolean;
  showChords?: boolean;
  /** Smooth playhead position in beats (tempo mode / listen). Overrides the note-snapped band. */
  playheadBeat?: number | null;
  compact?: boolean;
  /** Draw all notes neutral (rhythm reading). */
  rhythmOnly?: boolean;
  /** Draw the time signature on the first bar. */
  timeSignature?: boolean;
  /** Override the engraving scale (e.g. larger single-note reading prompts). */
  zoom?: number;
  className?: string;
}

interface Placed {
  index: number;
  x: number;
  y: number;
  clef: Clef;
  ledger: boolean;
  hollow: boolean;
  line: number;
  el?: SVGElement;
}

interface Geometry {
  scale: number;
  width: number;
  height: number;
  placed: Placed[];
  beatX: { beat: number; x: number }[];
  staffTop: number;
  staffBottom: number;
  chordY: number;
  labelY: number;
  previewX: number | null;
}

const DUR: [number, string, number][] = [
  [4, "w", 0],
  [3, "h", 1],
  [2, "h", 0],
  [1.5, "q", 1],
  [1, "q", 0],
  [0.75, "8", 1],
  [0.5, "8", 0],
  [0.25, "16", 0],
];

function durationOf(beats: number): { duration: string; dots: number } {
  for (const [b, d, dots] of DUR) if (Math.abs(beats - b) < 1e-3) return { duration: d, dots };
  // Triplets and odd values: nearest smaller.
  const found = DUR.find(([b]) => b <= beats + 1e-3);
  return found ? { duration: found[1], dots: found[2] } : { duration: "16", dots: 0 };
}

/** Split a gap into beat-aligned rests. */
function restsFor(from: number, to: number): { beat: number; beats: number }[] {
  const out: { beat: number; beats: number }[] = [];
  let a = from;
  let guard = 0;
  while (a < to - 1e-6 && guard++ < 32) {
    const d = [4, 2, 1, 0.5, 0.25].find((d) => Math.abs((a / d) - Math.round(a / d)) < 1e-6 && a + d <= to + 1e-6) ?? 0.25;
    out.push({ beat: a, beats: d });
    a += d;
  }
  return out;
}

function vexKey(n: NoteSpec): string {
  return `${n.name[0].toLowerCase()}${n.name.slice(1)}/${n.octave}`;
}

/** Page boundaries: greedy fill by note density, max 4 bars per page. */
function paginate(barsDensity: number[], innerWidth: number, firstExtra: number, maxBars: number): [number, number][] {
  const pages: [number, number][] = [];
  let start = 0;
  while (start < barsDensity.length) {
    let w = firstExtra;
    let end = start;
    while (end < barsDensity.length && end - start < maxBars) {
      const bw = Math.max(150, barsDensity[end] * 34 + 40);
      if (end > start && w + bw > innerWidth * 0.88) break;
      w += bw;
      end += 1;
    }
    pages.push([start, Math.max(end, start + 1)]);
    start = Math.max(end, start + 1);
  }
  return pages;
}

export function StaffView({
  sheet,
  current,
  statuses,
  wrong,
  aidFor,
  revealed,
  coloring = "chordtone",
  night = false,
  showChords = true,
  playheadBeat = null,
  compact = false,
  zoom,
  rhythmOnly = false,
  timeSignature = true,
  className,
}: StaffViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgHost = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [geo, setGeo] = useState<Geometry | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.floor(el.clientWidth)));
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const scale = zoom ?? (compact ? 0.95 : width < 720 ? 1.0 : 1.3);
  const inner = width / scale;
  const maxBars = compact ? 2 : 4;

  const barNotes = useMemo(() => {
    const bpb = sheet.beatsPerBar;
    const bars: number[][] = Array.from({ length: sheet.bars }, () => []);
    sheet.notes.forEach((n, i) => {
      const b = Math.min(sheet.bars - 1, Math.floor(((n.beat ?? i * 0.5) + 1e-6) / bpb));
      bars[b].push(i);
    });
    return bars;
  }, [sheet]);

  const sigAccCount = useMemo(() => Object.values(signatureMap(sheet.keySignature)).filter(Boolean).length, [sheet.keySignature]);
  const firstExtra = 48 + sigAccCount * 11 + 34;
  const pages = useMemo(
    () => (inner > 0 ? paginate(barNotes.map((b) => b.length), inner - 20, firstExtra, maxBars) : [[0, sheet.bars] as [number, number]]),
    [barNotes, inner, firstExtra, maxBars, sheet.bars]
  );

  const currentBar = useMemo(() => {
    const idx = Math.max(0, Math.min(sheet.notes.length - 1, current));
    if (playheadBeat != null) return Math.max(0, Math.min(sheet.bars - 1, Math.floor(playheadBeat / sheet.beatsPerBar)));
    return barNotes.findIndex((b) => b.includes(idx));
  }, [current, playheadBeat, barNotes, sheet]);
  const pageIndex = Math.max(0, pages.findIndex(([a, b]) => currentBar >= a && currentBar < b));
  const page = pages[pageIndex] ?? [0, 1];
  const nextPage = pages[pageIndex + 1];

  // ---------- Engrave the page ----------
  useEffect(() => {
    const host = svgHost.current;
    const wrap = wrapRef.current;
    if (!host || !wrap || width <= 0) return;
    host.innerHTML = "";

    const ink = cssRgb(wrap, "--ink");
    const tension = cssRgb(wrap, "--sheet-tension");
    const approach = cssRgb(wrap, "--ink", 0.55);
    const colorFor = (n: NoteSpec): string => {
      if (rhythmOnly || coloring === "ink") return ink;
      if (coloring === "letter") return letterColor(n.letter);
      if (n.role === "tension") return tension;
      if (n.role === "approach") return approach;
      return ink;
    };

    const grand = sheet.layout === "grand";
    const top = compact ? 34 : 44;
    const trebleY = top;
    const bassY = grand ? top + 96 : top;
    const singleClef: Clef = sheet.layout === "bass" ? "bass" : "treble";
    const height = (grand ? bassY + 138 : top + 146) + (compact ? 16 : 10);

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, height * scale);
    const ctx = renderer.getContext();
    ctx.scale(scale, scale);
    ctx.setFillStyle(ink);
    ctx.setStrokeStyle(ink);

    const sig = signatureMap(sheet.keySignature);
    const [pa, pb] = page;
    const barsOnPage = pb - pa;
    const preview = nextPage ? nextPage[0] : null;
    const leftPad = grand ? 24 : 10;
    const previewReserve = preview != null ? Math.min(200, inner * 0.14) : 0;
    const avail = inner - leftPad - 6 - firstExtra - previewReserve;
    const dens = Array.from({ length: barsOnPage }, (_, k) => Math.max(4, barNotes[pa + k].length));
    const densSum = dens.reduce((a, b) => a + b, 0);

    const placed: Placed[] = [];
    const beatX: { beat: number; x: number }[] = [];
    let x = leftPad;
    let previewX: number | null = null;

    const drawBar = (barIdx: number, bx: number, bw: number, first: boolean, isPreview: boolean) => {
      const bpb = sheet.beatsPerBar;
      const staves: Record<Clef, Stave | null> = { treble: null, bass: null };
      const mkStave = (clef: Clef, y: number) => {
        const st = new Stave(bx, y, bw);
        if (first) {
          st.addClef(clef);
          if (sheet.keySignature !== "C") st.addKeySignature(sheet.keySignature);
          if (barIdx === 0 && timeSignature) st.addTimeSignature(`${bpb}/4`);
        }
        if (barIdx === sheet.bars - 1 && !isPreview) st.setEndBarType(BarlineType.END);
        st.setStyle({ strokeStyle: ink, fillStyle: ink });
        st.setContext(ctx).draw();
        return st;
      };
      if (grand) {
        staves.treble = mkStave("treble", trebleY);
        staves.bass = mkStave("bass", bassY);
        if (first) {
          new StaveConnector(staves.treble, staves.bass).setType("brace").setContext(ctx).draw();
          new StaveConnector(staves.treble, staves.bass).setType("singleLeft").setContext(ctx).draw();
        }
        new StaveConnector(staves.treble, staves.bass)
          .setType(barIdx === sheet.bars - 1 && !isPreview ? "boldDoubleRight" : "singleRight")
          .setContext(ctx)
          .draw();
      } else {
        staves[singleClef] = mkStave(singleClef, trebleY);
      }

      // Tickables for this bar, filling gaps with rests.
      const idxs = barNotes[barIdx];
      const barStart = barIdx * bpb;
      type Tick = { kind: "note"; is: number[]; beat: number; beats: number } | { kind: "rest"; beat: number; beats: number };
      const ticks: Tick[] = [];
      let cursor = barStart;
      for (let k = 0; k < idxs.length; k++) {
        const i = idxs[k];
        const n = sheet.notes[i];
        const b = n.beat ?? i * 0.5;
        // Notes sharing a beat (and a staff) become one chord.
        const is = [i];
        const clefOf = (m: number) => (grand ? (m >= 60 ? "treble" : "bass") : singleClef);
        while (k + 1 < idxs.length) {
          const j = idxs[k + 1];
          const nj = sheet.notes[j];
          if (Math.abs((nj.beat ?? j * 0.5) - b) > 1e-6 || clefOf(nj.midi) !== clefOf(n.midi)) break;
          is.push(j);
          k += 1;
        }
        if (b > cursor + 1e-6) restsFor(cursor - barStart, b - barStart).forEach((r) => ticks.push({ kind: "rest", beat: barStart + r.beat, beats: r.beats }));
        const beats = Math.min(n.beats ?? 0.5, barStart + bpb - b);
        ticks.push({ kind: "note", is: is.sort((a, c) => sheet.notes[a].midi - sheet.notes[c].midi), beat: b, beats });
        cursor = b + beats;
      }
      if (cursor < barStart + bpb - 1e-6) restsFor(cursor - barStart, bpb).forEach((r) => ticks.push({ kind: "rest", beat: barStart + r.beat, beats: r.beats }));

      const voiceNotes: Record<Clef, (StaveNote | GhostNote)[]> = { treble: [], bass: [] };
      const real: { sn: StaveNote; tick: Tick; clef: Clef }[] = [];
      const accState: Record<string, string> = {};

      for (const t of ticks) {
        const { duration, dots } = durationOf(t.beats);
        const clef: Clef =
          !grand ? singleClef : t.kind === "note" ? (sheet.notes[t.is[0]].midi >= 60 ? "treble" : "bass") : "treble";
        let sn: StaveNote;
        if (t.kind === "rest") {
          sn = new StaveNote({ keys: [clef === "bass" ? "d/3" : "b/4"], duration: `${duration}r`, clef, dots });
        } else {
          const ns = t.is.map((i) => sheet.notes[i]);
          sn = new StaveNote({ keys: rhythmOnly ? ["b/4"] : ns.map(vexKey), duration, clef, dots, auto_stem: true });
          if (!rhythmOnly) {
            ns.forEach((n, k) => {
              const acc = n.name.slice(1);
              const slot = `${n.letter}${n.octave}`;
              const prev = accState[slot] ?? sig[n.letter];
              if (prev !== acc) {
                sn.addModifier(new Accidental(acc === "" ? "n" : acc), k);
                accState[slot] = acc;
              }
            });
          }
          const color = colorFor(ns[0]);
          sn.setStyle({ fillStyle: color, strokeStyle: color });
          if (ns.length > 1 && !rhythmOnly) ns.forEach((n, k) => sn.setKeyStyle(k, { fillStyle: colorFor(n), strokeStyle: colorFor(n) }));
          sn.setLedgerLineStyle({ strokeStyle: ink, fillStyle: ink });
          real.push({ sn, tick: t, clef });
        }
        if (dots) Dot.buildAndAttach([sn], { all: true });
        if (t.kind === "rest") {
          sn.setStyle({ fillStyle: ink, strokeStyle: ink });
          real.push({ sn, tick: t, clef });
        }
        voiceNotes[clef].push(sn);
        if (grand) {
          const other: Clef = clef === "treble" ? "bass" : "treble";
          voiceNotes[other].push(new GhostNote({ duration, dots }));
        }
      }

      const voices: Voice[] = [];
      (["treble", "bass"] as Clef[]).forEach((c) => {
        if (!staves[c]) return;
        const v = new Voice({ num_beats: bpb, beat_value: 4 }).setMode(Voice.Mode.SOFT);
        v.addTickables(voiceNotes[c]);
        voices.push(v);
      });
      const fmt = new Formatter();
      voices.forEach((v) => fmt.joinVoices([v]));
      const stave0 = staves.treble ?? staves.bass!;
      const usable = stave0.getNoteEndX() - stave0.getNoteStartX() - 14;
      fmt.format(voices, Math.max(40, usable));

      // Beams: eighths/sixteenths grouped by half bar, same staff, consecutive.
      const beams: Beam[] = [];
      let lastKey = "";
      let run: StaveNote[] = [];
      const flush = () => {
        if (run.length >= 2) beams.push(new Beam(run, true));
        run = [];
      };
      for (const r of real) {
        const isShort = r.tick.kind === "note" && r.tick.beats <= 0.75;
        const half = Math.floor((r.tick.beat - barStart + 1e-6) / 2);
        const key = `${r.clef}|${half}`;
        if (!isShort || key !== lastKey) flush();
        if (isShort) run.push(r.sn);
        lastKey = isShort ? key : "";
      }
      flush();

      voices.forEach((v, k) => v.draw(ctx, k === 0 ? (staves.treble ?? staves.bass!) : staves.bass!));
      beams.forEach((b) => {
        b.setStyle({ fillStyle: ink, strokeStyle: ink });
        b.setContext(ctx).draw();
      });

      for (const r of real) {
        const x0 = r.sn.getNoteHeadBeginX();
        const x1 = r.sn.getNoteHeadEndX();
        const cx = (x0 + x1) / 2;
        beatX.push({ beat: r.tick.beat, x: cx });
        if (r.tick.kind !== "note" || isPreview) continue;
        const props = r.sn.getKeyProps();
        const ys = r.sn.getYs();
        r.tick.is.forEach((i, k) => {
          const line = props[k]?.line ?? 3;
          placed.push({
            index: i,
            x: cx,
            y: ys[k] ?? ys[0],
            clef: r.clef,
            ledger: line < 0.5 || line > 5.5,
            hollow: r.tick.beats >= 2,
            line,
            el: r.sn.getSVGElement() ?? undefined,
          });
        });
      }
    };

    for (let k = 0; k < barsOnPage; k++) {
      const bw = (avail * dens[k]) / densSum + (k === 0 ? firstExtra : 0);
      drawBar(pa + k, x, bw, k === 0, false);
      x += bw;
    }
    if (preview != null) {
      previewX = x;
      const bw = Math.max(150, barNotes[preview].length * 30 + 30);
      drawBar(preview, x, bw, false, true);
    }

    const staffTopStave = new Stave(0, trebleY, 10);
    const staffTop = staffTopStave.getYForLine(0);
    const staffBottom = grand ? new Stave(0, bassY, 10).getYForLine(4) : staffTopStave.getYForLine(4);

    beatX.sort((a, b) => a.beat - b.beat);
    setGeo({
      scale,
      width,
      height: height * scale,
      placed,
      beatX,
      staffTop,
      staffBottom,
      chordY: staffTop - 26,
      labelY: staffBottom + 50,
      previewX,
    });
  }, [sheet, width, scale, inner, page, nextPage, barNotes, firstExtra, coloring, night, compact, rhythmOnly, timeSignature]);

  // ---------- State classes on engraved notes ----------
  useEffect(() => {
    if (!geo) return;
    for (const p of geo.placed) {
      const el = p.el;
      if (!el) continue;
      const st = statuses?.[p.index] ?? "pending";
      el.classList.toggle("is-current", p.index === current && st === "pending");
      el.classList.toggle("is-played", st === "hit");
      el.classList.toggle("is-miss", st === "wrong" || st === "missed");
    }
  }, [geo, statuses, current]);

  // ---------- Overlay geometry ----------
  const s = geo?.scale ?? 1;
  const cur = geo?.placed.find((p) => p.index === current);

  const bandX = useMemo(() => {
    if (!geo) return null;
    if (playheadBeat != null) {
      const bx = geo.beatX;
      if (!bx.length) return null;
      if (playheadBeat <= bx[0].beat) return bx[0].x;
      for (let i = 0; i + 1 < bx.length; i++) {
        if (playheadBeat >= bx[i].beat && playheadBeat <= bx[i + 1].beat) {
          const f = (playheadBeat - bx[i].beat) / Math.max(1e-6, bx[i + 1].beat - bx[i].beat);
          return bx[i].x + f * (bx[i + 1].x - bx[i].x);
        }
      }
      return bx[bx.length - 1].x;
    }
    return cur?.x ?? null;
  }, [geo, playheadBeat, cur]);

  const wrongGhost = useMemo(() => {
    if (!geo || !wrong) return null;
    const p = geo.placed.find((q) => q.index === wrong.index);
    if (!p) return null;
    const played = spellForKey(wrong.midi, sheet.keySignature);
    const key = `${played.name[0].toLowerCase()}${played.name.slice(1)}/${played.octave}`;
    const line = (Flow.keyProperties(key, p.clef) as { line: number }).line;
    return { x: p.x, y: p.y - (line - p.line) * 10, at: wrong.at, name: played.name };
  }, [geo, wrong, sheet.keySignature]);

  const chordLabels = useMemo(() => {
    if (!geo || !showChords) return [];
    return sheet.chords
      .map((c) => {
        const hit = geo.beatX.find((b) => Math.abs(b.beat - c.beat) < 1e-3) ?? geo.beatX.find((b) => b.beat >= c.beat);
        return hit && (geo.previewX == null || hit.x < geo.previewX) ? { x: hit.x, symbol: c.symbol, beat: c.beat } : null;
      })
      .filter((x): x is { x: number; symbol: string; beat: number } => !!x);
  }, [geo, sheet.chords, showChords]);

  return (
    <div
      ref={wrapRef}
      data-sheet={night ? "night" : undefined}
      className={cn(
        "sheet relative w-full overflow-hidden rounded-panel bg-paper text-ink",
        !compact && "shadow-sheet",
        className
      )}
      style={{ height: geo?.height ?? (compact ? 150 : 200) }}
    >
      <div ref={svgHost} key={`${page[0]}-${page[1]}`} className="absolute inset-0 animate-fade-in" />

      {geo && (
        <div className="pointer-events-none absolute inset-0">
          {/* Playhead band */}
          {bandX != null && (
            <div
              className="absolute rounded-[10px] bg-accent/[0.16] ring-1 ring-accent/25"
              style={{
                left: (bandX - 15) * s,
                width: 30 * s,
                top: (geo.staffTop - 30) * s,
                height: (geo.staffBottom - geo.staffTop + 60) * s,
                transition: playheadBeat != null ? "none" : "left 180ms cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          )}
          {/* Halo on the current note */}
          {cur && playheadBeat == null && (
            <div
              className="absolute rounded-full"
              style={{
                left: (cur.x - 13) * s,
                top: (cur.y - 13) * s,
                width: 26 * s,
                height: 26 * s,
                boxShadow: "0 0 0 2px rgb(var(--accent) / 0.55)",
                transition: "left 180ms cubic-bezier(0.22,1,0.36,1), top 180ms cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          )}
          {/* Chord symbols */}
          {chordLabels.map((c) => (
            <div
              key={`${c.beat}-${c.symbol}`}
              className="absolute -translate-x-1/2 whitespace-nowrap font-serif italic text-ink"
              style={{ left: c.x * s, top: geo.chordY * s - 14 * s, fontSize: 19 * s }}
            >
              {c.symbol}
            </div>
          ))}
          {/* Letters */}
          {!rhythmOnly &&
            geo.placed.map((p) => {
              const n = sheet.notes[p.index];
              const level = aidFor ? aidFor(n, p.clef) : 3;
              const st = statuses?.[p.index] ?? "pending";
              const show =
                level === 0 || (level === 1 && p.ledger) || (level === 2 && revealed?.has(p.index));
              if (!show) return null;
              const isCur = p.index === current && st === "pending";
              return (
                <div
                  key={p.index}
                  className={cn("absolute -translate-x-1/2 font-sans font-semibold leading-none", isCur ? "text-[rgb(var(--sheet-current))]" : "text-ink/70")}
                  style={{ left: p.x * s, top: geo.labelY * s, fontSize: 12 * s, opacity: st === "hit" ? 0.45 : 1 }}
                >
                  {prettyNote(n.name)}
                </div>
              );
            })}
          {/* Wrong-note ghost */}
          {wrongGhost && (
            <div
              key={wrongGhost.at}
              className="absolute animate-shake"
              style={{ left: (wrongGhost.x - 6.5) * s, top: (wrongGhost.y - 5) * s }}
            >
              <div
                className="rounded-[50%] bg-error/70"
                style={{ width: 13 * s, height: 10 * s, transform: "rotate(-20deg)" }}
              />
              <div className="absolute left-full top-1/2 ml-1 -translate-y-1/2 font-sans text-[11px] font-semibold text-error">
                {prettyNote(wrongGhost.name)}
              </div>
            </div>
          )}
          {/* Preview fade */}
          {geo.previewX != null && (
            <div
              className="absolute inset-y-0 right-0"
              style={{
                left: (geo.previewX - 4) * s,
                background: "linear-gradient(90deg, rgb(var(--paper) / 0.35), rgb(var(--paper)) 85%)",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
