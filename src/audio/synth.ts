/**
 * Tiny Web Audio synth. Used to hear notes when the Nord isn't the output,
 * and to preview scales in the library. Not meant to sound great.
 */

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Map<number, { osc: OscillatorNode; gain: GainNode }>();

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  noteOn(midi: number, velocity = 80) {
    const ctx = this.ensure();
    if (this.voices.has(midi)) this.noteOff(midi);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = midiToFreq(midi);
    const level = (velocity / 127) * 0.9;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.01);
    osc.connect(gain).connect(this.master!);
    osc.start();
    this.voices.set(midi, { osc, gain });
  }

  noteOff(midi: number) {
    const v = this.voices.get(midi);
    if (!v || !this.ctx) return;
    const now = this.ctx.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0, now + 0.08);
    v.osc.stop(now + 0.1);
    this.voices.delete(midi);
  }

  /** Play a sequence of midi notes with a fixed note length. */
  async play(notes: number[], noteMs = 300, velocity = 80): Promise<void> {
    for (const n of notes) {
      this.noteOn(n, velocity);
      await new Promise((r) => setTimeout(r, noteMs));
      this.noteOff(n);
    }
  }

  allOff() {
    for (const n of [...this.voices.keys()]) this.noteOff(n);
  }
}

export const synth = new Synth();
