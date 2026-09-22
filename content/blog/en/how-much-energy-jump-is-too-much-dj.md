---
title: "How much energy jump between two tracks is too much? A DJ's guide"
description: "Rules like 'never change BPM by more than 8%' help less than they promise, because the jump that ruins a transition is often not tempo at all."
slug: how-much-energy-jump-is-too-much-dj
locale: en
translationOf: cuanto-es-mucho-salto-de-energia
targetQuery: "energy jump between tracks DJ"
publishedAt: 2026-09-22
tags: energy curve, transitions, BPM
---

On a 1-to-10 energy scale, a jump of more than **two points upward** is audible and
more than three feels like a cut. Downward the margin is smaller still, because
dropping a floor is easy and lifting it again is not. Tempo has its own limit — past
6 to 8 percent you start to hear the pitch — but tempo is usually not the jump that
ruined the transition.

The most repeated rule in DJing is "do not change BPM by more than 6 or 8 percent
between two tracks". It is a useful rule and it is also incomplete.

Two tracks at exactly 150 BPM can still sound like a collision if one is a minimal
roller and the other arrives with the kick up front and the whole spectrum full. The
pulse matches; the feeling does not.

## The three jumps that matter

**Tempo.** The best known and the easiest to measure. Pitch fixes it up to a point;
past 6–8 percent it starts to be heard.

**Energy.** How much more intense a track feels than the one before. There is no
standard unit here, which is exactly why it is worth imposing one — 1 to 10, and the
thresholds at the top of this page.

**Harmony.** Incompatible keys sound wrong even when everything else fits. Be
suspicious of the short rule repeated everywhere — stay in the same key, go to its
relative, or move one position — because it leaves out a lot of mixes that work. What
actually goes with a given key is what the Camelot wheel tells you, and it works from
a considerably wider transition table than that rule:
[open it with your key](/tools/camelot-wheel) and see what it really offers.

## What each jump size feels like

| Energy jump | On the floor | When it is right |
|---|---|---|
| 0 to ±1 | Nothing happens, which is fine for one or two transitions | Inside a plateau you are holding on purpose |
| +2 | A lift people feel without looking up | The workhorse. Most of a climb should be made of these |
| +3 or more | A gear change; heads turn | Once or twice a set, and only with a track that can hold it |
| −2 | Room to breathe | After a peak, when the next track uses the space |
| −3 or more | The floor thins out | Almost never mid-set; it is how a warm-up gets handed over badly |

The row that gets ignored is the first one. **Too many flat transitions in a row is a
defect too** — a set that never moves more than a point is not restrained, it is a
set going nowhere, and it is much harder to notice than a jolt because nothing ever
sounds wrong.

## Why general rules are not enough

The trouble with "never exceed 8 percent" is that it is a rule about transitions in
the abstract, and you do not have transitions in the abstract: you have twenty-five
tracks in a specific order, and probably two or three specific transitions that are
the ones that are wrong. The other twenty-two are fine and do not need reviewing.

What is missing is not the rule. It is somebody pointing at **which** of your
transitions break it.

## How to check it by hand

If you want to do this without tools: build a table with three columns — track, BPM,
energy from 1 to 10. Work out the difference between each row and the next. Flag
anything that jumps more than two points of energy or more than 8 percent of BPM.

You will end up with two or three flagged rows. Those are the ones to look at. They
can almost always be fixed by moving a single track.

### Does the 8 percent BPM rule actually hold?

As a ceiling, roughly. What it hides is that the same 8 percent is much more
noticeable on a vocal than on a drum tool, because the pitch shift lands on something
your ear knows the pitch of. If the outgoing track has a recognisable vocal, treat 4
percent as the practical limit and use the full range on instrumentals.

### Is a big drop ever correct?

Yes, and it is one of the strongest moves available — but only when what follows
earns it. A −3 into a track that rebuilds over the next two minutes reads as
deliberate. The same −3 into something that also sits at 5 reads as a mistake, and
the floor treats it as one.

### What if my tracks have no energy value at all?

Then you assign them, and your own numbers are the best input available. Failing
that, energy can be estimated from BPM and from properties of the audio, but it is an
estimate — see [what to do when your tags are empty](/blog/dj-tracks-with-no-bpm-or-key)
for what is recoverable and how much to trust each source.

## What we automate

EnergyCurve does that arithmetic for you and marks the jumps on the curve, with the
specific move for each one: "send track 7 to position 3", and how much the score
rises if you do. It also flags the opposite, which is much less visible: too many
flat transitions in a row.

If you are not sure your software writes an energy value at all,
[energy tags](/energy-tags) covers how Rekordbox, Serato and Traktor each store one.

[See the jumps in your set](https://energycurve.app)
