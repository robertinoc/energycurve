# Product Feature 02 — Set Analysis Engine & Results

## What Shipped

The full analysis pipeline on top of manual playlist input: per-track energy
resolution, issue detection, set scoring, localized recommendations, a
reorder suggestion, and the results screen at
`/dashboard/playlists/[id]/analysis`.

All scoring rules come from the frozen constants in
`lib/product/strategy.ts`. The engines are pure modules under `lib/engine/`
with no I/O — services glue them to Supabase data.

## Authoritative v1 Interpretations

The frozen strategy left several details open. These resolutions are the
authoritative v1 reading; change them only with a deliberate product
decision:

1. **BPM band interpolation (A1)** — a BPM maps to a score by linear
   interpolation across its band's BPM range onto its score range, rounded
   to one decimal. The open-ended first and last bands are anchored at
   105 and 150 BPM (`OPEN_BAND_ANCHORS`): below 105 clamps to 3.0, above
   150 clamps to 10.0. A BPM falling in the tiny gaps between bands
   (e.g. 122.005) rounds into the lower band.
2. **Missing BPM fallback (A2)** — a track with no BPM and no manual score
   gets a position-based estimate: a linear ramp from the context's
   `expectedEnergyMin` to `expectedEnergyMax` across the playlist
   (single track → midpoint). Playlists without a context ramp 4 → 8.
3. **Score precedence (A3)** — manual `energy_score` > BPM-derived >
   position-estimated. Every resolved energy carries a `source` tag the UI
   shows (`manual` / `bpm` / `estimated`).
4. **Weak ending vs closing overlap (A4)** — the weak-ending threshold is
   `max(5, context.expectedEnergyMin)`: opening 5, main 6, closing 7. A weak
   ending scores as one context error (−2) and is deduped with the final
   track's out-of-range violation, so the last track costs at most one −2.
   The issue always appears in the list even when deduped (as a heads-up).
5. **Spikes (A5)** — upward jumps ≥3 are a separate issue type with no
   standalone penalty; for genres with `favorsGradualProgression` (house,
   progressive) each spike counts as one genre error (−1). Downward drops
   ≥3 are always reported but only cost −1 when the genre's
   `penalizeAbruptDrop` is true.
6. **Early peak (A6)** — flagged when the set's maximum energy (≥7) first
   occurs within the first third of the tracklist (n ≥ 4). Penalized as one
   genre error (−1) only when `penalizeEarlyPeak` is true (progressive);
   informational otherwise.
7. **No progression (A7)** — when the average energy of the last third does
   not exceed the first third, an informational hint is emitted (no score
   impact — `SET_SCORE_RULES_V1` has no such penalty).
8. **Context error granularity (A8)** — every track outside the context's
   expected band is one context error (−2 each). A track contributes at
   most one context error; a disallowed high peak (score ≥8 where
   `allowHighPeaks` is false) only relabels that same violation.
9. **Per-context comparison (A9)** — the same curve is scored under all
   three contexts; the results screen surfaces the best-fit context when it
   differs from the playlist's own.
10. **Paste parser (A10, shipped in feature 01)** — explicit format selector
    with live preview instead of auto-detection; trailing BPM suffixes are
    extracted, bare trailing numbers are not.
11. **Reorder suggestion (A11)** — stable ascending sort by resolved
    energy. The suggestion is re-analyzed and only shown when its score
    strictly beats the original, with both scores side by side.

12. **Set duration hint (A12, added post-MVP)** — informational only:
    sets shorter than 45 minutes emit `set_too_short`, longer than 150
    minutes emit `set_too_long` (`SET_DURATION_GUIDELINE_MINUTES` in
    `lib/engine/analysis.ts`). No score impact — `SET_SCORE_RULES_V1` has
    no duration penalty.

## Key Files

- `lib/engine/energy-score.ts` — BPM → energy, fallbacks, precedence
- `lib/engine/analysis.ts` — detectors + set score + per-context scores
- `lib/engine/recommendations.ts` — localized copy mapping + reorder
- `lib/content/analysis-copy.ts` — EN/ES issue templates
- `services/analysis-service.ts` — data glue + not-analyzable guards
- `app/dashboard/playlists/[id]/analysis/page.tsx` — results screen
- `lib/charts/curve-geometry.ts` — domain-parameterized curve geometry
  (shared by the landing demo and the real analysis chart)

## Deliberate v1 Boundaries

- Analysis is computed on request; nothing is persisted. A persistence layer
  (for the "playlists analyzed" KPI and history) is a follow-up.
- Recommendations are template-based, not AI-generated — aligned with the
  "explainable over magical" principle. An optional AI synthesis layer can
  be added later without changing the engine contract.
- The dashboard locale is EN for now; all engine output is localized
  (EN/ES) and ready for a locale toggle.
