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

## Password policy

WorkOS owns the policy; the app mirrors it so the signup and reset forms can
state the rules **before** the user types instead of rejecting them afterwards.

Verified against the WorkOS environment behind this app on **13 Aug 2026**:

| Rule | Value |
| --- | --- |
| Minimum length | **10** characters (`password_too_short`, `minimum_length: 10`) |
| Guessability | zxcvbn-style check (`password_too_weak`, with suggestions) |
| Breached-password rejection | **not observed** — see the caveat below |

The mirror lives in [lib/auth/password-policy.ts](/lib/auth/password-policy.ts):
`PASSWORD_MIN_LENGTH` (overridable with `NEXT_PUBLIC_PASSWORD_MIN_LENGTH`) plus
a small heuristic for common passwords and obvious patterns. It only ever
predicts a *rejection* — WorkOS stays the authority on acceptance, and the
haveibeenpwned lookup cannot run client-side because that would mean sending
the typed password somewhere.

### Re-checking the policy

The dashboard is the source of truth, but the API answers the same question
without a login. Post a password that cannot pass — nothing is created:

```bash
curl -s -X POST https://api.workos.com/user_management/users \
  -H "Authorization: Bearer $WORKOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"policy-probe@example.com","password":"a"}'
```

The 400 body lists one entry per broken rule, each with its own `code` and the
numbers behind it (`minimum_length`). If the minimum has moved, set
`NEXT_PUBLIC_PASSWORD_MIN_LENGTH` to match.

### Caveat: the breach check did not fire

During that same verification, `correcthorsebatterystaple` — a passphrase with
a very high haveibeenpwned count — was **accepted** (201) by this environment.
So leaked-password rejection appears to be off here, even though WorkOS
documents it as part of the default policy. Worth confirming in the dashboard
under Authentication before production launch, since it is the rule that
matters most. The app already handles the rejection if it is switched on:
`password_pwned` maps to a `password_breached` message.

> That probe left a real user (`policy-probe-aaa@example.com`) in the WorkOS
> test environment. Delete it from the dashboard if it is still there.

## Error Handling

The auth layer currently handles:

- missing field errors
- invalid credentials
- duplicate email (including the `email_not_available` code WorkOS actually
  returns, which previously fell through to a generic "sign up failed")
- password mismatch
- password policy rejections, kept **separate** rather than collapsed into one
  "weak password" bucket: too short (quoting the real minimum), leaked in a
  known breach, contains the email address, missing a character type, too
  guessable, plus a fallback for reasons we do not recognise
- config/setup failures
- Google social-login startup failures
- protected-route fallback when auth initialization fails

Every password rejection names the specific problem and points at the reliable
escape hatch — a passphrase of three or four unrelated words. Copy lives in
[lib/content/auth-copy.ts](/lib/content/auth-copy.ts) in EN and ES.

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

## Test Coverage

The auth test suite currently covers critical workflow logic for:

- route protection decisions
- redirect behavior
- callback URL derivation
- login/signup error mapping, including the structured WorkOS password-policy
  payloads ([tests/password-auth-helpers.test.ts](/tests/password-auth-helpers.test.ts))
- the mirrored password policy ([tests/password-policy.test.ts](/tests/password-policy.test.ts))
- EN/ES auth copy, including a guard that no message names WorkOS at the user
  ([tests/auth-copy.test.ts](/tests/auth-copy.test.ts))

These tests are intentionally lightweight and do not yet replace full browser-level end-to-end auth coverage.

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

- real email verification
- password reset / recovery flow
- browser-level auth integration / end-to-end tests
- account settings or editable profile management
- production-hardening details tied to WorkOS Production unlock

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
- [tests/auth-routing.test.ts](/Users/robertinoc/Documents/code/energycurve/tests/auth-routing.test.ts)
- [tests/password-auth-helpers.test.ts](/Users/robertinoc/Documents/code/energycurve/tests/password-auth-helpers.test.ts)
