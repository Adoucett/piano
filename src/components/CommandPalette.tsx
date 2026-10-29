import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { ArrowRight, BookOpen, Drum, GraduationCap, LibraryBig, Play, Settings, Sun, ChartLine, User } from "lucide-react";
import type { PatternId } from "@/types";
import { Dialog, Kbd } from "@/components/ui";
import { SCALES } from "@/theory/catalog";
import { PATTERNS, patternsFor } from "@/exercises/patterns";
import { PROGRESSIONS } from "@/exercises/progressions";
import { RHYTHM_DRILLS } from "@/rhythm/drills";
import { TEACHERS } from "@/teachers/registry";
import { TRACKS } from "@/exercises/tracks";
import { exercisePath, navigate } from "@/lib/router";
import { useSession } from "@/store/session";
import { specLabel } from "@/exercises/session";

const KEY_RE = /^([a-g])([#b♯♭]|sharp|flat)?$/i;

function normKey(tok: string): string | null {
  const m = tok.match(KEY_RE);
  if (!m) return null;
  const acc = m[2] ? (/[#♯]|sharp/i.test(m[2]) ? "#" : "b") : "";
  return m[1].toUpperCase() + acc;
}

const PATTERN_ALIASES: Record<string, PatternId> = {
  "3rds": "thirds",
  thirds: "thirds",
  "4ths": "fourths",
  fourths: "fourths",
  up: "ascending",
  down: "descending",
  updown: "upDown",
  enclosure: "enclosures",
  enclosures: "enclosures",
  approach: "approachBelow",
  approaches: "approachBelow",
  arps: "sevenths",
  arpeggios: "sevenths",
  sevenths: "sevenths",
  triads: "triads",
  "1235": "digital1235",
  "3567": "digital3567",
  digital: "digital1235",
  guide: "guideTones",
};

interface Parsed {
  key: string;
  scaleId: string;
  patternId: PatternId;
  score: number;
}

/** Parse "D dorian thirds" / "bb altered" / "f# bebop dominant from 7". */
export function parseQuery(q: string): Parsed[] {
  const toks = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!toks.length) return [];
  const key = normKey(toks[0]);
  if (!key) return [];
  const rest = toks.slice(1);
  let pattern: PatternId | null = null;
  const words: string[] = [];
  for (const t of rest) {
    if (PATTERN_ALIASES[t]) pattern = PATTERN_ALIASES[t];
    else words.push(t);
  }
  const text = words.join(" ");
  const scored = SCALES.map((s) => {
    const hay = [s.name, s.id, ...(s.aka ?? [])].join(" ").toLowerCase();
    let score = 0;
    for (const w of words) if (hay.includes(w)) score += w.length;
    if (!words.length) score = s.id === "major" ? 1 : 0;
    if (hay.startsWith(text)) score += 2;
    return { s, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  return scored.map(({ s, score }) => {
    const allowed = patternsFor(s.id).map((p) => p.id);
    const patternId = pattern && allowed.includes(pattern) ? pattern : "upDown";
    return { key, scaleId: s.id, patternId, score };
  });
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const start = useSession((s) => s.start);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const parsed = useMemo(() => parseQuery(q), [q]);
  const lower = q.toLowerCase();
  const match = (s: string) => !lower || s.toLowerCase().includes(lower);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const pages = [
    { label: "Today", path: "/today", icon: Sun },
    { label: "Courses", path: "/courses", icon: GraduationCap },
    { label: "Library", path: "/library", icon: LibraryBig },
    { label: "Rhythm", path: "/rhythm", icon: Drum },
    { label: "Progress", path: "/progress", icon: ChartLine },
    { label: "Settings", path: "/settings", icon: Settings },
  ].filter((p) => match(p.label));

  const scales = parsed.length ? [] : SCALES.filter((s) => match(s.name) || (s.aka ?? []).some(match)).slice(0, 6);
  const drills = RHYTHM_DRILLS.filter((d) => lower.length > 1 && match(d.title)).slice(0, 4);
  const teachers = TEACHERS.filter((t) => lower.length > 1 && match(t.name)).slice(0, 4);
  const tracks = TRACKS.filter((t) => lower.length > 1 && match(t.title));
  const progs = PROGRESSIONS.filter((p) => lower.length > 1 && (match(p.name) || match(p.id))).slice(0, 3);

  const itemCls =
    "flex h-10 cursor-default items-center gap-3 rounded-ctrl px-3 text-sm text-fg-2 data-[selected=true]:bg-line/[0.06] data-[selected=true]:text-fg-1";

  return (
    <Dialog open={open} onOpenChange={setOpen} className="overflow-hidden p-0">
      <Command shouldFilter={false} className="flex flex-col" loop>
        <div className="flex items-center gap-3 border-b border-line/[0.06] px-4">
          <Command.Input
            value={q}
            onValueChange={setQ}
            placeholder="Try “D dorian thirds”, “Bb altered”, “triplets”…"
            className="h-14 flex-1 bg-transparent text-md text-fg-1 outline-none placeholder:text-fg-3"
          />
          <Kbd>Esc</Kbd>
        </div>
        <Command.List className="max-h-[420px] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-fg-3">Nothing matches. Start with a key: “E♭ lydian”.</Command.Empty>
          {parsed.length > 0 && (
            <Command.Group heading="Practice" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-fg-3">
              {parsed.map((p) => {
                const spec = { scaleId: p.scaleId, key: p.key, patternId: p.patternId, octaves: 2 };
                return (
                  <Command.Item
                    key={`${p.key}-${p.scaleId}-${p.patternId}`}
                    value={`${p.key}-${p.scaleId}-${p.patternId}`}
                    onSelect={() => {
                      start(specLabel(spec), [{ kind: "exercise", spec: { ...spec, source: { kind: "library" } }, label: specLabel(spec) }], "/library");
                      go(exercisePath(spec));
                    }}
                    className={itemCls}
                  >
                    <Play className="h-4 w-4 text-accent" />
                    <span className="flex-1">{specLabel(spec)}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-fg-3" />
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}
          {pages.length > 0 && (
            <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-fg-3">
              {pages.map((p) => (
                <Command.Item key={p.path} value={p.path} onSelect={() => go(p.path)} className={itemCls}>
                  <p.icon className="h-4 w-4 text-fg-3" />
                  {p.label}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {(scales.length > 0 || progs.length > 0) && (
            <Command.Group heading="Library" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-fg-3">
              {scales.map((s) => (
                <Command.Item key={s.id} value={`scale-${s.id}`} onSelect={() => go(`/library/${s.id}`)} className={itemCls}>
                  <LibraryBig className="h-4 w-4 text-fg-3" />
                  {s.name}
                </Command.Item>
              ))}
              {progs.map((p) => (
                <Command.Item key={p.id} value={`prog-${p.id}`} onSelect={() => go(`/library/prog/${p.id}`)} className={itemCls}>
                  <LibraryBig className="h-4 w-4 text-fg-3" />
                  {p.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {(drills.length > 0 || teachers.length > 0 || tracks.length > 0) && (
            <Command.Group heading="More" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-fg-3">
              {drills.map((d) => (
                <Command.Item
                  key={d.id}
                  value={`drill-${d.id}`}
                  onSelect={() => {
                    start(d.title, [{ kind: "rhythm", drillId: d.id, label: d.title }], "/rhythm");
                    go("/practice");
                  }}
                  className={itemCls}
                >
                  <Drum className="h-4 w-4 text-fg-3" />
                  {d.title}
                </Command.Item>
              ))}
              {teachers.map((t) => (
                <Command.Item key={t.id} value={`teacher-${t.id}`} onSelect={() => go(`/courses/teacher/${t.id}`)} className={itemCls}>
                  <User className="h-4 w-4 text-fg-3" />
                  {t.name}
                </Command.Item>
              ))}
              {tracks.map((t) => (
                <Command.Item key={t.id} value={`track-${t.id}`} onSelect={() => go(`/courses/track/${t.id}`)} className={itemCls}>
                  <BookOpen className="h-4 w-4 text-fg-3" />
                  {t.title}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
        <div className="flex items-center gap-4 border-t border-line/[0.06] px-4 py-2 text-2xs text-fg-3">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move
          </span>
          <span>
            <Kbd>↵</Kbd> to open
          </span>
          <span className="ml-auto">Patterns: {PATTERNS.length}</span>
        </div>
      </Command>
    </Dialog>
  );
}
