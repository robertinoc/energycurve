# Technical Decisions

## 1. WorkOS AuthKit over Supabase Auth

**Decision**

Use WorkOS AuthKit as the authentication system.

**Why**

- It matches the explicit product requirement.
- It provides a clean hosted auth experience with App Router support.
- It keeps authentication concerns separate from the application database.

**Consequence**

- Supabase is used only for app data.
- The app needs a profile sync layer to relate WorkOS users to database records.

## 2. Supabase Postgres for application data only

**Decision**

Use Supabase Postgres strictly as the data store for domain tables.

**Why**

- It preserves a clear auth/data boundary.
- It avoids coupling application records to Supabase Auth assumptions.
- It keeps future vendor changes more manageable.

**Consequence**

- Server-side data access is required for now.
- Client-side Supabase access is intentionally postponed.

## 3. Server-only Supabase service role client

**Decision**

Use `SUPABASE_SERVICE_ROLE_KEY` only in server modules.

**Why**

- It avoids secret leakage to the browser.
- It simplifies the initial infrastructure before RLS policies are designed around WorkOS identities.

**Consequence**

- All current reads and writes happen on the server.
- If browser-side access is added later, RLS policies and a browser-safe client strategy must be introduced first.

## 4. `proxy.ts` for route protection

**Decision**

Use `proxy.ts` instead of `middleware.ts`.

**Why**

- Next.js 16 renamed the file convention from `middleware.ts` to `proxy.ts`.
- The user requested middleware-based route protection, and this is the current framework equivalent.

**Consequence**

- Documentation calls out that `proxy.ts` satisfies the middleware requirement.
- Future upgrades should continue following the active Next.js convention.

## 5. Profile synchronization on auth success

**Decision**

Sync the application profile after successful WorkOS authentication and again when bootstrapping the dashboard.

**Why**

- It guarantees a `profiles` record exists early.
- The second sync makes the dashboard resilient if the callback-side sync ever fails temporarily.

**Consequence**

- There is a small amount of intentional duplication for reliability.
- Sync logic remains centralized in `services/profile-service.ts`.

## 6. Keep business logic out of the foundation phase

**Decision**

Do not implement playlist analysis, BPM processing, or energy scoring yet.

**Why**

- The explicit goal of this phase is setup and infrastructure.
- Avoiding early product logic keeps the architecture cleaner and the scope controlled.

**Consequence**

- The dashboard is intentionally infrastructural, not feature-complete.
- Future product work should build on the existing service and schema boundaries.

## 7. Fail gracefully when WorkOS is not ready

**Decision**

Convert WorkOS initialization failures into guided setup states or safe redirects instead of raw framework error pages.

**Why**

- Early infrastructure environments frequently start without valid credentials.
- Recoverable failures are easier to debug than proxy/runtime crashes.
- This keeps the project runnable locally even before secrets are configured.

**Consequence**

- Auth entry points now distinguish between a healthy app and an incomplete auth setup.
- End-to-end authentication still cannot be verified without valid WorkOS credentials, but the app remains stable while being configured.

## 8. Keep the official AuthKit provider mounted

**Decision**

Mount `AuthKitProvider` in the root layout even though the current app is mostly server-rendered.

**Why**

- The official WorkOS Next.js guide marks `AuthKitProvider` as required to cover auth edge cases.
- Hosted sign-in and callback flows can trigger browser-side router quirks during development without it.
- The small amount of extra client work is worth the stability gain for the authentication foundation.

**Consequence**

- Auth still remains mostly server-first in EnergyCurve.
- The root layout now includes the provider so future WorkOS client hooks remain compatible.

## 9. Use document navigation for hosted auth entry points

**Decision**

Use normal browser navigation for the primary sign-in and sign-up CTAs instead of `next/link`.

**Why**

- `/auth/login` and `/auth/signup` immediately redirect to hosted WorkOS URLs on another origin.
- App Router fetch navigation can surface `Failed to fetch` when a client transition follows an external redirect.
- A full document navigation is simpler and more reliable for provider handoffs.

**Consequence**

- The auth CTA performs a regular browser navigation on purpose.
- Secondary in-app navigation can still use `next/link` where the destination stays inside EnergyCurve.

## Pending Technical Debt / Follow-ups

- Add automated auth/integration tests once the preferred testing stack is chosen.
- Add RLS policies aligned to WorkOS identities before browser-side Supabase access is introduced.
- Consider dynamic WorkOS redirect URI handling if Vercel preview environments need first-class support.
- Generate database types from Supabase automatically if the schema begins changing frequently.
