# Research — Audio Analysis & External Track Recommendations

Decision brief for two large, foundation-changing scope additions that the
frozen v1 spec had explicitly excluded. Both depend on an external data
source, so the real question isn't "how do we code it" — it's "which source,
at what cost, on what infra, under what licensing". This doc lays out the
options so the investment is a conscious choice.

Status: research only. Nothing here is committed to a build. Written after
the launch of the BPM-heuristic v1, alongside the DJ-software import work.

---

## 0. The key insight first

**Most of the value people expect from "audio analysis" — an accurate
per-track energy rating — can arrive for FREE through the import feature,
with no audio processing at all.**

DJ software and prep tools already compute and store per-track metadata:

| Source | BPM | Key | Energy rating | Genre |
|---|---|---|---|---|
| **Rekordbox** (XML) | ✅ | ✅ | via "My Tag"/rating | ✅ |
| **Traktor** (NML) | ✅ | ✅ | rating stars | ✅ |
| **Serato** | ✅ | ✅ | — | ✅ |
| **Mixed In Key** (writes tags) | ✅ | ✅ | ✅ **1–10 Energy** | — |

**Mixed In Key is the important one:** it's the de-facto standard tool DJs
run on their libraries, and it writes a literal **"Energy 1–10"** value into
the track tags/comments — the exact scale EnergyCurve uses. If a user has
run Mixed In Key (a large share of the ICP has), importing their library
gives us *real* energy per track, not a BPM guess.

**Therefore the recommended path is: build import first, read energy/key/
genre from the tags, and treat true audio analysis as a fallback for tracks
that have no tags — not as the primary engine.** This reframes audio
analysis from "rebuild the product" to "fill the gaps".

---

## 1. Audio analysis

Goal: derive per-track energy (and ideally key, danceability) from the
actual audio, for tracks where imported tags don't already provide it.

### Options

| Option | How | Cost | Infra | Verdict |
|---|---|---|---|---|
| **Imported tags (MIK/Rekordbox/etc.)** | Read energy/key from the import file | Free | None (rides on import) | ✅ **Primary path** |
| **Spotify Audio Features API** | Match track → Spotify ID → features | Free tier | API only | ❌ **Deprecated for new apps (Nov 2024).** Verify, but effectively unavailable |
| **Self-hosted (Essentia / librosa / aubio)** | User uploads audio → backend computes | Compute cost | ⚠️ Needs a worker/queue + storage; NOT serverless | 🟠 Powerful, most control, heaviest to run |
| **Commercial audio-AI API** (Cyanite.ai, Sonoteller, AudD, etc.) | Upload/URL → mood/energy/genre | Paid, per-track | Just API calls | 🟠 Fast to integrate, ongoing per-track cost |
| **AcousticBrainz** | Look up by MusicBrainz ID | Free | API only | 🟠 Dataset frozen since ~2022; spotty coverage of newer/underground tracks |
| **Browser Web Audio API** | Analyze uploaded files client-side | Free | None (client) | 🟠 No infra, but sets are multi-GB uploads + heavy in-browser compute + "perceptual energy" is hard to compute well |

### Reality checks
- **Uploading audio is a UX and cost problem.** A 2-hour set is ~2–4 GB.
  Uploading + storing + processing that per user is real money and real
  friction. The tag-import path sidesteps all of it.
- **"Energy" is subjective.** Even self-hosted analysis outputs raw features
  (RMS, spectral centroid, onset rate) that must be mapped to a 1–10 scale —
  that mapping is itself a research task. Mixed In Key already solved this;
  reusing its tag is both cheaper and more trusted by DJs.
- **Licensing:** processing user-owned audio files the user uploaded is
  generally fine; redistributing analysis of copyrighted catalogs is not.

### Recommendation
1. **Ship import-tag energy first** (part of the import work). This likely
   satisfies 80% of the "audio analysis" intent at zero infra cost.
2. If tag coverage proves insufficient, run a **small spike** on ONE
   commercial API (e.g. Cyanite) for a per-track fallback, measured against
   a real cost-per-analysis budget — before committing to self-hosting.
3. Self-hosted Essentia only if volume makes per-track API cost unviable
   AND audio analysis is confirmed as a core differentiator.

---

## 2. External track recommendations

Goal: suggest tracks the user doesn't have — to fix a gap in the curve, or
to extend a set — from outside their library.

### The hard dependency: a catalog
You can't recommend tracks you don't have data for. Options for the catalog:

| Catalog source | Fit for DJs | Access | Cost/licensing |
|---|---|---|---|
| **Beatport / Beatsource API** | ✅ Excellent (DJ-native, has BPM/key/genre) | Partner/commercial | Paid, requires agreement |
| **Spotify** | 🟠 Mainstream-biased, not DJ catalog | Recommendations API **deprecated (Nov 2024)** | ❌ Largely unavailable |
| **Own DB seeded from user imports** | 🟠 Grows with usage; cold-start empty | Free | You build the similarity engine |
| **Last.fm / ListenBrainz** | 🟠 Similar-artist/track graphs, not DJ-tuned | Free API | Free, attribution |

### Matching approach (once a catalog exists)
Recommendations for DJs are mostly **rules-based, not ML**: given a gap at
position N (say, "need a ~124 BPM, energy 7, compatible key track"), query
the catalog filtered by BPM range + Camelot-wheel-compatible key + target
energy + genre. This is explainable (fits the product principle) and
doesn't need a trained model.

### Reality checks
- **Cold start:** an own-DB approach recommends nothing until it has data.
  A commercial catalog (Beatport) works day one but costs money + a deal.
- **This is arguably a different product.** "Analyze my set" → "discover
  tracks to buy" crosses into curation/marketplace territory. Worth doing
  only if it's a deliberate strategic direction, ideally with an affiliate
  angle (Beatport affiliate revenue could offset the API cost).

### Recommendation
Defer until there's usage signal. When pursued, **start with Beatport** (DJ-
native + potential affiliate revenue) and a **rules-based matcher** on
BPM/key/energy/genre — not an ML recommender. Own-DB is a fallback if a
Beatport agreement isn't feasible.

---

## 3. Suggested overall sequence

```
NOW   → Import (Rekordbox/Traktor/Serato) — delivers real BPM, key,
        genre, and (via Mixed In Key tags) real ENERGY for free.
        This absorbs most of the "audio analysis" intent.
THEN  → Genre detection from imported tags (no audio needed).
LATER → Spike: one commercial audio API as a fallback for untagged
        tracks (cost-per-track budget first).
LATER → External recs: Beatport catalog + rules-based matcher, only
        if usage justifies the cost/deal — ideally with affiliate revenue.
```

**Bottom line:** the import feature is the highest-leverage next build not
just for convenience, but because it quietly delivers most of what "audio
analysis" and "genre detection" were asked for — without audio infra or
recurring API cost. The genuinely expensive items (audio processing at
scale, an external catalog) should wait for a real usage signal and be
entered deliberately.
