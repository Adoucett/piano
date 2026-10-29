/** Web MIDI output, for playing exercise demos back through the Nord. */

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

  noteOn(note: number, velocity = 80) {
    this.current?.send([0x90, note & 0x7f, velocity & 0x7f]);
  }

  noteOff(note: number) {
    this.current?.send([0x80, note & 0x7f, 0]);
  }

  allOff() {
    if (!this.current) return;
    for (let n = 0; n < 128; n++) this.current.send([0x80, n, 0]);
  }
}

export const midiOutput = new MidiOutput();
