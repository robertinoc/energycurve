# Product Feature 03 — DJ-familiar tracklist & live set curve

## Why this exists

EnergyCurve's users are DJs. They already live inside Rekordbox / Traktor / Serato
every day. If the app *looks and reads like the tools they know*, the learning
curve collapses and the product feels trustworthy on first open. This feature
makes the playlist screen speak a DJ's visual language while keeping EnergyCurve's
own thing — the **energy curve of the whole set** — as the hero.

The target UI was designed with the user (a DJ/producer) across four interactive
mockup iterations before any code was written.

## What we borrowed from Rekordbox — and what stays ours

Rekordbox has two worlds on screen: the **decks/mixer/jogs** (a *player*) and the
**library** (browse + organize + read tracks). EnergyCurve is **not a player** —
it analyzes and plans sets — so we borrow only from the **library** side. Copying
decks would mean fake controls that do nothing.

**Borrowed (library conventions):**
- A dense, columnar track table (the thing a DJ recognizes instantly).
- Monospace, right-aligned BPM / Key / Energy / Time.
- A **Key** column — in both **musical** (as Rekordbox shows it) and **Camelot**.
- Customizable columns (like Rekordbox's column chooser).
- A footer stat line (Rekordbox: "38 Tracks, 2h 42m, …").

**Ours (the differentiator):**
- The **set energy curve as the hero.** Rekordbox's waveform is the signature of a
  single *track*; EnergyCurve's curve is the signature of the whole *set*.
- A per-track **energy bar** in the table (height/number/color = the track's real
  energy). We do not fake audio waveforms — we don't have the audio, and a
  decorative waveform would imply data we don't have.

## Product decisions (frozen)

1. **Detail = workbench, Analyze = verdict.** The playlist *detail* page shows the
   live curve + table and is **visual only — no score, no issues**. The full
   scored report (score, sub-scores, issues, recommendations, suggested reorder)
   stays on the separate **Analyze** page.
2. **Reordering is a preview until saved.** Sorting a column or dragging a row is a
   preview; nothing persists until the user hits **Save order** (with Undo /
   Discard + a confirmation toast). *(Reordering lands in a later PR — see below.)*
3. **Camelot is shown neutral (no color).** Color-coding keys by the harmonic
   wheel was rejected: sorting by Camelot would line the colors up and falsely
   imply "sorted by key = a harmonically optimal set", which isn't true.
4. **Columns are customizable.** Energy / Artist / Title / BPM / Camelot / Key are
   always on; **Genre / Time / Comment** are optional and remembered per browser.
5. **Genre note is collapsed by default,** neutral gray (not a warning color), with
   a per-genre coaching tip.
6. **No decks / mixer / jogs / hot-cues.** Out of scope by design.

## The target curve

The dashed "target" overlay is the ideal energy arc for the playlist's
`(genre, context)`, from the existing pure engine function
`buildTargetCurve(trackCount, context, genre)` (`lib/engine/target-curve.ts`). It
only renders when both genre and context are set. This is the same target the
scoring engine fits sets against — the detail view just visualizes it without
scoring.

## How the pieces fit (implementation)

Data reuse — nothing here re-implements the engine:
- `resolveTrackEnergies(tracks, context, genre)` (`lib/engine/energy-score.ts`) →
  per-track score + source (manual > BPM > estimated).
- `buildTargetCurve(...)` (`lib/engine/target-curve.ts`) → dashed overlay.
- `curve-geometry.ts` primitives (`mapValuesToCurvePoints` with a `{min:1,max:10}`
  domain, `buildSmoothCurvePath`, `buildCurveAreaPath`) → the SVG curve.
- `energy-colors.ts` → the bar/dot colors.
- `lib/music/camelot.ts` → musical key → Camelot (neutral, no color).
- `lib/engine/genre-tips.ts` → the collapsible note's coaching copy, derived from
  the frozen `GENRE_BPM_PROFILES_V2` + `GENRE_CURVE_CHARACTER_V2` constants.

Components (all under `components/playlists/`):
- `playlist-workspace.tsx` — client parent. Computes energies + target, holds the
  hovered-row state, renders the curve + genre note + table + footer stat line.
- `set-curve.tsx` — the compact hero curve (your set + dashed target + hovered
  point highlight).
- `genre-note.tsx` — collapsible "Main genre detected" strip.
- `track-table.tsx` — the dense table: energy bar, dual Key columns, optional
  columns (via a Columns menu persisted to `localStorage`), row hover → curve
  highlight, and add / edit / remove / move (reusing the existing track actions).

Per-track metadata (`musical_key`, `genre`, `comment`, `duration_seconds`) is
captured on import and persisted — see migration `0008` and the parsers.

## What is / isn't done, by PR

- **PR1 — metadata foundation** (done): migration `0008`, parsers capture
  duration + comment, service persists the four fields, `lib/music/camelot.ts`.
- **PR2 — this UI** (done): the dense table + live curve + genre note + columns,
  replacing the old card-list track editor. Reordering is still via the existing
  up/down move buttons here.
- **PR3 — reorder & save** (planned): column sort + drag-to-reorder that both
  drive the curve, unified into the Save / Undo / Discard preview flow + toast,
  persisted via a new bulk `reorderTracks` service function.
- **PR4 — export** (done): "Export…" dropdown (For Rekordbox / Traktor /
  Serato-soon / CSV / TXT) + native exports that round-trip key/genre/comment/
  duration (Rekordbox `Tonality/Genre/Comments/TotalTime`, Traktor `INFO
  KEY/GENRE/COMMENT/PLAYTIME`), and CSV gains Key/Genre/Time columns.
- **PR5 — sidebar playlist tree** (planned): list the user's sets under the
  Playlists nav item.

## Non-goals / follow-ups

- No harmonic color-coding of Camelot (decision 3).
- Detail curve carries no score/issues (decision 1) — those stay on Analyze.
- New UI strings are English in v1; Spanish parity mirrors the existing analysis
  EN/ES pattern and is a follow-up.
- Column preferences are per-browser (`localStorage`); server-side prefs are a
  possible future upgrade.
