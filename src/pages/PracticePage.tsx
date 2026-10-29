import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, Gauge, Music2, Volume2 } from "lucide-react";
import type { PatternId } from "@/types";
import { useSession, type SessionItem } from "@/store/session";
import { useProgress } from "@/store/progress";
import { navigate, useRoute } from "@/lib/router";
import { Button, Kbd, Popover, Segmented, Select, Slider, Switch, Tip } from "@/components/ui";
import { ExerciseRunner } from "@/components/practice/ExerciseRunner";
import { ReadingRunner } from "@/components/practice/ReadingRunner";
import { RhythmRunner } from "@/components/practice/RhythmRunner";
import { specLabel } from "@/exercises/session";
import { SCALE_BY_ID } from "@/theory/catalog";
import { PATTERN_BY_ID } from "@/exercises/patterns";
import { PROGRESSION_BY_ID } from "@/exercises/progressions";
import { allTiers } from "@/exercises/tracks";
import { RHYTHM_BY_ID } from "@/rhythm/drills";
import { cn } from "@/lib/cn";
import { sound } from "@/audio/sound";

function itemId(it: SessionItem | undefined): string {
  if (!it) return "none";
  if (it.kind === "exercise") return `ex:${it.spec.progressionId ?? it.spec.scaleId}|${it.spec.key}|${it.spec.patternId}|${it.spec.octaves}`;
  if (it.kind === "reading") return `rd:${it.unitId}`;
  return `rh:${it.drillId}`;
}

