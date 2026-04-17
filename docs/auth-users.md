# Auth & Users

## Status

Section 3 of the roadmap is considered **complete for MVP**.

EnergyCurve does **not** use Supabase Auth. The actual architecture is:

- **WorkOS** for authentication, sessions, callbacks, and logout
- **Supabase Postgres** for application data only

This document closes the auth/users foundation without pretending the auth layer is already production-hardened in every dimension.

## What Is Included

### 1. Signup (email/password)

- implemented with product-owned `/signup`
- backed by WorkOS user-management APIs
- successful signup creates a WorkOS user, persists a session, syncs the user into `profiles`, and redirects to `/dashboard`

### 2. Login

- implemented with product-owned `/login`
- backed by WorkOS password authentication
- successful login persists the app session and redirects to `/dashboard`

### 3. Logout

- available from `/dashboard`
- clears the WorkOS-backed session
- returns the user to `/`

### 4. Route protection

- implemented in `proxy.ts`
- protects `/dashboard`
- redirects signed-out users to `/login`
- redirects authenticated users away from `/login` and `/signup`

### 5. User model in the database

The MVP user record is intentionally minimal:

- `profiles.id`
- `profiles.workos_user_id`
- `profiles.email`
- timestamps

This is enough for authentication identity bridging and future domain ownership.

### 6. Initial post-login dashboard

- authenticated users land on `/dashboard`
- the dashboard revalidates the session server-side
- the dashboard syncs/loads the corresponding `profiles` record

## Session Handling

EnergyCurve relies on WorkOS AuthKit for secure session handling:

- encrypted session cookies
- `saveSession()` on successful custom login/signup
- `withAuth()` for server validation
- proxy-level protection with `authkit()`

## Error Handling

The auth layer currently handles:

- missing field errors
- invalid credentials
- password mismatch
- duplicate email
- weak password
- config/setup failures
- Google social-login startup failures
- protected-route fallback when auth initialization fails

Structured server-side logs are emitted for:

- login/signup failures
- session persistence failures
- callback failures
- dashboard fallback paths

## Deliberate MVP Tradeoff

During sign up, new accounts are currently created with:

```ts
emailVerified: true
```

This is an explicit MVP shortcut so EnergyCurve can keep a predictable product-owned signup flow without blocking on email verification UX yet.

That is acceptable for the current roadmap closeout, but it should be revisited before stricter production hardening.

## Manual Verification Checklist

1. Visit `/signup` while signed out.
2. Create a new account with email/password.
3. Confirm the user lands on `/dashboard`.
4. Confirm a corresponding row exists in `public.profiles`.
5. Log out and confirm the app returns to `/`.
6. Visit `/login` and sign in with the same account.
7. Confirm the user lands on `/dashboard`.
8. Visit `/dashboard` while signed out and confirm it redirects to `/login`.
9. If Google Social Login is enabled, use `Continue with Google` and confirm it still returns to `/dashboard`.

## What Is Still Outside This Closeout

- password reset / forgot-password flow
- explicit email-verification hardening
- account settings or editable profile management
- automated auth integration tests
- production-hardening details tied to WorkOS Production unlock

## Repository Anchors

- [app/login/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/login/page.tsx)
- [app/signup/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/signup/page.tsx)
- [app/dashboard/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/dashboard/page.tsx)
- [proxy.ts](/Users/robertinoc/Documents/code/energycurve/proxy.ts)
- [lib/auth/password-auth.ts](/Users/robertinoc/Documents/code/energycurve/lib/auth/password-auth.ts)
- [services/profile-service.ts](/Users/robertinoc/Documents/code/energycurve/services/profile-service.ts)
