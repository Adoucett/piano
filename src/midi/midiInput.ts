/**
 * Web MIDI input. Auto-selects a Nord if present, handles note-on with
 * velocity 0 as note-off, and tracks the sustain pedal (CC64).
 */

export interface MidiNoteEvent {
  type: "noteon" | "noteoff";
  note: number; // MIDI note number
  velocity: number; // 0..127
  time: number; // performance.now()
  sustained?: boolean; // held by pedal after physical release
}

export interface MidiPort {
  id: string;
  name: string;
}

type NoteListener = (e: MidiNoteEvent) => void;
type PedalListener = (down: boolean) => void;
type PortsListener = (ports: MidiPort[]) => void;

export class MidiInput {
  private access: MIDIAccess | null = null;
  private current: MIDIInput | null = null;
  private noteListeners = new Set<NoteListener>();
  private pedalListeners = new Set<PedalListener>();
  private portsListeners = new Set<PortsListener>();
  private pedalDown = false;
  /** Notes physically released but held by the sustain pedal. */
  private pendingRelease = new Set<number>();

  get supported(): boolean {
    return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
  }

  async init(): Promise<boolean> {
    if (!this.supported) return false;
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this.access.onstatechange = () => this.refreshPorts();
    this.refreshPorts();
    this.autoSelect();
    return true;
  }

  listPorts(): MidiPort[] {
    if (!this.access) return [];
    return [...this.access.inputs.values()].map((i) => ({
      id: i.id,
      name: i.name ?? "MIDI input",
    }));
  }

  private refreshPorts() {
    const ports = this.listPorts();
    this.portsListeners.forEach((l) => l(ports));
    // If our current port vanished, try to re-select.
    if (this.current && !ports.find((p) => p.id === this.current!.id)) {
      this.current = null;
      this.autoSelect();
    }
  }

  private autoSelect() {
    if (!this.access) return;
    const inputs = [...this.access.inputs.values()];
    const nord = inputs.find((i) => /nord/i.test(i.name ?? ""));
    const pick = nord ?? inputs[0];
    if (pick) this.select(pick.id);
  }

  select(id: string) {
    if (!this.access) return;
    if (this.current) this.current.onmidimessage = null;
    const port = this.access.inputs.get(id) ?? null;
    this.current = port;
    if (port) port.onmidimessage = (e) => this.onMessage(e);
  }

  get currentPortId(): string | null {
    return this.current?.id ?? null;
  }

  private onMessage(e: MIDIMessageEvent) {
    const data = e.data;
    if (!data || data.length < 2) return;
    const status = data[0] & 0xf0;
    const d1 = data[1];
    const d2 = data[2] ?? 0;
    const time = performance.now();

    if (status === 0x90 && d2 > 0) {
      // Note on
      this.pendingRelease.delete(d1);
      this.emitNote({ type: "noteon", note: d1, velocity: d2, time });
    } else if (status === 0x80 || (status === 0x90 && d2 === 0)) {
      // Note off (incl. note-on velocity 0)
      if (this.pedalDown) {
        this.pendingRelease.add(d1);
        this.emitNote({ type: "noteoff", note: d1, velocity: 0, time, sustained: true });
      } else {
        this.emitNote({ type: "noteoff", note: d1, velocity: 0, time });
      }
    } else if (status === 0xb0 && d1 === 64) {
      // Sustain pedal (CC64)
      const down = d2 >= 64;
      this.pedalDown = down;
      this.pedalListeners.forEach((l) => l(down));
      if (!down) {
        // Release everything the pedal was holding.
        for (const n of this.pendingRelease) {
          this.emitNote({ type: "noteoff", note: n, velocity: 0, time });
        }
        this.pendingRelease.clear();
      }
    }
  }

  private emitNote(ev: MidiNoteEvent) {
    this.noteListeners.forEach((l) => l(ev));
  }

  onNote(l: NoteListener): () => void {
    this.noteListeners.add(l);
    return () => this.noteListeners.delete(l);
  }

  onPedal(l: PedalListener): () => void {
    this.pedalListeners.add(l);
    return () => this.pedalListeners.delete(l);
  }

  onPorts(l: PortsListener): () => void {
    this.portsListeners.add(l);
    return () => this.portsListeners.delete(l);
  }
}

export const midiInput = new MidiInput();
