# Roadmap Status

## Section 1 — Product & Strategy

**Status:** Complete for v1 definition

What is now closed:

- ICP documented
- MVP scope frozen
- product KPIs defined
- track energy score range defined as `1–10`
- energy score v1 logic documented
- analysis rules documented
- context modes documented
- standard track duration documented

Repository anchors:

- [docs/product-strategy.md](/Users/robertinoc/Documents/code/energycurve/docs/product-strategy.md)
- [lib/product/strategy.ts](/Users/robertinoc/Documents/code/energycurve/lib/product/strategy.ts)

What is intentionally still future work:

- implementing the actual scoring engine
- implementing automated recommendation generation
- building the playlist ingestion and analysis workflows

## Section 2 — Setup & Infra

**Status:** Complete for foundation

What is now closed:

- GitHub repository
- Next.js + TypeScript + Tailwind + `shadcn/ui`
- WorkOS auth infrastructure chosen and wired
- Supabase used as database only
- initial schema created and aligned to the v1 product domain
- environment variables documented
- Vercel deployment configured
- basic structured logging centralized

Repository anchors:

- [docs/setup-infra.md](/Users/robertinoc/Documents/code/energycurve/docs/setup-infra.md)
- [docs/architecture.md](/Users/robertinoc/Documents/code/energycurve/docs/architecture.md)
- [docs/decisions.md](/Users/robertinoc/Documents/code/energycurve/docs/decisions.md)
- [lib/observability/logger.ts](/Users/robertinoc/Documents/code/energycurve/lib/observability/logger.ts)

Known non-blockers:

- WorkOS production unlock remains a deployment-hardening step, not a local foundation blocker
- dedicated Supabase production separation is still strongly recommended before production launch

## Section 3 — Auth & Users

**Status:** Complete for MVP

What is now closed:

- email/password signup
- email/password login
- logout
- route protection through `proxy.ts`
- secure WorkOS-backed session persistence
- minimal user model in `profiles`
- initial post-login dashboard
- auth failure handling and setup-state fallback
- optional Google sign-in as a secondary path
- initial auth workflow test coverage

Repository anchors:

- [docs/auth-users.md](/Users/robertinoc/Documents/code/energycurve/docs/auth-users.md)
- [docs/auth-hardening-backlog.md](/Users/robertinoc/Documents/code/energycurve/docs/auth-hardening-backlog.md)
- [app/login/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/login/page.tsx)
- [app/signup/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/signup/page.tsx)
- [app/dashboard/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/dashboard/page.tsx)
- [proxy.ts](/Users/robertinoc/Documents/code/energycurve/proxy.ts)
- [lib/auth/password-auth.ts](/Users/robertinoc/Documents/code/energycurve/lib/auth/password-auth.ts)
- [services/profile-service.ts](/Users/robertinoc/Documents/code/energycurve/services/profile-service.ts)
- [tests/auth-routing.test.ts](/Users/robertinoc/Documents/code/energycurve/tests/auth-routing.test.ts)
- [tests/password-auth-helpers.test.ts](/Users/robertinoc/Documents/code/energycurve/tests/password-auth-helpers.test.ts)

Known post-MVP follow-ups:

- real email verification
- password reset / recovery
- broader auth integration / end-to-end coverage
- account settings / profile management

## Section 4 — Playlist Input

**Status:** Complete for MVP

What is now closed:

- playlist creation with required genre and context
- playlist listing and detail screens in the dashboard
- manual track entry with add/edit/remove and stable ordering
- paste-import with "Artist - Track" / "Track - Artist" parsers, live preview, numbering-prefix stripping, and BPM suffix extraction
- input validation and normalization (Zod, EN/ES messages)
- ownership-scoped persistence in Supabase
- error handling across parser, actions, and services

Repository anchors:

- [lib/playlists/parse-tracklist.ts](/Users/robertinoc/Documents/code/energycurve/lib/playlists/parse-tracklist.ts)
- [lib/playlists/schemas.ts](/Users/robertinoc/Documents/code/energycurve/lib/playlists/schemas.ts)
- [services/playlist-service.ts](/Users/robertinoc/Documents/code/energycurve/services/playlist-service.ts)
- [app/dashboard/playlists/actions.ts](/Users/robertinoc/Documents/code/energycurve/app/dashboard/playlists/actions.ts)

## Section 5 — Track Engine & Analysis Engine

**Status:** Complete for MVP (v1 rules)

What is now closed:

- energy score from BPM via band interpolation, with position fallback and manual override precedence
- energy curve generation from resolved scores
- detection: abrupt drops, abrupt spikes, flat zones, early peaks, weak endings, context violations
- set score per `SET_SCORE_RULES_V1` with penalty-by-category breakdown
- per-context scoring and best-fit context
- estimated set duration