export default function PracticePage() {
  const { parts } = useRoute();
  const session = useSession();
  const start = useSession((s) => s.start);

  // Deep links: #/practice/ex/<scale>/<key>/<pattern>/<octaves> and #/practice/prog/<id>/<key>/<pattern>
  useEffect(() => {
    if (parts[1] === "ex" && parts.length >= 5) {
      const [, , scaleId, key, patternId, oct] = parts;
      if (!SCALE_BY_ID[scaleId] || !PATTERN_BY_ID[patternId as PatternId]) return;
      const spec = { scaleId, key, patternId: patternId as PatternId, octaves: Number(oct) || 1, source: { kind: "library" as const } };
      const cur = session.items[session.index];
      if (cur?.kind === "exercise" && itemId(cur) === itemId({ kind: "exercise", spec })) return;
      start(specLabel(spec), [{ kind: "exercise", spec, label: specLabel(spec) }], "/library");
    } else if (parts[1] === "prog" && parts.length >= 5) {
      const [, , progressionId, key, patternId] = parts;
      if (!PROGRESSION_BY_ID[progressionId]) return;
      const spec = { scaleId: "major", key, patternId: patternId as PatternId, octaves: 1, progressionId, source: { kind: "library" as const } };
      const cur = session.items[session.index];
      if (cur?.kind === "exercise" && itemId(cur) === itemId({ kind: "exercise", spec })) return;
      start(specLabel(spec), [{ kind: "exercise", spec, label: specLabel(spec) }], "/library");
    } else if (parts[1] === "read" && parts[2]) {
      const unit = allTiers().flatMap((t) => t.units).find((u) => u.id === parts[2]);
      if (unit?.kind !== "reading") return;
      const cur = session.items[session.index];
      if (cur?.kind === "reading" && cur.unitId === unit.id) return;
      start(unit.title, [{ kind: "reading", drill: unit.drill, unitId: unit.id, label: unit.title }], "/courses/track/reading");
    } else if (parts[1] === "rhythm" && parts[2]) {
      if (!RHYTHM_BY_ID[parts[2]]) return;
      const cur = session.items[session.index];
      if (cur?.kind === "rhythm" && cur.drillId === parts[2]) return;
      const title = RHYTHM_BY_ID[parts[2]].title;
      start(title, [{ kind: "rhythm", drillId: parts[2], label: title }], "/rhythm");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts.join("/")]);

  const item = session.items[session.index];
  const isLast = session.index + 1 >= session.items.length;

  const back = useCallback(() => {
    sound.stopAll();
    navigate(session.returnTo || "/today");
  }, [session.returnTo]);

  const next = useCallback(() => {
    if (!useSession.getState().next()) {
      toast(session.items.length > 1 ? "Session complete." : "Done.", { description: session.title });
      back();
    }
  }, [back, session.items.length, session.title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog]")) back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back]);

  useEffect(() => {
    if (!item && parts.length <= 1) navigate("/today");
  }, [item, parts.length]);

  if (!item) return null;

  const nextLabel = isLast ? "Finish" : "Next";
  return (
    <div className="flex h-full flex-col bg-bg-0">
      <TopBar onBack={back} kind={item.kind} />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto" key={`${session.index}-${itemId(item)}`}>
        {item.kind === "exercise" && <ExerciseRunner spec={item.spec} onNext={next} nextLabel={nextLabel} />}
        {item.kind === "reading" && <ReadingRunner drill={item.drill} unitId={item.unitId} onNext={next} nextLabel={nextLabel} />}
        {item.kind === "rhythm" && <RhythmRunner drillId={item.drillId} onNext={next} nextLabel={nextLabel} />}
      </div>
    </div>
  );
}

function TopBar({ onBack, kind }: { onBack: () => void; kind: SessionItem["kind"] }) {
  const { title, items, index, setIndex } = useSession();
  const settings = useProgress((s) => s.settings);
  const set = useProgress((s) => s.setSettings);

  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-b border-line/[0.06] bg-bg-1/80 px-4 backdrop-blur">
      <Tip content={<span>Back <Kbd>Esc</Kbd></span>}>
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Tip>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-fg-1">{title}</div>
        {items.length > 1 && (
          <div className="mt-1 flex items-center gap-1">
            {items.map((it, i) => (
              <button
                key={i}
                title={it.label}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-180",
                  i === index ? "w-5 bg-accent" : i < index ? "w-1.5 bg-fg-2" : "w-1.5 bg-line/[0.15] hover:bg-line/[0.3]"
                )}
              />
            ))}
            <span className="ml-2 font-mono text-[10px] tabular text-fg-3">
              {index + 1}/{items.length}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {kind === "exercise" && (
        <>
          <Popover
            trigger={
              <Button variant="secondary" size="sm" className="font-mono tabular">
                <Gauge className="h-3.5 w-3.5 text-fg-3" />
                {settings.practiceMode === "tempo" ? `${settings.bpm} BPM` : "Wait mode"}
              </Button>
            }
          >
            <div className="space-y-4">
              <Row label="Mode">
                <Segmented
                  size="sm"
                  value={settings.practiceMode}
                  onChange={(v) => set({ practiceMode: v })}
                  options={[
                    { value: "wait", label: "Wait" },
                    { value: "tempo", label: "Tempo" },
                  ]}
                />
              </Row>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-fg-3">
                  <span>Tempo</span>
                  <span className="font-mono tabular text-fg-1">{settings.bpm} BPM</span>
                </div>
                <Slider value={settings.bpm} onChange={(v) => set({ bpm: v })} min={40} max={240} step={1} className="w-full" />
                <div className="mt-1 text-2xs text-fg-3">
                  <Kbd>←</Kbd> <Kbd>→</Kbd> ±4 BPM
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-2">Swing</span>
                <Segmented
                  size="sm"
                  value={settings.swingLines}
                  onChange={(v) => set({ swingLines: v })}
                  options={[
                    { value: "auto", label: "Auto", title: "Bebop scales, vocabulary and progressions swing" },
                    { value: "on", label: "On" },
                    { value: "off", label: "Off" },
                  ]}
                />
              </div>
              {settings.swingLines !== "off" && (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-fg-3">
                    <span>Swing ratio</span>
                    <span className="font-mono tabular text-fg-1">
                      {Math.round(settings.swing * 100)}:{100 - Math.round(settings.swing * 100)}
                    </span>
                  </div>
                  <Slider value={Math.round(settings.swing * 100)} onChange={(v) => set({ swing: v / 100 })} min={50} max={72} className="w-full" />
                </div>
              )}
              <Row label="Match octave">
                <Switch checked={settings.matchMode === "exact-octave"} onChange={(v) => set({ matchMode: v ? "exact-octave" : "any-octave" })} />
              </Row>
            </div>
          </Popover>

          <Popover
            trigger={
              <Button variant="secondary" size="sm">
                <Music2 className="h-3.5 w-3.5 text-fg-3" /> Backing
              </Button>
            }
          >
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs text-fg-3">Click</div>
                <Segmented
                  size="sm"
                  value={settings.click}
                  onChange={(v) => set({ click: v })}
                  options={[
                    { value: "all", label: "All" },
                    { value: "2&4", label: "2 & 4" },
                    { value: "4", label: "4" },
                    { value: "gap", label: "Gap" },
                    { value: "off", label: "Off" },
                  ]}
                />
              </div>
              <Row label="Count-in">
                <Switch checked={settings.countIn} onChange={(v) => set({ countIn: v })} />
              </Row>
              <Row label="Chord pad">
                <Switch checked={settings.drone} onChange={(v) => set({ drone: v })} />
              </Row>
              <Row label="Walking bass & ride">
                <Switch checked={settings.walkingBass} onChange={(v) => set({ walkingBass: v })} />
              </Row>
              <Row label="Cadence after a clean run">
                <Switch checked={settings.cadenceOnClean} onChange={(v) => set({ cadenceOnClean: v })} />
              </Row>
            </div>
          </Popover>

          <Popover
            trigger={
              <Button variant="secondary" size="sm">
                <Eye className="h-3.5 w-3.5 text-fg-3" /> {settings.aidMode === "auto" ? "Aids: auto" : `Aids: ${["letters", "ledger", "on miss", "none"][settings.aidLevel]}`}
              </Button>
            }
          >
            <div className="space-y-4">
              <Row label="Reading aids">
                <Segmented
                  size="sm"
                  value={settings.aidMode}
                  onChange={(v) => set({ aidMode: v })}
                  options={[
                    { value: "auto", label: "Auto" },
                    { value: "manual", label: "Manual" },
                  ]}
                />
              </Row>
              {settings.aidMode === "auto" ? (
                <p className="text-xs leading-relaxed text-fg-3">
                  Letters fade per staff region as your reading there improves: in the notehead, then ledger lines only, then only after a miss, then gone.
                </p>
              ) : (
                <Segmented
                  size="sm"
                  value={String(settings.aidLevel) as "0" | "1" | "2" | "3"}
                  onChange={(v) => set({ aidLevel: Number(v) as 0 | 1 | 2 | 3 })}
                  options={[
                    { value: "0", label: "Letters", title: "1" },
                    { value: "1", label: "Ledger", title: "2" },
                    { value: "2", label: "On miss", title: "3" },
                    { value: "3", label: "None", title: "4" },
                  ]}
                />
              )}
              <div>
                <div className="mb-2 text-xs text-fg-3">Note color</div>
                <Segmented
                  size="sm"
                  value={settings.noteColoring}
                  onChange={(v) => set({ noteColoring: v })}
                  options={[
                    { value: "chordtone", label: "Chord tones" },
                    { value: "ink", label: "Ink" },
                    { value: "letter", label: "Letters" },
                  ]}
                />
              </div>
              <Row label="Night sheet">
                <Switch checked={settings.nightSheet} onChange={(v) => set({ nightSheet: v })} />
              </Row>
              <Row label="Finger numbers">
                <Switch checked={settings.showFingering} onChange={(v) => set({ showFingering: v })} />
              </Row>
            </div>
          </Popover>
        </>
      )}

      <Popover
        trigger={
          <Button variant="ghost" size="icon" aria-label="Sound">
            <Volume2 className="h-4 w-4" />
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs text-fg-3">Sound source</div>
            <Select
              value={settings.soundSource}
              onChange={(v) => set({ soundSource: v })}
              options={[
                { value: "auto", label: "Auto (Nord if connected)" },
                { value: "nord", label: "Nord via MIDI" },
                { value: "piano", label: "Sampled grand" },
                { value: "synth", label: "Simple synth" },
              ]}
              className="w-full"
            />
          </div>
          <Row label="Backing on Nord (ch. 2)">
            <Switch checked={settings.backingToNord} onChange={(v) => set({ backingToNord: v })} />
          </Row>
        </div>
      </Popover>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-fg-2">{label}</span>
      {children}
    </div>
  );
}
