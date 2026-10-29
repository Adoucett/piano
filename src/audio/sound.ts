/**
 * The app's voice. One interface, three engines:
 *   1. "nord"  – notes go out over MIDI to the Nord (its own piano sounds them)
 *   2. "piano" – a sampled concert grand (smplr SplendidGrandPiano), lazy-loaded
 *   3. "synth" – the small offline synth, last resort
 * "auto" picks the Nord when a MIDI output exists, otherwise the sampled grand.
 */
import { getAudioContext, getMaster, audioToPerf } from "./context";
import { synth } from "./synth";
import { midiOutput } from "@/midi/midiOutput";

export type SoundSource = "auto" | "nord" | "piano" | "synth";
export type ResolvedSource = "nord" | "piano" | "synth";
export type PianoStatus = "idle" | "loading" | "ready" | "error";

interface SmplrLike {
  start(e: { note: number; velocity?: number; time?: number; duration?: number | null }): (time?: number) => void;
  stop(target?: number | { time?: number }): void;
  ready?: Promise<void>;
  load?: Promise<unknown>;
}

class Sound {
  private source: SoundSource = "auto";
  private piano: SmplrLike | null = null;
  private pianoLoad: Promise<void> | null = null;
  private held = new Map<number, (t?: number) => void>();
  private statusListeners = new Set<(s: PianoStatus) => void>();
  status: PianoStatus = "idle";

  setSource(s: SoundSource) {
    this.source = s;
    if (this.resolved() === "piano") void this.ensurePiano();
  }

  getSource(): SoundSource {
    return this.source;
  }

  resolved(): ResolvedSource {
    if (this.source === "nord") return midiOutput.available ? "nord" : "piano";
    if (this.source === "auto") return midiOutput.available ? "nord" : "piano";
    return this.source;
  }

  /** Human label for the footer / top bar. */
  label(): string {
    const r = this.resolved();
    if (r === "nord") return midiOutput.portName ?? "Nord";
    if (r === "piano") return this.status === "ready" ? "Grand piano" : this.status === "loading" ? "Loading piano…" : "Grand piano";
    return "Synth";
  }

  onStatus(l: (s: PianoStatus) => void): () => void {
    this.statusListeners.add(l);
    return () => this.statusListeners.delete(l);
  }

  private setStatus(s: PianoStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  ensurePiano(): Promise<void> {
    if (this.pianoLoad) return this.pianoLoad;
    this.setStatus("loading");
    this.pianoLoad = (async () => {
      try {
        const { SplendidGrandPiano } = await import("smplr");
        const ctx = getAudioContext();
        const p = SplendidGrandPiano(ctx, { destination: getMaster(), decayTime: 0.6 }) as unknown as SmplrLike;
        await (p.ready ?? p.load);
        this.piano = p;
        this.setStatus("ready");
      } catch (err) {
        console.warn("[sound] sampled piano failed to load, using synth", err);
        this.setStatus("error");
      }
    })();
    return this.pianoLoad;
  }

  private engine(): ResolvedSource {
    const r = this.resolved();
    if (r === "piano" && !this.piano) {
      void this.ensurePiano();
      return "synth";
    }
    return r;
  }

  noteOn(midi: number, velocity = 80) {
    const e = this.engine();
    if (e === "nord") midiOutput.noteOn(midi, velocity);
    else if (e === "piano") {
      this.held.get(midi)?.();
      this.held.set(midi, this.piano!.start({ note: midi, velocity }));
    } else synth.noteOn(midi, velocity);
  }

  noteOff(midi: number) {
    if (midiOutput.available) midiOutput.noteOff(midi);
    const stop = this.held.get(midi);
    if (stop) {
      stop();
      this.held.delete(midi);
    }
    synth.noteOff(midi);
  }

  /** Schedule a note at an audio-clock time for a fixed duration (seconds). */
  play(midi: number, start: number, duration: number, velocity = 80) {
    const e = this.engine();
    if (e === "nord") {
      midiOutput.noteOn(midi, velocity, 1, audioToPerf(start));
      midiOutput.noteOff(midi, 1, audioToPerf(start + duration));
    } else if (e === "piano") {
      this.piano!.start({ note: midi, velocity, time: start, duration });
    } else synth.play(midi, start, duration, velocity);
  }

  chord(midis: number[], start: number, duration: number, velocity = 64) {
    midis.forEach((m, i) => this.play(m, start + i * 0.012, duration, velocity - i * 2));
  }

  stopAll() {
    if (midiOutput.available) midiOutput.allOff(1);
    this.held.forEach((s) => s());
    this.held.clear();
    this.piano?.stop();
    synth.allOff();
  }
}

export const sound = new Sound();
