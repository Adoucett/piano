/**
 * Backing sounds: woodblock click, hi-hat chick, a soft pad (drone), and a
 * walking bass. All are scheduled on the shared audio clock. The pad and bass
 * can optionally go to the Nord on MIDI channel 2.
 */
import { getAudioContext, getMaster, audioToPerf } from "./context";
import { midiOutput } from "@/midi/midiOutput";

let noiseBuf: AudioBuffer | null = null;
function noise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

let bus: GainNode | null = null;
function out(): GainNode {
  if (!bus) {
    const ctx = getAudioContext();
    bus = ctx.createGain();
    bus.gain.value = 0.8;
    bus.connect(getMaster());
  }
  return bus;
}

export function setBackingVolume(v: number) {
  out().gain.value = v;
}

/** A woodblock: pitched body + filtered noise transient. Accent = higher, louder. */
export function woodblock(time: number, accent = false, level = 1) {
  const ctx = getAudioContext();
  const g = ctx.createGain();
  const peak = (accent ? 0.55 : 0.36) * level;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(peak, time + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(accent ? 1250 : 950, time);
  osc.frequency.exponentialRampToValueAtTime(accent ? 1100 : 820, time + 0.06);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = accent ? 2600 : 2000;
  bp.Q.value = 4;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.25 * level, time);
  ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.012);
  osc.connect(g);
  src.connect(bp).connect(ng).connect(g);
  g.connect(out());
  osc.start(time);
  osc.stop(time + 0.09);
  src.start(time);
  src.stop(time + 0.03);
}

/** Closed hi-hat "chick" (jazz 2 & 4). */
export function hat(time: number, level = 1) {
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(0.18 * level, time + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  src.connect(hp).connect(g).connect(out());
  src.start(time);
  src.stop(time + 0.08);
}

/** Ride cymbal ping. */
export function ride(time: number, level = 1) {
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 5200;
  bp.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(0.07 * level, time + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
  src.connect(bp).connect(g).connect(out());
  src.start(time);
  src.stop(time + 0.5);
}

function freq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface BackingRouting {
  /** Send pad + bass to the Nord on channel 2 instead of the browser. */
  toNord: boolean;
}

let routing: BackingRouting = { toNord: false };
export function setBackingRouting(r: BackingRouting) {
  routing = r;
}

const NORD_CH = 2;

/** A soft pad chord from `start` to `end` (seconds). */
export function pad(midis: number[], start: number, end: number, level = 1) {
  if (routing.toNord && midiOutput.available) {
    midis.forEach((m) => {
      midiOutput.noteOn(m, 46, NORD_CH, audioToPerf(start));
      midiOutput.noteOff(m, NORD_CH, audioToPerf(end));
    });
    return;
  }
  const ctx = getAudioContext();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  lp.Q.value = 0.3;
  const g = ctx.createGain();
  const peak = 0.05 * level;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(peak, start + 0.35);
  g.gain.setValueAtTime(peak, Math.max(start + 0.36, end - 0.25));
  g.gain.linearRampToValueAtTime(0.0001, end + 0.1);
  lp.connect(g).connect(out());
  for (const m of midis) {
    for (const det of [-6, 5]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = freq(m);
      o.detune.value = det;
      o.connect(lp);
      o.start(start);
      o.stop(end + 0.2);
    }
  }
}

/** A plucked upright-bass-ish note. */
export function bass(midi: number, start: number, duration: number, level = 1) {
  if (routing.toNord && midiOutput.available) {
    midiOutput.noteOn(midi, 70, NORD_CH, audioToPerf(start));
    midiOutput.noteOff(midi, NORD_CH, audioToPerf(start + duration * 0.9));
    return;
  }
  const ctx = getAudioContext();
  const o = ctx.createOscillator();
  o.type = "triangle";
  o.frequency.value = freq(midi);
  const o2 = ctx.createOscillator();
  o2.type = "sine";
  o2.frequency.value = freq(midi);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1400, start);
  lp.frequency.exponentialRampToValueAtTime(380, start + 0.18);
  const g = ctx.createGain();
  const peak = 0.34 * level;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  g.gain.exponentialRampToValueAtTime(peak * 0.4, start + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.98);
  o.connect(lp);
  o2.connect(lp);
  lp.connect(g).connect(out());
  o.start(start);
  o2.start(start);
  o.stop(start + duration);
  o2.stop(start + duration);
}
