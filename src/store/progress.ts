import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AidLevel,
  ExerciseSpec,
  PatternId,
  RunSummary,
} from "@/types";
import { exerciseKey } from "@/types";
import { CURRICULUM, UNLOCK_THRESHOLD } from "@/exercises/curriculum";
import { keysForOrder } from "@/theory/catalog";
import type { Level } from "@/types";

export type MatchMode = "exact-octave" | "any-octave";
export type InputSource = "midi" | "qwerty";
export type PracticeMode = "wait" | "tempo";
export type ReadingKind = "treble" | "bass" | "grand";

export interface ItemStat {
  attempts: number;
  mastery: number; // 0..1 EMA of accuracy
  bestAccuracy: number;
  avgReactionMs: number;
  lastPracticed: number; // epoch ms
  octaves: number;
  patternId: PatternId;
  scaleId: string;
  key: string;
}

export interface ReadingStat {
  seen: number;
  correct: number;
}

export interface Settings {
  matchMode: MatchMode;
  inputSource: InputSource;
  practiceMode: PracticeMode;
  aidLevel: AidLevel;
  autoAidDown: boolean; // suggest reducing aids as accuracy rises
  bpm: number;
  autoTempoUp: boolean;
  preferMidiOutput: boolean; // play demos through MIDI out vs synth
}

interface ProgressState {
  items: Record<string, ItemStat>;
  reading: Record<ReadingKind, ReadingStat>;
  practiceDays: string[]; // ISO yyyy-mm-dd
  settings: Settings;

  recordRun: (spec: ExerciseSpec, summary: RunSummary) => void;
  recordReading: (kind: ReadingKind, correct: boolean) => void;
  getItem: (key: string) => ItemStat | undefined;
  readingMastery: (kind: ReadingKind) => number;
  levelProgress: (levelId: string) => number;
  isLevelUnlocked: (levelId: string) => boolean;
  reviewQueue: (limit?: number) => ExerciseSpec[];
  streak: () => number;
  setSettings: (partial: Partial<Settings>) => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  reset: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  matchMode: "exact-octave",
  inputSource: "midi",
  practiceMode: "wait",
  aidLevel: 0,
  autoAidDown: true,
  bpm: 80,
  autoTempoUp: false,
  preferMidiOutput: true,
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Enumerate the default-pattern exercise keys that define a level's coverage. */
function levelItemKeys(level: Level): string[] {
  const keys: string[] = [];
  for (const unit of level.units) {
    if (unit.readingDrill) continue;
    const pattern = unit.patternIds[0];
    const ks = keysForOrder(unit.keyOrder);
    for (const scaleId of unit.scaleIds) {
      for (const key of ks) {
        keys.push(exerciseKey({ scaleId, key, patternId: pattern }));
      }
    }
  }
  return keys;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      items: {},
      reading: { treble: { seen: 0, correct: 0 }, bass: { seen: 0, correct: 0 }, grand: { seen: 0, correct: 0 } },
      practiceDays: [],
      settings: DEFAULT_SETTINGS,

      recordRun: (spec, summary) => {
        const k = exerciseKey(spec);
        set((state) => {
          const prev = state.items[k];
          const mastery = prev
            ? prev.mastery * 0.6 + summary.accuracy * 0.4
            : summary.accuracy;
          const item: ItemStat = {
            attempts: (prev?.attempts ?? 0) + 1,
            mastery: Math.max(0, Math.min(1, mastery)),
            bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, summary.accuracy),
            avgReactionMs: prev
              ? prev.avgReactionMs * 0.7 + summary.avgReactionMs * 0.3
              : summary.avgReactionMs,
            lastPracticed: Date.now(),
            octaves: spec.octaves,
            patternId: spec.patternId,
            scaleId: spec.scaleId,
            key: spec.key,
          };
          const day = todayISO();
          const practiceDays = state.practiceDays.includes(day)
            ? state.practiceDays
            : [...state.practiceDays, day];
          return { items: { ...state.items, [k]: item }, practiceDays };
        });
      },

      recordReading: (kind, correct) => {
        set((state) => {
          const prev = state.reading[kind];
          const day = todayISO();
          const practiceDays = state.practiceDays.includes(day)
            ? state.practiceDays
            : [...state.practiceDays, day];
          return {
            reading: {
              ...state.reading,
              [kind]: { seen: prev.seen + 1, correct: prev.correct + (correct ? 1 : 0) },
            },
            practiceDays,
          };
        });
      },

      getItem: (key) => get().items[key],

      readingMastery: (kind) => {
        const r = get().reading[kind];
        if (!r || r.seen < 5) return r && r.seen ? (r.correct / r.seen) * (r.seen / 5) : 0;
        return r.correct / r.seen;
      },

      levelProgress: (levelId) => {
        const level = CURRICULUM.find((l) => l.id === levelId);
        if (!level) return 0;
        const state = get();
        const keys = levelItemKeys(level);
        let total = keys.length;
        let sum = keys.reduce((s, k) => s + (state.items[k]?.mastery ?? 0), 0);
        for (const unit of level.units) {
          if (unit.readingDrill) {
            total += 1;
            const kinds: ReadingKind[] =
              unit.readingDrill === "grand" ? ["grand"] : [unit.readingDrill];
            sum += kinds.reduce((s, kind) => s + state.readingMastery(kind), 0) / kinds.length;
          }
        }
        return total ? sum / total : 0;
      },

      isLevelUnlocked: (levelId) => {
        const idx = CURRICULUM.findIndex((l) => l.id === levelId);
        if (idx <= 0) return true;
        const prev = CURRICULUM[idx - 1];
        return get().levelProgress(prev.id) >= UNLOCK_THRESHOLD;
      },

      reviewQueue: (limit = 8) => {
        const items = Object.values(get().items)
          .filter((i) => i.mastery < 0.9)
          .sort((a, b) => a.mastery - b.mastery)
          .slice(0, limit);
        return items.map((i) => ({
          scaleId: i.scaleId,
          key: i.key,
          patternId: i.patternId,
          octaves: i.octaves,
          source: { kind: "library" as const },
        }));
      },

      streak: () => {
        const days = new Set(get().practiceDays);
        let streak = 0;
        const d = new Date();
        // Count back from today (or yesterday if today not practiced yet).
        if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
        while (days.has(d.toISOString().slice(0, 10))) {
          streak += 1;
          d.setDate(d.getDate() - 1);
        }
        return streak;
      },

      setSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),

      exportJSON: () => {
        const { items, reading, practiceDays, settings } = get();
        return JSON.stringify({ items, reading, practiceDays, settings }, null, 2);
      },

      importJSON: (json) => {
        try {
          const data = JSON.parse(json);
          set((state) => ({
            items: data.items ?? {},
            reading: data.reading ?? state.reading,
            practiceDays: data.practiceDays ?? [],
            settings: { ...state.settings, ...(data.settings ?? {}) },
          }));
          return true;
        } catch {
          return false;
        }
      },

      reset: () =>
        set({
          items: {},
          reading: { treble: { seen: 0, correct: 0 }, bass: { seen: 0, correct: 0 }, grand: { seen: 0, correct: 0 } },
          practiceDays: [],
        }),
    }),
    { name: "scale-trainer-progress" }
  )
);
