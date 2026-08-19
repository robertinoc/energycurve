# Energy Model v3 — specification

> **Status: specified, not fitted.** Every feature this model needs is extracted
> and shipping today. The coefficients are not, because fitting them needs a
> labelled corpus that only exists on the owner's own drive. This document is
> the thing the calibration run will follow — read it as a plan with its
> measurements already taken, not as a description of code that exists.

## Why the current model isn't enough

Today's energy score is BPM, plus perceived loudness when the tag happens to
carry it. Those are two of the predictors, and not the strongest two.

The construct being estimated is **arousal** — the activation axis of Russell's
circumplex model of affect, which is what people mean by a track being
"energetic" as distinct from being fast. The music-information-retrieval
literature consistently finds that spectral measures carry more of the variance
in perceived arousal than tempo does; spectral flux and spectral entropy
together account for a substantial share on their own.

Tempo is a proxy that works because it correlates with the real thing inside a
genre. Across genres it stops working, which is exactly the case the product
keeps meeting: a 128 BPM deep-house record and a 128 BPM peak-time techno record
are not the same energy, and today they score the same.

## What is already extracted

All of it ships, in the browser, per track, from
`lib/audio/spectral-features.ts` and the framewise worker:

| Feature | What it measures | Where |
|---|---|---|
| `rmsMean`, `rmsPeak` | Loudness, mean and 95th percentile | Meyda `rms`, aggregated |
| `fluxMean` | How fast the spectrum changes frame to frame | **ours** — Meyda's is broken |
| `entropyMean` | Normalised spectral entropy, 0…1 | **ours** — Meyda doesn't ship it |
| `onsetRate` | Detected onsets per second | **ours**, derived from flux |
| `chroma` | 12-bin pitch-class profile | Meyda |
| tempo | BPM | `web-audio-beat-detector` |

Two of those are ours because they had to be. Meyda 5.6.3's `spectralFlux`
extractor is non-functional — an undeclared variable and a loop that starts at a
negative index — and spectral entropy isn't offered at all. See
`docs/spike-browser-audio-analysis.md`.

**The gap between here and a working v3 is not extraction. It is fitting.**

## The proposed form

```
arousal_raw = w₁·norm(tempo)
            + w₂·norm(rmsMean)
            + w₃·norm(fluxMean)
            + w₄·norm(entropyMean)
            + w₅·norm(onsetRate)

energy = clamp(round(10 · sigmoid(arousal_raw)), 0, 10)
```

Linear in normalised features, squashed once at the end. Deliberately the
simplest form that can work, for two reasons: it stays explainable — a DJ can be
told *"this scored high because it's dense and loud, not because it's fast"* —
and with a corpus in the low hundreds anything richer would fit noise.

`norm()` is per-feature standardisation against the corpus, not against the
playlist. Normalising within a set would make the same track score differently
depending on its company, which breaks every comparison the product makes.

**No coefficients are proposed here.** Writing plausible-looking numbers into
this document would be the worst thing it could contain: they would get
implemented, and nobody would know they were invented rather than measured.

## How to fit it

> **Corrected 19 Aug 2026.** This section used to say the labelled dataset
> "already exists and costs nothing" because **Mixed In Key writes its own 1–10
> energy into the tags**. That premise is false for this project: the owner has
> never used Mixed In Key, so no such corpus exists here and none will appear. The
> plan below replaces it. Everything about the *form* of the model above is
> unaffected.

Labels come from a listener rating tracks by ear, in the harness. That is not a
lesser substitute. The quantity being predicted is *arousal* — how activating the
music feels — a perceptual construct with no instrument to read it off. Mixed In
Key's numbers were themselves a heuristic somebody chose: a convenient reference,
not a ground truth. A working DJ rating tracks from the genre they actually play
is a defensible source, and better matched to this catalogue than a
general-purpose tool calibrated on everything.

1. Analyse a folder at `/backstage/audio-spike`, then rate each track 1–10 in the
   **Energy by ear** column while listening to it. Aim across the whole scale, not
   just the peak-time material: the panel names which ratings still have no
   example, because a corpus rated only 7–8 fits a model that can only answer 7–8.
2. `Copy labels JSON`. Each entry already pairs the rating with the features
   measured for that same file, so there is nothing to join.
3. Feed it to `fitEnergyModelV3` (`lib/engine/energy-model-v3.ts`). It
   standardises against the training rows only, holds out every fifth row, and
   fits by ordinary least squares on the logit of the rating — the link is
   inverted first, so the thing being fitted really is linear in the features.
4. **The bar to beat is the current model, not zero.** `fitEnergyModelV3` returns
   `bpmBaselineMae` — today's BPM-only model scored on the same holdout — next to
   `holdoutMae`, so the comparison can't be forgotten. If v3 doesn't beat it, it
   doesn't ship: a more complicated model that predicts no better is strictly
   worse.
5. Write the fitted weights and both error figures into this document, and only
   then into `ENERGY_MODEL_V3`.

Until step 5 happens, `ENERGY_MODEL_V3` is `null` and the scorer is inert — a
track carrying features still resolves from BPM, and a test pins that. The
coefficients stay absent rather than plausible, for the reason stated above.

A caveat worth carrying into the fit: one person's ratings are one person's
ratings. They encode a single taste and a single genre range, which is exactly
what makes them well matched here and exactly what limits how far the model
generalises. Widening that means more raters, not more tracks.

## Source precedence, which does not change

v3 replaces one branch of the ladder, not the ladder:

```
manual override  >  audio analysis  >  tag  >  BPM  >  estimated from position
```

Every value keeps reporting which rung it came from, so a DJ can always tell
what was measured from what was inferred. That contract predates v3 and survives
it — a model that quietly relabelled an estimate as a measurement would be worse
than no model.

## References

- Russell, J. A. (1980). *A circumplex model of affect.* Journal of Personality
  and Social Psychology, 39(6). The arousal/valence framing this model estimates
  one axis of.
- The MIR literature on spectral flux and spectral entropy as arousal
  predictors. **Specific papers and effect sizes to be cited here at fitting
  time** — the figure quoted in `docs/product-strategy-v2.md` came from a
  secondary source and should be replaced with a primary citation before anyone
  relies on it.
- `docs/spike-browser-audio-analysis.md` — how the features are extracted, what
  they cost, and why Meyda's flux isn't used.
