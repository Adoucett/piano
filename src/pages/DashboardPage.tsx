import { useMemo } from "react";
import type { ExerciseSpec } from "@/types";
import { SCALES, CHROMATIC_KEYS, getScaleDef } from "@/theory/catalog";
import { CURRICULUM } from "@/exercises/curriculum";
import { useProgress } from "@/store/progress";
import { PATTERN_BY_ID } from "@/exercises/patterns";
import { Badge, Button, Card } from "@/components/ui";
import { prettyNote } from "@/lib/notecolor";

function masteryColor(m: number): string {
  if (m <= 0) return "hsl(220 15% 20%)";
  const hue = 160; // emerald
  const light = 18 + m * 34;
  return `hsl(${hue} 60% ${light}%)`;
}

export function DashboardPage({ onPractice }: { onPractice: (q: ExerciseSpec[]) => void }) {
  const items = useProgress((s) => s.items);
  const streak = useProgress((s) => s.streak)();
  const reviewQueue = useProgress((s) => s.reviewQueue);
  const levelProgress = useProgress((s) => s.levelProgress);
  const isUnlocked = useProgress((s) => s.isLevelUnlocked);

  // Best mastery per scale+key across all patterns.
  const grid = useMemo(() => {
    const m: Record<string, number> = {};
    for (const item of Object.values(items)) {
      const k = `${item.scaleId}|${item.key}`;
      m[k] = Math.max(m[k] ?? 0, item.mastery);
    }
    return m;
  }, [items]);

  const review = reviewQueue(8);
  const practiced = Object.keys(items).length;

  const nextLocked = CURRICULUM.find((l) => !isUnlocked(l.id));
  const prevOfNext = nextLocked
    ? CURRICULUM[CURRICULUM.findIndex((l) => l.id === nextLocked.id) - 1]
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-400">Streak</div>
          <div className="text-3xl font-bold">{streak} {streak === 1 ? "day" : "days"}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-400">Exercises practiced</div>
          <div className="text-3xl font-bold">{practiced}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-400">Next unlock</div>
          {nextLocked && prevOfNext ? (
            <div>
              <div className="text-sm font-semibold">{nextLocked.title}</div>
              <div className="text-xs text-slate-400">
                Get {prevOfNext.title.replace(/^\d+\.\s*/, "")} to 60% ({Math.round(levelProgress(prevOfNext.id) * 100)}% now)
              </div>
            </div>
          ) : (
            <div className="text-sm text-emerald-300">Everything unlocked</div>
          )}
        </Card>
      </div>

      {review.length > 0 && (
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Review queue (your weakest)
            </h3>
            <Button variant="subtle" onClick={() => onPractice(review)}>
              Practice all
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {review.map((spec, i) => (
              <button
                key={i}
                onClick={() => onPractice([spec])}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
              >
                {prettyNote(spec.key)} {getScaleDef(spec.scaleId).name}{" "}
                <span className="text-xs text-slate-400">
                  · {PATTERN_BY_ID[spec.patternId].name}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Mastery by scale and key
        </h3>
        <table className="border-separate border-spacing-0.5">
          <thead>
            <tr>
              <th className="sticky left-0 bg-slate-800/40 pr-2 text-left text-xs font-medium text-slate-400"></th>
              {CHROMATIC_KEYS.map((k) => (
                <th key={k} className="px-1 text-center text-[10px] font-medium text-slate-400">
                  {prettyNote(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCALES.map((s) => (
              <tr key={s.id}>
                <td className="sticky left-0 whitespace-nowrap bg-slate-800/40 pr-2 text-xs text-slate-300">
                  {s.name}
                </td>
                {CHROMATIC_KEYS.map((k) => {
                  const m = grid[`${s.id}|${k}`] ?? 0;
                  return (
                    <td key={k} className="p-0">
                      <button
                        title={`${k} ${s.name}: ${Math.round(m * 100)}%`}
                        onClick={() =>
                          onPractice([
                            { scaleId: s.id, key: k, patternId: "upDown", octaves: 2, source: { kind: "library" } },
                          ])
                        }
                        className="h-5 w-5 rounded-sm transition-transform hover:scale-125"
                        style={{ backgroundColor: masteryColor(m) }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <span>less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((m) => (
            <span key={m} className="h-3 w-3 rounded-sm" style={{ backgroundColor: masteryColor(m) }} />
          ))}
          <span>mastered</span>
          <Badge className="ml-2">click a cell to practice</Badge>
        </div>
      </Card>
    </div>
  );
}
