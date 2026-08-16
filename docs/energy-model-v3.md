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

The labelled dataset already exists and costs nothing: **Mixed In Key writes its
own 1–10 energy into the tags**, and the import path already reads those tags.
Every analysed file that carries a MIK energy is one training row of
`(features) → (label)`.

1. Run the analysis harness at `/backstage/audio-spike` over a library with MIK
   energies in the tags. A few hundred tracks across at least three genres —
   a single-genre corpus fits a genre, not a model.
2. Export `(tempo, rmsMean, fluxMean, entropyMean, onsetRate, mikEnergy)` per
   track.
3. Fit by ordinary least squares. Hold out 20% and report the error on the
   holdout, not on the training set.
4. **The bar to beat is the current model, not zero.** Score the same holdout
   with today's BPM-only model first. If v3 doesn't beat it, it doesn't ship —
   a more complicated model that predicts no better is strictly worse.
5. Write the fitted coefficients and both error figures into this document, and
   only then into `lib/product/strategy.ts`.

Where MIK and v3 disagree, MIK is the label but not necessarily right — it is
one vendor's opinion, fitted to their own catalogue. The goal is agreeing with
it closely enough to be trusted, then extending to the files it says nothing
about, which is the whole point: the tracks with no tags are the ones the user
came here with.

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
