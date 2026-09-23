---
title: "What is a DJ set energy curve, and why it matters more than BPM"
description: "An energy curve is the shape your set makes over time: where it lifts, holds and lands. A different question from tempo, and the one a floor answers."
slug: what-is-a-dj-set-energy-curve
locale: en
targetQuery: "what is a DJ set energy curve"
publishedAt: 2026-09-22
tags: energy curve, fundamentals, set prep
---

A **DJ set energy curve** is the shape your set makes over time: the line you get by
reading the intensity of each track in play order and joining the dots. It says where
the set lifts, where it holds, and where it lands. It is not a measure of tempo, and
that is the whole reason it is worth drawing separately.

Tempo is the number every DJ already has. Every track in your library carries a BPM,
every piece of software shows it, and sorting by it is one click. So it becomes the
default way to think about order — and it quietly answers the wrong question.

## Why BPM is not the same question

Two tracks at 128 BPM can do completely different things to a room. One is sparse,
dubby, three elements and a lot of space. The other is a full-width peak-time record
with a vocal hook. Same tempo, opposite jobs. A set ordered by BPM alone treats them
as interchangeable, and the floor does not.

The reverse trap is just as common. A drop from 140 to 132 looks like a big move on
paper. If the 132 track is heavier, it may be a **lift** in the room. Tempo went down;
energy went up. Any tool reading only BPM will report that backwards.

This is why EnergyCurve scores the whole set on its own **1 to 10** scale rather than
inferring everything from tempo. BPM is one input. It is a good one — tempo and
intensity really are correlated, and the engine uses tempo bands as a starting point
when a track carries no energy tag at all — but a correlation used as a substitute is
how you end up confidently wrong about the middle of your night.

## What the curve actually shows you

Drawn out, a set stops being a list and becomes a shape, and shapes have problems you
can see from across the room.

**The abrupt drop.** Two tracks next to each other whose energy differs by **3 points
or more** on the 1-10 scale. That is the threshold the engine flags, and it is flagged
because it is the moment a floor thins out — people read the gap as the set ending and
go to the bar. Sometimes you want it. A deliberate reset before the last third is a
real move. The point is that you should be choosing it.

**The flat zone.** **Three or more tracks in a row** at the same level. Nothing wrong
happens, exactly; the set just stops saying anything for twelve minutes. This is the
single most common thing a curve reveals that a tracklist hides, because in a list
those three tracks all look fine individually.

**The weak ending.** A set that finishes below the middle of the scale. For most
contexts that is a set that trails off rather than lands.

**The early peak.** Everything you had, spent in the first third, with an hour still to
play. This one depends on the genre — some styles build slowly and hate a premature
climax, others do not mind — which is why the engine treats it as genre-dependent
rather than as a universal rule.

## The curve depends on the slot, not just the set

A curve is not good or bad in the abstract. It is good or bad **for a slot**, and the
same tracklist can be both.

EnergyCurve asks which of three contexts you are playing, and the expected band moves
with it. An **opening** set is expected to sit roughly between 3 and 6, and a high peak
in it is a fault rather than a highlight — you are warming a room, not taking it. A
**main** slot is expected between 6 and 9, and high peaks belong there. A **closing**
set sits higher and tighter still.

So a curve that peaks at 9 in the first forty minutes is a problem in an opening slot
and completely correct in a main one. A tool that does not ask which one you are
playing cannot tell you which you have.

## Where the energy numbers come from

This is the part people expect to be harder than it is. Most DJs already have energy
values and do not think of them as data.

If you use Mixed In Key, your tracks carry an energy level in the comment field. If you
tag by hand in Rekordbox's Grouping column, that is a value too. Lexicon DJ can write a
dedicated ENERGY field. EnergyCurve reads all of those — the full list is on
[the energy tags page](/energy-tags), along with which field wins when a track carries
more than one.

And when a track carries nothing, the honest answer is to say so. A set where half the
tracks have no tags produces a curve that is partly measurement and partly inference,
and the product's rule is to tell you which part is which rather than draw one
confident line through both. If that is your library, the specific version of this
problem is covered in
[what to do when your tracks have no BPM or key](/blog/dj-tracks-with-no-bpm-or-key).

## Reading a curve is a skill you already have

Nothing here is new to a DJ. You already know that a set needs to go somewhere, that
you cannot open at ten, that a room you drop too hard does not always come back. The
curve is not teaching you that. It is showing you whether the set in front of you does
what you already know it should — before the room is the thing that tells you.

That is the only real argument for looking at it beforehand rather than after. A
recording analysed on Sunday tells you what happened. A tracklist analysed on Thursday
tells you what to move. Both are worth having; only one of them changes the night. That
distinction is the subject of
[analysing your set before you play it](/blog/analyse-your-dj-set-before-you-play-it).

You can draw the curve for a set right now, with no account, on
[the energy curve tool](/tools/energy-curve) — paste a tracklist or drop an export from
your software.

```faq
Q: Is an energy curve the same as an energy level?
A: No, and this is the most common confusion. Mixed In Key's 1-10 is a value for a
single track. An energy curve is the shape the whole set makes when those values are
read in play order. One describes a record; the other describes a night.

Q: Do I need Mixed In Key to get a curve?
A: No. EnergyCurve reads a dedicated ENERGY field, the comment field, Rekordbox's
Grouping column and a few others — a value you typed by hand works the same as one a
tool wrote. See [the energy tags page](/energy-tags) for the full list.

Q: What happens if my tracks have no energy tags at all?
A: You still get a curve, drawn from tempo bands and position, and the product tells
you that is what it did. A set with nothing tagged gets no score at all rather than a
number that looks measured and is not.
```
