import { midiInput, type MidiPort } from "@/midi/midiInput";
import { midiOutput } from "@/midi/midiOutput";
import { qwerty } from "@/midi/qwerty";
import { synth } from "@/audio/synth";
import { useProgress } from "@/store/progress";

export interface NoteEvent {
  note: number;
  velocity: number;
  on: boolean;
  source: "midi" | "virtual";
}

type NoteListener = (e: NoteEvent) => void;
type HeldListener = (held: Set<number>) => void;
type StatusListener = (s: InputStatus) => void;

export interface InputStatus {
  midiSupported: boolean;
  midiInReady: boolean;
  midiOutReady: boolean;
  inPortName: string | null;
  inPorts: MidiPort[];
  outPorts: MidiPort[];
}

class InputBus {
  held = new Set<number>();
  private noteListeners = new Set<NoteListener>();
  private heldListeners = new Set<HeldListener>();
  private statusListeners = new Set<StatusListener>();
  private initialized = false;
  private status: InputStatus = {
    midiSupported: false,
    midiInReady: false,
    midiOutReady: false,
    inPortName: null,
    inPorts: [],
    outPorts: [],
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
        if (e.type === "noteon") this.dispatch(e.note, e.velocity, true, "midi");
        else this.dispatch(e.note, 0, false, "midi");
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
      inPortName:
        midiInput.listPorts().find((p) => p.id === midiInput.currentPortId)?.name ?? null,
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
  }

  stopQwerty() {
    qwerty.stop();
  }

  /** A note triggered by mouse/computer-keyboard: sound it, then dispatch. */
  virtualOn(note: number, velocity = 80) {
    const preferMidi = useProgress.getState().settings.preferMidiOutput;
    if (preferMidi && midiOutput.available) midiOutput.noteOn(note, velocity);
    else synth.noteOn(note, velocity);
    this.dispatch(note, velocity, true, "virtual");
  }

  virtualOff(note: number) {
    if (midiOutput.available) midiOutput.noteOff(note);
    synth.noteOff(note);
    this.dispatch(note, 0, false, "virtual");
  }

  private dispatch(note: number, velocity: number, on: boolean, source: "midi" | "virtual") {
    if (on) this.held.add(note);
    else this.held.delete(note);
    const ev: NoteEvent = { note, velocity, on, source };
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

  onStatus(l: StatusListener): () => void {
    this.statusListeners.add(l);
    return () => this.statusListeners.delete(l);
  }
}

export const inputBus = new InputBus();
