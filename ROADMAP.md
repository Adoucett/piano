# Roadmap

Status: the premium UI/UX and curriculum overhaul has shipped to
https://adoucett.github.io/piano/. That includes the Graphite & Ivory design
system, the sidebar shell with a command palette, engraved notation with
chord-tone coloring, the sampled piano, audio-clock timing, mastery tiers, the
four-track curriculum, the rhythm trainer and the progress views. It was
reviewed by a visual-design panel and a music-pedagogy panel.

## Next

- **Mobile/tablet layout**: the practice screen is desktop-first; a portrait
  iPad layout would help on a music stand.
- **Reading**: bass-clef sight lines and two-hand grand-staff lines; rhythmic
  reading (tap the notated rhythm) at higher tiers.
- **Vocabulary**: more ii-V-I lines (Bird blues, tritone subs, minor
  ii-V-i with melodic-minor colors); a transcription-style "lick of the week".
- **Comping**: shell and rootless voicing drills played in time over the
  backing, not only read.
- **Teachers**: more lessons per teacher, each tagged with `trackId`,
  `difficulty` and `estMinutes`.
- **Practice history**: resume the last session; per-lesson completion.

## Smaller follow-ups

- Reading drills: a larger chord view at small window sizes.
- Hide the sidebar's sound status once the piano has loaded.
- Optional metronome accent patterns (clave, 2 & 4 only, bar 1 only).

## How things are wired

See `AGENTS.md` for the architecture map, valid ids, deep links and
content-extension recipes, and `src/teachers/README.md` for teachers. Pushing to
`main` builds, tests and deploys via `.github/workflows/deploy.yml`.
