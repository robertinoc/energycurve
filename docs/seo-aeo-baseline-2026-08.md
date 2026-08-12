# SEO / AEO baseline — August 2026

> Snapshot taken **12 Aug 2026**, immediately after the SEO/AEO pass shipped
> (PR #82) and **before** search engines recrawled. This is the "before" we
> compare against. Re-measure with the same 10 queries in ~1 month.

## Headline

**energycurve.app appeared in 0 of 10 target queries** — not in results, not in
AI answers, not as a citation. A `site:energycurve.app` probe returned nothing
from the domain: **the site is not in the index yet**. The site itself is live
and fetchable (H1, FAQ, and format list all retrieved fine), so this is crawl
lag, not a technical blocker. A clean zero is the expected and correct baseline.

## Per-query results

| # | Query | We appear? | Who ranks | Type |
|---|---|---|---|---|
| 1 | DJ set energy curve | No | DJ.Studio, HarmonySet, SetFlow, Mixgraph | Informational |
| 2 | how to order tracks in a DJ set | No | Pirate.com, DJ.Studio, Quora, SetFlow | Informational |
| 3 | DJ set analysis tool | No | dj-set-analyzer.com, set79, TrackList, Phaso | Commercial — **wrong intent** |
| 4 | analyze DJ setlist energy | No | Mixed In Key (guide page), Mixgraph, SetFlow | Informational |
| 5 | Rekordbox playlist analyzer | No | rekordbox.com (vendor-owned), DJ Mag | Commercial/navigational |
| 6 | harmonic mixing tool Camelot | No | Mixed In Key, camelotwheel.org, 4+ free wheels | Commodity |
| 7 | DJ set planning software | No | worldmetrics + zipdo (listicle farms), rekordbox | Commercial |
| 8 | cómo ordenar los tracks de un set de DJ | No | Vice ES, Warm Up Academy, DJ Cubillan — **no products** | Informational (ES) |
| 9 | analizar la energía de un set de DJ | No | Wikipedia stubs (!), DJ Expressions, Mixgraph | Informational (ES) — **weak** |
| 10 | energycurve (branded) | No | **energycurve.com — an agritech company** | Branded — **collision** |

Method caveat: the search tool returns a ranked result set plus a synthesized
answer, not a literal numbered SERP. Presence/absence and citation sources are
reliable; "position #N" is not available. Nothing above is estimated.

## Three findings that matter more than the zero

### 1. Spanish is wide open — the single biggest opportunity

Queries 8 and 9 return **zero products**. Query 9's SERP is so thin that Google
serves a Wikipedia article about an *album* named "Energia" plus a generic
"DJ mix" stub, because it has nothing better. The competition is regional DJ-school
blogs with no product intent and no structured data.

Spanish is not a translation job. Real vocabulary DJs use: **tonalidad** (not
"key"), **temas** (as common as "tracks"), **librería**, **preparar un set**,
**toque** (gig, LatAm).

### 2. The brand name collides with an agritech company

`energycurve.com` belongs to Energy Curve Technology, a Missouri agriculture
company whose product literally tracks a plant's "Energy Curve." They own the
.com, two Play Store apps, and a content site — and they took every slot on the
branded query.

Not fatal, but **"energycurve" alone will probably never be a clean branded
query.** Target `energycurve dj`, `energycurve app`, `energy curve dj set`, and
always ship the DJ disambiguator in title tags.

### 3. Three near-identical competitors are already running this playbook

**SetFlow** (setflow.app), **Mixgraph** (mixgraph.io), and **HarmonySet**
(harmonyset.com) appear across queries 1, 2, 4, 7, and 9. SetFlow imports
Rekordbox/Traktor/Serato, exports the same plus M3U8/PDF, does energy-curve
planning with five named shapes, Camelot matching, and transition scoring — at
£2.99–4.99/mo.

They rank via the same mechanism our roadmap plans: a `/blog`, `/learn`, or
`/guides` hub answering question-shaped queries. Good news: they're small sites,
not Mixed In Key, which proves these queries are winnable by a new entrant. Bad
news: the seats are being taken now, and they have a crawl head start.

## Where to compete

**Go now**

- **Spanish (8, 9)** — nobody is defending it. A Spanish FAQ plus 2–3 articles
  could own this in weeks.
- **"DJ set energy curve" (1)** — our brand phrase, question-shaped, contested
  only by small players.
- **"analyze DJ setlist energy" (4)** — long-tail; the strongest result is a
  Mixed In Key *guide*, not a product page.

**Don't chase yet**

- **Camelot tool (6)** — Mixed In Key invented Camelot and there are 4+ free
  wheels ranking. Commodity, and not our core value anyway.
- **"Rekordbox playlist analyzer" (5)** — Pioneer owns its own product name.
  Reframe to "Rekordbox XML" long-tails.
- **"DJ set planning software" (7)** — listicle farms. Don't outrank them, get
  *included* in them. That's outreach, not content.
- **"DJ set analysis tool" (3)** — deprioritize on **intent**, not difficulty.
  Everything ranking does track *identification* of recorded mixes ("what songs
  were in this set"). We do pre-play ordering. Traffic from here bounces.

## Content gaps worth writing

One correction first: "how to convert a Rekordbox playlist to Traktor without
losing key tags" **is not a gap** — Lexicon ranks with dedicated pages in both
directions and advertises preserving BPM/key/comments, plus MIXO, MusConv, and
two GitHub tools. That lane is served and defended. Don't build there.

Real gaps:

1. **"Is my set order actually good?"** — everything ranking is *prescriptive*
   ("here's how to build an arc"). A probe for "score my DJ set out of 10"
   returned nothing relevant. Nobody offers "paste your tracklist, get a verdict
   on the order you already have." That is exactly this product, and the query
   space is empty.
2. **Pre-play vs post-play.** Phaso.io does energy arc + AI coaching, but on
   *recordings, after the gig*. An explicit comparison page ("analyze your set
   before you play it, not after") takes that traffic with a sharper promise.
3. **What to do when tracks have no BPM/key tags.** Every ranking guide assumes
   clean metadata. Our FAQ already answers this and it's the entry with no
   competing answer anywhere. Expand into a full page.
4. **How big an energy jump is too big?** Competitors give prose advice
   ("avoid >8% BPM jumps"); nobody flags the jumps in *your* playlist.
5. **M3U8 and plain-text tracklists.** All competitor content assumes you own
   Rekordbox/Serato/Traktor. Nothing serves the DJ with a text list. We support
   both.
6. **All of 1–5 in Spanish** — no equivalent exists at all.

## Vocabulary corrections (applied to the copy)

- **"energy flow" and "energy arc" outrank "energy curve" in real usage.**
  HarmonySet titles a page "DJ Set Energy Flow"; Mixgraph ships an "Energy Arc
  Planner." The brand is on the least-used synonym — so both alternatives now
  appear in body copy and in the keyword set.
- **Named set shapes are shared vocabulary**: warm-up → build → peak time →
  cool-down, "the classic arc," "after-hours," "sunrise set." Now used in the
  features copy.
- **The 1–10 collision**: Mixed In Key established 1–10 as a *per-track* energy
  scale. Ours scores the *whole set*. This will be misread, so there is now a
  dedicated FAQ entry spelling out the difference.
- **Camelot shorthand**: DJs write "5A to 7A," not "A minor to B minor."
- **"Transitions" / "blends"** are the units DJs discuss.
- Competitors hook on **time saved** ("two hours to two minutes"); our copy
  leads on quality. Worth testing the time angle.

## What to re-measure in a month

Same 10 queries, same method:

1. Does `site:energycurve.app` return anything? That's the crawl gate — nothing
   else can move until it opens.
2. Any appearance on 1, 4, 8, 9 (the winnable four).
3. Have SetFlow / Mixgraph / HarmonySet expanded their footprint? That's the
   competitive clock.
4. Does our FAQ get cited in an AI answer on any question-shaped query? That's
   the AEO signal proper.
