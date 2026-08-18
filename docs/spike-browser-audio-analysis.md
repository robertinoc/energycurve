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

Two runs matter, and they disagree about speed for a reason worth recording.

**The numbers below are from production, on the owner's own library** — 21 and 23
techno/house tracks, 95 and 207 minutes of audio, Chrome on an M-series Mac.
An earlier set of figures in this doc came from a **dev build** and was
pessimistic by roughly 3×; production is what ships, so production wins.

| | production (21 tracks) | dev build (8 tracks) |
|---|---|---|
| Median per track | **2.29 s** | 6.7 s |
| Slowest 5% | 2.85 s | 12.9 s |
| Realtime factor | **126×** | 40× |
| Projected 40-track playlist | **1 m 32 s** | 4 m 38 s |
| Worst interface freeze | **561 ms** | not measured |

Take the dev-build column as a floor on how bad it gets, not as the number to
plan against.

### Speed: the obvious next step, now taken

1 m 32 s for a 40-track playlist was tolerable but not comfortable. The
optimisation path was arithmetic rather than guesswork, because cost is exactly
linear in frames analysed (measured — see the two controlled experiments below):
analysing 3×30 s windows instead of whole tracks is ~3×, which puts a playlist
around 30 seconds.

**Shipped 17 Aug 2026.** `lib/audio/sample-windows.ts` places three 30-second
windows at the centre of equal divisions of the track — never at either edge,
because a DJ intro and outro are often beatless and quiet and misrepresent the
track. Tracks under 90 s are still analysed whole: sampling them would cover
everything anyway and buy nothing.

Two consequences worth knowing rather than discovering:

- **Flux is now segmented per window.** It is defined between *consecutive*
  frames, so a seam between two windows would compare audio a minute apart and
  read as an enormous onset at every join. Peaks are picked inside each window;
  the threshold is still pooled across all of them, because it is a statistic
  about the track and a per-window threshold would rescale itself inside a
  breakdown and call it busy.
- **The onset rate shifts by a hair, and predictably.** A peak needs a neighbour
  on each side, so each window's first frame is disqualified as a candidate:
  three windows lose three candidates where a whole-track pass loses one. On the
  synthetic case in `tests/audio-sample-windows.test.ts` that is 27/30 vs 29/30 —
  under 7%, and asserted exactly rather than tolerated.

The wall-clock number above is the pre-change measurement. Re-run the harness
against a real library to quote the new one; the `Sampled` column now reports the
seconds and percentage each row actually examined.

### The interface freeze is the real blocker

**561 ms**, and in an earlier run **1.16 s**. Over 500 ms reads as broken.

The framewise DSP already runs in a worker, so this isn't that: it's
`decodeAudioData` plus the mono downmix, both of which happen on the main
thread. Fixing it means decoding in chunks, or moving to a
`MediaStreamTrackProcessor`-style pipeline, or simply accepting a visible
"analysing…" state that blocks interaction honestly instead of freezing.

This is the one finding that must be addressed before any of this ships, and it
is only visible because the tab was in front — the first attempt at this
measurement reported 0 ms from a background tab, which is indistinguishable from
"never froze".

### The cost is linear in frames

Two controlled experiments, both on the dev build (the ratios hold regardless):

- **Dropping `chroma`** — the feature that looked expensive: 4 870 ms → 4 532 ms.
  Only ~7%. Chroma is *not* the bottleneck.
- **Doubling the hop to 4096** — half the frames: 4 870 ms → 2 463 ms and
  5 854 ms → 2 860 ms, with frame counts halving exactly (4 708 → 2 354).

So the per-frame FFT is the cost, and it scales linearly with how much audio you
feed it. Flux, entropy and the detected key barely moved between hop sizes; the
onset rate did, because it's defined per frame — so that particular lever needs
the onset threshold recalibrated first.

### Accuracy against the files' own Mixed In Key tags

**Tempo: 19/19 exact.** On techno at 147–164 BPM, every tagged file matched.
Combined with the earlier 8/8 on house and disco, `web-audio-beat-detector` can
be treated as production-ready for this catalogue. This is the finding that
justifies the whole feature: it closes the gap for wav/flac/aiff with no tags.

**Key: 3/14 (21%).** Not shippable, and the sample is now large enough to say so
with some confidence rather than as a smoke signal.

Where it fails is consistent and diagnosable: **major/minor confusion**. Across
the run the detector repeatedly produced a plausible tonic with the wrong mode
(`Dm` against a tag of `11m`, `C` against `12d`), and the key-confidence column
sits mostly between 0.4 and 0.85 — high confidence in the wrong answer, which is
exactly what a whole-track averaged chroma produces on bass-heavy dance music.

Fixes, in rough order of effort:

1. Harmonic/percussive separation before chroma — kicks and bass pollute the
   pitch-class profile on precisely this genre.
2. Per-segment key voting instead of one average over the whole track.
3. Tuning correction.
4. Swap the Krumhansl-Kessler profiles for Temperley's or Shaath's, which were
   fitted on pop rather than classical.

The harness is how we'll know whether any of that worked: re-run, and see if 21%
moves.

Useful side-effect: the tags in this library are **Open Key** notation
(`7m`, `4d`), and the existing `toCamelot()` already converts them — so the
accuracy comparison works against a real corpus with no new parsing.

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
4. **Fix the main-thread freeze first.** 561 ms is the blocker, not speed.
   Decoding and the downmix still run on the main thread.
5. **Then optimise.** ~~1 m 32 s per playlist is tolerable, not good. Windowed
   sampling is the lever and the linearity is measured, so ~30 s is
   predictable.~~ **Done 17 Aug 2026** — see "Speed" above.
6. **No server-side batch needed.** H3's server analysis stays where it is —
   optional, demand-driven. The privacy promise ("your audio never leaves your
   machine") holds as a real property of the design.

## What exists in the repo after this spike

- `lib/audio/key-detection.ts` — Krumhansl-Schmuckler, pure, tested
- `lib/audio/spectral-features.ts` — entropy, flux, onset rate, aggregation; pure, tested
- `lib/audio/analyze-features.worker.ts` — the framewise loop
- `lib/audio/analyze-track.ts` — decode → tempo → features → key
- `app/backstage/audio-spike/` — the measurement harness (backstage, noindex)
- `tests/audio-analysis.test.ts` — 23 tests over the pure parts

The harness is a measuring instrument, **not a feature**, and the screen says so
in as many words — it lives in backstage for the same reason Analytics does, and
it gets deleted once the key-detection question is settled. It is kept for now
because it's how we'll measure whether the key rework moved 21% to something
shippable.