Repository anchors:

- [lib/engine/energy-score.ts](/Users/robertinoc/Documents/code/energycurve/lib/engine/energy-score.ts)
- [lib/engine/analysis.ts](/Users/robertinoc/Documents/code/energycurve/lib/engine/analysis.ts)
- [docs/product-feature-02-set-analysis.md](/Users/robertinoc/Documents/code/energycurve/docs/product-feature-02-set-analysis.md)

## Section 6 — Recommendations & Results UI

**Status:** Complete for MVP (template-based)

What is now closed:

- localized (EN/ES) actionable recommendations per detected issue
- informational hints: no progression, too many rests
- reorder suggestion (ascending energy) shown only when it strictly improves the score
- results screen: set score + penalty arithmetic, interactive energy curve with issue markers, issue list, recommendations, original vs suggested order
- dashboard shows real playlists with Edit / Analyze shortcuts

What is intentionally still future work:

- persisting analysis results (KPI: playlists analyzed)
- AI-generated narrative recommendations
- PostHog product analytics
- production hardening follow-ups from `docs/auth-hardening-backlog.md`

Repository anchors:

- [lib/engine/recommendations.ts](/Users/robertinoc/Documents/code/energycurve/lib/engine/recommendations.ts)
- [lib/content/analysis-copy.ts](/Users/robertinoc/Documents/code/energycurve/lib/content/analysis-copy.ts)
- [app/dashboard/playlists/[id]/analysis/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/dashboard/playlists/[id]/analysis/page.tsx)

## Section 7 — Analytics & Analysis History

**Status:** Complete for MVP (dashboards configured in PostHog, not in code)

What is now closed:

- `analyses` history table with content-hash dedupe (adoption KPI: playlists analyzed)
- PostHog server-side events: signup, playlist_created, analysis_started, analysis_completed
- Browser pageview/pageleave tracking (engagement KPI: time on results screen)
- Profile-id identity shared between server and browser events
- Graceful no-op everywhere when `NEXT_PUBLIC_POSTHOG_KEY` is unset

What is intentionally still future work:

- Building the actual PostHog dashboards (actives, analyses run, retention) — a PostHog-UI task, not code
- Alerting / weekly digests

Repository anchors:

- [supabase/migrations/0003_analyses.sql](/Users/robertinoc/Documents/code/energycurve/supabase/migrations/0003_analyses.sql)
- [lib/analytics/posthog-server.ts](/Users/robertinoc/Documents/code/energycurve/lib/analytics/posthog-server.ts)
- [components/analytics/analytics-tracker.tsx](/Users/robertinoc/Documents/code/energycurve/components/analytics/analytics-tracker.tsx)
- [services/analysis-service.ts](/Users/robertinoc/Documents/code/energycurve/services/analysis-service.ts)

## Section 8 — Launch Readiness

**Status:** Code complete; deployment hardening tasks remain operational

What is now closed:

- password reset flow (`/forgot-password`, `/reset-password`) with Resend delivery and anti-enumeration
- email verification flow behind `AUTH_REQUIRE_EMAIL_VERIFICATION` (`/verify-email`, WorkOS-sent codes, resend)
- getting-started onboarding block on the empty dashboard
- `/api/health` uptime probe (overall status + database reachability, no sensitive detail)

What remains operational (not code):

- WorkOS `Production` unlock + Vercel production env vars
- dedicated Supabase production project + applied migrations
- PostHog project + `NEXT_PUBLIC_POSTHOG_KEY`
- Resend account + domain + `RESEND_API_KEY` / `RESEND_FROM_EMAIL`
- flipping `AUTH_REQUIRE_EMAIL_VERIFICATION=true` after one manual email test
- external uptime monitor pointed at `/api/health`
- collecting user feedback post-launch

## Post-launch — DJ-familiar tracklist (feature 03)

**Status:** In progress (post-launch enhancement)

Making the playlist screen read like Rekordbox/Traktor so DJs feel at home. Full write-up: `docs/product-feature-03-dj-tracklist.md`; rationale in decision 25.

- PR1 — per-track metadata (key/genre/comment/duration) captured on import + persisted (migration `0008`) + `lib/music/camelot.ts`: **done**.
- PR2 — dense track table + live set curve + collapsible genre note + customizable columns, replacing the card-list editor: **done**.
- PR3 — reorder & save (drag + column sort → preview/Undo/Save + toast, persisted via bulk `reorderTracks`): **done**.
- PR4 — Export dropdown (For Rekordbox/Traktor/Serato-soon/CSV/TXT) + native metadata round-trip: **done**.
- PR5 — sidebar playlist tree: **done**.

## Post-launch — local audio files import (feature 04)

