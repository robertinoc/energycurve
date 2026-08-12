<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# EnergyCurve Notes

- Current scope is the product MVP: playlist ingestion, the energy/analysis/recommendation engines, the results UI, and the DJ-familiar tracklist on the playlist detail page (dense track table + live set curve; see `docs/product-feature-03-dj-tracklist.md`). Implement engines strictly against the frozen constants in `lib/product/strategy.ts` — do not invent new scoring rules.
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

## Local test runs

`vitest.config.ts` excludes `**/.claude/**`. Agent worktrees there are full
checkouts, so without the exclusion the local run executes other branches'
suites too — which is why runs once reported 643 tests for a repo that has ~350.
The same reason `.claude/**` is in the eslint ignores. CI clones fresh and was
always correct.
