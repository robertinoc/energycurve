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
3. Visit `http://localhost:3010/dashboard` while signed out.
4. Confirm you are redirected to `/login`.
5. Click the login CTA and complete the WorkOS sign-in flow.
6. Confirm WorkOS returns you to `/dashboard`.
7. Confirm a row exists in `public.profiles` for the authenticated WorkOS user.
8. Visit `/signup` while signed out and confirm the sign-up CTA redirects through WorkOS.
9. While signed in, visit `/login` or `/signup` and confirm you are redirected to `/dashboard`.
10. Click `Log out` from `/dashboard`.
11. Confirm the WorkOS logout completes and you land back on `/`.
12. After logout, revisit `/dashboard` and confirm the route is protected again.

## Deployment Notes

- Deploy on Vercel with the same environment variables configured per environment.
- Register the deployed WorkOS callback URI for each environment.
- Keep `SUPABASE_SERVICE_ROLE_KEY` in Vercel server-side env vars only.
- `proxy.ts` fulfills the middleware requirement because Next.js 16 renamed the file convention from `middleware.ts` to `proxy.ts`.
- The login, signup, callback, and protected dashboard routes now guard against both missing and invalid WorkOS setup and redirect users back to a recoverable setup state when initialization fails.

## Follow-ups / Technical Debt

- Missing WorkOS configuration now renders setup guidance instead of a runtime exception, but the auth flow still requires valid credentials before it can be tested end to end.
- Add automated integration tests for auth when stable test credentials and a preferred test runner are selected.
- Introduce RLS policies before any browser-side Supabase access is added.
- Add Supabase type generation if the schema starts changing frequently.
- Decide whether preview deployments need dynamic WorkOS redirect URI handling.
