import { useProgress } from "@/store/progress";
import { useInputStatus } from "@/hooks/useInput";
import { Segmented } from "@/components/ui";
import type { AidLevel } from "@/types";

export function AidControl() {
  const aidLevel = useProgress((s) => s.settings.aidLevel);
  const setSettings = useProgress((s) => s.setSettings);
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs uppercase tracking-wide text-slate-400 sm:inline">
        Reading help
      </span>
      <Segmented<string>
        value={String(aidLevel)}
        onChange={(v) => setSettings({ aidLevel: Number(v) as AidLevel })}
        options={[
          { value: "0", label: "Letters" },
          { value: "1", label: "Next" },
          { value: "2", label: "Delayed" },
          { value: "3", label: "None" },
        ]}
      />
    </div>
  );
}

export function MidiStatus() {
  const status = useInputStatus();
  const inputSource = useProgress((s) => s.settings.inputSource);

  const dotColor =
    status.midiInReady && status.inPortName
      ? "bg-emerald-400"
      : status.midiSupported
        ? "bg-amber-400"
        : "bg-rose-400";

  const label = !status.midiSupported
    ? "No Web MIDI (use Chrome)"
    : status.inPortName
      ? status.inPortName
      : "No MIDI device";

  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 px-3 py-1.5 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
      <span className="max-w-[160px] truncate text-slate-200">{label}</span>
      {inputSource === "qwerty" && (
        <span className="text-xs text-slate-400">(keyboard)</span>
      )}
    </div>
  );
}
