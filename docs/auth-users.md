# Auth & Users

## Status

Section 3 is considered **complete for MVP**.

EnergyCurve uses:

- **WorkOS** for auth, sessions, callbacks, and logout
- **Supabase Postgres** for app data only

This means the original roadmap item “Implement authentication using Supabase” is fulfilled in spirit through the actual chosen architecture:

- authentication lives in WorkOS
- the application user record lives in Supabase

## What Is Included

- email/password signup
- email/password login
- logout
- route protection with `proxy.ts`
- secure session persistence
- minimal user record in `profiles`
- post-login dashboard redirect to `/dashboard`
- optional Google sign-in
- failure handling for common auth errors and setup problems

## User Model

The MVP user model is intentionally minimal:

- `profiles.id`
- `profiles.workos_user_id`
- `profiles.email`
- timestamps

This is enough to bridge authentication identity with application-owned records.

## Session Model

EnergyCurve relies on WorkOS AuthKit for:

- encrypted session cookies
- server-side `withAuth()` checks
- `saveSession()` after custom login/signup
- callback/session handling

## MVP Tradeoff

Signup still uses an explicit MVP shortcut:

```ts
emailVerified: true
```

That is acceptable for the current MVP closeout, but it belongs in the auth hardening backlog before stricter production release criteria.

## Test Coverage

The auth test suite currently covers critical workflow logic for:

- route protection decisions
- redirect behavior
- callback URL derivation
- login/signup error mapping

These tests are intentionally lightweight and do not yet replace full browser-level end-to-end auth coverage.

## Follow-ups

See:

- [docs/auth-hardening-backlog.md](/Users/robertinoc/Documents/code/energycurve/docs/auth-hardening-backlog.md)

## Repository Anchors

- [app/login/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/login/page.tsx)
- [app/signup/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/signup/page.tsx)
- [app/dashboard/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/dashboard/page.tsx)
- [proxy.ts](/Users/robertinoc/Documents/code/energycurve/proxy.ts)
- [lib/auth/password-auth.ts](/Users/robertinoc/Documents/code/energycurve/lib/auth/password-auth.ts)
- [services/profile-service.ts](/Users/robertinoc/Documents/code/energycurve/services/profile-service.ts)
