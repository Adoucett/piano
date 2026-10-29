import { useRef } from "react";
import { useProgress } from "@/store/progress";
import { useInputStatus } from "@/hooks/useInput";
import { inputBus } from "@/practice/inputBus";
import { Button, Card, Segmented, Select } from "@/components/ui";

export function SettingsPage() {
  const settings = useProgress((s) => s.settings);
  const setSettings = useProgress((s) => s.setSettings);
  const exportJSON = useProgress((s) => s.exportJSON);
  const importJSON = useProgress((s) => s.importJSON);
  const reset = useProgress((s) => s.reset);
  const status = useInputStatus();
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scale-trainer-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importJSON(String(reader.result));
      if (!ok) alert("Could not import that file.");
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="mb-3 font-semibold">Input &amp; sound</h3>
        <div className="flex flex-col gap-4">
          <Row label="Input source">
            <Segmented
              value={settings.inputSource}
              onChange={(v) => {
                setSettings({ inputSource: v });
                if (v === "qwerty") inputBus.startQwerty();
                else inputBus.stopQwerty();
              }}
              options={[
                { value: "midi", label: "MIDI (Nord)" },
                { value: "qwerty", label: "Computer keys" },
              ]}
            />
          </Row>

          <Row label="MIDI input device">
            <Select
              value={status.inPorts.find((p) => p.name === status.inPortName)?.id ?? ""}
              onChange={(e) => inputBus.selectInput(e.target.value)}
              disabled={!status.midiSupported}
            >
              {status.inPorts.length === 0 && <option value="">(none detected)</option>}
              {status.inPorts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Row>

          <Row label="MIDI output (for demos)">
            <Select
              value={status.outPorts.find((p) => p.name)?.id ?? ""}
              onChange={(e) => inputBus.selectOutput(e.target.value)}
              disabled={!status.midiSupported}
            >
              {status.outPorts.length === 0 && <option value="">(none detected)</option>}
              {status.outPorts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Row>

          <Row label="Play demos through">
            <Segmented
              value={settings.preferMidiOutput ? "midi" : "synth"}
              onChange={(v) => setSettings({ preferMidiOutput: v === "midi" })}
              options={[
                { value: "midi", label: "Nord / MIDI out" },
                { value: "synth", label: "Built-in synth" },
              ]}
            />
          </Row>

          {!status.midiSupported && (
            <p className="text-sm text-amber-300">
              This browser has no Web MIDI. Use Chrome or Edge for live input from the Nord. You
              can still practice with the computer keyboard.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Practice</h3>
        <div className="flex flex-col gap-4">
          <Row label="Match octave">
            <Segmented
              value={settings.matchMode}
              onChange={(v) => setSettings({ matchMode: v })}
              options={[
                { value: "exact-octave", label: "Exact octave" },
                { value: "any-octave", label: "Any octave" },
              ]}
            />
          </Row>
          <Row label="Timing mode">
            <Segmented
              value={settings.practiceMode}
              onChange={(v) => setSettings({ practiceMode: v })}
              options={[
                { value: "wait", label: "Wait for me" },
                { value: "tempo", label: "Metronome" },
              ]}
            />
          </Row>
          <Row label={`Tempo (${settings.bpm} bpm)`}>
            <input
              type="range"
              min={40}
              max={200}
              value={settings.bpm}
              onChange={(e) => setSettings({ bpm: Number(e.target.value) })}
              className="w-48"
            />
          </Row>
          <Row label="Auto-suggest less reading help">
            <Segmented
              value={settings.autoAidDown ? "on" : "off"}
              onChange={(v) => setSettings({ autoAidDown: v === "on" })}
              options={[
                { value: "on", label: "On" },
                { value: "off", label: "Off" },
              ]}
            />
          </Row>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Progress data</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={doExport}>
            Export JSON
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
          />
          <Button
            variant="ghost"
            className="text-rose-300 hover:bg-rose-500/10"
            onClick={() => confirm("Erase all progress?") && reset()}
          >
            Reset progress
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-slate-300">{label}</span>
      {children}
    </div>
  );
}
