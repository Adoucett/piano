import { Gauge, Lock, Play } from "lucide-react";
import { Button, Card, Pill } from "@/components/ui";
import { PageShell, PageTitle } from "./PageShell";
import { RHYTHM_DRILLS } from "@/rhythm/drills";
import { TRACK_BY_ID } from "@/exercises/tracks";
import { useProgress, rhythmKey, tierLock } from "@/store/progress";
import { useSession } from "@/store/session";
import { navigate } from "@/lib/router";
import { TIER_NAME } from "@/practice/mastery";
import { cn } from "@/lib/cn";

export default function RhythmPage() {
  const state = useProgress();
  const start = useSession((s) => s.start);
  const tiers = TRACK_BY_ID.rhythm.tiers;
  const run = (drillId: string, title: string) => {
    start(title, [{ kind: "rhythm", drillId, label: title }], "/rhythm");
    navigate("/practice");
  };

  return (
    <PageShell>
      <PageTitle
        title="Rhythm & Time"
        subtitle="Any key works. Scored in milliseconds against the audio clock: mean error, early/late bias, evenness, swing ratio and drift."
        right={
          state.settings.latencyMs === 0 ? (
            <Button size="sm" variant="ghost" onClick={() => navigate("/settings")}>
              <Gauge className="h-3.5 w-3.5" /> Calibrate latency first
            </Button>
          ) : (
            <span className="font-mono text-xs text-fg-3">Latency offset {state.settings.latencyMs} ms</span>
          )
        }
      />
      <div className="space-y-10">
        {tiers.map((tier) => {
          const lock = tierLock(state, tier);
          const drills = RHYTHM_DRILLS.filter((d) => d.tier === tier.n);
          return (
            <section key={tier.id}>
              <div className="mb-3 flex items-baseline gap-3">
                <span className="font-mono text-xs text-fg-3">{tier.n}</span>
                <h2 className="text-md font-medium text-fg-1">{tier.title}</h2>
                <span className="text-sm text-fg-3">{tier.description}</span>
                {!lock.open && (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-fg-3">
                    <Lock className="h-3 w-3" /> {lock.reasons.join("; ")}
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {drills.map((d) => {
                  const stat = state.items[rhythmKey(d.id)];
                  return (
                    <Card key={d.id} className={cn("flex flex-col p-5", !lock.open && "border-dashed border-line/[0.12] bg-transparent shadow-none")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-medium text-fg-1">{d.title}</div>
                        {stat && <Pill tone={stat.tier >= 2 ? "success" : "neutral"}>{TIER_NAME[stat.tier]}</Pill>}
                      </div>
                      <p className="mt-1 flex-1 text-sm text-fg-3">{d.description}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-mono text-xs tabular text-fg-3">
                          {d.bpm} BPM · {d.bars} bars
                          {stat?.lastMae != null ? ` · ±${Math.round(stat.lastMae)} ms` : ""}
                        </span>
                        <Button size="sm" disabled={!lock.open} onClick={() => run(d.id, d.title)}>
                          <Play className="h-3 w-3" /> Start
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}
