import { midiInput, type MidiPort } from "@/midi/midiInput";
import { midiOutput } from "@/midi/midiOutput";
import { qwerty } from "@/midi/qwerty";
import { sound } from "@/audio/sound";
import { perfToAudio } from "@/audio/context";

export interface NoteEvent {
  note: number;
  velocity: number;
  on: boolean;
  source: "midi" | "virtual";
  /** Audio-clock time (seconds), latency-compensated. Compare against transport.beatTime(). */
  time: number;
  /** performance.now() time (ms) of the event. */
  perfTime: number;
}

type NoteListener = (e: NoteEvent) => void;
type HeldListener = (held: Set<number>) => void;
type StatusListener = (s: InputStatus) => void;
type PedalListener = (down: boolean) => void;

export interface InputStatus {
  midiSupported: boolean;
  midiInReady: boolean;
  midiOutReady: boolean;
  inPortName: string | null;
  outPortName: string | null;
  inPorts: MidiPort[];
  outPorts: MidiPort[];
  qwerty: boolean;
}

class InputBus {
  held = new Set<number>();
  pedal = false;
  /** Latency offset in ms subtracted from every timestamp (from calibration). */
  latencyMs = 0;
  private noteListeners = new Set<NoteListener>();
  private heldListeners = new Set<HeldListener>();
  private statusListeners = new Set<StatusListener>();
  private pedalListeners = new Set<PedalListener>();
  private initialized = false;
  private status: InputStatus = {
    midiSupported: false,
    midiInReady: false,
    midiOutReady: false,
    inPortName: null,
    outPortName: null,
    inPorts: [],
    outPorts: [],
    qwerty: false,
  };

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.status.midiSupported = midiInput.supported;
    try {
      const okIn = await midiInput.init();
      const okOut = await midiOutput.init();
      this.status.midiInReady = okIn;
      this.status.midiOutReady = okOut && midiOutput.available;
      midiInput.onNote((e) => {
        if (e.type === "noteon") this.dispatch(e.note, e.velocity, true, "midi", e.time);
        else if (!e.sustained) this.dispatch(e.note, 0, false, "midi", e.time);
      });
      midiInput.onPedal((down) => {
        this.pedal = down;
        this.pedalListeners.forEach((l) => l(down));
      });
      midiInput.onPorts(() => this.refreshStatus());
    } catch {
      this.status.midiInReady = false;
    }
    this.refreshStatus();
  }

  private refreshStatus() {
    this.status = {
      ...this.status,
      inPortName: midiInput.listPorts().find((p) => p.id === midiInput.currentPortId)?.name ?? null,
      outPortName: midiOutput.portName,
      inPorts: midiInput.listPorts(),
      outPorts: midiOutput.listPorts(),
      midiOutReady: midiOutput.available,
    };
    this.statusListeners.forEach((l) => l(this.status));
  }

  getStatus(): InputStatus {
    return this.status;
  }

  selectInput(id: string) {
    midiInput.select(id);
    this.refreshStatus();
  }

  selectOutput(id: string) {
    midiOutput.select(id);
    this.refreshStatus();
  }

  startQwerty() {
    qwerty.start(
      (note, vel) => this.virtualOn(note, vel),
      (note) => this.virtualOff(note)
    );
    this.status = { ...this.status, qwerty: true };
    this.refreshStatus();
  }

  stopQwerty() {
    qwerty.stop();
    this.status = { ...this.status, qwerty: false };
    this.refreshStatus();
  }

  /** A note triggered by mouse/computer-keyboard: sound it, then dispatch. */
  virtualOn(note: number, velocity = 80) {
    sound.noteOn(note, velocity);
    this.dispatch(note, velocity, true, "virtual", performance.now());
  }

  virtualOff(note: number) {
    sound.noteOff(note);
    this.dispatch(note, 0, false, "virtual", performance.now());
  }

  private dispatch(note: number, velocity: number, on: boolean, source: "midi" | "virtual", perfTime: number) {
    if (on) this.held.add(note);
    else this.held.delete(note);
    const time = perfToAudio(perfTime) - this.latencyMs / 1000;
    const ev: NoteEvent = { note, velocity, on, source, time, perfTime };
    this.noteListeners.forEach((l) => l(ev));
    const snapshot = new Set(this.held);
    this.heldListeners.forEach((l) => l(snapshot));
  }

  onNote(l: NoteListener): () => void {
    this.noteListeners.add(l);
    return () => this.noteListeners.delete(l);
  }

  onHeld(l: HeldListener): () => void {
    this.heldListeners.add(l);
    return () => this.heldListeners.delete(l);
  }

  onPedal(l: PedalListener): () => void {
    this.pedalListeners.add(l);
    return () => this.pedalListeners.delete(l);
  }

  onStatus(l: StatusListener): () => void {
    this.statusListeners.add(l);
    return () => this.statusListeners.delete(l);
  }
}

export const inputBus = new InputBus();
