import type { ExerciseSpec, Unit } from "@/types";
import { CURRICULUM } from "@/exercises/curriculum";
import { keysForOrder } from "@/theory/catalog";
import { useProgress, type ReadingKind } from "@/store/progress";
import { Badge, Button, Card } from "@/components/ui";
import { getScaleDef } from "@/theory/catalog";

function unitExercises(unit: Unit): ExerciseSpec[] {
  const pattern = unit.patternIds[0];
  const keys = keysForOrder(unit.keyOrder);
  const out: ExerciseSpec[] = [];
  for (const scaleId of unit.scaleIds) {
    for (const key of keys) {
      out.push({
        scaleId,
        key,
        patternId: pattern,
        octaves: unit.octaves,
        source: { kind: "curriculum", unitId: unit.id },
      });
    }
  }
  return out;
}

export function CurriculumPage({
  onPractice,
  onReading,
}: {
  onPractice: (q: ExerciseSpec[]) => void;
  onReading: (kind: ReadingKind) => void;
}) {
  const levelProgress = useProgress((s) => s.levelProgress);
  const isUnlocked = useProgress((s) => s.isLevelUnlocked);

  return (
    <div className="flex flex-col gap-4">
      {CURRICULUM.map((level) => {
        const unlocked = isUnlocked(level.id);
        const progress = Math.round(levelProgress(level.id) * 100);
        return (
          <Card key={level.id} className={unlocked ? "" : "opacity-60"}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{level.title}</h3>
                <p className="text-sm text-slate-400">{level.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {!unlocked && <Badge className="bg-amber-500/20 text-amber-200">Locked</Badge>}
                <Badge>{progress}%</Badge>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-sky-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {level.units.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{unit.title}</div>
                    <div className="truncate text-xs text-slate-400">
                      {unit.readingDrill
                        ? "note reading"
                        : unit.scaleIds.map((id) => getScaleDef(id).name).join(", ")}
                    </div>
                  </div>
                  <Button
                    variant="subtle"
                    disabled={!unlocked}
                    onClick={() =>
                      unit.readingDrill
                        ? onReading(
                            (unit.readingDrill === "grand" ? "grand" : unit.readingDrill) as ReadingKind
                          )
                        : onPractice(unitExercises(unit))
                    }
                  >
                    Start
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
