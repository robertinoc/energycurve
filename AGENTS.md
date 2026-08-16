<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# EnergyCurve Notes

- **The product is live and selling.** Stripe is in live mode, PRO and PRO+ are purchasable, and the paid tiers have real features behind them. Anything that changes scoring, gating or billing now changes what someone already paid for.
- Core scope: playlist ingestion, the energy/analysis/recommendation engines, the results UI, and the DJ-familiar tracklist on the playlist detail page (dense track table + live set curve; see `docs/product-feature-03-dj-tracklist.md`). Implement engines strictly against the frozen constants in `lib/product/strategy.ts` — do not invent new scoring rules.
- Local audio import (`docs/product-feature-04-local-audio-import.md`) parses tags client-side (`music-metadata`, lazy-loaded via dynamic `import()`); audio bytes never reach the server — only the parsed `ImportedTrack` JSON, validated by `createAudioImportSchema` (coerce-to-null stance for messy tags).
- Data ownership is enforced in the service layer (`services/*-service.ts`): every playlist/track function takes a `profileId` and scopes queries by it. Never skip that check — RLS will not catch it (see decision 22 in `docs/decisions.md`).
- Authentication must use WorkOS AuthKit. Do not introduce Supabase Auth.
- Supabase is reserved for application data and is accessed server-side only through `lib/supabase/server.ts`.
- `proxy.ts` fulfills the middleware/protected-route role because this project uses Next.js 16.
- Product direction and plan gating live in `docs/product-strategy-v2.md` (vision, market, Energy Model v3, FREE/PRO/PRO+ matrix). New features must state their plan tier; engine scoring rules still come only from `lib/product/strategy.ts`.
- Keep `README.md` and `docs/*.md` updated whenever infrastructure changes.

## Plan gating and pricing (decided 12 Aug 2026 — do not silently change)

- Prices are **FREE $0 / PRO $9.99 / PRO+ $19.99** monthly, $99 / $199 annual.
  Same ladder as StageLink. Never propose lower: underpricing can't be undone
  later without churning users.
- **Native export stays free forever.** Rekordbox XML, Traktor NML, and M3U8
  export are free on every tier. Getting the fixed order back into the booth is
  what makes the analysis actionable, so paywalling it breaks the product loop —
  and it is the exact move that gets Lexicon and MIXO resented for charging per
  conversion. `tests/pricing-copy.test.ts` fails if it ever moves behind a plan.
- **PRO is the recommended plan** on `/pricing` and on the landing's plan band.
  Exactly one plan may be `recommended` (enforced by test).
- **Nothing unbuilt may render as included.** Plan-matrix cells and card
  highlights use a `soon` flag that renders a clock and a "Soon" label. The free
  tier's highlights must contain no `soon` at all — everything it advertises has
  to already work. Tests enforce both.
- Paid schema.org offers stay `PreOrder`. Flip them to `InStock` in the same
  change that ships Stripe checkout, not before.
- Tier rule for new features: audio + engine/planning depth is **PRO**; variable
  cost (AI, lookups), multi-user, or whole-library workflow is **PRO+**. The
  heuristic (non-AI) reordering is never paywalled.

## EnergyCurve is operated by StageLink LLC

Payments are processed under that name, so a customer's card statement and
receipts read "StageLink LLC", not "EnergyCurve". This is stated up front on
purpose — on the landing's suite section, in the FAQ, in the footer, on
`/pricing`, in the transactional-email footer, and in both the terms and the
privacy policy. `tests/seo.test.ts` fails if any of those drop the name in
either locale. Do not "clean up" those mentions.

## SEO / AEO conventions

- `lib/seo.ts` is the single source for the canonical origin, the keyword set,
  and the schema.org graphs. The FAQPage entities are generated from the same
  copy the page renders, so markup can never contradict visible text — keep it
  that way rather than hand-writing JSON-LD.
- The FAQ uses native `<details>` so every answer ships in the HTML while
  collapsed. Don't replace it with a JS-only accordion.