**Status:** Done

Third way in: pick audio files (or a folder) from disk; tags (BPM/key/genre/MIK energy/duration) are parsed client-side with music-metadata — audio never leaves the browser, only the parsed JSON (validated by `createAudioImportSchema`) reaches the server. Full write-up: `docs/product-feature-04-local-audio-import.md`.

Repository anchors:

- [lib/auth/password-reset.ts](/Users/robertinoc/Documents/code/energycurve/lib/auth/password-reset.ts)
- [lib/auth/email-verification.ts](/Users/robertinoc/Documents/code/energycurve/lib/auth/email-verification.ts)
- [lib/email/send-email.ts](/Users/robertinoc/Documents/code/energycurve/lib/email/send-email.ts)
- [app/api/health/route.ts](/Users/robertinoc/Documents/code/energycurve/app/api/health/route.ts)

## Strategy 2.0 — horizons (approved 2026-08-12)

Full strategy: `docs/product-strategy-v2.md` (market analysis, science-based
Energy Model v3, FREE/PRO/PRO+ plans at $5.99/$11.99).

- **H1 (now)**: in-browser audio analysis (meyda + web-audio-beat-detector — Essentia.js ruled out on AGPL, see spike-browser-audio-analysis.md) · Energy Model v3
  (arousal multi-feature, calibrated vs MIK tags) · set version history ·
  NML missing-files warning · M3U8-first for file-sourced playlists ·
  billing foundation (Stripe + plan gates).
- **H2 (next)**: Gig Mode (offline PWA) · global track library + insights ·
  set comparator · per-transition suggestions (B20 expansion) · USB export
  research.
- **H3 (later)**: server-side batch analysis (if demanded) · title-lookup
  enrichment API (PRO+) · Beatport/Lexicon partnerships · public set curves
  (growth loop).

## Content, SEO & AEO — closed 12 Aug 2026

Shipped in PRs #82 and #83:

- Landing copy rewritten around what the product actually does, with the
  vocabulary DJs really search ("energy flow", "energy arc", named set shapes).
  Removed the "upload a mix" promise, which was never true.
- StageLink LLC transparency: dedicated suite section, FAQ entry, footer line,
  transactional-email footer, and the operating entity named in both the terms
  and the privacy policy. Tests pin all of it in EN and ES.
- SEO: keyword-bearing metadata + `metadataBase`, `robots.ts`, `sitemap.ts`,
  a generated Open Graph image, and a schema.org graph (Organization with
  `parentOrganization: StageLink LLC`, SoftwareApplication with the price
  points, FAQPage generated from the rendered copy).
- AEO: 8-question FAQ in native `<details>` so answers ship in the HTML even
  collapsed. Baseline measured in `seo-aeo-baseline-2026-08.md` — 0 of 10
  target queries, domain not yet indexed. Re-measure ~Sep 2026.
- `/pricing` published: FREE / PRO $9.99 / PRO+ $19.99, PRO marked recommended,
  roadmap capabilities rendered as "Soon" rather than check marks.

### Spanish got its own URLs — 17 Aug 2026

The August smoke-test round's most expensive finding: the Spanish site had no
address. Language was resolved on the client from `localStorage`, so the server
answered every request in English and a full Spanish translation of every
marketing page was unreachable to search engines and answer engines — the exact
space `seo-aeo-baseline-2026-08.md` named as the most winnable.

- **English stays at the root, Spanish lives under `/es`.** The existing English
  URLs are the ones already linked and measured; moving them to `/en` would have
  invalidated all of them for a cosmetic symmetry. `lib/content/locale-routing.ts`
  owns the arithmetic, pure and shared by server and client.
- **Six pages × two languages**, each with a **self-referencing canonical** plus
  the `hreflang` pair and `x-default`. Canonicalising `/es/pricing` to `/pricing`
  would have told Google the Spanish page was a duplicate not worth indexing,
  which is the failure this change exists to undo.
- Titles and descriptions are translated (`lib/content/page-metadata.ts`), the
  JSON-LD follows the route's locale, `og:locale` is `es_LA` (the copy is
  Rioplatense), and the sitemap lists all twelve URLs with their alternates.
- **Internal links are localized**, so a visitor on `/es` who clicks "Precios"
  stays in Spanish. The language toggle now navigates between the two URLs and
  also exists on `/pricing`, `/install` and the legal pages, which previously
  relied on the landing page having set the language first.
- The stored preference is written **only when the visitor uses the toggle**.
  `persistSiteLocale` also writes the app cookie the dashboard and transactional
  emails read, so persisting whatever language the URL happened to be would have
  silently switched a Spanish customer's receipts to English just by visiting the
  homepage. Landing on a URL is not a choice.
