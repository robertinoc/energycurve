# Research — External Track Recommendations (+ why audio analysis is out of scope)

Decision brief for the remaining large block-2 scope item — external track
recommendations — plus the rationale for **dropping audio analysis** from
scope entirely.

Status: research only. Nothing here is committed to a build. Written after
the launch of the BPM-heuristic v1, alongside the DJ-software import work.

---

## 1. Audio analysis — OUT OF SCOPE (decision 2026-07-06)

Audio analysis (deriving energy/key from the actual waveform) is **not
being pursued**. Too complex and costly for the value, and — crucially —
**unnecessary**, because the per-track energy it would produce already
arrives for free through the import feature:

DJ software and prep tools store per-track metadata that the import reads
directly — no audio processing, no upload, no recurring API cost:

| Source | BPM | Key | Energy rating | Genre |
|---|---|---|---|---|
| **Rekordbox** (XML) | ✅ | ✅ | rating/My Tag | ✅ |
| **Traktor** (NML) | ✅ | ✅ | rating | ✅ |
| **Serato** | ✅ | ✅ | — | ✅ |
| **Mixed In Key** (writes tags) | ✅ | ✅ | ✅ **Energy 1–10** | — |

**Mixed In Key** is the clincher: it's the de-facto tool DJs run on their
libraries and it writes a literal **"Energy 1–10"** value — the exact scale
EnergyCurve uses. Importing a library that's been through MIK gives *real*
energy per track. Between that and BPM-derived energy for the rest, the
import covers the energy need without any audio pipeline.

Also, audio analysis would have meant multi-GB uploads, a non-serverless
processing backend, subjective feature→energy mapping, and (for API routes
like Spotify Audio Features) a source that was **deprecated for new apps
around Nov 2024** anyway. Not worth it. Closed.

---

## 2. External track recommendations

Goal: suggest tracks the user doesn't have — to fix a gap in the curve, or
extend a set — from outside their library.

### The hard dependency: a catalog
You can't recommend tracks you have no data for. Catalog options:

| Catalog source | Fit for DJs | Access | Cost/licensing |
|---|---|---|---|
| **Beatport / Beatsource API** | ✅ Excellent (DJ-native: BPM/key/genre) | Partner/commercial | Paid, needs agreement — but **affiliate revenue possible** |
| **Spotify** | 🟠 Mainstream-biased, not a DJ catalog | Recommendations API **deprecated (~Nov 2024)** | ❌ Largely unavailable |
| **Own DB seeded from user imports** | 🟠 Grows with usage; cold-start empty | Free | You build the similarity engine |
| **Last.fm / ListenBrainz** | 🟠 Similar-artist graphs, not DJ-tuned | Free API | Free, attribution |

### Matching approach (once a catalog exists)
DJ recommendations are mostly **rules-based, not ML** — and that fits the
product's "explainable over magical" principle. Given a gap at position N
("need ~124 BPM, energy 7, key-compatible"), query the catalog filtered by:
BPM range + Camelot-wheel-compatible key + target energy + genre. No trained
model required.

### Reality checks
- **Cold start:** own-DB recommends nothing until it has data; a commercial
  catalog (Beatport) works day one but costs money + a deal.
- **This is arguably a different product.** "Analyze my set" → "discover
  tracks to buy" edges into curation/marketplace territory. Do it only as a
  deliberate strategic move — ideally with a **Beatport affiliate** angle so
  recommendation clicks offset (or beat) the catalog cost.

### Recommendation
**Defer until there's real usage signal.** When pursued: start with
**Beatport** (DJ-native + affiliate revenue) and a **rules-based matcher**
on BPM/key/energy/genre — not an ML recommender. Own-DB is the fallback if a
Beatport agreement isn't feasible.

---

## 3. Suggested sequence (audio analysis removed)

```
NOW   → Import (Rekordbox/Traktor/Serato) — delivers real BPM, key,
        genre, and (via Mixed In Key tags) real ENERGY for free.
THEN  → Genre detection from imported tags (no audio needed).
LATER → External recs: Beatport catalog + rules-based matcher, only if
        usage justifies the cost/deal — ideally with affiliate revenue.
```

**Bottom line:** import is the highest-leverage next build — it delivers the
accurate per-track energy that made audio analysis unnecessary, plus BPM,
key, and the genre tags that power genre detection. External
recommendations wait for a usage signal and enter deliberately (Beatport +
affiliate).
