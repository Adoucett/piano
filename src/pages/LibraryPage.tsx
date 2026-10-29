import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Headphones, Play, Search, Square } from "lucide-react";
import { Button, Card, Eyebrow, Pill, Segmented } from "@/components/ui";
import { StaffView } from "@/components/StaffView";
import { KeyboardView } from "@/components/KeyboardView";
import { useRoute, navigate } from "@/lib/router";
import { SCALES, SCALE_BY_ID, FAMILY_LABEL, FAMILY_ORDER, CIRCLE_OF_FIFTHS, CIRCLE_OF_FOURTHS } from "@/theory/catalog";
import { getScaleInfo, prettyChord } from "@/theory/engine";
import { patternsFor, buildExercise, buildProgression, lineSwing, type Exercise } from "@/exercises/patterns";
import { PROGRESSIONS, PROGRESSION_BY_ID } from "@/exercises/progressions";
import { useProgress } from "@/store/progress";
import { useSession } from "@/store/session";
import { specLabel } from "@/exercises/session";
import { transport } from "@/practice/transport";
import { sound } from "@/audio/sound";
import { swingBeat } from "@/rhythm/drills";
import { useHeldNotes } from "@/hooks/useInput";
import { prettyNote } from "@/lib/notecolor";
import { cn } from "@/lib/cn";
import { exerciseKey, type ExerciseSpec, type PatternId } from "@/types";
import { TIER_NAME } from "@/practice/mastery";
import { Note } from "tonal";

const KEY_ORDER = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export default function LibraryPage() {
  const { parts } = useRoute();
  const [q, setQ] = useState("");
  const isProg = parts[1] === "prog";
  const scaleId = !isProg && parts[1] && SCALE_BY_ID[parts[1]] ? parts[1] : isProg ? null : "major";
  const progId = isProg && parts[2] && PROGRESSION_BY_ID[parts[2]] ? parts[2] : null;

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (s: (typeof SCALES)[number]) =>
      !needle || s.name.toLowerCase().includes(needle) || s.aka?.some((a) => a.toLowerCase().includes(needle)) || s.chords.some((c) => c.toLowerCase() === needle);
    return FAMILY_ORDER.map((f) => ({ family: f, scales: SCALES.filter((s) => s.family === f && match(s)) })).filter((g) => g.scales.length);
  }, [q]);

  return (
    <div className="flex h-full">
      <div className="flex w-[280px] shrink-0 flex-col border-r border-line/[0.06]">
        <div className="px-5 pb-3 pt-10">
          <h1 className="text-xl font-semibold tracking-tight text-fg-1">Library</h1>
          <div className="mt-4 flex h-9 items-center gap-2 rounded-ctrl border border-line/[0.08] bg-surface-1 px-2.5">
            <Search className="h-3.5 w-3.5 text-fg-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Scale, mode or chord"
              className="w-full bg-transparent text-sm text-fg-1 outline-none placeholder:text-fg-4"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-10">
          <Eyebrow className="mb-1 mt-4 px-2">Progressions</Eyebrow>
          {PROGRESSIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/library/prog/${p.id}`)}
              className={cn(
                "flex h-8 w-full items-center rounded-ctrl px-2 text-left text-sm transition-colors",
                progId === p.id ? "bg-line/[0.07] text-fg-1" : "text-fg-2 hover:bg-line/[0.04] hover:text-fg-1"
              )}
            >
              {p.name}
            </button>
          ))}
          {groups.map((g) => (
            <div key={g.family}>
              <Eyebrow className="mb-1 mt-5 px-2">{FAMILY_LABEL[g.family]}</Eyebrow>
              {g.scales.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/library/${s.id}`)}
                  className={cn(
                    "flex h-8 w-full items-center justify-between gap-2 rounded-ctrl px-2 text-left text-sm transition-colors",
                    scaleId === s.id ? "bg-line/[0.07] text-fg-1" : "text-fg-2 hover:bg-line/[0.04] hover:text-fg-1"
                  )}
                >
                  <span className="truncate">{prettyNote(s.name)}</span>
                  <span className="shrink-0 font-serif text-[13px] italic text-fg-3">{prettyChord("", s.chords[0] ?? "")}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto">
        {progId ? <ProgressionDetail id={progId} key={progId} /> : scaleId ? <ScaleDetail id={scaleId} key={scaleId} /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function usePreview(ex: Exercise) {
  const settings = useProgress((s) => s.settings);
  const [playing, setPlaying] = useState(false);
  const stop = () => {
    transport.stop();
    sound.stopAll();
    setPlaying(false);
  };
  useEffect(() => () => {
    transport.stop();
    sound.stopAll();
  }, []);
  const listen = () => {
    if (playing) return stop();
    const swing = lineSwing(ex, settings);
    transport.start({
      bpm: settings.bpm,
      countInBeats: 0,
      click: "off",
      totalBeats: ex.totalBeats,
      chords: ex.chords,
      drone: settings.drone,
      walkingBass: settings.walkingBass,
      onEnd: () => setPlaying(false),
    });
    ex.notes.forEach((n) => sound.play(n.midi, transport.beatTime(swingBeat(n.beat ?? 0, swing)), (n.beats ?? 0.5) * transport.spb * 0.92, 74));
    setPlaying(true);
  };
  return { playing, listen };
}

function Preview({ ex, spec, all }: { ex: Exercise; spec: ExerciseSpec; all: ExerciseSpec[] }) {
  const settings = useProgress((s) => s.settings);
  const item = useProgress((s) => s.items[exerciseKey(spec)]);
  const start = useSession((s) => s.start);
  const { path } = useRoute();
  const { playing, listen } = usePreview(ex);
  const practice = (specs: ExerciseSpec[], title: string) => {
    start(title, specs.map((s) => ({ kind: "exercise" as const, spec: s, label: specLabel(s) })), path);
    navigate("/practice");
  };
  return (
    <>
      <div className="mt-6">
        <StaffView
          sheet={ex}
          current={-1}
          coloring={settings.noteColoring}
          night={settings.nightSheet}
          aidFor={() => 1}
          showChords
          timeSignature
          compact
        />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => practice([spec], specLabel(spec))}>
          <Play className="h-3.5 w-3.5" /> Practice
        </Button>
        <Button onClick={() => practice(all, `${specLabel(spec).replace(/^\S+ /, "")}, all keys`)}>All 12 keys</Button>
        <Button variant="ghost" onClick={listen}>
          {playing ? <Square className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
          {playing ? "Stop" : "Listen"}
        </Button>
        <span className="ml-auto text-xs text-fg-3">
          {item ? (
            <>
              {TIER_NAME[item.tier]} · best {Math.round(item.bestAccuracy * 100)}%{item.bestBpm ? ` at ${item.bestBpm} BPM` : ""}
            </>
          ) : (
            "Not played yet"
          )}
        </span>
      </div>
    </>
  );
}

function KeyChips({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {KEY_ORDER.map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            "h-8 min-w-9 rounded-ctrl px-2 font-mono text-sm transition-colors",
            value === k ? "bg-fg-1 text-bg-0" : "text-fg-2 hover:bg-line/[0.06] hover:text-fg-1"
          )}
        >
          {prettyNote(k)}
        </button>
      ))}
    </div>
  );
}

