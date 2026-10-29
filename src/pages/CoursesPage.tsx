import { useState } from "react";
import { ArrowLeft, ArrowRight, Clock, Lock, Play, Unlock } from "lucide-react";
import { Button, Card, Eyebrow, Pill, Ring, Bar, Tip } from "@/components/ui";
import { PageShell, PageTitle } from "./PageShell";
import { useRoute, navigate } from "@/lib/router";
import { TRACKS, TRACK_BY_ID, type Tier, type TrackId, type UnitDef } from "@/exercises/tracks";
import { useProgress, tierLock, tierProgress, unitProgress, currentTier } from "@/store/progress";
import { unitItems } from "@/exercises/session";
import { useSession, type SessionItem } from "@/store/session";
import { PATTERN_BY_ID } from "@/exercises/patterns";
import { TEACHERS, getTeacher } from "@/teachers/registry";
import { lessonExercises, lessonLength, stepKeys } from "@/teachers/resolve";
import type { Lesson, Teacher } from "@/teachers/types";
import { getScaleDef } from "@/theory/catalog";
import { getProgression } from "@/exercises/progressions";
import { prettyNote } from "@/lib/notecolor";
import { cn } from "@/lib/cn";
import type { PatternId } from "@/types";

export default function CoursesPage() {
  const { parts } = useRoute();
  if (parts[1] === "track" && parts[2] && TRACK_BY_ID[parts[2] as TrackId]) return <TrackDetail id={parts[2] as TrackId} />;
  if (parts[1] === "teacher" && parts[2]) {
    const t = getTeacher(parts[2]);
    if (t) return <TeacherDetail teacher={t} />;
  }
  return <Overview />;
}

function useStart() {
  const start = useSession((s) => s.start);
  const { path } = useRoute();
  return (title: string, items: SessionItem[]) => {
    if (!items.length) return;
    start(title, items, path);
    navigate("/practice");
  };
}

function UnlockChip() {
  const unlockAll = useProgress((s) => s.settings.unlockAll);
  const set = useProgress((s) => s.setSettings);
  return (
    <Tip content={unlockAll ? "Every tier is open. Progress still records." : "Open every tier regardless of progress."}>
      <button
        onClick={() => set({ unlockAll: !unlockAll })}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
          unlockAll ? "border-accent/30 bg-accent/[0.1] text-accent" : "border-line/[0.08] text-fg-3 hover:text-fg-1"
        )}
      >
        {unlockAll ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        {unlockAll ? "All open" : "Open everything"}
      </button>
    </Tip>
  );
}

/* ------------------------------------------------------------------ */

