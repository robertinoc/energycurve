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