const PRIMARY_PATTERNS: PatternId[] = ["upDown", "ascending", "descending", "thirds", "fourths", "sevenths", "digital1235", "guideTones"];

function PatternChips({ options, value, onChange }: { options: { id: PatternId; name: string }[]; value: PatternId; onChange: (p: PatternId) => void }) {
  const [more, setMore] = useState(false);
  const primary = options.filter((p) => PRIMARY_PATTERNS.includes(p.id)).slice(0, 6);
  const shown = more ? options : primary.some((p) => p.id === value) ? primary : [...primary, ...options.filter((p) => p.id === value)];
  const hidden = options.length - shown.length;
  const chip = (active: boolean) =>
    cn("h-7 rounded-full px-3 text-xs transition-colors", active ? "bg-line/[0.1] text-fg-1" : "text-fg-3 hover:bg-line/[0.04] hover:text-fg-1");
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((p) => (
        <button key={p.id} onClick={() => onChange(p.id)} className={chip(value === p.id)}>
          {p.name}
        </button>
      ))}
      {(hidden > 0 || more) && (
        <button onClick={() => setMore((m) => !m)} className="flex h-7 items-center gap-1 rounded-full px-3 text-xs text-fg-2 hover:bg-line/[0.04] hover:text-fg-1">
          {more ? "Fewer" : `${hidden} more`}
          <ChevronDown className={cn("h-3 w-3 transition-transform", more && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

function ScaleDetail({ id }: { id: string }) {
  const def = SCALE_BY_ID[id];
  const [key, setKey] = useState("C");
  const [pattern, setPattern] = useState<PatternId>("upDown");
  const [octaves, setOctaves] = useState<"1" | "2">("1");
  const held = useHeldNotes();
  const info = useMemo(() => getScaleInfo(key, def), [key, def]);
  const options = patternsFor(id);
  const pat = options.some((p) => p.id === pattern) ? pattern : options[0].id;
  const spec: ExerciseSpec = { scaleId: id, key, patternId: pat, octaves: Number(octaves), source: { kind: "library" } };
  const ex = useMemo(() => buildExercise(spec), [id, key, pat, octaves]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = KEY_ORDER.map((k) => ({ ...spec, key: k }));
  const pcs = useMemo(() => new Set(info.pitchClasses.map((n) => (Note.chroma(n) ?? 0) as number)), [info]);
  const order = CIRCLE_OF_FOURTHS.indexOf(key as never) >= 0 ? "fourths" : CIRCLE_OF_FIFTHS.indexOf(key as never) >= 0 ? "fifths" : "";

  return (
    <div className="mx-auto max-w-[980px] px-10 pb-16 pt-10 animate-fade-in">
      <div className="text-2xs uppercase tracking-[0.1em] text-fg-3">{FAMILY_LABEL[def.family]}</div>
      <h2 className="mt-2 font-serif text-[44px] leading-[1.05] tracking-tight text-fg-1">
        {prettyNote(info.tonic)} {prettyNote(def.name)}
      </h2>
      {def.aka?.length ? <div className="mt-1 text-sm text-fg-3">Also: {def.aka.join(", ")}</div> : null}

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap gap-1.5">
            {info.pitchClasses.map((pc, i) => (
              <div key={pc + i} className="flex w-12 flex-col items-center rounded-ctrl border border-line/[0.06] bg-surface-1 py-2">
                <span className="font-mono text-[11px] text-fg-3">{prettyNote(info.degreeLabels[i])}</span>
                <span className="mt-0.5 text-md font-medium text-fg-1">{prettyNote(pc)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-[560px] text-sm leading-relaxed text-fg-2">{prettyNote(def.tip)}</p>
        </div>
        <div>
          <Eyebrow className="mb-2">Plays over</Eyebrow>
          <div className="flex flex-wrap gap-1.5">
            {def.chords.map((c) => (
              <Pill key={c} className="font-serif text-[14px] italic">
                {prettyChord(info.tonic, c)}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="w-16 text-xs text-fg-3">Key</span>
          <KeyChips value={key} onChange={setKey} />
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <span className="w-16 pt-1.5 text-xs text-fg-3">Pattern</span>
          <div className="flex-1">
            <PatternChips options={options} value={pat} onChange={setPattern} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="w-16 text-xs text-fg-3">Range</span>
          <Segmented
            size="sm"
            value={octaves}
            onChange={setOctaves}
            options={[
              { value: "1", label: "1 octave" },
              { value: "2", label: "2 octaves" },
            ]}
          />
          {order && <span className="text-xs text-fg-4">"All 12 keys" goes chromatically from C.</span>}
        </div>
      </div>

      <Preview ex={ex} spec={spec} all={all} />

      <Card className="mt-6 overflow-hidden p-0">
        <KeyboardView
          held={held}
          focus={ex.notes.map((n) => n.midi)}
          scalePcs={pcs}
          labels="scale"
          spell={(m) => {
            const pc = info.pitchClasses.find((n) => Note.chroma(n) === m % 12);
            return pc ?? Note.pitchClass(Note.fromMidi(m));
          }}
          onPress={(m) => sound.noteOn(m, 80)}
          onRelease={(m) => sound.noteOff(m)}
        />
      </Card>
    </div>
  );
}

function ProgressionDetail({ id }: { id: string }) {
  const prog = PROGRESSION_BY_ID[id];
  const [key, setKey] = useState("C");
  const options = patternsFor(null, true);
  const [pattern, setPattern] = useState<PatternId>("ascending");
  const pat = options.some((p) => p.id === pattern) ? pattern : options[0].id;
  const spec: ExerciseSpec = { scaleId: prog.chords[0].scaleId, key, patternId: pat, octaves: 1, progressionId: id, source: { kind: "library" } };
  const ex = useMemo(() => buildProgression(spec), [id, key, pat]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = KEY_ORDER.map((k) => ({ ...spec, key: k }));

  return (
    <div className="mx-auto max-w-[980px] px-10 pb-16 pt-10 animate-fade-in">
      <div className="text-2xs uppercase tracking-[0.1em] text-fg-3">Progression{prog.minor ? " · minor" : ""}</div>
      <h2 className="mt-2 font-serif text-[44px] leading-[1.05] tracking-tight text-fg-1">
        {prog.name} <span className="text-fg-3">in {prettyNote(key)}</span>
      </h2>
      <p className="mt-3 max-w-[620px] text-sm leading-relaxed text-fg-2">{prettyNote(prog.description)}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {ex.chords.map((c, i) => (
          <div key={i} className="rounded-card border border-line/[0.06] bg-surface-1 px-4 py-3">
            <div className="font-serif text-[22px] italic leading-none text-fg-1">{c.symbol}</div>
            <div className="mt-1.5 text-xs text-fg-3">{SCALE_BY_ID[prog.chords[i]?.scaleId]?.name}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="w-16 text-xs text-fg-3">Key</span>
          <KeyChips value={key} onChange={setKey} />
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <span className="w-16 pt-1.5 text-xs text-fg-3">Line</span>
          <div className="flex-1">
            <PatternChips options={options} value={pat} onChange={setPattern} />
          </div>
        </div>
      </div>

      <Preview ex={ex} spec={spec} all={all} />
    </div>
  );
}
