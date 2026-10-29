import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AidLevel, ExerciseSpec, RunSummary } from "@/types";
import { exerciseKey } from "@/types";
import { applyRun, itemScore, type ItemKind, type ItemStat, type RunOutcome } from "@/practice/mastery";
import {
  TRACKS,
  TIER_BY_ID,
  TIER_SECURE,
  UNLOCK_THRESHOLD,
  crossRequirements,
  unitExercises,
  type Tier,
  type UnitDef,
} from "@/exercises/tracks";
import type { Region } from "@/exercises/reading";
import type { ClickPattern } from "@/practice/transport";
import type { SoundSource } from "@/audio/sound";

export type MatchMode = "exact-octave" | "any-octave";
export type InputSource = "midi" | "qwerty";
export type PracticeMode = "wait" | "tempo";
export type NoteColoring = "chordtone" | "ink" | "letter";
export type Theme = "dark" | "light";

export interface Settings {
  matchMode: MatchMode;
  inputSource: InputSource;
  practiceMode: PracticeMode;
  aidMode: "auto" | "manual";
  aidLevel: AidLevel;
  bpm: number;
  swing: number;
  /** Swing the eighths in lines. Auto swings bebop scales, vocabulary and progressions. */
  swingLines: "auto" | "on" | "off";
  click: ClickPattern;
  countIn: boolean;
  drone: boolean;
  walkingBass: boolean;
  soundSource: SoundSource;
  backingToNord: boolean;
  cadenceOnClean: boolean;
  noteColoring: NoteColoring;
  nightSheet: boolean;
  theme: Theme;
  showFingering: boolean;
  /** Input latency (ms) measured by calibration, subtracted from every note. */
  latencyMs: number;
  unlockAll: boolean;
  sidebarCollapsed: boolean;
}

export interface RunRecord {
  t: number;
  key: string;
  kind: ItemKind;
  acc: number;
  mae?: number;
  bpm: number;
  mode: PracticeMode;
}

export interface RegionStat {
  ema: number;
  n: number;
}

interface ProgressState {
  items: Record<string, ItemStat>;
  runs: RunRecord[];
  regions: Partial<Record<Region, RegionStat>>;
  leitner: Record<string, number>;
  practiceDays: string[];
  settings: Settings;

  recordRun: (key: string, kind: ItemKind, summary: RunSummary, meta?: { spec?: ExerciseSpec; refId?: string }) => RunOutcome;
  recordExercise: (spec: ExerciseSpec, summary: RunSummary) => RunOutcome;
  recordReadingNote: (leitnerId: string, region: Region, correctFirstTry: boolean) => void;
  recordRegion: (region: Region, correct: boolean) => void;
  setSettings: (partial: Partial<Settings>) => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  reset: () => void;
}

export const DEFAULT_SETTINGS: Settings = {
  matchMode: "exact-octave",
  inputSource: "midi",
  practiceMode: "tempo",
  aidMode: "auto",
  aidLevel: 0,
  bpm: 88,
  swing: 0.62,
  swingLines: "auto",
  click: "all",
  countIn: true,
  drone: true,
  walkingBass: false,
  soundSource: "auto",
  backingToNord: false,
  cadenceOnClean: true,
  noteColoring: "chordtone",
  nightSheet: false,
  theme: "dark",
  showFingering: true,
  latencyMs: 0,
  unlockAll: false,
  sidebarCollapsed: false,
};

function localISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function withDay(days: string[]): string[] {
  const day = localISO();
  return days.includes(day) ? days : [...days, day];
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      items: {},
      runs: [],
      regions: {},
      leitner: {},
      practiceDays: [],
      settings: DEFAULT_SETTINGS,

      recordRun: (key, kind, summary, meta) => {
        const now = Date.now();
        const outcome = applyRun(get().items[key], kind, summary, now, meta);
        set((state) => ({
          items: { ...state.items, [key]: outcome.next },
          runs: [
            ...state.runs.slice(-399),
            { t: now, key, kind, acc: summary.accuracy, mae: summary.meanAbsErrorMs, bpm: summary.bpm, mode: summary.mode },
          ],
          practiceDays: withDay(state.practiceDays),
        }));
        return outcome;
      },

      recordExercise: (spec, summary) => {
        const { source: _source, ...bare } = spec;
        return get().recordRun(exerciseKey(spec), "exercise", summary, { spec: bare });
      },

      recordReadingNote: (id, region, correct) => {
        set((state) => {
          const box = state.leitner[id] ?? 2;
          const nextBox = correct ? Math.min(5, box + 1) : 1;
          const r = state.regions[region] ?? { ema: 0.5, n: 0 };
          return {
            leitner: { ...state.leitner, [id]: nextBox },
            regions: { ...state.regions, [region]: { ema: r.ema * 0.85 + (correct ? 0.15 : 0), n: r.n + 1 } },
          };
        });
      },

      recordRegion: (region, correct) => {
        set((state) => {
          const r = state.regions[region] ?? { ema: 0.5, n: 0 };
          return { regions: { ...state.regions, [region]: { ema: r.ema * 0.9 + (correct ? 0.1 : 0), n: r.n + 1 } } };
        });
      },

      setSettings: (partial) => set((state) => ({ settings: { ...state.settings, ...partial } })),

      exportJSON: () => {
        const { items, runs, regions, leitner, practiceDays, settings } = get();
        return JSON.stringify({ version: 2, items, runs, regions, leitner, practiceDays, settings }, null, 2);
      },

      importJSON: (json) => {
        try {
          const data = JSON.parse(json);
          set((state) => ({
            items: data.items ?? {},
            runs: data.runs ?? [],
            regions: data.regions ?? {},
            leitner: data.leitner ?? {},
            practiceDays: data.practiceDays ?? [],
            settings: { ...state.settings, ...(data.settings ?? {}) },
          }));
          return true;
        } catch {
          return false;
        }
      },

      reset: () => set({ items: {}, runs: [], regions: {}, leitner: {}, practiceDays: [] }),
    }),
    {
      name: "scale-trainer-progress",
      version: 2,
      migrate: (persisted: unknown) => {
        // v1 stored a different item shape; keep settings and days, drop the rest.
        const p = (persisted ?? {}) as { settings?: Partial<Settings>; practiceDays?: string[] };
        return {
          items: {},
          runs: [],
          regions: {},
          leitner: {},
          practiceDays: p.practiceDays ?? [],
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
        } as unknown as ProgressState;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProgressState>;
        const settings = { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) };
        const legacy = settings.swingLines as unknown;
        if (typeof legacy === "boolean") settings.swingLines = legacy ? "on" : "auto";
        return { ...current, ...p, settings };
      },
    }
  )
);

