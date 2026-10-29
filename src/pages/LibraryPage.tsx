import { useMemo, useState } from "react";
import type { ExerciseSpec, PatternId, ScaleFamily } from "@/types";
import { SCALES } from "@/theory/catalog";
import { CHROMATIC_KEYS } from "@/theory/catalog";
import { getScaleInfo, chordSymbol } from "@/theory/engine";
import { getScaleDef } from "@/theory/catalog";
import { buildExercise, PATTERNS } from "@/exercises/patterns";
import { synth } from "@/audio/synth";
import { midiOutput } from "@/midi/midiOutput";
import { useProgress } from "@/store/progress";
import { StaffView } from "@/components/StaffView";
import { KeyboardView } from "@/components/KeyboardView";
import { Badge, Button, Card, Select } from "@/components/ui";
import { prettyNote } from "@/lib/notecolor";
import { Note } from "tonal";

const FAMILY_LABELS: Record<ScaleFamily, string> = {
  major: "Major",
  minor: "Minor family",
  "modes-major": "Modes of major",
  "pentatonic-blues": "Pentatonic & blues",
  "melodic-minor-modes": "Melodic minor modes",
  "harmonic-minor-modes": "Harmonic minor modes",
  symmetric: "Symmetric",
  bebop: "Bebop",
  advanced: "Advanced",
};

const FAMILY_ORDER: ScaleFamily[] = [
  "major",
  "minor",
  "modes-major",
  "pentatonic-blues",
  "melodic-minor-modes",
  "harmonic-minor-modes",
  "symmetric",
  "bebop",
  "advanced",
];

export function LibraryPage({ onPractice }: { onPractice: (q: ExerciseSpec[]) => void }) {
  const [key, setKey] = useState("C");
  const [scaleId, setScaleId] = useState("major");
  const [pattern, setPattern] = useState<PatternId>("upDown");
  const preferMidi = useProgress((s) => s.settings.preferMidiOutput);

  const def = getScaleDef(scaleId);
  const info = useMemo(() => getScaleInfo(key, def), [key, def]);
  const spec: ExerciseSpec = { scaleId, key, patternId: pattern, octaves: 2, source: { kind: "library" } };
  const notes = useMemo(() => buildExercise(spec), [scaleId, key, pattern]);

  const scalePCs = useMemo(
    () => new Set(info.pitchClasses.map((pc) => ((Note.chroma(pc) ?? 0) + 12) % 12)),
    [info]
  );
  const pcLabels = useMemo(() => {
    const m: Record<number, string> = {};
    for (const pc of info.pitchClasses) m[((Note.chroma(pc) ?? 0) + 12) % 12] = pc;
    return m;
  }, [info]);

  const preview = async () => {
    const seq = buildExercise({ ...spec, octaves: 1 }).map((n) => n.midi);
    if (preferMidi && midiOutput.available) {
      for (const m of seq) {
        midiOutput.noteOn(m, 70);
        await new Promise((r) => setTimeout(r, 220));
        midiOutput.noteOff(m);
      }
    } else {
      await synth.play(seq, 220, 70);
    }
  };

  const byFamily = useMemo(() => {
    const map = new Map<ScaleFamily, typeof SCALES>();
    for (const s of SCALES) {
      const arr = map.get(s.family) ?? [];
      arr.push(s);
      map.set(s.family, arr);
    }
    return map;
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit max-h-[70vh] overflow-y-auto">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Scale library
        </h3>
        {FAMILY_ORDER.filter((f) => byFamily.has(f)).map((family) => (
          <div key={family} className="mb-3">
            <div className="mb-1 text-xs font-semibold text-sky-300">
              {FAMILY_LABELS[family]}
            </div>
            <div className="flex flex-col">
              {byFamily.get(family)!.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScaleId(s.id)}
                  className={`rounded-lg px-2 py-1 text-left text-sm transition-colors ${
                    s.id === scaleId ? "bg-sky-500/20 text-sky-100" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Card>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={key} onChange={(e) => setKey(e.target.value)}>
            {CHROMATIC_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
          <Select value={pattern} onChange={(e) => setPattern(e.target.value as PatternId)}>
            {PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={preview}>
            Hear it
          </Button>
          <Button onClick={() => onPractice([{ ...spec }])}>Practice this</Button>
        </div>

        <Card>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">
              {prettyNote(key)} {def.name}
            </h2>
            {def.aka?.map((a) => (
              <Badge key={a}>{a}</Badge>
            ))}
            {def.chords.map((c) => (
              <Badge key={c} className="bg-sky-500/20 text-sky-200">
                {chordSymbol(key, c)}
              </Badge>
            ))}
          </div>
          <div className="mb-1 font-mono text-sm text-slate-400">{prettyNote(info.formula)}</div>
          <div className="mb-3 font-mono text-sm text-slate-300">
            {info.pitchClasses.map(prettyNote).join("  ")}
          </div>
          <p className="mb-3 text-sm text-slate-400">{def.tip}</p>
          <StaffView notes={notes} clef="treble" colorByLetter labelFor={(_, n) => n.name} />
          <div className="mt-3">
            <KeyboardView
              scalePitchClasses={scalePCs}
              pcLabels={pcLabels}
              showAllLabels={false}
              colorByLetter
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
