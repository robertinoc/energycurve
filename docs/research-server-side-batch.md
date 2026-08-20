# Research: server-side batch analysis

> Ran 20 Aug 2026. The H3 roadmap item, whose own wording made it conditional:
> **"server-side batch analysis (only if browser-first proves insufficient)"**.
>
> Answer: **browser-first did not prove insufficient, and the reason to decline
> is not cost.** Writing this up did surface a real defect in the browser path,
> which is fixed in the same PR. Verdict and reopening conditions at the bottom.

## The condition the task set for itself

The item was written in the strategy doc as a hedge, before the browser path
existed. It now exists and has been measured, so the hedge can be resolved
instead of carried.

| Measured | Where |
|---|---|
| 1 m 32 s for a 40-track playlist, whole-track | [spike, 15 Aug](spike-browser-audio-analysis.md) |
| **~30 s** for the same playlist after 3×30 s windowed sampling | shipped 17 Aug, `lib/audio/sample-windows.ts` |
| Cost is exactly linear in frames analysed | two controlled experiments in the spike |
| Tempo 8/8 exact | spike |

Thirty seconds, on the DJ's own CPU, for work they asked for and are watching
happen. A server would have to beat that end to end *including the upload*, and
it cannot: the upload alone is larger than the analysis.

## The arithmetic, for completeness

A 40-track playlist, which is one set:

| Format | Per 5-min track | The playlist |
|---|---|---|
| MP3 320 kbps | ~12 MB | **~480 MB** |
| WAV 44.1/16/stereo | ~50 MB | **~2 GB** |

DJs who care about untagged files are disproportionately the FLAC-and-WAV
crowd — that is *why* their files have no tags, they ripped or were sent them
rather than buying from a store that tags. So the 2 GB column is the realistic
one, not the optimistic one.

Two gigabytes up a domestic connection is minutes before a single frame is
analysed. Then it is our CPU, our storage, our egress, and a queue to operate,
to arrive at a number the browser had in thirty seconds for nothing.

**But cost is the weakest of the three arguments**, and if it were the only one
I would be writing an estimate rather than a verdict. A CDN and a spot worker
would make it affordable. The next section is why affordability is irrelevant.

## The argument that actually decides it

**"Your audio never leaves your computer" is not marketing copy we could soften.
It is a load-bearing claim, and it appears in twelve strings across two locales:**

- `lib/content/site-copy.ts` — the landing hero subhead, and the FAQ answer to
  the question literally titled *do you upload my music?*
- `lib/content/dashboard-copy.ts` — the import gateway, the audio-files tab, the
  format hint, the enrich panel
- `tests/seo.test.ts` — a test named *states that audio never leaves the device*
- `e2e/public-surface.spec.ts` — asserted on `/privacy` and `/es/privacy` in both
  languages

A server-side batch path does not add a feature to that product. It makes the
sentence false, and then every one of those twelve strings needs a qualifier —
*unless you choose the fast option*, *except in the cases where* — which is
exactly the shape of a privacy claim nobody believes. The claim's value comes
from being unconditional. A conditional version is worth less than no claim,
because a hedged promise reads as a hidden one.

It is also the only genuinely differentiating thing we say. Mixed In Key is
desktop software, so it never had to make the promise; every web competitor that
touches audio uploads it. Trading the one structural difference for a speedup
against a 30-second baseline is a bad trade at any price.

## What I found while writing this

The complaint the server path was reaching for is not speed. It is that **the
tab has to stay open**, and that turned out to be worse than I assumed:
`components/playlists/audio-enrich.tsx` accumulated every result in an array and
wrote once, after the loop. Thirty-nine of forty tracks analysed and a closed
laptop lid meant **zero tracks saved**.

That is the real defect, it has nothing to do with servers, and it is fixed in
this PR: results now flush every five tracks, so at most four tracks of work is
ever at risk. Five rather than one because forty round-trips to save forty
numbers is its own kind of rude; five bounds the loss to about four seconds of
analysis while cutting the writes to eight.

Worth stating plainly: **the roadmap item was a proxy for this bug.** It is the
second time this month that an infrastructure-shaped task turned out to be a
client-side bug wearing a costume, and it is a decent argument for measuring
before planning capacity.

## Verdict

**Declined, not deferred.** The condition the task set — *if browser-first proves
insufficient* — was tested and came back negative, so the item is closed rather
than carried at the bottom of H3 where nobody will ever pick it up.

## What would reopen it

Signals, not opinions. Any one of these is a real argument:

1. **A file the browser cannot decode at all** and a server codec can. `AIFF`
   and `ALAC` are the candidates; nobody has reported one. Note this reopens a
   *narrow transcode*, not batch analysis — and it still breaks the promise, so
   it would need to be opt-in per file with its own disclosure.
2. **Analysis has to happen when the user is not present** — e.g. a nightly
   library-wide pass on a Global Track Library (H2) too large to sit through.
   Different feature, different consent conversation, and the honest version
   would be a local desktop helper rather than an upload.
3. **A machine class where 30 s becomes 5 minutes.** Plausible on a low-end
   phone. The answer there is to decline the analysis and say why, not to
   upload — a DJ analysing a 40-track set on a phone is not a scenario we owe a
   fast path.
4. **Measured demand**: users asking for it in feedback, having read that their
   audio stays local. Nobody has. The feedback form is live and this is
   precisely what it is for.

## What I could not verify

- Real-world upload throughput for the target user. The 2 GB figure is
  arithmetic from bitrates, not a measurement, and it did not need to be
  precise: the verdict does not rest on it.
- Whether any user has *wanted* this. There is no signal either way yet, which
  is itself the reason to close rather than build. Reopening condition #4 exists
  to catch it if the signal ever appears.
