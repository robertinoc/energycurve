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

## Engine V2 — Target-Curve Model

V2 replaced V1's penalty counting: the score now measures how the set
compares to an **ideal energy curve** for its context and genre, with
proportional penalties and genre-aware tolerances. The V1 sections above
stay as the historical spec; V1 constants remain frozen in
`lib/product/strategy.ts` next to the `*_V2` blocks. Snapshots carry
`analyses.algorithm_version` (migration 0006) and the engine version is part
of the dedupe hash, so V1 and V2 scores are never conflated.

Why V1 was replaced: binary thresholds cliff-edged (Δ2.9 free, Δ3.0
penalized), flat zones required exact equality, per-issue subtraction made
long sets score systematically worse (real playlists landed at 1–3/10), each
out-of-range track cost a flat −2, good craft (post-peak breathers, peak
plateaus) was punished, and the ascending-sort reorder was musically wrong
for main/closing sets and rarely improved anything.

### Authoritative v2 Interpretations

1. **Genre-relative BPM → energy (B1)** — each genre maps its own BPM band
   onto energy 3→9 (`GENRE_BPM_PROFILES_V2`); outside the band the score
   keeps sliding toward 1/10 across a 10-BPM ramp, then clamps. No genre →
   V1 universal bands (legacy playlists keep their scores). Unknown genres
   fall back to `DEFAULT_GENRE_BPM_PROFILE`.
2. **Target curve (B2)** — `buildTargetCurve(n, context, genre)` samples a
   continuous ideal shape at the set's exact track count (length-invariant).
   Opening ramps 3→6 (slow-build genres 3→5.5); main ramps to a peak at
   ~70% of the set and holds (driving genres 7→9.5 with an earlier climax;
   slow-build genres climax at 80%); closing ramps 7→9 (driving 9.5) and
   soft-landing genres may descend ~1 point over the final 10%.
3. **Shape fit sub-score (B3)** — deviations within ±0.75 of the target are
   free (waves are craft); only the excess enters an RMSE that costs 3.5
   points per unit. A set whose maximum never gets within 0.5 of the
   target's maximum additionally loses 1.5 points per missing energy point
   (`no_climax`). An early peak is flagged when the set maxes out in the
   first third at ≥ target + 1.5; it costs points only through the shape
   deviation it causes (penalty-severity for slow-build genres).
4. **Transition tolerance (B4)** — per-genre rise/drop comfort
   (`GENRE_TRANSITION_TOLERANCE_V2`); only the excess beyond tolerance is
   penalized at 1.5 points per energy point, capped at 4 per transition.
5. **Flat zones (B5)** — a run of 3+ tracks whose energy range stays within
   0.3 (no more exact-equality blind spot). Penalty 1 + 0.5 per extra
   track, capped at 4. A zone is exempt when the target is equally flat
   there and the set rides it within the shape tolerance — a sustained peak
   plateau is craft, a mid-energy stall is not.
6. **Worst-first decay (B6)** — dynamics problems (transitions + flat zones)
   are ranked; each successive one is discounted by 0.6, so a long set with
   one cliff is judged by the cliff, not by its track count.
7. **Breathers (B7)** — a drop of 2–3 points landing ≥5.5, right after 2+
   tracks at ≥8, carries no penalty and surfaces as a positive
   `good_breather` issue. Breathers are excluded from `too_many_rests`.
8. **Ending quality sub-score (B8)** — weighted distance (last track ⅔,
   second-to-last ⅓, tolerance 0.5) from the target's landing, at 2.5
   points per energy point. Replaces the binary weak-ending; `weak_ending`
   is surfaced when the sub-score drops below 8.5 and the set lands low.
9. **Final blend (B9)** — `score = 0.50·shape + 0.35·dynamics +
   0.15·ending`, clamped to [1, 10], one decimal. Issues are the
   explanation layer: each penalty issue carries its attributed final-score
   cost (`penaltyApplied`), derived from its sub-score contribution.