- All twelve routes still prerender as static: `<html lang>` is corrected on the
  client instead of read from the request, because reading the request in the root
  layout opts *every* page out of static rendering — a real per-request cost for
  an attribute Google ignores when determining page language.

Still open in this area: blog seed content (needs blog infrastructure, which
this repo doesn't have), and the Search Console property itself (code support
shipped via `GOOGLE_SITE_VERIFICATION`; claiming the domain needs the account).

## v3 — approved capability set (12 Aug 2026)

Seven capabilities, tiered in `product-strategy-v2.md`:

- **PRO**: slot-aware planning (curve mapped to wall-clock time) · planned vs
  played comparison · named target curve shapes · printable PDF set sheet.
- **PRO+**: save your own curve templates · residency mode (don't repeat recent
  sets at a venue) · collaborative B2B/B3B sets with other EnergyCurve users.

Native export (Rekordbox XML, Traktor NML, M3U8) is **free forever** — a
deliberate exception to the "engine depth is PRO" rule; see the strategy doc.

## Spike: browser audio analysis — done 12 Aug 2026

`docs/spike-browser-audio-analysis.md`. Verdict: **browser-first is viable, no
server needed**, with two corrections to the plan.

- **Shipped and selling (14 Aug 2026).** PRO: real BPM from audio, slot-aware
  planning, named curve shapes, printable set sheet, order history, planned vs
  played. PRO+: set comparator, global library, per-transition advice, custom
  curve shapes. Plus the first-run guide, shareable public curves, conversion
  and churn events, and a bilingual purchase email.
- **Gig Mode shipped 17 Aug 2026 — H2 is closed.** The booth view at
  `/dashboard/playlists/[id]/gig`: current track as the largest thing on screen,
  the next one with its tempo move already worked out, the arc with a marker where
  the DJ actually is, and one thumb-sized control. Position is bookmarked in
  `localStorage` per playlist so a locked phone or an evicted tab doesn't lose the
  place; a Screen Wake Lock keeps the screen on (opt-in — it costs battery, and
  the DJ knows whether the phone is plugged in); a narrowly scoped service worker
  (`public/sw.js`) makes the set openable with no signal. `gig_mode` flipped to
  `status: "shipped"` and the pricing card and matrix both dropped their "Soon".
- **Key detection, 17 Aug 2026: two of the four spike fixes are in, and the number
  is still unmeasured.** Per-window voting is on by default, and `keyAgreement`
  replaces a confidence score that used to read 0.4–0.85 while getting the mode
  wrong. Both Krumhansl and Temperley profiles ship with a picker in the harness;
  the default is unchanged so the next run stays comparable with the 21% baseline.
  HPSS and tuning correction are deliberately not done — the spike report explains
  why, and the order to work in. Still `status: "planned"`, still "Soon" on the
  pricing matrix, because no number justifies otherwise yet.
- **Still open and worth naming**: Energy Model v3 is specified but unfitted and
  blocked on a labelled run over a Mixed-In-Key-tagged library — the same run key
  detection needs, so one session of tagged files unblocks both. Residency mode and
  collaborative B2B/B3B sets remain the two planned PRO+ capabilities.
- **Essentia.js is out** — AGPL-3.0, unusable in a closed-source paid product.
- **Direct USB export researched and declined** — writing the database is
  solved, but a CDJ needs per-track ANLZ analysis files that only rekordbox
  produces. See `docs/research-usb-export.md` for the narrower playlist-injection
  idea that survived.
- **Energy Model v3 specified, not fitted** — every feature it needs already
  ships; the coefficients need a labelled run over a MIK-tagged library. Spec and
  fitting procedure in `docs/energy-model-v3.md`.
  Replaced by MIT parts: `web-audio-beat-detector` (tempo), `meyda` (spectral
  features), and our own spectral flux, spectral entropy, and Krumhansl-Schmuckler
  key detection. Meyda's own `spectralFlux` extractor is broken (throws under ESM),
  so that one is ours out of necessity.
- **Tempo: 8/8 exact** against the Mixed In Key tags on 8 real tracks. Production
  ready.
- **Key: 4/6 on a 6-track sample** — not shippable yet, and n is far too small to
  quote as a rate. Both misses were major/minor confusions, the tractable kind.
- **Speed: windowed sampling shipped 17 Aug 2026.** The framewise pass was 88% of
  a track's cost and exactly linear in frame count, so `lib/audio/sample-windows.ts`
  now reads three 30-second windows at the centre of equal divisions of the track
  instead of every frame — ~3× less work, with tracks under 90 s still analysed
  whole. Flux is segmented per window so no seam reads as an onset. Re-run the
  harness on a real library to quote the new wall-clock; the `Sampled` column
  reports what each row actually examined.
