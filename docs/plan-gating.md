# Plan gating

Where each feature sits on the FREE / PRO / PRO+ ladder, and how the code
enforces it.

## The rule for new features

**Every feature gets a row in the public matrix and an entry in the registry,
before it ships.** Two files, in this order:

1. `lib/content/site-copy.ts` → `pricing.rows` — the public promise. Each row
   carries a `key`, plus a cell per tier (`"yes"`, `"no"`, `"soon"`, or text like
   `"3 / month"`).
2. `lib/product/capabilities.ts` → `CAPABILITIES` — the same key, with
   `minPlan`, `status` (`shipped` | `planned`), and `limit` when a number backs it.

`tests/capabilities.test.ts` fails if the two disagree, so neither can be
forgotten. A feature that isn't built yet still gets both, with `"soon"` cells
and `status: "planned"` — that way its tier is decided when the roadmap decides
it, not improvised at merge time.

Numbers live in **one** place: `PLAN_LIMITS` in `lib/product/plans.ts`. The
registry says *which tier* unlocks a thing; `PLAN_LIMITS` says *how many*.

## Why the drift test exists

`/pricing` advertised **2** custom taxonomies. The shipped code enforced **12**,
per kind, ignoring the plan entirely. Three deviations from the promise in one
constant, live, unnoticed. The playlist limit (`free: 3`) wasn't enforced at all.

Marketing copy and gating code drift by default: they're edited by different
people at different times for different reasons. The test is what makes them
edit together.

## The ladder

| | FREE | PRO | PRO+ |
|---|---|---|---|
| Active playlists | 3 | ∞ | ∞ |
| Applied fixes | 3 / month | ∞ | ∞ |
| AI ordering (Claude) | 1 / month | 3 / month | ∞ |
| Custom genres + set contexts | 2 (combined) | ∞ | ∞ |
| Import, analysis, curve, score | ✓ | ✓ | ✓ |
| Heuristic reordering | ✓ | ✓ | ✓ |
| **Native export** (Rekordbox / Traktor / M3U8) | ✓ | ✓ | ✓ |
| Real audio analysis, Energy Model v3, version history, slot-aware planning, curve shapes, planned-vs-played, PDF set sheet | ✗ | soon | soon |
| Curve templates, residency mode, B2B sets, Gig Mode, global library, per-transition suggestions | ✗ | ✗ | soon |

**Native export is free forever, on every tier.** The loop is analyse → fix →
get it back into the booth; paywalling the last step makes the first two
pointless. It has no `PlanLimits` key, and `tests/capabilities.test.ts` asserts
both that it's free everywhere and that no export-shaped limit key appears. Do
not move it.

## Using the gate

```ts
import { can, isAvailable, quotaFor } from "@/lib/product/capabilities"

can(plan, status, "gig_mode")        // entitled? (ignores whether it's built)
isAvailable(plan, status, "gig_mode") // entitled AND built
quotaFor(plan, status, "active_playlists") // number | null (null = unlimited)
```

`can` vs `isAvailable` is a real distinction: a PRO+ subscriber *is* entitled to
Gig Mode today, it just doesn't exist. Use `can` to decide whether to show an
upgrade prompt; use `isAvailable` to decide whether to render a feature.

Entitlement always flows through `effectivePlan`, so a lapsed subscriber
(`past_due`, `canceled`) reads as free while the profile keeps `plan: "pro"` —
that's what lets the UI say "your subscription is past due" instead of silently
demoting someone.

## Behaviour at a limit

**Reaching a cap blocks creation. It never hides, locks or deletes anything.**

Someone who ends up over a limit — by downgrading, or because a limit tightened —
keeps everything they made and simply can't add more. This is a settled decision
(2026-08-13): the alternative holds a user's own playlists hostage to a plan
change, which converts faster and costs more than it earns.

Encoded in `atTaxonomyLimit()` (`lib/playlists/taxonomy-validation.ts`) and
asserted in `tests/taxonomy.test.ts`.

## Where enforcement lives

| Limit | Enforced in | Status |
|---|---|---|
| `customTaxonomies` | `services/taxonomy-service.ts` → `taxonomyUsage` | **done** — plan-aware, counted across contexts + genres combined |
| `activePlaylists` | — | **not yet** — needs a count check on the three creation paths (`createPlaylistWithTracksAction`, `importPlaylistAction`, `importAudioFilesAction`) |
| `fixesPerMonth` | — | **blocked** — needs monthly usage tracking |
| `aiOrderingsPerMonth` | — | **blocked** — needs monthly usage tracking |
| `audioAnalysis`, `versionHistory`, `proWorkflow` | — | n/a — the features don't exist yet |

Gates belong in the **service**, not the action, so a new caller can't skip one.
The service returns a typed validation result; the action turns it into localised
copy.

### The monthly quotas need a migration

There is no usage table. `smart-order` persists nothing, and applied fixes aren't
recorded either, so "3 per month" is currently uncountable. Enforcing the two
monthly caps means a `feature_usage` table (profile, capability key, period,
count) plus writes at both call sites — its own change, deliberately not bolted
onto this one.

Until then FREE users get unlimited fixes and unlimited AI orderings. **The AI
ordering one costs real money per use**, so it's the more urgent of the two.

## What is still missing for any of this to sell

Nothing in the app reads the plan. There's no plan badge, no post-checkout
confirmation, and no "manage my subscription" link — the billing portal is only
reachable by hand-calling `/api/billing/portal`. A subscriber pays and the
product looks identical, which is its own problem, independent of gating. See
`docs/billing.md`.