10. **Per-context comparison (B10)** — unchanged from A9, but each context
    is scored against its own regenerated target curve.
11. **Reorder optimizer (B11)** — replaces the ascending sort: exhaustive
    search up to 8 tracks, greedy target-slot seed + deterministic 2-opt
    beyond. Suggested only when it beats the original by ≥ 0.5
    (`REORDER_MIN_IMPROVEMENT_V2`).
12. **Versioning (B12)** — `CURRENT_ANALYSIS_ALGORITHM_VERSION` in
    `strategy.ts` is the single source of truth; it is written to every
    snapshot and mixed into `computeAnalysisInputHash`, so re-analyzing
    after an engine bump records a fresh history row.

### V3 additions (B13–B16)

Driven by the first real production import (21 tracks at 155–160 BPM, all
energies clamped to 10, genre mis-detected as techno, score 5.5 for
artifacts): garbage-in fixes plus an explicit confidence layer.

13. **Energy confidence (B13)** — BPM alone cannot discriminate energy
    inside a homogeneous-BPM set, so the engine says "I don't know" instead
    of punishing its own missing signal (`ENERGY_CONFIDENCE_RULES_V3`).
    `analyzePlaylist` accepts optional per-track `trackMeta`
    (source + BPM). A flat zone is *suppressed* (no penalty, no issue) when
    every track in it is BPM-sourced and the zone's BPMs span ≤ 2. The
    missing-climax penalty is suppressed when ≥ 70% of tracks are
    BPM-sourced and the resolved curve spans < 1.5. Any suppression (or the
    global condition) emits one informational `low_energy_confidence` issue
    telling the DJ to add manual energies or Mixed In Key data. The reorder
    optimizer scores with the same rules so its objective matches the final
    score.
14. **Per-track genre anchors + wider edge ramp (B14)** — a track's own
    imported genre tag (when it maps) anchors its BPM→energy band; unmapped
    tags fall back to the playlist genre. `BPM_PROFILE_EDGE_RAMP` widened
    10 → 20 so a mis-detected genre no longer collapses every out-of-band
    BPM to the same clamped 10, and nearby out-of-band BPMs keep
    differentiating.
15. **Genre detection v2 (B15)** — compound tags map by containment
    (longest known token wins: "Techno (Peak Time / Driving)" → techno,
    "Hard Techno Industrial" → hard-techno; alias table extended, moved to
    `lib/playlists/genre-mapping.ts`). Candidate genres = voted ∪ genres
    whose BPM-band fit ≥ 0.6. Score = 0.45·voteShare + 0.55·bpmFit
    (`GENRE_DETECTION_RULES_V3`) — BPM outweighs votes on purpose:
    unanimous mislabeled tags must lose to a perfect BPM fit. Ties break by
    median-BPM distance to band center, then narrower band, then name.
    With no usable BPMs, votes decide alone; with neither, dominant is null.
16. **Open Key → Camelot (B16)** — Traktor exports keys in Open Key
    (1–12 + m/d); `toCamelot` in `lib/music/camelot.ts` now converts it
    (same wheel rotated by 7: 1d = 8B, 1m = 8A), fixing the empty Camelot
    column and Camelot sorting for NML imports.

### V4 additions (B17–B20) — harmonic reordering + loudness

Driven by a head-to-head against a hand-crafted harmonic ordering of a real
38-track set (PRIDE - BOUNCE): the reorder optimizer ignored keys entirely,
the parser missed 14/38 keys, and the loudness signal in the file went
unused. V4 closes all three gaps with deterministic Camelot math — no LLM,
same explainability contract.

17. **Full key coverage from Traktor (B17)** — `INFO @KEY` text is only
    present when a tagger wrote it (24/38 on the reference file);
    Traktor's own numeric `MUSICAL_KEY VALUE` (0–11 majors C…B, 12–23
    minors C…B — verified against 24 tracks carrying both) covers 38/38.
    The parser falls back to it (`musicalKeyValueToOpenKey`), emitting Open
    Key text that `toCamelot` already converts. `PERCEIVED_DB` is now
    extracted and persisted (`tracks.perceived_db`, migration 0010).
