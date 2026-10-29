/**
 * Mastery model. Pure functions, so they're easy to test and reason about.
 *
 *  Learned  ≥95% accuracy (wait mode allowed)
 *  Secure   ≥97%, mean timing error ≤25 ms, ≥120 BPM, evenness (IOI CV) ≤8%
 *  Fluent   ≥98%, ≤20 ms, ≥160 BPM, CV ≤6%, and still true 48 h later
 *
 * Reading and rhythm items use their own thresholds (reaction time / timing).
 */
import type { ExerciseSpec, RunSummary } from "@/types";

export type ItemKind = "exercise" | "reading" | "rhythm";
export type Tier = 0 | 1 | 2 | 3;

export const TIER_NAME: Record<Tier, string> = { 0: "New", 1: "Learned", 2: "Secure", 3: "Fluent" };
export const TIER_SCORE: Record<Tier, number> = { 0: 0, 1: 0.7, 2: 0.9, 3: 1 };

export interface SrState {
  reps: number;
  interval: number; // days
  ease: number;
  due: number; // epoch ms
}

export interface ItemStat {
  kind: ItemKind;
  spec?: ExerciseSpec;
  refId?: string;
  attempts: number;
  /** EMA of accuracy, 0..1. */
  mastery: number;
  bestAccuracy: number;
  lastAccuracy: number;
  tier: Tier;
  fluentCandidateAt?: number;
  bestBpm: number;
  cleanStreak: number;
  cleanStreakBpm: number;
  lastMae?: number;
  lastCv?: number;
  avgReactionMs: number;
  lastPracticed: number;
  sr: SrState;
}

const DAY = 86_400_000;

/** The tier a single run qualifies for, ignoring retention. */
export function runTier(kind: ItemKind, s: RunSummary): Tier {
  const acc = s.accuracy;
  const mae = s.meanAbsErrorMs;
  const cv = s.ioiCv;
  if (kind === "reading") {
    if (acc >= 0.98 && s.avgReactionMs <= 900) return 3;
    if (acc >= 0.95 && s.avgReactionMs <= 1500) return 2;
    if (acc >= 0.9) return 1;
    return 0;
  }
  if (kind === "rhythm") {
    if (mae == null) return 0;
    if (acc >= 0.98 && mae <= 15 && (cv == null || cv <= 0.06)) return 3;
    if (acc >= 0.95 && mae <= 25 && (cv == null || cv <= 0.08)) return 2;
    if (acc >= 0.9 && mae <= 40) return 1;
    return 0;
  }
  const tempo = s.mode === "tempo" && mae != null;
  if (tempo && acc >= 0.98 && mae! <= 20 && s.bpm >= 160 && (cv == null || cv <= 0.06)) return 3;
  if (tempo && acc >= 0.97 && mae! <= 25 && s.bpm >= 120 && (cv == null || cv <= 0.08)) return 2;
  if (acc >= 0.95 && (s.mode === "wait" || s.bpm >= 80)) return 1;
  return 0;
}

/** A "clean" run advances the tempo ladder. */
export function isClean(s: RunSummary): boolean {
  return s.mode === "tempo" && s.accuracy >= 0.97 && (s.meanAbsErrorMs ?? 999) <= 35;
}

/** SM-2 quality 0..5 from a run. */
export function quality(s: RunSummary): number {
  const a = s.accuracy;
  if (a >= 0.98) return 5;
  if (a >= 0.95) return 4;
  if (a >= 0.9) return 3;
  if (a >= 0.8) return 2;
  if (a >= 0.6) return 1;
  return 0;
}

export function nextSr(prev: SrState | undefined, q: number, now: number): SrState {
  let reps = prev?.reps ?? 0;
  let interval = prev?.interval ?? 0;
  let ease = prev?.ease ?? 2.5;
  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(interval * ease);
  }
  ease = Math.max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return { reps, interval, ease, due: now + interval * DAY };
}

export interface RunOutcome {
  prev?: ItemStat;
  next: ItemStat;
  promotedTo?: Tier;
  /** Suggested next tempo (two clean runs in a row at this tempo). */
  suggestBpm?: number;
  /** Fluent is pending the 48-hour retention check. */
  fluentPending?: boolean;
}

export function applyRun(
  prev: ItemStat | undefined,
  kind: ItemKind,
  s: RunSummary,
  now: number,
  meta: { spec?: ExerciseSpec; refId?: string } = {}
): RunOutcome {
  let tier = runTier(kind, s);
  let fluentCandidateAt = prev?.fluentCandidateAt;
  let fluentPending = false;
  if (tier === 3 && kind === "exercise") {
    if (prev?.tier === 3) {
      // already fluent
    } else if (fluentCandidateAt != null && now - fluentCandidateAt >= 2 * DAY) {
      tier = 3;
    } else {
      fluentCandidateAt = fluentCandidateAt ?? now;
      fluentPending = true;
      tier = 2;
    }
  }
  const prevTier = prev?.tier ?? 0;
  const newTier = Math.max(prevTier, tier) as Tier;

  const clean = isClean(s);
  let cleanStreak = 0;
  let cleanStreakBpm = s.bpm;
  if (clean) {
    cleanStreak = prev && prev.cleanStreakBpm === s.bpm ? prev.cleanStreak + 1 : 1;
  }
  const mastery = prev ? prev.mastery * 0.6 + s.accuracy * 0.4 : s.accuracy;

  const next: ItemStat = {
    kind,
    spec: meta.spec ?? prev?.spec,
    refId: meta.refId ?? prev?.refId,
    attempts: (prev?.attempts ?? 0) + 1,
    mastery: Math.max(0, Math.min(1, mastery)),
    bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, s.accuracy),
    lastAccuracy: s.accuracy,
    tier: newTier,
    fluentCandidateAt,
    bestBpm: clean ? Math.max(prev?.bestBpm ?? 0, s.bpm) : prev?.bestBpm ?? 0,
    cleanStreak,
    cleanStreakBpm,
    lastMae: s.meanAbsErrorMs ?? prev?.lastMae,
    lastCv: s.ioiCv ?? prev?.lastCv,
    avgReactionMs: prev ? prev.avgReactionMs * 0.7 + s.avgReactionMs * 0.3 : s.avgReactionMs,
    lastPracticed: now,
    sr: nextSr(prev?.sr, quality(s), now),
  };
  return {
    prev,
    next,
    promotedTo: newTier > prevTier ? newTier : undefined,
    suggestBpm: !clean ? undefined : veryTight(s) ? s.bpm + 8 : cleanStreak >= 2 ? s.bpm + 4 : undefined,
    fluentPending,
  };
}

/** A clean run with this much margin skips ahead: an advanced player shouldn't have to climb 4 BPM at a time. */
function veryTight(s: RunSummary): boolean {
  return s.mode === "tempo" && s.accuracy >= 0.98 && (s.meanAbsErrorMs ?? 99) <= 15 && (s.ioiCv ?? 1) <= 0.05;
}

/** 0..1 contribution of one item to a tier's progress. */
export function itemScore(stat: ItemStat | undefined): number {
  if (!stat) return 0;
  return Math.max(TIER_SCORE[stat.tier], stat.mastery * 0.6);
}