/* ------------------------------------------------------------------ */
/* Selectors (pure, take state)                                        */
/* ------------------------------------------------------------------ */

type S = Pick<ProgressState, "items" | "settings" | "practiceDays" | "regions">;

export function readingKey(unitId: string) {
  return `reading:${unitId}`;
}
export function rhythmKey(drillId: string) {
  return `rhythm:${drillId}`;
}

/** Progress (0..1) of one unit. */
export function unitProgress(s: S, unit: UnitDef): number {
  if (unit.kind === "reading") return itemScore(s.items[readingKey(unit.id)]);
  if (unit.kind === "rhythm") return itemScore(s.items[rhythmKey(unit.drillId)]);
  const base = unitExercises(unit);
  if (!base.length) return 0;
  let sum = 0;
  for (const spec of base) {
    let best = 0;
    for (const p of unit.patternIds) best = Math.max(best, itemScore(s.items[exerciseKey({ ...spec, patternId: p })]));
    sum += best;
  }
  return sum / base.length;
}

export function tierProgress(s: S, tier: Tier): number {
  if (!tier.units.length) return 0;
  return tier.units.reduce((a, u) => a + unitProgress(s, u), 0) / tier.units.length;
}

export function isTierSecure(s: S, tierId: string): boolean {
  const t = TIER_BY_ID[tierId];
  return t ? tierProgress(s, t) >= TIER_SECURE : false;
}

export interface TierLock {
  open: boolean;
  /** Human reasons it is closed. */
  reasons: string[];
}

export function tierLock(s: S, tier: Tier): TierLock {
  if (s.settings.unlockAll) return { open: true, reasons: [] };
  const reasons: string[] = [];
  const track = TRACKS.find((t) => t.id === tier.track)!;
  const prev = track.tiers.find((t) => t.n === tier.n - 1);
  if (prev && tierProgress(s, prev) < UNLOCK_THRESHOLD) reasons.push(`${Math.round(UNLOCK_THRESHOLD * 100)}% of ${track.title}: ${prev.title}`);
  for (const req of crossRequirements(tier)) {
    if (!isTierSecure(s, req)) {
      const t = TIER_BY_ID[req];
      const tr = TRACKS.find((x) => x.id === t.track)!;
      reasons.push(`${tr.title} tier ${t.n} at Secure`);
    }
  }
  return { open: reasons.length === 0, reasons };
}

/** The tier to work on in a track: the first open tier that isn't Secure yet. */
export function currentTier(s: S, trackId: string): Tier {
  const track = TRACKS.find((t) => t.id === trackId)!;
  const open = track.tiers.filter((t) => tierLock(s, t).open);
  return open.find((t) => tierProgress(s, t) < TIER_SECURE) ?? open[open.length - 1] ?? track.tiers[0];
}

/** Items due for spaced review, most overdue first. */
export function dueItems(s: S, now = Date.now(), limit = 6): ItemStat[] {
  return Object.values(s.items)
    .filter((i) => i.kind === "exercise" && i.spec && i.sr.due <= now)
    .sort((a, b) => a.sr.due - b.sr.due)
    .slice(0, limit);
}

/** The weakest exercise items you've touched. */
export function weakItems(s: S, limit = 3): ItemStat[] {
  return Object.values(s.items)
    .filter((i) => i.kind === "exercise" && i.spec && i.tier < 2)
    .sort((a, b) => a.mastery - b.mastery || a.lastPracticed - b.lastPracticed)
    .slice(0, limit);
}

export function daysThisMonth(s: Pick<S, "practiceDays">, d = new Date()): number {
  const prefix = localISO(d).slice(0, 7);
  return s.practiceDays.filter((x) => x.startsWith(prefix)).length;
}

/** Reading-aid level for a region in auto mode. Color fades first, then letters. */
export function aidForRegion(s: S, region: Region): AidLevel {
  if (s.settings.aidMode === "manual") return s.settings.aidLevel;
  const r = s.regions[region];
  if (!r || r.n < 8) return 0;
  if (r.ema < 0.7) return 0;
  if (r.ema < 0.85) return 1;
  if (r.ema < 0.95) return 2;
  return 3;
}
