# Auth Hardening Backlog

This backlog captures the auth work that should happen in a dedicated hardening/audit phase, not inside the current MVP closeout.

## Priority 1

### Real email verification

Current state:

- signup uses `emailVerified: true` as an explicit MVP shortcut

Future work:

- implement a real verification flow through WorkOS
- define the post-signup UX for unverified users
- remove the verification bypass

### Password reset / recovery

Current state:

- no forgot-password or reset-password flow exists

Future work:

- reset request entry point
- reset completion flow
- product copy and error states for recovery

## Priority 2

### Auth integration coverage expansion

Current state:

- critical auth workflow helpers are covered by the initial test suite
- browser-level end-to-end auth flows are not covered yet

Future work:

- expand toward higher-level integration or staging-safe end-to-end coverage

### Production-specific WorkOS hardening

Future work:

- re-verify production redirects and cookies
- re-check Google and provider behavior in production
- audit secret scoping and environment posture

## Priority 3

### Account settings / profile management

Current state:

- `profiles` is a minimal identity bridge only

Future work:

- editable profile/account settings surface
- preferences and linked account management if needed

### Auth observability deepening

Current state:

- structured logging exists
- no dedicated auth dashboard/alerting layer exists

Future work:

- add centralized auth event dashboards or alerting if auth errors start to matter operationally

## Rule Of Thumb

Do not pull these items forward unless:

- auth issues are blocking real users
- production release readiness requires them
- a future product feature directly depends on richer account capabilities


## Status update — cycle C (2026-07-04)

- **Password reset / recovery: IMPLEMENTED.** `/forgot-password` +
  `/reset-password` backed by WorkOS `createPasswordReset` /
  `resetPassword`. Email delivery goes through Resend
  (`RESEND_API_KEY` + `RESEND_FROM_EMAIL`); without those vars the
  forgot-password page shows an honest "not available" state instead of
  pretending to send. Anti-enumeration: unknown emails get the same
  neutral response as known ones. Rate limited 5/15min per email.
- **Real email verification: IMPLEMENTED behind a flag.**
  `AUTH_REQUIRE_EMAIL_VERIFICATION=true` stops marking signups as
  verified; WorkOS emails a 6-digit code and the user completes signup
  on `/verify-email` (resend supported, rate limited 3/10min). Login of
  an unverified user routes through the same page. Default stays `false`
  until the WorkOS-sent emails are confirmed arriving in the target
  environment — flip it per environment after one manual test.
- Remaining: broader browser-level E2E auth coverage, account settings /
  profile management.
