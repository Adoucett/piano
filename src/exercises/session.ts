/**
 * Session builders: the daily session (time → reading → focus → review),
 * whole tiers, single units, and teacher lessons.
 */
import { exerciseKey, type ExerciseSpec, type PatternId } from "@/types";
import type { SessionItem } from "@/store/session";
import {
  currentTier,
  dueItems,
  unitProgress,
  readingKey,
  rhythmKey,
  type Settings,
} from "@/store/progress";
import { itemScore, type ItemStat } from "@/practice/mastery";
import { unitExercises, type Tier, type UnitDef } from "./tracks";
import { getRhythmDrill } from "@/rhythm/drills";
import { getScaleDef } from "@/theory/catalog";
import { getProgression } from "./progressions";
import { PATTERN_BY_ID } from "./patterns";

type S = { items: Record<string, ItemStat>; settings: Settings; practiceDays: string[]; regions: Record<string, { ema: number; n: number }> };

export function specLabel(spec: ExerciseSpec): string {
  const pat = PATTERN_BY_ID[spec.patternId]?.name ?? spec.patternId;
  if (spec.progressionId) return `${getProgression(spec.progressionId).name} in ${spec.key} · ${pat}`;
  return `${spec.key} ${getScaleDef(spec.scaleId).name} · ${pat}`;
}

export function unitItems(unit: UnitDef, tier?: Tier, patternId?: PatternId): SessionItem[] {
  if (unit.kind === "reading") return [{ kind: "reading", drill: unit.drill, unitId: unit.id, label: unit.title }];
  if (unit.kind === "rhythm") return [{ kind: "rhythm", drillId: unit.drillId, label: unit.title }];
  return unitExercises(unit, tier?.id, patternId).map((spec) => ({ kind: "exercise", spec, label: specLabel(spec) }));
}

function weakestUnit(s: S, tier: Tier, kinds: UnitDef["kind"][]): UnitDef | undefined {
  const units = tier.units.filter((u) => kinds.includes(u.kind));
  return [...units].sort((a, b) => unitProgress(s, a) - unitProgress(s, b))[0];
}

/** Next `n` exercises in a unit that aren't Secure yet, in key order. */
function nextExercises(s: S, unit: UnitDef, tier: Tier, n: number): SessionItem[] {
  if (unit.kind !== "scale" && unit.kind !== "progression") return unitItems(unit, tier);
  const out: SessionItem[] = [];
  for (const p of unit.patternIds) {
    for (const spec of unitExercises(unit, tier.id, p)) {
      if (itemScore(s.items[exerciseKey(spec)]) >= 0.9) continue;
      out.push({ kind: "exercise", spec, label: specLabel(spec) });
      if (out.length >= n) return out;
    }
  }
  return out.length ? out : unitItems(unit, tier).slice(0, n);
}

export interface DailyPlan {
  items: SessionItem[];
  steps: { title: string; detail: string; minutes: number }[];
}

export function dailySession(s: S, now = Date.now()): DailyPlan {
  const items: SessionItem[] = [];
  const steps: DailyPlan["steps"] = [];

  const rTier = currentTier(s, "rhythm");
  const rUnit = weakestUnit(s, rTier, ["rhythm"]);
  if (rUnit && rUnit.kind === "rhythm") {
    items.push({ kind: "rhythm", drillId: rUnit.drillId, label: rUnit.title });
    steps.push({ title: "Time", detail: getRhythmDrill(rUnit.drillId).title, minutes: 2 });
  }

  const readTier = currentTier(s, "reading");
  const readUnit = weakestUnit(s, readTier, ["reading"]);
  if (readUnit && readUnit.kind === "reading") {
    items.push({ kind: "reading", drill: readUnit.drill, unitId: readUnit.id, label: readUnit.title });
    steps.push({ title: "Reading sprint", detail: readUnit.title, minutes: 3 });
  }

  // Alternate the focus between Scales and Vocabulary by day.
  const day = Math.floor(now / 86_400_000);
  const vocab = currentTier(s, "vocab");
  const scales = currentTier(s, "scales");
  const vocabOpen = s.settings.unlockAll || vocab.n > 1 || unitProgress(s, vocab.units[0]) > 0 || day % 2 === 1;
  const focusTier = vocabOpen && day % 2 === 1 ? vocab : scales;
  const focusUnit = weakestUnit(s, focusTier, ["scale", "progression"]);
  if (focusUnit) {
    const ex = nextExercises(s, focusUnit, focusTier, 3);
    items.push(...ex);
    steps.push({ title: "Focus", detail: `${focusUnit.title} · ${ex.length} keys`, minutes: 8 });
  }

  const review = dueItems(s, now, 3).filter((i) => i.spec);
  if (review.length) {
    items.push(
      ...review.map((i) => ({
        kind: "exercise" as const,
        spec: { ...i.spec!, source: { kind: "review" as const } },
        label: specLabel(i.spec!),
      }))
    );
    steps.push({ title: "Review", detail: `${review.length} due`, minutes: 4 });
  }
  return { items, steps };
}

export { readingKey, rhythmKey };
