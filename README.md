# EnergyCurve

EnergyCurve is a Next.js App Router project for DJs. This repository is currently limited to setup and infrastructure. Product logic such as playlist analysis, BPM workflows, and energy scoring is intentionally deferred.

## What Was Set Up

- Next.js 16 App Router project with TypeScript strict mode and Tailwind CSS v4
- `shadcn/ui` configured with a minimal reusable UI base
- WorkOS AuthKit wired for login, sign up, callback handling, logout, and session-aware route protection
- Official `AuthKitProvider` mounted in the root layout for App Router auth edge-case handling
- Supabase Postgres integrated as the application data layer only
- Server-only profile synchronization between WorkOS users and the `profiles` table
- Protected `/dashboard` route with server-side access validation
- Recoverable setup states for missing or invalid WorkOS configuration instead of raw framework crashes
- Initial SQL schema for `profiles`, `playlists`, and `tracks`
- Initial brand/logo system with gradient and monochrome SVG assets
- Documentation for setup, architecture, technical decisions, deployment, and validation

## Stack

- Next.js 16.2.3
- React 19
- TypeScript
- Tailwind CSS v4
- `shadcn/ui`
- WorkOS AuthKit
- Supabase Postgres
- Vercel-ready deployment configuration

## Project Structure

```text
app/
components/
docs/
lib/
services/
supabase/migrations/
types/
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:

- `WORKOS_CLIENT_ID`
- `WORKOS_API_KEY`
- `WORKOS_COOKIE_PASSWORD`
- `NEXT_PUBLIC_WORKOS_REDIRECT_URI`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Detailed explanations live in [docs/setup-infra.md](/Users/robertinoc/Documents/code/energycurve/docs/setup-infra.md).

## Recommended Environment Split

- Local development: WorkOS `Staging` + `http://localhost:3010`
- Vercel production: WorkOS `Production` + `https://energycurve.vercel.app`
- Prefer a dedicated Supabase project for local/dev and another for production

Using separate WorkOS and Supabase environments keeps local tests from colliding with production identities or production data.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Populate `.env.local` from `.env.example`.

3. Apply the initial database migration from [supabase/migrations/0001_initial_schema.sql](/Users/robertinoc/Documents/code/energycurve/supabase/migrations/0001_initial_schema.sql) in Supabase SQL Editor or via the Supabase CLI.

4. Configure WorkOS:
   - Add `http://localhost:3010/auth/callback` as the redirect URI.
   - Add `http://localhost:3010/` as the default logout URI.

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3010](http://localhost:3010).

## Validation Commands

```bash
npm run lint
npm run typecheck
npm run build
```

## Manual Verification

Use the checklist in [docs/setup-infra.md](/Users/robertinoc/Documents/code/energycurve/docs/setup-infra.md) to verify:

- protected routing
- login and sign-up flows
- callback handling
- profile synchronization
- logout behavior

## Deployment Notes

- Set the same environment variables in Vercel for each environment.
- Configure the WorkOS redirect URI per deployed environment.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- `proxy.ts` is used because Next.js 16 renamed `middleware.ts` to `proxy.ts`.
- Session persistence is handled by WorkOS AuthKit cookies plus `proxy.ts` for matched routes.
- For the cleanest setup, map Vercel `Production` to WorkOS `Production` and keep local `.env.local` on WorkOS `Staging`.
- Prefer a dedicated Supabase production project instead of sharing the same database with local/staging auth identities.

## Known Limitations

- No business logic has been added yet for playlist ingestion or analysis.
- Database access currently uses a server-only service role client; if future client-side data access is introduced, add RLS policies and a browser-safe client strategy.
- Automated tests were not added in this phase; validation is currently lint, typecheck, build, and manual auth/infrastructure checks.
- End-to-end auth verification still depends on real WorkOS and Supabase credentials being configured in the target environment.
- Until WorkOS `Production` is unlocked and wired, the Vercel deployment should be treated as pre-production rather than final production infrastructure.

## Related Docs

- [docs/setup-infra.md](/Users/robertinoc/Documents/code/energycurve/docs/setup-infra.md)
- [docs/brand-design.md](/Users/robertinoc/Documents/code/energycurve/docs/brand-design.md)
- [docs/architecture.md](/Users/robertinoc/Documents/code/energycurve/docs/architecture.md)
- [docs/decisions.md](/Users/robertinoc/Documents/code/energycurve/docs/decisions.md)
- [AGENTS.md](/Users/robertinoc/Documents/code/energycurve/AGENTS.md)
