# Spike: browser-side audio analysis

> Ran 12 Aug 2026. Question asked: **can we analyse real audio in the browser
> well enough and fast enough to ship as a PRO feature, or do we need
> server-side batch analysis (H3)?**
>
> Answer: **yes for tempo and the Energy Model v3 features, not yet for key.**
> The plan survives, with one substitution and one open risk.

## Headline: Essentia.js is out, on licensing

The roadmap named **Essentia.js** as the engine. It can't be used.

Essentia is **AGPL-3.0**. [Its licensing page](https://essentia.upf.edu/licensing_information.html)
states it is released under "Affero GPLv3 for non-commercial applications" and
that a commercial licence exists — but only by negotiating with the Music
Technology Group at UPF: *"Contact Music Technology Group (UPF) for more
information about licensing conditions."* No published price, no self-serve
path.

Why that's disqualifying here rather than a detail:

- Browser-side analysis means **shipping the library to the user's machine**.
  That's conveying it, and our code calls its API in the same execution context
  — a combined work, not mere aggregation.
- EnergyCurve is closed-source and about to charge money. AGPL §13 would put us
  in the position of having to offer corresponding source to every user.
- The escape hatch is a negotiated commercial licence from a university, with
  unknown cost, for a product priced at US$9.99/mo. That is not a dependency to
  build a paid tier on.

Also worth noting even setting licensing aside: essentia.js is at **0.1.3, last
published May 2022** — four years stale.

The same problem rules out **aubio / aubiojs** (GPL-3.0).

## What replaced it

An MIT-only stack, assembled rather than adopted:

| Need | Choice | Licence | State |
|---|---|---|---|
| Tempo | [`web-audio-beat-detector`](https://www.npmjs.com/package/web-audio-beat-detector) | MIT | 8.2.38, published July 2026 — actively maintained |
| Spectral features | [`meyda`](https://www.npmjs.com/package/meyda) | MIT | 5.6.3, April 2024 |
| Spectral entropy | ours (`lib/audio/spectral-features.ts`) | — | Meyda doesn't ship it |
| Spectral flux | ours | — | Meyda's is broken, see below |
| Key | ours — Krumhansl-Schmuckler on Meyda's chroma | — | published algorithm, no library needed |

Bundle cost: both are lazy-loaded, so neither enters the page bundle.

### Meyda's `spectralFlux` is broken and we can't use it

Spectral flux is the single most important input to Energy Model v3, and
Meyda 5.6.3 ships it non-functional:

```js
// node_modules/meyda/dist/esm/extractors/spectralFlux.js
// "This file isn't being typechecked at all because there are major issues
//  with it. See #852 for details."
for (var i = -(bufferSize / 2); i < signal.length / 2 - 1; i++) {
    x = Math.abs(signal[i]) - Math.abs(previousSignal[i]);
```

Two separate defects:

1. **`x` is never declared.** ES modules are always strict mode, so the
   assignment throws `ReferenceError: x is not defined`. This is exactly how the
   spike first failed — every track came back with `"x is not defined"`.
2. **The loop starts at a negative index.** Even with `x` declared, the first
   half of the iterations read `undefined`, and `Math.abs(undefined)` is `NaN`.

So flux is computed in `spectral-features.ts` — half-wave rectified sum of
bin-to-bin increases, normalised by bin count — with tests pinning the
definition. There is a smaller, harmless typing gap too: `spectralFlux` is in
Meyda's requestable-feature union but missing from `MeydaFeaturesObject`.

## Measurements

8 real tracks from the user's library: 6 mp3 (3.5–10.6 MB) and 2 FLAC
(27 MB, 39 MB), 219–529 s long, house/disco. Chrome on an M-series Mac, dev
build. Frame 2048, hop 2048, mono.

| | median | range |
|---|---|---|
| Decode (`decodeAudioData`) | 330 ms | 184–746 ms |
| Tempo pass | 267 ms | 227–547 ms |
| **Feature pass** | **6 100 ms** | **4 870–11 628 ms** |
| Total per track | 6 700 ms | 5 539–12 958 ms |
| Realtime factor | ~40× | 38–42× |

Heap after the batch settled at ~109 MB, peaking near 286 MB. The 39 MB FLAC
decoded and analysed without incident, so file size is not the constraint —
**duration is**, and only through frame count.

### The feature pass is 88% of the cost, and it's linear in frames

Two controlled experiments:

- **Dropping `chroma`** (the feature that looked expensive): 4 870 ms → 4 532 ms.
  Only ~7%. Chroma is *not* the bottleneck.
- **Doubling the hop to 4096** (half the frames): 4 870 ms → 2 463 ms and
  5 854 ms → 2 860 ms, with frame counts halving exactly (4 708 → 2 354).
  Realtime factor 40× → 72×.

So the cost is the per-frame FFT, and it scales linearly with the number of
frames analysed. That makes the optimisation path arithmetic rather than
speculative:

| Lever | Expected gain | Cost |
|---|---|---|
| Analyse 3×30 s windows instead of the whole track | ~3× on a 4-minute track | Aggregate features only; loses time-varying detail |
| Hop 4096 | 2× (measured) | Onset rate needs recalibrating — it's per frame |
| Decode at 22.05 kHz | ~2× | Fine for these features; halves frequency resolution |

Stacked, ~6 s/track becomes well under 1 s. **Nothing here requires a server.**

Flux, entropy and the detected key barely moved between hop 2048 and 4096
(entropy 0.4510 → 0.4518, same key, confidence 0.67 → 0.66), which is what you'd
expect from track-level aggregates. The onset rate *did* move (1.84 → 1.00/s)
because it's defined per frame — so that lever isn't free.

### Accuracy against the files' own Mixed In Key tags

**Tempo: 8/8 exact.** 119/119, 123/123, 120/120, 125.2/125, 124/124, 120/120,
123/123, 126/126. Not "close" — exact, on every track. `web-audio-beat-detector`
can be treated as production-ready for this catalogue.

**Key: 4/6 exact Camelot** (two tracks carried no key tag):

| Detected | → Camelot | Tag | → Camelot | |
|---|---|---|---|---|
| Gm | 6A | 11m | 6A | match |
| F#m | 11A | 4m | 11A | match |
| Gm | 6A | 11m | 6A | match |
| Am | 8A | 1m | 8A | match |
| A# | 6B | 7m | 2A | miss |
| C | 8B | 10m | 5A | miss |

**n=6 is far too small to call this an accuracy rate** — it's a smoke signal,
not a validation. What it does tell us is *how* it fails: both misses picked the
wrong **mode**, and one (C major vs C minor) got the tonic exactly right. Major/
minor confusion is the textbook Krumhansl-Schmuckler weakness, and it's the
tractable kind of wrong.

Known fixes, in rough order of effort: harmonic/percussive separation before
chroma (bass-heavy dance mixes pollute the profile); per-segment key voting
instead of one whole-track average; tuning correction; and swapping the K-K
profiles for Temperley's or Shaath's, which were fitted on pop rather than
classical.

Useful side-effect: the tags in this library are **Open Key** notation
(`7m`, `4d`), and the existing `toCamelot()` already converts them — so the
accuracy harness works against a real corpus with no new parsing.

## Architecture as built

```
main thread                          worker
───────────                          ──────
decodeAudioData  ──────────────────▶
tempo via web-audio-beat-detector
  (own internal worker)
downmix to mono
transfer Float32Array ─────────────▶ framewise Meyda loop
                                     rms · amplitudeSpectrum · chroma
                                     ours: flux, entropy
                    ◀──────────────  aggregated features
Krumhansl-Schmuckler on chroma
```

The framewise loop is the part that would freeze the UI for seconds, so it runs
in a worker with the samples **transferred** (a 5-minute track is ~50 MB of
Float32 — cloning it would be worse than the analysis). One worker is reused
across a batch.

The UI-freeze probe in the harness reported 0 ms, but that number is not
trustworthy: `requestAnimationFrame` is throttled in a background tab, so the
probe never ticked. Re-measure with the tab visible before quoting it.

## Verdict

**Browser-first is viable. Ship it as planned, with these changes:**

1. **Essentia.js is out of the roadmap.** Replace it with meyda +
   web-audio-beat-detector + our own flux/entropy/key. The Asana task and the
   strategy doc both name Essentia and need editing.
2. **Tempo is done** — 8/8 exact. That alone closes the biggest gap in the
   product (wav/flac/aiff with no tags), and it's the cheapest part of the pass.
3. **Key is the real risk.** It is not shippable at this accuracy, and it must
   not be advertised until validated on a corpus in the hundreds. Ship tempo and
   the v3 features first; keep key behind a "beta" label or hold it back.
4. **Optimise before shipping.** ~6 s/track is too slow for a 40-track playlist
   (4 minutes). Windowed sampling is the lever, and the linearity is measured, so
   the gain is predictable.
5. **No server-side batch needed.** H3's server analysis stays where it is —
   optional, demand-driven. The privacy promise ("your audio never leaves your
   machine") holds as a real property of the design.

## What exists in the repo after this spike

- `lib/audio/key-detection.ts` — Krumhansl-Schmuckler, pure, tested
- `lib/audio/spectral-features.ts` — entropy, flux, onset rate, aggregation; pure, tested
- `lib/audio/analyze-features.worker.ts` — the framewise loop
- `lib/audio/analyze-track.ts` — decode → tempo → features → key
- `app/backstage/audio-spike/` — the measurement harness (backstage, noindex)
- `tests/audio-analysis.test.ts` — 23 tests over the pure parts

The harness is a measuring instrument, not a feature: point it at a folder and
it reports per-track timings plus the tag comparison. It's how the corpus
validation subtask should be run.
