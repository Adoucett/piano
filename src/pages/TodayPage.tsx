import { useMemo } from "react";
import { ArrowRight, Cable, Play } from "lucide-react";
import { Button, Card, Eyebrow, Kbd, Pill, Ring } from "@/components/ui";
import { PageShell } from "./PageShell";
import { useProgress, currentTier, tierProgress, weakItems, dueItems, daysThisMonth } from "@/store/progress";
import { dailySession, specLabel } from "@/exercises/session";
import { TRACKS } from "@/exercises/tracks";
import { useSession, type SessionItem } from "@/store/session";
import { navigate } from "@/lib/router";
import { TIER_NAME } from "@/practice/mastery";
import { useInputStatus } from "@/hooks/useInput";
import { prettyNote } from "@/lib/notecolor";

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return "Late session.";
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}

export default function TodayPage() {
  const state = useProgress();
  const start = useSession((s) => s.start);
  const status = useInputStatus();
  const plan = useMemo(() => dailySession(state), [state]);
  const weak = weakItems(state, 3);
  const due = dueItems(state, Date.now(), 12).length;
  const days = daysThisMonth(state);
  const minutes = plan.steps.reduce((a, s) => a + s.minutes, 0);

  const run = (title: string, items: SessionItem[]) => {
    if (!items.length) return;
    start(title, items, "/today");
    navigate("/practice");
  };


  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <PageShell>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-serif text-[44px] leading-[1.05] tracking-tight text-fg-1">{greeting()}</h1>
          <p className="mt-2 text-sm text-fg-3">
            {date} · <span className="font-mono tabular text-fg-2">{days}</span> {days === 1 ? "day" : "days"} this month
            {due > 0 && (
              <>
                {" "}
                · <span className="text-fg-2">{due}</span> due for review
              </>
            )}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new Event("open-palette"))}>
          Jump to any scale <Kbd>⌘K</Kbd>
        </Button>
      </div>

      {!status.inPortName && (
        <Card className="mb-6 flex items-center gap-4 px-5 py-4">
          <Cable className="h-5 w-5 text-fg-3" />
          <div className="flex-1 text-sm">
            <div className="text-fg-1">No MIDI keyboard connected.</div>
            <div className="text-fg-3">
              {status.midiSupported ? "Plug the Nord in over USB; it is picked up automatically." : "Web MIDI needs Chrome or Edge."} You can also play with the computer keyboard (A–; is one octave, Z/X shift it).
            </div>
          </div>
          <Button size="sm" onClick={() => state.setSettings({ inputSource: "qwerty" })} disabled={state.settings.inputSource === "qwerty"}>
            {state.settings.inputSource === "qwerty" ? "Computer keyboard on" : "Use computer keyboard"}
          </Button>
        </Card>
      )}

      <Card className="p-7">
        <Eyebrow>Today's session · about {minutes} min</Eyebrow>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-fg-1">{plan.steps.map((s, i) => (i === 0 ? s.title : s.title.toLowerCase())).join(", ")}.</h2>
        <ol className="mt-6 space-y-3">
          {plan.steps.map((s, i) => (
            <li key={s.title} className="flex items-center gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line/[0.1] font-mono text-[11px] text-fg-3">{i + 1}</span>
              <span className="w-32 shrink-0 text-sm font-medium text-fg-1">{s.title}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-fg-2">{prettyNote(s.detail)}</span>
              <span className="font-mono text-xs tabular text-fg-3">{s.minutes}′</span>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex items-center gap-3">
          <Button variant="primary" size="lg" onClick={() => run("Today", plan.items)}>
            <Play className="h-4 w-4" /> Start session
          </Button>
          <span className="text-xs text-fg-3">{plan.steps.length} steps</span>
        </div>
      </Card>

      <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1.35fr]">
        <section>
          <Eyebrow className="mb-3">Weak spots</Eyebrow>
          {weak.length === 0 ? (
            <Card className="p-5 text-sm text-fg-3">Nothing flagged yet. Weak spots show up here after a few runs.</Card>
          ) : (
            <Card className="divide-y divide-line/[0.05]">
              {weak.map((w) => (
                <button
                  key={specLabel(w.spec!)}
                  onClick={() => run(specLabel(w.spec!), [{ kind: "exercise", spec: { ...w.spec!, source: { kind: "review" } }, label: specLabel(w.spec!) }])}
                  className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-line/[0.03]"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-fg-1">{prettyNote(specLabel(w.spec!))}</span>
                  <span className="font-mono text-xs tabular text-fg-3">{Math.round(w.mastery * 100)}%</span>
                  <Pill>{TIER_NAME[w.tier]}</Pill>
                  <ArrowRight className="h-3.5 w-3.5 text-fg-3" />
                </button>
              ))}
            </Card>
          )}
        </section>

        <section>
          <Eyebrow className="mb-3">Tracks</Eyebrow>
          <div className="grid grid-cols-2 gap-3">
            {TRACKS.map((t) => {
              const tier = currentTier(state, t.id);
              const p = tierProgress(state, tier);
              return (
                <Card key={t.id} interactive className="cursor-pointer p-4" onClick={() => navigate(`/courses/track/${t.id}`)}>
                  <div className="flex items-center gap-3">
                    <Ring value={p} size={32}>
                      <span className="font-mono text-[10px] text-fg-2">{tier.n}</span>
                    </Ring>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-fg-1">{t.title}</div>
                      <div className="truncate text-xs text-fg-3">{tier.title}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
