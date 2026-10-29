/** A simple Web Audio metronome with a scheduler-driven click. */

type BeatListener = (beatIndex: number, time: number) => void;

export class Metronome {
  private ctx: AudioContext | null = null;
  private running = false;
  private bpm = 80;
  private beatsPerBar = 4;
  private nextNoteTime = 0;
  private beatIndex = 0;
  private timer: number | null = null;
  private listeners = new Set<BeatListener>();
  private readonly lookahead = 25; // ms
  private readonly scheduleAhead = 0.1; // s

  setBpm(bpm: number) {
    this.bpm = Math.max(20, Math.min(300, bpm));
  }

  getBpm(): number {
    return this.bpm;
  }

  setBeatsPerBar(n: number) {
    this.beatsPerBar = n;
  }

  get isRunning(): boolean {
    return this.running;
  }

  onBeat(l: BeatListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  start() {
    if (this.running) return;
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.running = true;
    this.beatIndex = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduler();
  }

  stop() {
    this.running = false;
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Seconds per beat. */
  get secondsPerBeat(): number {
    return 60 / this.bpm;
  }

  private scheduler = () => {
    if (!this.running || !this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAhead) {
      this.click(this.nextNoteTime, this.beatIndex % this.beatsPerBar === 0);
      this.listeners.forEach((l) => l(this.beatIndex, this.nextNoteTime));
      this.nextNoteTime += this.secondsPerBeat;
      this.beatIndex += 1;
    }
    this.timer = window.setTimeout(this.scheduler, this.lookahead);
  };

  private click(time: number, accent: boolean) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(accent ? 0.5 : 0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }
}

export const metronome = new Metronome();
