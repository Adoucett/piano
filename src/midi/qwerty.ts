/**
 * Computer-keyboard fallback input so the app is usable without a MIDI device.
 * Two rows map to a chromatic octave; z/x shift the octave.
 */

const KEY_MAP: Record<string, number> = {
  a: 0, // C
  w: 1, // C#
  s: 2, // D
  e: 3, // D#
  d: 4, // E
  f: 5, // F
  t: 6, // F#
  g: 7, // G
  y: 8, // G#
  h: 9, // A
  u: 10, // A#
  j: 11, // B
  k: 12, // C
  o: 13, // C#
  l: 14, // D
  p: 15, // D#
  ";": 16, // E
};

type Handler = (note: number, velocity: number) => void;

export class QwertyInput {
  private baseOctave = 4;
  private down = new Set<string>();
  private onDown: Handler | null = null;
  private onUp: ((note: number) => void) | null = null;
  private attached = false;

  start(onDown: Handler, onUp: (note: number) => void) {
    this.onDown = onDown;
    this.onUp = onUp;
    if (this.attached) return;
    window.addEventListener("keydown", this.handleDown);
    window.addEventListener("keyup", this.handleUp);
    this.attached = true;
  }

  stop() {
    if (!this.attached) return;
    window.removeEventListener("keydown", this.handleDown);
    window.removeEventListener("keyup", this.handleUp);
    this.attached = false;
    this.down.clear();
  }

  private noteFor(key: string): number | null {
    const offset = KEY_MAP[key];
    if (offset == null) return null;
    return (this.baseOctave + 1) * 12 + offset;
  }

  private handleDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "z") {
      this.baseOctave = Math.max(0, this.baseOctave - 1);
      return;
    }
    if (key === "x") {
      this.baseOctave = Math.min(8, this.baseOctave + 1);
      return;
    }
    if (this.down.has(key)) return;
    const note = this.noteFor(key);
    if (note == null) return;
    e.preventDefault();
    this.down.add(key);
    this.onDown?.(note, 80);
  };

  private handleUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (!this.down.has(key)) return;
    this.down.delete(key);
    const note = this.noteFor(key);
    if (note != null) this.onUp?.(note);
  };
}

export const qwerty = new QwertyInput();
