/** Web MIDI output, for playing demos and backing through the Nord. */

import type { MidiPort } from "./midiInput";

export class MidiOutput {
  private access: MIDIAccess | null = null;
  private current: MIDIOutput | null = null;

  get supported(): boolean {
    return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
  }

  async init(): Promise<boolean> {
    if (!this.supported) return false;
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this.autoSelect();
    return true;
  }

  listPorts(): MidiPort[] {
    if (!this.access) return [];
    return [...this.access.outputs.values()].map((o) => ({
      id: o.id,
      name: o.name ?? "MIDI output",
    }));
  }

  private autoSelect() {
    if (!this.access) return;
    const outs = [...this.access.outputs.values()];
    const nord = outs.find((o) => /nord/i.test(o.name ?? ""));
    this.current = nord ?? outs[0] ?? null;
  }

  select(id: string) {
    if (!this.access) return;
    this.current = this.access.outputs.get(id) ?? null;
  }

  get available(): boolean {
    return this.current != null;
  }

  get portName(): string | null {
    return this.current?.name ?? null;
  }

  /** `channel` is 1-based. `at` is a performance.now() timestamp for scheduled sends. */
  noteOn(note: number, velocity = 80, channel = 1, at?: number) {
    this.current?.send([0x90 | ((channel - 1) & 0x0f), note & 0x7f, velocity & 0x7f], at);
  }

  noteOff(note: number, channel = 1, at?: number) {
    this.current?.send([0x80 | ((channel - 1) & 0x0f), note & 0x7f, 0], at);
  }

  allOff(channel = 1) {
    if (!this.current) return;
    const status = 0xb0 | ((channel - 1) & 0x0f);
    this.current.send([status, 123, 0]); // All Notes Off
    for (let n = 0; n < 128; n++) this.current.send([0x80 | ((channel - 1) & 0x0f), n, 0]);
  }
}

export const midiOutput = new MidiOutput();
