/**
 * Small offline synth: the last-resort sound when there is no Nord and the
 * sampled piano can't load. Soft, piano-ish envelope on two partials.
 */
import { getAudioContext, getMaster } from "./context";

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface Voice {
  oscs: OscillatorNode[];
  gain: GainNode;
}

export class Synth {
  private voices = new Map<number, Voice>();
  private bus: GainNode | null = null;

  private out(): GainNode {
    if (!this.bus) {
      const ctx = getAudioContext();
      this.bus = ctx.createGain();
      this.bus.gain.value = 0.22;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3200;
      this.bus.connect(lp).connect(getMaster());
    }
    return this.bus;
  }

  noteOn(midi: number, velocity = 80, when?: number) {
    const ctx = getAudioContext();
    const t = when ?? ctx.currentTime;
    if (this.voices.has(midi)) this.noteOff(midi, t);
    const gain = ctx.createGain();
    const f = midiToFreq(midi);
    const oscs = [
      Object.assign(ctx.createOscillator(), { type: "triangle" as OscillatorType }),
      Object.assign(ctx.createOscillator(), { type: "sine" as OscillatorType }),
    ];
    oscs[0].frequency.value = f;
    oscs[1].frequency.value = f * 2;
    const partial = ctx.createGain();
    partial.gain.value = 0.18;
    oscs[0].connect(gain);
    oscs[1].connect(partial).connect(gain);
    const level = (velocity / 127) * 0.9;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(level, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(level * 0.35, t + 0.6);
    gain.gain.exponentialRampToValueAtTime(level * 0.12, t + 3);
    gain.connect(this.out());
    oscs.forEach((o) => o.start(t));
    this.voices.set(midi, { oscs, gain });
  }

  noteOff(midi: number, when?: number) {
    const v = this.voices.get(midi);
    if (!v) return;
    const ctx = getAudioContext();
    const t = when ?? ctx.currentTime;
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setTargetAtTime(0, t, 0.06);
    v.oscs.forEach((o) => o.stop(t + 0.4));
    this.voices.delete(midi);
  }

  /** Schedule a note with a fixed length (does not track as a held voice). */
  play(midi: number, start: number, duration: number, velocity = 80) {
    const ctx = getAudioContext();
    const gain = ctx.createGain();
    const osc = Object.assign(ctx.createOscillator(), { type: "triangle" as OscillatorType });
    osc.frequency.value = midiToFreq(midi);
    const level = (velocity / 127) * 0.9;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(level * 0.3, start + Math.max(0.1, duration));
    gain.gain.setTargetAtTime(0, start + duration, 0.08);
    osc.connect(gain).connect(this.out());
    osc.start(start);
    osc.stop(start + duration + 0.6);
  }

  allOff() {
    for (const n of [...this.voices.keys()]) this.noteOff(n);
  }
}

export const synth = new Synth();
