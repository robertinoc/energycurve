# Setup & Infrastructure

## Scope

This phase covers only the technical foundation for EnergyCurve:

- Next.js project setup
- authentication infrastructure
- protected routing
- Supabase data access
- initial schema
- environment management
- documentation and validation guidance

Product logic is intentionally out of scope for now.

## Environment Variables

Create `.env.local` from `.env.example`.

| Variable | Required | Server only | Purpose |
| --- | --- | --- | --- |
| `WORKOS_CLIENT_ID` | Yes | Yes | WorkOS AuthKit client identifier |
| `WORKOS_API_KEY` | Yes | Yes | WorkOS API key used by AuthKit |
| `WORKOS_COOKIE_PASSWORD` | Yes | Yes | Secret used by WorkOS to encrypt session cookies. Must be at least 32 characters. |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | Yes | No | Callback URI registered in WorkOS. Local value should be `http://localhost:3010/auth/callback`. |
| `SUPABASE_URL` | Yes | Yes | Supabase project URL for the server-side client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Yes | Supabase service role key used only on the server |

### Notes

- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to client components or browser code.
- WorkOS logout uses the default Logout URI configured in the WorkOS dashboard.
- `NEXT_PUBLIC_WORKOS_REDIRECT_URI` is intentionally public because the WorkOS SDK expects that variable name.
- If WorkOS values are missing or invalid, the auth entry points now render setup guidance instead of exposing a framework runtime error.

## Environment Topology

Recommended setup:

| Surface | WorkOS environment | Supabase project | Base URL |
| --- | --- | --- | --- |
| Local development | `Staging` | Dev project | `http://localhost:3010` |
| Vercel production | `Production` | Production project | `https://energycurve.vercel.app` |

Why this split matters:

- WorkOS `Staging` and `Production` create different user identities, even for the same email address.
- If both environments point at the same Supabase database, the same person can end up with multiple `profiles` rows because `profiles.workos_user_id` is unique per WorkOS environment.
- Separating dev and production data makes auth issues easier to debug and avoids accidental writes into production during local testing.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env template:

```bash
cp .env.example .env.local
```

3. Fill in the required WorkOS and Supabase values.

4. In the WorkOS dashboard:
   - add `http://localhost:3010/auth/callback` as a Redirect URI
   - add `http://localhost:3010/` as a Logout URI
   - optional: enable `Google Social Login` if you want the `Continue with Google` button to work

5. Apply the initial schema in Supabase:
   - open [supabase/migrations/0001_initial_schema.sql](/Users/robertinoc/Documents/code/energycurve/supabase/migrations/0001_initial_schema.sql)
   - run it in Supabase SQL Editor
   - or apply it via Supabase CLI if you use that workflow

6. Start the app:

```bash
npm run dev
```

## Infrastructure Validation Checklist

### Automated checks

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

Expected outcome:

- `lint` exits successfully
- `typecheck` exits successfully
- `build` finishes without errors

### Manual checks

1. Open `http://localhost:3010`.
2. Confirm the landing page renders.
3. Toggle between `EN` and `ES` and confirm the language selection persists after refresh.
4. Submit the public contact form with valid data and confirm you get a success state.
5. Submit the contact form with invalid data and confirm field-level validation errors appear.
6. Visit `http://localhost:3010/dashboard` while signed out.
7. Confirm you are redirected to `/login`.
8. Click the login CTA and complete the WorkOS sign-in flow.
9. Confirm WorkOS returns you to `/dashboard`.
10. Confirm a row exists in `public.profiles` for the authenticated WorkOS user.
11. Visit `/signup` while signed out and confirm the sign-up CTA redirects through WorkOS.
12. If Google Social Login is enabled in WorkOS, click `Continue with Google` and confirm it still returns to `/dashboard`.
13. While signed in, visit `/login` or `/signup` and confirm you are redirected to `/dashboard`.
14. Click `Log out` from `/dashboard`.
15. Confirm the WorkOS logout completes and you land back on `/`.
16. After logout, revisit `/dashboard` and confirm the route is protected again.

## Deployment Notes

- Deploy on Vercel with the same environment variables configured per environment.
- Register the deployed WorkOS callback URI for each environment.
- Keep `SUPABASE_SERVICE_ROLE_KEY` in Vercel server-side env vars only.
- `proxy.ts` fulfills the middleware requirement because Next.js 16 renamed the file convention from `middleware.ts` to `proxy.ts`.
- The login, signup, callback, and protected dashboard routes now guard against both missing and invalid WorkOS setup and redirect users back to a recoverable setup state when initialization fails.
- Prefer these mappings:
  - local `.env.local` -> WorkOS `Staging`
  - Vercel `Production` env vars -> WorkOS `Production`
  - local/dev Supabase project -> local `.env.local`
  - Supabase production project -> Vercel `Production`
- In Vercel, prefer scoping the production secrets to the `Production` environment instead of `All Environments`.
- If preview deployments are introduced later, either give them a separate WorkOS redirect strategy or keep auth restricted to the production deployment until that strategy is defined.

## Production Readiness Audit

### Safe state to keep today

- Keep local `.env.local` on WorkOS `Staging` and `http://localhost:3010`.
- Keep the current Vercel deployment working, even if it temporarily still uses WorkOS `Staging`.
- Treat `https://energycurve.vercel.app` as a hosted pre-production environment until WorkOS `Production` is unlocked.
- Continue product development on top of the current setup without blocking on WorkOS billing or production unlock.

### Real infrastructure work still pending

- Unlock WorkOS `Production`.
- Configure WorkOS `Production` redirects:
  - `https://energycurve.vercel.app/auth/callback`
  - `https://energycurve.vercel.app/auth/login`
  - `https://energycurve.vercel.app/`
- Generate and securely store the WorkOS `Production` API key and `Production` client ID.
- Update Vercel `Production` environment variables to use WorkOS `Production` instead of WorkOS `Staging`.
- Prefer a dedicated Supabase production project instead of sharing the same database with local/staging auth identities.
- Point Vercel `Production` to the production Supabase project after the schema migration is applied there.

### Why this matters

- WorkOS `Staging` and `Production` generate different user IDs for the same human user.
- If both auth environments write into the same Supabase database, one person can end up with multiple `profiles` rows because `profiles.workos_user_id` is unique.
- Keeping Vercel on WorkOS `Staging` is acceptable during setup, but it should be considered temporary and not the final production posture.

### Release gate before calling the app production-ready

Do not consider EnergyCurve fully production-ready until all of the following are true:

1. Vercel `Production` uses WorkOS `Production`.
2. WorkOS `Production` redirects match the deployed production URL exactly.
3. Vercel `Production` secrets are scoped to `Production` only.
4. A dedicated Supabase production project is in place, migrated, and connected.
5. Login, callback, dashboard access, profile sync, and logout are re-verified on the deployed production URL.

## Follow-ups / Technical Debt

- Missing WorkOS configuration now renders setup guidance instead of a runtime exception, but the auth flow still requires valid credentials before it can be tested end to end.
- Add automated integration tests for auth when stable test credentials and a preferred test runner are selected.
- Introduce RLS policies before any browser-side Supabase access is added.
- Add Supabase type generation if the schema starts changing frequently.
- Decide whether preview deployments need dynamic WorkOS redirect URI handling.
