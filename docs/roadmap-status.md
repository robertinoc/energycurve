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
