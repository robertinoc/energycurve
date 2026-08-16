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
| Applied fixes | ∞ | ∞ | ∞ |
| AI ordering (Claude) | 1 / month | 3 / month | ∞ |
| Custom genres + set contexts | 2 (combined) | ∞ | ∞ |
| Import, analysis, curve, score | ✓ | ✓ | ✓ |
| Heuristic reordering | ✓ | ✓ | ✓ |
| **Native export** (Rekordbox / Traktor / M3U8) | ✓ | ✓ | ✓ |
| **Slot-aware planning**, **named curve shapes**, **PDF set sheet**, **order history**, **planned vs played**, **real BPM from audio** | ✗ | ✓ | ✓ |
| Key detection from audio, Energy Model v3 | ✗ | soon | soon |
| **Set comparator** (two sets side by side), **global library**, **per-transition advice** | ✗ | ✗ | ✓ |
| Curve templates, residency mode, B2B sets, Gig Mode | ✗ | ✗ | soon |

**Applied fixes are uncapped on every tier.** A cap was advertised on /pricing
and never enforced anywhere: applying a fix is local, instant and reversible, so
there is no server boundary to meter. It also made the free tier feel broken on
the exact interaction that demonstrates the product. `tests/capabilities.test.ts`
asserts that any capability carrying a numeric limit is actually referenced by
code — that test exists because of this row.

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
| `activePlaylists` | `services/playlist-service.ts` → `createPlaylist` | **done** — throws `PlaylistLimitError`, which all three creation paths translate |
| `aiOrderingsPerMonth` | `app/api/playlists/[id]/smart-order/route.ts` | **done** — via `feature_usage` (migration 0014) |
| `fixesPerMonth` | — | **not enforceable as specified** — see below |
| `audioAnalysis`, `versionHistory`, `proWorkflow` | — | n/a — the features don't exist yet |

### Monthly quotas

`feature_usage` (migration 0014) holds one row per profile / capability / month.
The increment goes through `consume_feature_quota`, a Postgres function whose
`on conflict … where used < limit` does the check and the write in one statement,
so two concurrent requests can't both pass at the boundary.

Unlimited plans never touch it: `null` means unlimited and the caller skips the
round-trip rather than encoding "no limit" as a sentinel.

Two deliberate choices in the AI-ordering gate, both about charging for what we
actually spend:

- **A cache hit costs nothing.** `smart-order` keeps an in-memory cache keyed by
  tracklist, so the gate sits *after* the cache check. Charging for a hit would
  meter our infrastructure instead of our cost — and would make someone's monthly
  allowance depend on when we last deployed, since the cache is per-process.
- **The quota is consumed after Claude answers**, not before. A fallback to the
  local heuristic still returns a usable order, but it cost nothing. The trade is
  that a burst of simultaneous requests can each clear the pre-check; bounded by
  how fast a person clicks, and the counter stays correct either way.

Both read and consume **fail open** on a database error. An uncounted use is
cheaper than telling a paying customer they hit a limit they didn't.

### Applied fixes are uncapped, on purpose (decided 2026-08-14)

`/pricing` used to advertise "Applied fixes — 3 / month" on FREE. Nothing enforced
it, and nothing could: `applyFix` in `components/analysis/analysis-workbench.tsx`
adds an id to React state and writes localStorage. It never reaches the server.
The only server call in that flow is `reorderTracksAction`, when the user *saves*
the resulting order — a bad proxy, since one save can carry ten applied fixes and
a manual drag-reorder carries none.

The cap was removed rather than the feature. The matrix row now reads yes / yes /
yes, `fixesPerMonth` is gone from `PlanLimits`, and `applied_fixes` stays in the
registry with no `limit`.

Two reasons, in order:

1. **It's the value demo.** Applying a fix and watching the curve change is what
   convinces someone the product works. Metering that makes the free tier feel
   broken on the one interaction that has to feel generous.
2. **It couldn't be honoured.** A published cap with no enforcement is a promise
   we break, and the alternatives were worse: metering saved reorders would also
   meter manual dragging, and a client-side cap is both bypassable and punitive
   on an instant local interaction.

The differentiators that remain are real and enforced: unlimited playlists,
unlimited custom taxonomies, more AI orderings, and (soon) audio analysis.

`tests/capabilities.test.ts` now guards the class rather than the instance: any
capability declaring a **numeric** limit must be referenced by code under `app/`
or `services/`. Declaring a cap nobody applies fails the build. The earlier
consistency test couldn't catch this — it proves the advertised number matches
`PLAN_LIMITS`, not that anything reads it.

## What is still missing for any of this to sell

Nothing in the app reads the plan. There's no plan badge, no post-checkout
confirmation, and no "manage my subscription" link — the billing portal is only
reachable by hand-calling `/api/billing/portal`. A subscriber pays and the
product looks identical, which is its own problem, independent of gating. See
`docs/billing.md`.
