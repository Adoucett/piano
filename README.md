# Étude - piano practice for scales, reading and time

A browser-based piano practice app for scales, modes, jazz vocabulary,
sight-reading and rhythm, with **live MIDI input** (built for a Nord Grand 2,
works with any MIDI keyboard). Designed for a player with a strong ear and weak
sight-reading: every note is on an engraved staff with its letter name in a
lane underneath, and reading aids fade per staff region as you improve.

Live site: **https://adoucett.github.io/piano/** (use Chrome or Edge for MIDI).

## Features

- **Live MIDI** via Web MIDI, timestamped on the audio clock. Auto-selects the
  Nord, handles sustain (CC64) and velocity-0 note-offs. Falls back to the
  computer keyboard. Latency calibration in Settings.
- **Sound**: MIDI-direct (the Nord makes the sound) or a sampled grand piano
  in the browser, with a synth fallback. Optional bass/click backing.
- **Scale library** built on [`tonal`](https://github.com/tonaljs/tonal): major,
  the three minors, modes of major / melodic minor / harmonic minor,
  pentatonics and blues, symmetric scales and the bebop scales. Spelled
  correctly in every key, with practical respelling for altered and symmetric
  scales and jazz degree labels (b9 #9 3 #11 b13 b7).
- **Notation**: VexFlow engraving with key/time signatures, beaming, chord
  symbols, chord-tone coloring (root, 3rd, 5th, 7th, tension) and a night-sheet
  option.
- **Exercises**: 27 patterns, from scale runs, 3rds/4ths and groups through
  bebop lines, enclosures, digital patterns and guide tones over ii-V-I
  progressions, plus seeded sight-reading lines.
- **Timing**: wait mode or tempo mode against a lookahead transport, with early/
  late meters, swing ratio, a tempo ladder and three mastery tiers (Learned,
  Secure, Fluent) with spaced review.
- **Curriculum**: four parallel tracks (Scales & Modes, Reading, Rhythm & Time,
  Jazz Vocabulary), five tiers each, and a daily session (time, reading, focus,
  review).
- **Rhythm trainer**: pulse, subdivision, swing, displacement and polyrhythm
  drills scored in milliseconds.
- **Teachers**: modular style programs (Bach, Brad Mehldau, pop, bebop, gospel),
  each with lessons, vocabulary and tips. Drop-in extensible.
- **Progress**: calendar, trends, a scale x key mastery grid and reading-region
  stats. Stored locally; export/import as JSON. `?unlock=1` (or Settings)
  opens everything.

## Run locally

```bash
npm install
npm run dev        # http://127.0.0.1:5174
```

Or double-click `ScaleTrainer.command` on macOS (installs deps on first run and
opens Chrome).

```bash
npm test           # unit tests
npm run build      # production build to dist/
```

## Extending (teachers, lessons, scales, drills)

Content is data-driven and auto-discovered; most additions are a single file
you can drop in, even from the GitHub web UI. **[AGENTS.md](AGENTS.md)** has
copy-paste recipes, every valid id, and deep links. It is written so an AI
agent or a human can add a lesson in a minute. Teacher details are in
[`src/teachers/README.md`](src/teachers/README.md).

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which type-checks,
tests, builds and publishes to GitHub Pages. The Vite `base` is `/piano/` in
production.

## Tech

Vite + React + TypeScript + Tailwind, Radix primitives, `tonal` for theory,
`vexflow` for notation, `smplr` for the sampled piano, `zustand` for state.
No backend; it is a static site.
