# Jazz Scale Trainer

A browser-based piano practice app for learning scales, modes, and jazz lines
with **live MIDI input** (built for a Nord Grand 2, works with any MIDI
keyboard). Designed for a player with a strong ear but weak sight-reading: every
note is shown on the staff *and* labeled by letter name, with reading aids that
fade as you improve.

Live site: **https://adoucett.github.io/piano/** (use Chrome or Edge for MIDI).

## Features

- **Live MIDI** via the Web MIDI API. Auto-selects the Nord, handles the sustain
  pedal (CC64) and note-on velocity 0. Falls back to the computer keyboard or a
  built-in synth when no device is present.
- **Complete scale library** built on [`tonal`](https://github.com/tonaljs/tonal):
  major, all three minors, the modes of major / melodic minor / harmonic minor,
  pentatonics and blues, symmetric scales, and the bebop scales - correctly
  spelled in every key (Eb minor is `Eb Gb Bb Db`, never `D# F# A# C#`).
- **Reading-first UI**: VexFlow staff with color-coded, letter-labeled noteheads
  and a matching 88-key keyboard. Four reading-aid levels (letters -> next-note
  only -> delayed -> none) that the app suggests stepping down as your accuracy
  climbs.
- **Exercise generator**: up/down, 3rds, 4ths, groups of 3/4, diatonic triads
  and 7ths, and bebop enclosures - applicable to any scale in any key.
- **10-level curriculum** from staff-reading basics up to advanced jazz lines,
  with mastery-based unlocking.
- **Teachers**: modular, data-driven coaches (Bach, Brad Mehldau, a pop writer,
  a bebop player, a gospel player) each with a bio, scalar vocabulary and a set
  of lessons. Fully extensible - see [`src/teachers/README.md`](src/teachers/README.md).
- **Progress tracking**: per scale/key/pattern mastery, a weakest-first review
  queue, a practice streak, and a mastery heatmap. Stored locally; export/import
  as JSON.

## Run locally

```bash
npm install
npm run dev        # http://127.0.0.1:5174
```

Or double-click `ScaleTrainer.command` on macOS (installs deps on first run and
opens Chrome).

```bash
npm test           # unit tests (theory spelling, patterns, matcher, teachers)
npm run build      # production build to dist/
```

## Extending (add teachers, lessons, scales)

Content is data-driven and auto-discovered - most additions are a single file you
can drop in (even from the GitHub web UI). See **[AGENTS.md](AGENTS.md)** for
copy-paste recipes and the list of valid scale/pattern ids; it is written so an
AI agent or a human can add a lesson in under a minute. Teacher-specific details
are in [`src/teachers/README.md`](src/teachers/README.md).

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. The Vite `base` is `/piano/` in production.

## Tech

Vite + React + TypeScript + Tailwind, `tonal` for music theory, `vexflow` for
notation, `zustand` for state. No backend - it is a static site.
