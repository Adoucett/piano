import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Card, Segmented, Select, Slider, Switch } from "@/components/ui";
import { PageShell, PageTitle } from "./PageShell";
import { useProgress, DEFAULT_SETTINGS, type Settings } from "@/store/progress";
import { useInputStatus, useNoteEvents } from "@/hooks/useInput";
import { inputBus, type NoteEvent } from "@/practice/inputBus";
import { transport } from "@/practice/transport";
import { sound } from "@/audio/sound";
import { audioNow } from "@/audio/context";
import { cn } from "@/lib/cn";

function Row({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-8 border-b border-line/[0.05] px-6 py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm text-fg-1">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-fg-3">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-2xs font-medium uppercase tracking-[0.08em] text-fg-3">{title}</h2>
      <Card>{children}</Card>
    </section>
  );
}

export default function SettingsPage() {
  const s = useProgress((st) => st.settings);
  const set = useProgress((st) => st.setSettings);
  const status = useInputStatus();
  const up = <K extends keyof Settings>(k: K) => (v: Settings[K]) => set({ [k]: v } as Partial<Settings>);

  return (
    <PageShell>
      <PageTitle title="Settings" />
      <div className="max-w-[820px]">

      <Section title="Sound">
        <Row label="Sound source" hint="Auto uses the Nord when it is connected for output, otherwise the sampled grand.">
          <Segmented
            size="sm"
            value={s.soundSource}
            onChange={up("soundSource")}
            options={[
              { value: "auto", label: "Auto" },
              { value: "nord", label: "Nord" },
              { value: "piano", label: "Sampled grand" },
              { value: "synth", label: "Light synth" },
            ]}
          />
        </Row>
        <Row label="Backing through the Nord" hint="Bass and pad on MIDI channel 2. Set a second layer on the Nord to channel 2 to hear it.">
          <Switch checked={s.backingToNord} onChange={up("backingToNord")} />
        </Row>
        <Row label="Cadence after a clean run" hint="A short resolving chord when a run is clean.">
          <Switch checked={s.cadenceOnClean} onChange={up("cadenceOnClean")} />
        </Row>
        <Row label="Test" hint="Plays a chord through the current source.">
          <Button size="sm" onClick={() => sound.chord([48, 55, 64, 71], audioNow() + 0.05, 1.2, 70)}>
            Play Cmaj7
          </Button>
        </Row>
      </Section>

      <Section title="Input">
        <Row label="MIDI input" hint={status.midiSupported ? undefined : "Web MIDI isn't available in this browser. Use Chrome or Edge."}>
          <Select
            value={status.inPorts.find((p) => p.name === status.inPortName)?.id ?? ""}
            placeholder={status.inPorts.length ? "Choose device" : "No devices"}
            disabled={!status.inPorts.length}
            onChange={(id) => inputBus.selectInput(id)}
            options={status.inPorts.map((p) => ({ value: p.id, label: p.name }))}
            className="w-56"
          />
        </Row>
        <Row label="MIDI output" hint="Where the Nord sound source and backing are sent.">
          <Select
            value={status.outPorts.find((p) => p.name === status.outPortName)?.id ?? ""}
            placeholder={status.outPorts.length ? "Choose device" : "No devices"}
            disabled={!status.outPorts.length}
            onChange={(id) => inputBus.selectOutput(id)}
            options={status.outPorts.map((p) => ({ value: p.id, label: p.name }))}
            className="w-56"
          />
        </Row>
        <Row label="Computer keyboard" hint="A S D F G H J K L ; plays white keys, W E T Y U O P plays black keys. Z / X shift the octave.">
          <Switch checked={s.inputSource === "qwerty"} onChange={(v) => set({ inputSource: v ? "qwerty" : "midi" })} />
        </Row>
        <Calibration />
      </Section>

      <Section title="Practice">
        <Row label="Default mode" hint="Wait waits for each note. Tempo scores you against the click.">
          <Segmented
            size="sm"
            value={s.practiceMode}
            onChange={up("practiceMode")}
            options={[
              { value: "wait", label: "Wait" },
              { value: "tempo", label: "Tempo" },
            ]}
          />
        </Row>
        <Row label="Octave matching" hint="Exact octave is what the staff shows. Any octave is easier while learning a shape.">
          <Segmented
            size="sm"
            value={s.matchMode}
            onChange={up("matchMode")}
            options={[
              { value: "exact-octave", label: "Exact" },
              { value: "any-octave", label: "Any" },
            ]}
          />
        </Row>
        <Row label={`Swing ratio · ${Math.round(s.swing * 100)}%`} hint="50% is straight, 67% is triplet swing. Used by swing drills and swung lines.">
          <Slider value={s.swing} onChange={up("swing")} min={0.5} max={0.75} step={0.01} />
        </Row>
        <Row label="Swing the eighths in lines" hint="Auto swings bebop scales, vocabulary and progressions, and keeps scales and reading straight.">
          <Segmented
            size="sm"
            value={s.swingLines}
            onChange={up("swingLines")}
            options={[
              { value: "auto", label: "Auto" },
              { value: "on", label: "Always" },
              { value: "off", label: "Never" },
            ]}
          />
        </Row>
        <Row label="Count-in">
          <Switch checked={s.countIn} onChange={up("countIn")} />
        </Row>
        <Row label="Drone on the chord root">
          <Switch checked={s.drone} onChange={up("drone")} />
        </Row>
        <Row label="Walking bass" hint="Under progressions and lines in tempo mode.">
          <Switch checked={s.walkingBass} onChange={up("walkingBass")} />
        </Row>
      </Section>

      <Section title="Display">
        <Row label="Theme">
          <Segmented
            size="sm"
            value={s.theme}
            onChange={up("theme")}
            options={[
              { value: "dark", label: "Graphite" },
              { value: "light", label: "Ivory" },
            ]}
          />
        </Row>
        <Row label="Night sheet" hint="Dark paper with ivory ink.">
          <Switch checked={s.nightSheet} onChange={up("nightSheet")} />
        </Row>
        <Row label="Note coloring" hint="Chord tones colors 1-3-5-7 against tensions. Letters colors by pitch name. Ink is plain.">
          <Segmented
            size="sm"
            value={s.noteColoring}
            onChange={up("noteColoring")}
            options={[
              { value: "chordtone", label: "Chord tones" },
              { value: "letter", label: "Letters" },
              { value: "ink", label: "Ink" },
            ]}
          />
        </Row>
        <Row label="Reading aids" hint="Auto fades letter names per staff region as your reading there improves.">
          <div className="flex items-center gap-3">
            <Segmented
              size="sm"
              value={s.aidMode}
              onChange={up("aidMode")}
              options={[
                { value: "auto", label: "Auto" },
                { value: "manual", label: "Manual" },
              ]}
            />
            {s.aidMode === "manual" && (
              <Segmented
                size="sm"
                value={String(s.aidLevel) as "0" | "1" | "2" | "3"}
                onChange={(v) => set({ aidLevel: Number(v) as Settings["aidLevel"] })}
                options={[
                  { value: "0", label: "All", title: "Letters in every notehead" },
                  { value: "1", label: "Ledger", title: "Letters on ledger-line notes only" },
                  { value: "2", label: "On miss", title: "Letter appears after a wrong note" },
                  { value: "3", label: "None" },
                ]}
              />
            )}
          </div>
        </Row>
        <Row label="Fingering" hint="Right-hand numbers where standard fingerings exist.">
          <Switch checked={s.showFingering} onChange={up("showFingering")} />
        </Row>
      </Section>

      <ProgressSection />
      </div>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */

const CAL_BEATS = 8;
const CAL_BPM = 90;

function Calibration() {
  const latency = useProgress((s) => s.settings.latencyMs);
  const set = useProgress((s) => s.setSettings);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [taps, setTaps] = useState<number[]>([]);
  const offsets = useRef<number[]>([]);
  const startedRef = useRef(false);

  const finish = useCallback(() => {
    startedRef.current = false;
    const o = [...offsets.current].sort((a, b) => a - b);
    if (o.length < 4) {
      setPhase("idle");
      toast("Not enough taps to calibrate. Play one note on every click.");
      return;
    }
    const median = o[Math.floor(o.length / 2)];
    const ms = Math.max(-40, Math.min(250, Math.round(median)));
    set({ latencyMs: ms });
    inputBus.latencyMs = ms;
    setPhase("done");
    toast(`Latency set to ${ms} ms`);
  }, [set]);

  const start = () => {
    offsets.current = [];
    setTaps([]);
    startedRef.current = true;
    setPhase("running");
    transport.start({ bpm: CAL_BPM, countInBeats: 4, click: "all", totalBeats: CAL_BEATS, onEnd: finish });
  };

  useEffect(() => () => {
    if (startedRef.current) transport.stop();
  }, []);

  useNoteEvents(
    useCallback(
      (e: NoteEvent) => {
        if (!e.on || !startedRef.current) return;
        const raw = e.time + inputBus.latencyMs / 1000;
        const beat = Math.round((raw - transport.t0) / transport.spb);
        if (beat < 0 || beat >= CAL_BEATS) return;
        const off = (raw - transport.beatTime(beat)) * 1000;
        if (Math.abs(off) > transport.spb * 400) return;
        offsets.current.push(off);
        setTaps((t) => [...t, off]);
      },
      []
    )
  );

  return (
    <div className="border-b border-line/[0.05] px-6 py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-8">
        <div>
          <div className="text-sm text-fg-1">Latency calibration</div>
          <div className="mt-0.5 text-xs text-fg-3">
            Four count-in clicks, then play any key on each of the next {CAL_BEATS} clicks. The median offset is subtracted from every note you play.
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-sm tabular text-fg-2">{latency} ms</span>
          <Button size="sm" onClick={start} disabled={phase === "running"}>
            {phase === "running" ? "Listening…" : latency ? "Recalibrate" : "Calibrate"}
          </Button>
        </div>
      </div>
      {phase !== "idle" && (
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: CAL_BEATS }, (_, i) => {
            const t = taps[i];
            return (
              <div
                key={i}
                className={cn(
                  "flex h-7 flex-1 items-center justify-center rounded-ctrl font-mono text-[11px] tabular",
                  t == null ? "bg-line/[0.05] text-fg-4" : "bg-surface-3 text-fg-2"
                )}
              >
                {t == null ? "·" : `${t > 0 ? "+" : ""}${Math.round(t)}`}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProgressSection() {
  const s = useProgress((st) => st.settings);
  const set = useProgress((st) => st.setSettings);
  const exportJSON = useProgress((st) => st.exportJSON);
  const importJSON = useProgress((st) => st.importJSON);
  const reset = useProgress((st) => st.reset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState(false);

  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `etude-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (f: File) => {
    const ok = importJSON(await f.text());
    toast(ok ? "Progress imported" : "That file couldn't be read");
  };

  return (
    <Section title="Progress">
      <Row label="Open every tier" hint="Skip the gating. Progress still records normally. You can also add ?unlock=1 to the URL.">
        <Switch checked={s.unlockAll} onChange={(v) => set({ unlockAll: v })} />
      </Row>
      <Row label="Backup" hint="Progress lives in this browser. Export it to move between machines.">
        <div className="flex gap-2">
          <Button size="sm" onClick={doExport}>
            Export
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
          />
        </div>
      </Row>
      <Row label="Reset" hint="Clears all progress. Settings are kept.">
        {confirm ? (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="border-error/40 text-error hover:bg-error/10"
              onClick={() => {
                reset();
                setConfirm(false);
                toast("Progress cleared");
              }}
            >
              Clear everything
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
            Reset progress
          </Button>
        )}
      </Row>
      <Row label="Restore default settings">
        <Button size="sm" variant="ghost" onClick={() => set({ ...DEFAULT_SETTINGS, sidebarCollapsed: s.sidebarCollapsed })}>
          Restore
        </Button>
      </Row>
    </Section>
  );
}
