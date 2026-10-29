# Roadmap

Status: core app is functional and deployed to https://adoucett.github.io/piano/
(live MIDI, scale library, 10-level curriculum, teachers, progress, dashboard).

## Next session: premium UI/UX overhaul

Goal: make it feel like a polished commercial piano-academy product (think
Pianote / Flowkey / online academies), not a utilitarian tool. Functionality is
proven; this pass is about visual design, readability, and flow.

### 1. Visual design system
- Establish a real design language: refined typography scale, spacing, elevation,
  a considered color palette (dark + light themes), motion/transitions.
- Replace the current flat cards/segmented controls with polished components.
- Make the brand/landing/header feel intentional.

### 2. Notation quality (the staff)
- Upgrade the staff rendering to look premium: better sizing, spacing, margins,
  crisp noteheads, elegant clefs, measure framing, a smooth note "cursor".
- Refine the letter/color coding so it reads instantly and looks tasteful
  (current boomwhacker palette is functional but could be classier / tunable).
- Consider animated note highlighting and a smoother scrolling "now playing"
  window. Evaluate VexFlow styling vs. a custom SVG renderer for full control.

### 3. Keyboard visualization
- Make the 88-key keyboard look like a real premium piano (gradients, shadows,
  pressed-key animation, finger-number hints, cleaner labels).

### 4. Audio modes (requested)
- Keep MIDI-direct (Nord makes the sound) as the default.
- Add an explicit **fallback audio mode**: a nicer built-in instrument than the
  current basic triangle synth - e.g. a sampled piano (soundfont / web-audio
  samples) so practice sounds good without the Nord. Surface a clear toggle.

### 5. "Unlock everything" mode (requested)
- A developer/testing switch that bypasses curriculum unlock gating so all
  levels/units are immediately available. Add to Settings (and/or a URL flag
  like `?unlock=1`). Implementation hook: `isLevelUnlocked()` in
  `src/store/progress.ts` - short-circuit when the flag is on.

### 6. Lesson structure polish
- Richer lesson flow: intro screen, step-by-step guidance, per-step instruction
  cards, nicer run summaries and celebrations, progress within a lesson.
- Consider lesson difficulty tags, estimated time, and better teacher lesson
  pages. Expand teacher lesson content.

## Smaller follow-ups
- Code-split the bundle (currently ~1.25MB; vexflow + tonal dominate).
- Light theme.
- Mobile/tablet layout pass.
- Optional: persist "last practiced" and resume.

## How things are wired (for whoever picks this up)
See `AGENTS.md` for the architecture map and content-extension recipes, and
`src/teachers/README.md` for adding teachers/lessons. The app is a static
Vite+React+TS site; pushing to `main` auto-builds/tests/deploys via
`.github/workflows/deploy.yml`.