function Overview() {
  const state = useProgress();
  return (
    <PageShell>
      <PageTitle
        title="Courses"
        subtitle="Four tracks that move independently. Each Vocabulary tier also waits on the Rhythm tier below it, so the lines you learn sit in time."
        right={<UnlockChip />}
      />

      <div className="space-y-3">
        {TRACKS.map((track) => {
          const cur = currentTier(state, track.id);
          return (
            <Card key={track.id} interactive className="cursor-pointer px-6 py-5" onClick={() => navigate(`/courses/track/${track.id}`)}>
              <div className="flex items-center gap-6">
                <div className="w-56 shrink-0">
                  <div className="text-md font-medium text-fg-1">{track.title}</div>
                  <div className="mt-0.5 text-xs text-fg-3">{track.blurb}</div>
                </div>
                <div className="flex flex-1 items-center">
                  {track.tiers.map((tier, i) => {
                    const p = tierProgress(state, tier);
                    const lock = tierLock(state, tier);
                    const isCur = tier.id === cur.id;
                    return (
                      <div key={tier.id} className="flex flex-1 items-center">
                        <Tip content={lock.open ? `${tier.title} · ${Math.round(p * 100)}%` : `Opens after: ${lock.reasons.join("; ")}`}>
                          <div className={cn("relative", !lock.open && "opacity-60")}>
                            <Ring value={p} size={36} stroke={isCur ? 3 : 2}>
                              {lock.open ? (
                                <span className={cn("font-mono text-[11px]", isCur ? "text-accent" : "text-fg-2")}>{tier.n}</span>
                              ) : (
                                <Lock className="h-3 w-3 text-fg-3" />
                              )}
                            </Ring>
                          </div>
                        </Tip>
                        {i < track.tiers.length - 1 && <div className="mx-2 h-px flex-1 bg-line/[0.08]" />}
                      </div>
                    );
                  })}
                </div>
                <div className="hidden w-48 shrink-0 text-right lg:block">
                  <div className="text-2xs uppercase tracking-[0.08em] text-fg-3">Now</div>
                  <div className="truncate text-sm text-fg-1">{cur.title}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-fg-3" />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mb-5 mt-14 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-fg-1">Teachers</h2>
          <p className="mt-1 text-sm text-fg-3">Curated programs in a particular voice. They use the same exercises, so the progress counts.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEACHERS.map((t) => (
          <TeacherCard key={t.id} teacher={t} />
        ))}
      </div>
    </PageShell>
  );
}

function TeacherCard({ teacher }: { teacher: Teacher }) {
  const lessons = teacher.lessons.length;
  return (
    <Card interactive className="group relative cursor-pointer overflow-hidden p-6" onClick={() => navigate(`/courses/teacher/${teacher.id}`)}>
      <div className="absolute inset-y-0 left-0 w-[2px]" style={{ background: teacher.color, opacity: 0.7 }} />
      <div className="text-2xs uppercase tracking-[0.08em]" style={{ color: teacher.color }}>
        {teacher.style}
      </div>
      <div className="mt-2 font-serif text-[28px] leading-tight text-fg-1">{teacher.name}</div>
      <p className="mt-2 line-clamp-2 text-sm text-fg-2">{teacher.tagline}</p>
      <div className="mt-5 flex items-center justify-between text-xs text-fg-3">
        <span>
          {lessons} {lessons === 1 ? "lesson" : "lessons"}
        </span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-180 group-hover:translate-x-0.5" />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function TrackDetail({ id }: { id: TrackId }) {
  const track = TRACK_BY_ID[id];
  const state = useProgress();
  const cur = currentTier(state, id);
  return (
    <PageShell>
      <button onClick={() => navigate("/courses")} className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-3 hover:text-fg-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Courses
      </button>
      <PageTitle title={track.title} subtitle={track.blurb} right={<UnlockChip />} />
      <div className="relative space-y-4 pl-8">
        <div className="absolute bottom-6 left-[11px] top-6 w-px bg-line/[0.08]" />
        {track.tiers.map((tier) => (
          <TierBlock key={tier.id} tier={tier} current={tier.id === cur.id} />
        ))}
      </div>
    </PageShell>
  );
}

function TierBlock({ tier, current }: { tier: Tier; current: boolean }) {
  const state = useProgress();
  const run = useStart();
  const lock = tierLock(state, tier);
  const p = tierProgress(state, tier);
  const [open, setOpen] = useState(current);
  const allItems = () => tier.units.flatMap((u) => unitItems(u, tier));

  return (
    <div className="relative">
      <div
        className={cn(
          "absolute -left-8 top-5 flex h-6 w-6 items-center justify-center rounded-full border bg-bg-0 font-mono text-[11px]",
          current ? "border-accent/60 text-accent" : lock.open ? "border-line/[0.14] text-fg-2" : "border-line/[0.08] text-fg-4"
        )}
      >
        {lock.open ? tier.n : <Lock className="h-3 w-3" />}
      </div>
      <Card className={cn("overflow-hidden", !lock.open && "border-dashed border-line/[0.12] bg-transparent shadow-none")}>
        <button className="flex w-full items-center gap-5 px-6 py-5 text-left" onClick={() => setOpen((o) => !o)}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-md font-medium text-fg-1">{tier.title}</span>
              {current && <Pill tone="accent">Current</Pill>}
            </div>
            <p className="mt-1 text-sm text-fg-3">{prettyNote(tier.description)}</p>
            {!lock.open && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-fg-2">
                <Lock className="h-3 w-3 text-fg-3" /> Opens after {lock.reasons.join(" and ")}.
              </p>
            )}
          </div>
          <div className="w-28 shrink-0">
            <div className="mb-1.5 text-right font-mono text-xs tabular text-fg-2">{Math.round(p * 100)}%</div>
            <Bar value={p} />
          </div>
        </button>
        {open && (
          <div className="border-t border-line/[0.05]">
            {tier.units.map((u) => (
              <UnitRow key={u.id} unit={u} tier={tier} disabled={!lock.open} />
            ))}
            <div className="flex justify-end px-6 py-3">
              <Button size="sm" variant="ghost" disabled={!lock.open} onClick={() => run(tier.title, allItems())}>
                <Play className="h-3.5 w-3.5" /> Whole tier
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function unitMeta(unit: UnitDef): string {
  if (unit.kind === "scale") return `${unit.scaleIds.length > 1 ? `${unit.scaleIds.length} scales · ` : ""}12 keys · ${unit.octaves} oct`;
  if (unit.kind === "progression") return `${getProgression(unit.progressionId).name} · 12 keys`;
  if (unit.kind === "reading") return `${unit.drill.count} prompts · ${unit.drill.layout} clef`;
  return "Rhythm drill";
}

function UnitRow({ unit, tier, disabled }: { unit: UnitDef; tier: Tier; disabled: boolean }) {
  const state = useProgress();
  const run = useStart();
  const p = unitProgress(state, unit);
  const patterns = unit.kind === "scale" || unit.kind === "progression" ? unit.patternIds : [];
  const [pattern, setPattern] = useState<PatternId | undefined>(patterns[0]);

  return (
    <div className="flex items-center gap-4 border-b border-line/[0.04] px-6 py-3 last:border-b-0">
      <Ring value={p} size={24} stroke={2} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-fg-1">{prettyNote(unit.title)}</div>
        <div className="truncate text-xs text-fg-3">{unitMeta(unit)}</div>
      </div>
      {patterns.length > 1 && (
        <div className="hidden flex-wrap justify-end gap-1 md:flex">
          {patterns.map((pid) => (
            <button
              key={pid}
              onClick={() => setPattern(pid)}
              className={cn(
                "h-6 rounded-full px-2.5 text-xs transition-colors",
                pattern === pid ? "bg-line/[0.09] text-fg-1" : "text-fg-3 hover:text-fg-1"
              )}
            >
              {PATTERN_BY_ID[pid]?.name ?? pid}
            </button>
          ))}
        </div>
      )}
      <Button size="sm" disabled={disabled} onClick={() => run(unit.title, unitItems(unit, tier, pattern))}>
        <Play className="h-3 w-3" /> Start
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function stepLabel(step: Lesson["steps"][number]): string {
  const pat = PATTERN_BY_ID[step.patternId]?.name ?? step.patternId;
  const where = step.progressionId ? getProgression(step.progressionId).name : getScaleDef(step.scaleId).name;
  const keys = stepKeys(step);
  return `${where} · ${pat} · ${keys.length === 12 ? "12 keys" : keys.join(" ")}`;
}

function TeacherDetail({ teacher }: { teacher: Teacher }) {
  const run = useStart();
  const lessons = [...teacher.lessons].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  return (
    <PageShell>
      <button onClick={() => navigate("/courses")} className="mb-8 inline-flex items-center gap-1.5 text-sm text-fg-3 hover:text-fg-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Courses
      </button>

      <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="text-2xs uppercase tracking-[0.1em]" style={{ color: teacher.color }}>
            {teacher.style}
            {teacher.era ? ` · ${teacher.era}` : ""}
          </div>
          <h1 className="mt-3 font-serif text-[56px] leading-[1] tracking-tight text-fg-1">{teacher.name}</h1>
          <p className="mt-4 max-w-[620px] font-serif text-[22px] italic leading-snug text-fg-2">{teacher.tagline}</p>
          <p className="mt-6 max-w-[620px] text-base leading-relaxed text-fg-2">{teacher.bio}</p>

          <h2 className="mb-4 mt-12 text-lg font-semibold tracking-tight text-fg-1">Lessons</h2>
          <div className="space-y-3">
            {lessons.map((lesson, i) => (
              <Card key={lesson.id} className="p-6">
                <div className="flex items-start gap-5">
                  <span className="mt-1 font-serif text-[28px] leading-none text-fg-3">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-md font-medium text-fg-1">{lesson.title}</div>
                    <p className="mt-1 text-sm text-fg-3">{lesson.summary}</p>
                    <ol className="mt-4 space-y-1.5">
                      {lesson.steps.map((s, j) => (
                        <li key={j} className="text-xs text-fg-3">
                          <span className="text-fg-2">{prettyNote(stepLabel(s))}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        run(
                          `${teacher.name}: ${lesson.title}`,
                          lessonExercises(teacher, lesson).map((spec) => ({ kind: "exercise" as const, spec }))
                        )
                      }
                    >
                      <Play className="h-3 w-3" /> Start
                    </Button>
                    <span className="inline-flex items-center gap-1 text-xs text-fg-3">
                      <Clock className="h-3 w-3" />
                      {lesson.estMinutes ? `${lesson.estMinutes} min` : `${lessonLength(lesson)} runs`}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <aside className="space-y-8 lg:pt-24">
          <div>
            <Eyebrow className="mb-3">Approach</Eyebrow>
            <p className="text-sm leading-relaxed text-fg-2">{teacher.philosophy}</p>
          </div>
          <div>
            <Eyebrow className="mb-3">Key ideas</Eyebrow>
            <ul className="space-y-3">
              {teacher.signatureTips.map((t) => (
                <li key={t} className="border-l border-line/[0.1] pl-3 text-sm italic leading-relaxed text-fg-2">
                  {prettyNote(t)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Eyebrow className="mb-3">Vocabulary</Eyebrow>
            <div className="flex flex-wrap gap-1.5">
              {teacher.scalarVocab.map((id) => (
                <button key={id} onClick={() => navigate(`/library/${id}`)}>
                  <Pill className="hover:text-fg-1">{getScaleDef(id).name}</Pill>
                </button>
              ))}
            </div>
          </div>
          <p className="border-t border-line/[0.06] pt-6 text-xs leading-relaxed text-fg-3">
            Teacher programs are written in the style of the musicians they're named for. They aren't affiliated with or endorsed by them.
          </p>
          {teacher.favoriteKeys?.length ? (
            <div>
              <Eyebrow className="mb-3">Favorite keys</Eyebrow>
              <div className="font-mono text-sm text-fg-2">{teacher.favoriteKeys.map(prettyNote).join("  ")}</div>
            </div>
          ) : null}
        </aside>
      </div>
    </PageShell>
  );
}
