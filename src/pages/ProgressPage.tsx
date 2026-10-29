import { useMemo } from "react";
import { Card, Eyebrow, Bar, Tip } from "@/components/ui";
import { PageShell, PageTitle } from "./PageShell";
import { useProgress, daysThisMonth, type RunRecord } from "@/store/progress";
import { CIRCLE_OF_FOURTHS, SCALE_BY_ID } from "@/theory/catalog";
import { REGION_LABEL, type Region } from "@/exercises/reading";
import { TIER_NAME, type Tier } from "@/practice/mastery";
import { navigate } from "@/lib/router";
import { prettyNote } from "@/lib/notecolor";
import { cn } from "@/lib/cn";

const CORE_SCALES = ["major", "dorian", "mixolydian", "lydian", "melodic-minor", "altered", "lydian-dominant", "bebop-dominant", "harmonic-minor", "half-whole-dim"];
const REGIONS: Region[] = ["treble-high", "treble", "middle", "bass", "bass-low"];

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ProgressPage() {
  const state = useProgress();
  const days = daysThisMonth(state);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const runsWeek = state.runs.filter((r) => r.t >= weekAgo).length;
  const items = Object.values(state.items);
  const secure = items.filter((i) => i.tier >= 2).length;
  const fluent = items.filter((i) => i.tier >= 3).length;
  const timed = state.runs.filter((r) => r.mode === "tempo" && r.mae != null).slice(-20);
  const avgMae = timed.length ? Math.round(timed.reduce((a, r) => a + (r.mae ?? 0), 0) / timed.length) : null;

  const grid = useMemo(() => {
    const m = new Map<string, Tier>();
    for (const it of Object.values(state.items)) {
      if (it.kind !== "exercise" || !it.spec || it.spec.progressionId) continue;
      const k = `${it.spec.scaleId}|${it.spec.key}`;
      m.set(k, Math.max(m.get(k) ?? 0, it.tier) as Tier);
    }
    const practiced = new Set([...m.keys()].map((k) => k.split("|")[0]));
    const rows = [...CORE_SCALES, ...[...practiced].filter((s) => !CORE_SCALES.includes(s))].filter((s) => SCALE_BY_ID[s]);
    return { m, rows };
  }, [state.items]);

  return (
    <PageShell>
      <PageTitle title="Progress" subtitle="Consistency over streaks. Tiers are Learned (accurate), Secure (accurate, in time, at tempo) and Fluent (still Secure two days later)." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Days this month" value={days} />
        <Stat label="Runs this week" value={runsWeek} />
        <Stat label="Secure / Fluent" value={`${secure} / ${fluent}`} />
        <Stat label="Timing, last 20 runs" value={avgMae != null ? `±${avgMae} ms` : "–"} />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="p-5">
          <Eyebrow className="mb-4">{new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Eyebrow>
          <Calendar days={state.practiceDays} />
        </Card>
        <Card className="p-5">
          <Eyebrow className="mb-4">Recent runs</Eyebrow>
          <Trend runs={state.runs.slice(-48)} />
        </Card>
      </div>

      <Card className="mt-5 overflow-x-auto p-5">
        <div className="mb-4 flex items-center justify-between">
          <Eyebrow>Scales × keys</Eyebrow>
          <div className="flex items-center gap-3 text-2xs text-fg-3">
            {([0, 1, 2, 3] as Tier[]).map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-[3px]", cellTone(t, t > 0))} />
                {TIER_NAME[t]}
              </span>
            ))}
          </div>
        </div>
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th />
              {CIRCLE_OF_FOURTHS.map((k) => (
                <th key={k} className="w-9 text-center font-mono text-[11px] font-normal text-fg-3">
                  {prettyNote(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((s) => (
              <tr key={s}>
                <td className="whitespace-nowrap pr-3 text-xs text-fg-2">
                  <button onClick={() => navigate(`/library/${s}`)} className="hover:text-fg-1">
                    {prettyNote(SCALE_BY_ID[s].name)}
                  </button>
                </td>
                {CIRCLE_OF_FOURTHS.map((k) => {
                  const has = grid.m.has(`${s}|${k}`);
                  const t = grid.m.get(`${s}|${k}`) ?? 0;
                  return (
                    <td key={k}>
                      <Tip content={`${prettyNote(k)} ${SCALE_BY_ID[s].name}: ${has ? TIER_NAME[t] : "not played"}`}>
                        <div className={cn("mx-auto h-6 w-8 rounded-[4px]", cellTone(t, has))} />
                      </Tip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-5 p-5">
        <Eyebrow className="mb-4">Reading by staff region</Eyebrow>
        <div className="grid gap-3 sm:grid-cols-5">
          {REGIONS.map((r) => {
            const st = state.regions[r];
            return (
              <div key={r}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-xs text-fg-2">{REGION_LABEL[r]}</span>
                  <span className="font-mono text-[11px] tabular text-fg-3">{st && st.n >= 4 ? `${Math.round(st.ema * 100)}%` : "–"}</span>
                </div>
                <Bar value={st?.ema ?? 0} />
                <div className="mt-1 text-2xs text-fg-4">{st?.n ?? 0} notes</div>
              </div>
            );
          })}
        </div>
      </Card>
    </PageShell>
  );
}

function cellTone(t: Tier, has: boolean) {
  if (!has) return "bg-line/[0.04]";
  return ["bg-line/[0.12]", "bg-accent/[0.3]", "bg-accent/[0.6]", "bg-accent"][t];
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="px-5 py-4">
      <div className="text-2xs uppercase tracking-[0.08em] text-fg-3">{label}</div>
      <div className="mt-1.5 font-serif text-[32px] leading-none tabular text-fg-1">{value}</div>
    </Card>
  );
}

function Calendar({ days }: { days: string[] }) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const n = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const set = new Set(days);
  const today = localISO(now);
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
        <div key={i} className="text-center text-2xs text-fg-4">
          {d}
        </div>
      ))}
      {Array.from({ length: lead }, (_, i) => (
        <div key={`l${i}`} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const iso = localISO(new Date(now.getFullYear(), now.getMonth(), i + 1));
        const on = set.has(iso);
        return (
          <div
            key={iso}
            className={cn(
              "flex aspect-square items-center justify-center rounded-[6px] font-mono text-[11px]",
              on ? "bg-accent/[0.85] text-accent-on" : "bg-line/[0.04] text-fg-3",
              iso === today && !on && "ring-1 ring-line/[0.2]"
            )}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );
}

function Trend({ runs }: { runs: RunRecord[] }) {
  if (runs.length < 2) return <div className="flex h-[180px] items-center justify-center text-sm text-fg-3">Play a few runs to see a trend.</div>;
  const W = 640;
  const H = 180;
  const pad = 8;
  const x = (i: number) => pad + (i / (runs.length - 1)) * (W - pad * 2);
  const yAcc = (a: number) => pad + (1 - a) * (H - pad * 2);
  const maeMax = Math.max(60, ...runs.map((r) => r.mae ?? 0));
  const yMae = (m: number) => pad + (m / maeMax) * (H - pad * 2);
  const accPath = runs.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yAcc(r.acc).toFixed(1)}`).join("");
  const maePts = runs.map((r, i) => (r.mae != null ? [x(i), yMae(r.mae)] : null)).filter(Boolean) as number[][];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[180px] w-full" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={W} y1={pad + g * (H - pad * 2)} y2={pad + g * (H - pad * 2)} stroke="rgb(var(--line) / 0.06)" />
        ))}
        <path d={accPath} fill="none" stroke="rgb(var(--accent))" strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
        {maePts.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r={2.2} fill="rgb(var(--info))" opacity={0.7} />
        ))}
      </svg>
      <div className="mt-2 flex gap-4 text-2xs text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-accent" /> Accuracy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-info" /> Timing error (lower is better, top = 0 ms)
        </span>
      </div>
    </div>
  );
}
