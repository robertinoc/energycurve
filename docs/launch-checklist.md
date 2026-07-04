# Launch Checklist

Operational steps to take EnergyCurve from "code complete" to production.
Everything code-side is done (see `docs/roadmap-status.md`); every item
below is a dashboard/console task for the project owner, in order.

## 1. Database

- [ ] Apply migration `supabase/migrations/0003_analyses.sql` in the
      Supabase SQL Editor (dev project).
- [ ] Create a **dedicated production Supabase project** and apply all
      migrations (`0001` → `0003`) there. The free tier pauses after ~1
      week of inactivity — use a paid plan for production.

## 2. Product analytics (PostHog)

- [ ] Create a project at posthog.com (free tier is fine to start).
- [ ] Set `NEXT_PUBLIC_POSTHOG_KEY` in `.env.local` and in Vercel
      (all environments). Optional: `NEXT_PUBLIC_POSTHOG_HOST` if using
      the EU cloud.
- [ ] Build the three KPI dashboards (all insights use the events the app
      already sends):
      1. **Active users** — Insight → Trends → event `$pageview`, counted
         by *Unique users*, daily; add a second series with *Weekly active
         users* aggregation.
      2. **Analyses run** — Insight → Trends → event `analysis_completed`,
         *Total count*, daily; breakdown by `genre` or `context` for
         flavor. A second series with `playlist_created` shows the funnel
         informally.
      3. **Retention** — Insight → Retention → performed `signup` (first
         time) then came back to do `analysis_completed`, weekly.

## 3. Transactional email (Resend) — required for password reset

- [ ] Create a Resend account and verify a sending domain.
- [ ] Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
      (e.g. `EnergyCurve <noreply@yourdomain.com>`) in `.env.local` + Vercel.
- [ ] Test: `/forgot-password` with a real account email → reset link
      arrives → new password works on `/login`.

## 4. Email verification flag

- [ ] With WorkOS Staging, sign up a test account with
      `AUTH_REQUIRE_EMAIL_VERIFICATION=true` locally → confirm the WorkOS
      6-digit code email arrives and `/verify-email` completes signup.
- [ ] Then set `AUTH_REQUIRE_EMAIL_VERIFICATION=true` in Vercel
      production. Until then the documented MVP bypass stays active.

## 5. Production environment

- [ ] Unlock WorkOS **Production** and configure redirect URI
      (`https://<prod-domain>/auth/callback`) + logout URI.
- [ ] Set all production env vars in Vercel (WorkOS Production keys,
      production Supabase URL + service role key, PostHog, Resend, the
      verification flag).
- [ ] Re-verify login, signup, playlist flow, and analysis on the deployed
      production URL (production smoke test — run it together).

## 6. Monitoring

- [ ] Point an uptime monitor (UptimeRobot, Better Stack, or Vercel
      checks) at `GET /api/health`. It returns 200 with
      `{"status":"ok"}` when healthy and 503 when the database is
      unreachable.

## 7. Post-launch

- [ ] Collect feedback from the first DJs (KPIs to watch in PostHog:
      signups, analyses per user, time on the results screen, weekly
      retention).
- [ ] Revisit the deferred backlog with real usage data: AI narrative
      layer on recommendations, analysis history UI, broader E2E test
      coverage.
