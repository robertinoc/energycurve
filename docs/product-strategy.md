# Product & Strategy v1

## Status

This document freezes EnergyCurve's initial product strategy so section 1 of the roadmap is explicit in the repository, not only in an external document.

The product strategy is considered **defined for v1**. The analysis engine is still implementation work, but the product direction, MVP boundaries, and core scoring assumptions are now fixed enough for engineering.

## Product Vision

EnergyCurve helps DJs design better sets through energy-curve analysis with clear, actionable feedback that adapts to musical context and genre.

The goal is to move set creation from something purely intuitive toward something assisted, conscious, and optimized without replacing artistic judgment.

## Problem

Today, DJs often:

- build sets mostly on intuition
- prioritize BPM or harmony but not overall energy
- lack objective validation tools
- make avoidable mistakes such as abrupt drops, flat sets, or poor adaptation to the set context

## Solution

EnergyCurve v1 is intended to:

- analyze playlists automatically
- visualize the energy curve
- detect structural issues
- suggest concrete improvements

It should behave like a creative copilot, not a replacement for the DJ's taste.

## Ideal Customer Profile

### Primary ICP

- beginner/intermediate DJs, roughly ages 18–35
- typically use Rekordbox, Serato, or Traktor
- mix at home or at small events
- publish sets and actively want to improve

Common pain points:

- insecurity when building sets
- lack of actionable feedback
- difficulty understanding progression and energy flow

### Secondary ICP

- semi-pro DJs who want to optimize sets, validate decisions, and save prep time

## Value Proposition

Core statement:

> Design sets that work on the dancefloor.

EnergyCurve should help users:

- understand the flow of a set
- avoid common structural mistakes
- improve progression
- gain confidence in their set design

## MVP Scope

### Included

- manual playlist input
- per-track energy score
- energy curve analysis
- context-aware adaptation
- genre-aware adaptation
- set score
- recommendations

### Excluded

- DJ software integrations
- audio analysis
- external track recommendations
- social features

## Product KPIs

### Adoption

- registered users
- playlists analyzed

### Engagement

- time spent on results screens
- recommendation interactions

### Retention

- returning users
- analyzed sets per user

## Context Modes

### Opening

- expected energy: low to medium
- should progress gradually

### Main

- expected energy: high
- should feel dynamic

### Closing

- expected energy: sustained and strong

## Supported Genres in v1

- House
- Techno
- Hard Techno
- Melodic Techno
- Progressive

The analysis should adapt expectations by genre instead of treating all energy progressions as equal.

## Product Principles

- Simple over complex
- Explainable over magical
- Assist, do not impose
- Focus on flow, not isolated tracks

## Technical Product Rules

### Energy Score v1

- each track receives a score from **1 to 10**
- `1` means very low energy
- `10` means maximum energy

If BPM is available, v1 uses these bands:

| BPM band | Score band |
| --- | --- |
| `< 115` | `3–4` |
| `115–122` | `4–5` |
| `122–128` | `5–7` |
| `128–135` | `6–8` |
| `135+` | `7–10` |

Fallback:

- if BPM is not available, estimate energy from relative position in the playlist

### Energy Curve

The energy curve is the ordered list of track energy scores.

Example:

```text
[3, 4, 5, 6, 7, 6, 8, 9]
```

### Analysis Rules v1

- abrupt drop: any adjacent score difference `>= 3`
- flat zone: `3` or more tracks with the same score
- early peak: depends on genre and context
- weak ending: final track below the expected context threshold

### Context Engine v1

| Context | Target energy band | Special rule |
| --- | --- | --- |
| Opening | `3–6` | avoid high peaks |
| Main | `6–9` | dynamic movement allowed |
| Closing | `7–9` | sustain a strong ending |

### Genre Engine v1

- Hard Techno:
  - do not penalize high energy
  - do penalize abrupt drops
- Progressive:
  - penalize early peaks
  - favor slower progression
- Melodic Techno:
  - allow more variation

### Set Score v1

Base formula:

```text
score = 10
  - (abrupt_drops * 1)
  - (flat_zones * 1)
  - (context_errors * 2)
  - (genre_errors * 1)
```

Clamp the final result to the `1–10` range.

### Standard Track Duration

- default estimate: `3 minutes per track`

### Final Output Bundle

The analysis system should ultimately return:

- set score
- energy curve
- issue list
- recommendations
- suggested order

## Repository Alignment

The current repository now reflects this strategy through:

- product strategy documentation in this file
- typed constants in `lib/product/strategy.ts`
- schema alignment for `energy_score`, `genre`, and `context`

The full scoring and recommendation engine is still future implementation work, but the product definition itself is now frozen enough for the next product phase.

