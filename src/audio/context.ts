/**
 * The one shared AudioContext. Every clock in the app (metronome, backing,
 * input timestamps, scoring) is expressed in this context's time, in seconds.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function getMaster(): GainNode {
  getAudioContext();
  return master!;
}

/** Current audio-clock time in seconds. */
export function audioNow(): number {
  return getAudioContext().currentTime;
}

/**
 * Map a performance.now() timestamp (e.g. a MIDIMessageEvent.timeStamp) onto
 * the audio clock, using the context's output timestamp pairing.
 */
export function perfToAudio(perfMs: number): number {
  const c = getAudioContext();
  const ts = c.getOutputTimestamp?.();
  if (ts && ts.contextTime != null && ts.performanceTime != null && ts.performanceTime > 0) {
    return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
  }
  // Fallback: assume currentTime corresponds to now.
  return c.currentTime + (perfMs - performance.now()) / 1000;
}

/** Inverse of perfToAudio: audio-clock seconds → performance.now() ms (for MIDI send timestamps). */
export function audioToPerf(audioTime: number): number {
  const c = getAudioContext();
  const ts = c.getOutputTimestamp?.();
  if (ts && ts.contextTime != null && ts.performanceTime != null && ts.performanceTime > 0) {
    return ts.performanceTime + (audioTime - ts.contextTime) * 1000;
  }
  return performance.now() + (audioTime - c.currentTime) * 1000;
}

/** Resume audio on the first user gesture (browsers block autoplay). */
export function unlockAudioOnGesture() {
  const unlock = () => {
    getAudioContext();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}
