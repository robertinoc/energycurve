# EnergyCurve 2.0 — Product Strategy: The DJ Set Copilot

> Status: approved 2026-08-12. Supersedes the positioning sections of
> `product-strategy.md` (the engine constants and genre framework there remain
> canonical). Companion Asana import: `energycurve-roadmap-asana.csv`
> (delivered separately, not committed).

## 1. Vision

EnergyCurve stops being "a playlist analyzer" and becomes **the DJ set
copilot**: the tool a DJ opens between the library and the booth. The full
loop it owns:

**build → analyze → fix → export → play → learn from what was played.**

Today the product already covers build → analyze → fix → export better than
anyone (see §2). The strategy is to deepen that loop — real audio analysis, a
science-based energy model, performance tooling — not to pivot into library
management (Lexicon's turf) or playback (rekordbox's turf).

Tagline stays: **"Shape the curve. Own the dancefloor."**

## 2. Market analysis (August 2026)

| Product | Price | What it is | What it does NOT do |
|---|---|---|---|
| [Mixed In Key 11 / Flow](https://mixedinkey.com/) | **$58 one-time** | Desktop key + energy (1–10) + cue detection; writes tags | No set curve, no narrative analysis, no recommendations, no web |
| [Lexicon](https://www.lexicondj.com/pricing) | **$9.99/mo** Essential · **$19.99/mo** Ultimate · lifetime $199/$399 | Library manager: sync/convert between Rekordbox, Serato, Traktor, Engine, VirtualDJ, djay | Doesn't analyze the *set* — it organizes the *library* |
| [Mixo](https://thedjmixtape.com/mixo-vs-lexicon/) | Subscription-only; conversion paywalled | Library manager (Lexicon's weaker rival) | Same gap as Lexicon |
| [DJ.Studio](https://dj.studio/blog/dj-software-integration) | Paid desktop | AI-assisted mix *arrangement* (builds the actual mix audio) | Studio tool, not a set-planning copilot; validates "AI for sets" demand |
| [rekordbox](https://rekordbox.com/en/2026/04/rekordbox-for-android-now-supports-beatport-streaming/) | Free–Professional tiers | The player/ecosystem (CloudDirectPlay, Beatport Streaming on CDJs) | Analysis is per-track, not per-set; closed ecosystem |
| [OpenKeyScan](https://www.openkeyscan.com/best-key-detection-software-2026) | Free | Offline key detection, writes tags | Data provider only |

**The gap EnergyCurve owns:** nobody is the copilot of the set's *narrative*.
Mixed In Key produces per-track data; Lexicon organizes files; rekordbox plays
them. EnergyCurve is the only product whose unit of analysis is **the set as a
story** — energy curve vs an ideal, harmonic flow, actionable fixes, one-click
AI ordering, native export back to the booth. Strategy: deepen this moat.

Positioning line for marketing: *"Mixed In Key tells you what each track is.
EnergyCurve tells you what your SET is — and how to make it hit harder."*

## 3. Science-based Energy Model v3

### The research

Musical "energy" maps to the psychological construct of **arousal** (Russell's
circumplex model of affect). The MIR literature converges on a small set of
measurable predictors:

- **Spectral flux + spectral entropy alone explain ~65% of the variance in
  perceived arousal** ([Beyond Intensity: Spectral Features Effectively
  Predict Music-Induced Subjective Arousal](https://www.researchgate.net/publication/258443279_Beyond_Intensity_Spectral_Features_Effectively_Predict_Music-Induced_Subjective_Arousal)).
- Loudness (RMS), tempo, onset rate, danceability, spectral rolloff/skewness
  and beats-loudness band ratio round out the strongest feature set
  ([Audio features dedicated to the detection and tracking of arousal and
  valence](https://www.tandfonline.com/doi/full/10.1080/24751839.2018.1463749),
  [Modeling Perceived Emotion With Continuous Musical Features](https://www.researchgate.net/publication/200806322_Modeling_Perceived_Emotion_With_Continuous_Musical_Features)).

Today's engine derives energy from **tempo** (genre-anchored bands, B1/B14/B21)
refined by **tagged loudness** when present (B19). That is two of the six
strongest predictors — solid, but upgradeable.

### The v3 model

```
energy = f(tempo, RMS loudness, spectral flux, spectral entropy, onset rate)
```

- **Features**: computed in-browser by meyda + our own DSP (§4) — no audio ever leaves
  the DJ's machine.
- **Calibration**: regress against the Mixed In Key energies we already parse
  from comment tags. Our user corpus doubles as a free labeled dataset; MIK's
  1–10 scale is the industry's shared vocabulary, so agreeing with it where it
  exists (and extending beyond it where it doesn't) is exactly right.
- **Graceful degradation** (unchanged philosophy): full audio features → tag
  energy (MIK) → BPM-derived → position-estimated. Each source labeled in the
  UI, as today.

### Feasibility of "upload audio for analysis"

> **Superseded 12 Aug 2026 by the spike.** Essentia.js is **AGPL-3.0** and
> cannot ship in a closed-source paid product; its commercial licence is a
> negotiation with UPF with no published price. Replaced by an MIT stack
> (`web-audio-beat-detector` + `meyda` + our own flux/entropy/key). The
> browser-first conclusion below still holds and is now measured — tempo is
> 8/8 exact against Mixed In Key tags. Full findings and numbers:
> [spike-browser-audio-analysis.md](./spike-browser-audio-analysis.md).

The original reasoning, kept for the record: **[Essentia.js](https://mtg.github.io/essentia.js/)**
(Music Technology Group, UPF Barcelona; open source) runs the Essentia C++ MIR
library as WebAssembly **in the browser**, including BPM, key, all spectral
features above, and TensorFlow.js models
([TISMIR paper](https://transactions.ismir.net/articles/10.5334/tismir.111)).
The audio-files import already opens local files for tag reading; the same
`File` handles feed Essentia. Consequences:

- Privacy promise intact: "your audio never leaves your machine" becomes a
  *feature of the analysis*, not a limitation.
- Zero storage/compute infra cost. Server-side batch analysis stays in H3 as
  an optional upgrade if demand appears (large libraries, mobile).
- Fixes the #1 recurring user pain: wav/flac/aiff files without tags now get
  real BPM/key/energy instead of estimates or manual entry.

## 4. Integrations: what's possible, what's not

| Integration | Verdict | Why |
|---|---|---|
| **Spotify** | ❌ Dead end | `audio_features`/`audio_analysis` APIs [killed Nov 2024](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api), no replacement 18+ months later |
| **Title-lookup APIs** (SoundNet, Musicae, FreqBlog) | ✅ H3, PRO+ | Per-request cost; fills BPM/key/energy for tracks with no file and no tags ([landscape](https://dev.to/birrings/spotifys-audiofeatures-api-died-in-2024-heres-what-i-built-to-replace-it-3dn3)) |
| **Beatport** | 🤝 Long-term partnership | API is [partner-brokered, no public SDK](https://apis.io/providers/beatport/); worth pursuing once we have traction numbers |
| **Rekordbox / Traktor / Serato** | ✅ Already shipped (files) | Native import/export is our integration; USB-export research in H2 |
| **Lexicon** | 🤝 Complementary | They organize, we analyze; a "send to EnergyCurve" hook is a cheap partnership pitch |
| **Apple Music API** | ⚠️ Weak | Reduced fields; not DJ-relevant enough to prioritize |

## 5. Feature roadmap

### H1 — Now (1–2 months)
1. **Real audio analysis in the browser** (meyda + web-audio-beat-detector; *not* Essentia.js — AGPL): BPM + key + v3
   features for untagged files, opt-in per playlist, progress UI reusing the
   audio-import pattern. Validate key accuracy against MIK-tagged corpus
   before announcing accuracy claims.
2. **Energy Model v3** (arousal multi-feature + calibration, §3).
3. **Set version history**: original vs curated vs smart-ordered snapshots,
   A/B their curves/scores.
4. Pending polish: NML missing-files warning (#21), M3U8-first export for
   file-sourced playlists (#22).
5. **Billing foundation** (Stripe + plan gates) — needed before PRO launch.

### H2 — Next (3–4 months)
6. **Gig Mode**: performance view (big tracklist + curve + per-track notes),
   installable PWA, works offline.
7. **Global track library**: every track across playlists, dedup, "tracks you
   never play", per-track set appearances.
8. **Set comparator**: two sets side by side (curves, harmony, overlap).
9. **Per-transition suggestions**: expand the B20 harmonic engine into a
   track-to-track "what mixes well next" surface.
10. USB/export research (rekordbox device-library format).

### H3 — Later (5+ months)
11. Server-side batch analysis (only if browser-first proves insufficient).
12. Title-lookup enrichment API (PRO+, per-request cost).
13. Beatport / Lexicon partnerships.
14. **Public set curves** (share a read-only "shape of my set" page — the
    growth loop; every shared curve is an ad).

## 6. Plans: FREE / PRO / PRO+

Design rule: **everything touching audio + the engine's depth is PRO;
everything with variable cost (AI, lookups) or pro-workflow is PRO+.**

One deliberate exception, decided 12 Aug 2026: **native export stays free
forever.** Getting the fixed order back into Rekordbox or Traktor is what makes
the analysis actionable at all — paywalling it breaks the loop the product is
built around, and it's exactly the move that makes Lexicon and MIXO resented
for charging per conversion. It also makes the free tier a genuine wedge rather
than a crippled demo. PRO earns its price on limits and on audio depth.
Claude smart ordering is THE PRO+ driver (real marginal cost → protected
margin). FREE must deliver the "aha": see your set's curve, feel the gap.

| Capability | FREE | PRO $5.99/mo · $59/yr | PRO+ $11.99/mo · $119/yr |
|---|---|---|---|
| Active playlists | 3 | Unlimited | Unlimited |
| Import (all formats incl. audio files) | ✅ | ✅ | ✅ |
| Analysis, score, curve, markers | ✅ | ✅ | ✅ |
| Applicable fixes | 3/month | Unlimited | Unlimited |
| Export CSV/TXT | ✅ | ✅ | ✅ |
| Export native (Rekordbox/Traktor/M3U8) | ✅ | ✅ | ✅ |
| **Real audio analysis (browser)** | — | ✅ | ✅ |
| Energy Model v3 | — | ✅ | ✅ |
| Set version history | — | ✅ | ✅ |
| Custom genres/contexts | 2 | Unlimited | Unlimited |
| Search + organization | ✅ | ✅ | ✅ |
| **Claude smart ordering** | 1/month | 3/month | **Unlimited** |
| Gig Mode (H2) | — | — | ✅ |
| Global library + insights (H2) | — | — | ✅ |
| Per-transition suggestions (H2) | — | — | ✅ |
| Title-lookup enrichment (H3) | — | — | ✅ |
| Support / early access | Community | Standard | Priority + early access |

Heuristic (non-Claude) smart ordering remains available on every tier — the
fallback path never paywalls basic reordering.

### v3 capability set (approved 12 Aug 2026)

Six capabilities approved in one pass, after removing native export from the
paid tiers left PRO+ thin. Tier assignments follow the design rule above:
planning depth and engine work is PRO; variable cost, multi-user, or
whole-library workflow is PRO+.

| # | Capability | Tier | Why it earns its tier |
|---|---|---|---|
| 1 | **Slot-aware planning** — say "I'm on 01:00–03:00" and the curve maps to wall-clock time, flagging a peak that lands too early for the slot | PRO | *The* warm-up DJ's pain ("I burned the floor before the headliner"), and nobody in the market does it. Cheap to build on the curve we already draw. |
| 2 | **Planned vs played** — mark what you actually played, compare the planned curve against the real one | PRO | Closes the product loop (build → analyze → fix → export → play → **learn**) and is the strongest retention lever we have, because it brings the DJ back *after* the gig. Phaso does this from recordings; from a setlist it's cheaper and more actionable. |
| 3 | **Named target curve shapes** — warm-up, peak time, after-hours, sunrise, festival; optimize toward *that* shape instead of a generic ideal | PRO | Near table stakes: SetFlow and Mixgraph both ship five named shapes, and these are words DJs already use (see the vocabulary notes in `seo-aeo-baseline-2026-08.md`). |
| 4 | **Printable PDF set sheet** | PRO | Trivial to build, reads as unmistakably professional, and SetFlow already has it. |
| 5 | **Save your own curve templates** | PRO+ | The base shapes cover most DJs; saving personal templates is a power-user workflow. |
| 6 | **Residency mode** — "don't suggest anything I played at this venue in the last N gigs" | PRO+ | Needs the global library (already PRO+) plus played history, and it solves a real, specific pain for anyone holding a residency. |
| 7 | **Collaborative B2B / B3B sets** — invite other EnergyCurve users to build one set together, alternating tracks while keeping harmony and energy coherent | PRO+ | Deliberately PRO+: it is genuinely complex (multi-user invitations, shared playlist state, conflict handling) and nobody in the market does it. Multi-user by definition, so it belongs at the top of the ladder. |

**Sequencing note, not a pricing note:** PRO should not launch before in-browser
audio analysis works. Without it, PRO is only "the limits are removed", which is
hard to defend against SetFlow at £2.99–4.99/mo. With real audio analysis inside,
the story carries itself.

### Pricing rationale

- **$5.99 / $11.99** undercuts Lexicon ($9.99/$19.99) while staying serious;
  we're the newer brand, price is our wedge. Annual ≈ 2 months free.
- **No lifetime** at launch (protects recurring revenue; MIK's $58-once and
  Lexicon's $199 lifetime anchor exists, revisit at month 6 with churn data).
- Rough revenue sketch (paid users → MRR at 70/30 PRO/PRO+ mix):
  100 → ~$780 · 500 → ~$3.9k · 2,000 → ~$15.6k.

## 7. Risks & open questions

- **Key accuracy** vs Mixed In Key: the spike measured 4/6 exact Camelot on a
  6-track sample — far too small to be a rate, and both misses were major/minor
  confusions. Validate on a corpus in the hundreds before any marketing claim;
  ship behind a "beta" label or hold key back and ship tempo first.
- **Claude cost per smart order**: per-playlist caching already implemented;
  monitor via ai-usage telemetry before raising FREE/PRO quotas.
- **Hobbyist churn**: DJs gig seasonally; annual pricing + Gig Mode are the
  retention levers.
- **Tag dependence until audio analysis covers everything**: v3 needs features
  OR tags; the degradation ladder keeps untagged libraries usable meanwhile.
- **Browser-first limits**: very large libraries (1k+ files) may strain
  in-tab analysis → batching UI, and H3's server path if real demand shows.