18. **Camelot harmony math (B18)** — `harmonicTier(a, b)`: perfect (same
    key), smooth (±1 same ring with 12↔1 wrap, or relative major/minor),
    boost (+2 same ring, cost 0.5), clash (cost 1); unknown keys are
    excluded, never treated as clashes. `assessHarmony` aggregates a
    per-order ratio (`HARMONY_RULES_V4`).
19. **Loudness as an energy signal (B19)** — for BPM-derived tracks with a
    dB reading, energy adjusts by up to ±0.8 around the BPM anchor based on
    the track's loudness relative to the set median (`LOUDNESS_RULES_V4`:
    needs ≥6 dB readings and ≥1.5 dB spread — never fabricated). Source
    becomes `bpm_loudness`, which the confidence layer (B13) treats as real
    differentiation: no flat-zone suppression, no low-confidence nag.
20. **Harmonic reorder objective (B20)** — the optimizer maximizes
    `energyScore + 2.0 × harmonicRatio` when ≥50% of transitions have both
    keys (`REORDER_HARMONY_V4`). Two deterministic seeds are hill-climbed
    (2-opt) and the best objective wins: the energy seed protects the
    curve, the harmonic seed (a walk around the Camelot wheel) assembles
    the key chains that pairwise swaps can't build from scratch. Suggestion
    gate: energy improves ≥0.5 OR harmony improves ≥0.2 with energy not
    worse than 0.3. The set score's meaning is unchanged — harmony shapes
    only the suggested order, surfaced as "Harmonic X/Y" badges in the
    order comparison. On the reference set: 6/37 compatible transitions →
    30/37 (ratio 0.76), clashes 31 → 7, energy 5.8 → 8.3.
21. **Half/double-time BPM tag correction (B21)** — BPM detectors routinely
    tag fast tracks at half tempo (real case: a ~160 BPM hard-techno track
    tagged "80" scored energy 1.0 while its 160 BPM neighbours scored 9.1).
    When a tagged BPM falls outside the scoring genre's band but a ×2 / ×0.5
    multiple (`BPM_TAG_TIME_MULTIPLIERS_V4`) lands inside it (± the B14
    anchor margin), the energy mapping uses the corrected tempo. The B14
    tag-plausibility check also runs on the corrected tempo, so a half-time
    tag can still anchor the track's own genre. Non-destructive: stored and
    displayed BPM keep the tag's value; in-band tags are always trusted;
    tags no multiple can rescue keep their genuine low/high energy. No
    correction without a genre (universal bands have no band to judge
    against).

## Key Files

- `lib/engine/energy-score.ts` — BPM → energy (genre-aware + universal
  fallback), position fallback, precedence
- `lib/engine/target-curve.ts` — ideal-curve builder per context × genre
- `lib/engine/analysis.ts` — V2 sub-scores + issue derivation + per-context
  scores
- `lib/engine/reorder.ts` — deterministic order optimizer
- `lib/engine/recommendations.ts` — localized copy mapping + reorder gate
- `lib/content/analysis-copy.ts` — EN/ES issue templates + sub-score labels
- `services/analysis-service.ts` — data glue + not-analyzable guards +
  versioned snapshots
- `app/dashboard/playlists/[id]/analysis/page.tsx` — results screen
- `lib/charts/curve-geometry.ts` — domain-parameterized curve geometry
  (shared by the landing demo and the real analysis chart)
- `tests/calibration.test.ts` — product-level score invariants for tuning

## Deliberate v1 Boundaries

- Analysis is computed on request; nothing is persisted. A persistence layer
  (for the "playlists analyzed" KPI and history) is a follow-up.
- Recommendations are template-based, not AI-generated — aligned with the
  "explainable over magical" principle. An optional AI synthesis layer can
  be added later without changing the engine contract.
- The dashboard locale is EN for now; all engine output is localized
  (EN/ES) and ready for a locale toggle.