- Vocabulary: DJs search "energy flow" and "energy arc" more than "energy
  curve", and Mixed In Key's 1-10 means *per-track* energy while ours scores the
  *whole set* — the FAQ disambiguates this deliberately. Baseline and the full
  vocabulary notes: `docs/seo-aeo-baseline-2026-08.md`.

## What is gated, and where to look

`lib/product/capabilities.ts` is the registry: every capability, its minimum
plan, whether it is `shipped` or `planned`, and which `PlanLimits` key backs it.
`tests/capabilities.test.ts` asserts the registry and the public pricing matrix
in `lib/content/site-copy.ts` agree, so a feature can't ship as included while
the page says "soon", or the reverse.

**Adding a gated feature means four things, not one**: a registry entry, a
pricing row with the same `key`, a `can(...)` call at the real boundary (service
or page, never only the UI), and a line in `docs/plan-gating.md`. Skipping the
`can(...)` is the one that silently gives the feature away.

Two rules that keep coming up and should not be re-litigated per feature:

- **Native export is free forever, on every tier.** The loop is analyse → fix →
  get it back into the booth; paywalling the last step makes the first two
  pointless. A test enforces it.
- **Recording is free; reading is paid.** Declaring a slot, picking a curve
  shape and capturing version history all happen for everyone; the analysis that
  reads them is PRO. A free user who upgrades finds their history already there
  instead of starting empty.

## Conventions that only show up once you've shipped a few of these

- **Server-side is the boundary.** Hiding a button is presentation; a guessed
  URL has to meet the same wall. Every gated page checks `can(...)` itself.
- **Say what isn't known.** `null` for an unscored version, "no key on one side"
  instead of a confident verdict, "never played *as far as we recorded*". A
  number the product can't stand behind is worse than an absent one.
- **Charts must not dramatise.** `curveDomain` crops a shared axis so a
  difference is legible, but never below a 3-point span — auto-scaling alone
  turns a 0.2 difference into a mountain range.
- **Track identity across playlists goes through `trackKey`** (in
  `lib/playlists/set-comparison.ts`). The set comparator and the global library
  both use it, so "you play this in three sets" and "these two nights share
  nothing" can never contradict each other.
- **Transactional email language comes from `profiles.preferred_locale`**, not
  from a request cookie. Null means "never chose" and resolves to English.

## Verifying a change

`npx tsc --noEmit` is the authority, and it is not optional even when the tests
pass. Two ways that has bitten:

- A syntax error anywhere (a bad merge resolution, a missing brace in a copy
  file) makes suites fail to *load*. The summary line still reads "N passed" —
  just a smaller N — so reading only the tail of the output looks green.
- The dev server writes `.next/dev/types/`. A transient syntax error in there
  makes `tsc` bail before it reaches semantic checks, and filtering those lines
  out of the output hides that nothing else was checked. Stop the dev server, or
  delete the directory, before trusting a clean run.

## Parallel PRs

Several feature branches open at once against the same files will conflict on
merge, and the copy tables are where it always happens. Anchor a new block in
`lib/content/dashboard-copy.ts` at a *different* existing key per branch rather
than all at the same one — that alone reduced a four-way conflict to a
one-line documentation clash.

Rebase the branch and resolve; never open a PR whose base is another branch.

## Local test runs

`vitest.config.ts` excludes `**/.claude/**`. Agent worktrees there are full
checkouts, so without the exclusion the local run executes other branches'
suites too — which is why runs once reported 643 tests for a repo that has ~350.
The same reason `.claude/**` is in the eslint ignores. CI clones fresh and was
always correct.

## Dependency licensing is a hard constraint

EnergyCurve is closed-source and charges money, and browser-side features **ship
their dependencies to the user's machine**. So: **no AGPL or GPL dependencies**,
ever, in anything that reaches the client.

This is not hypothetical — it already changed the roadmap. Essentia.js, named in
the strategy doc as the audio-analysis engine, is AGPL-3.0 and had to be dropped
(its commercial licence is an unpriced negotiation with a university). aubio /
aubiojs are GPL-3.0 and out for the same reason. Check `license` in a package's
metadata before adding it; when the only good library is copyleft, implement the
algorithm instead — that's why `lib/audio/key-detection.ts` exists.

See `docs/spike-browser-audio-analysis.md`.
