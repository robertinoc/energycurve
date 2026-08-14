# Billing

Stripe Checkout + webhooks. **Nothing is wired to the UI yet** — the endpoints
exist and work, but `/pricing` still shows "Tell me when it's ready" on the paid
cards. Flipping that is a separate change, and it should only happen after the
test-mode run below succeeds.

## The one non-obvious thing

**Stripe is linked to the StageLink LLC entity**, so a customer's card statement,
invoices, and receipts read **"StageLink LLC"**, not "EnergyCurve". That's stated
up front on the landing page, in the FAQ, in the footer, on `/pricing`, in the
transactional-email footer, and in both the terms and the privacy policy — and
`tests/seo.test.ts` fails if any of those drop the name. Don't "clean up" those
mentions.

## The Stripe account is shared with StageLink

This is the source of every non-obvious constraint below, so it's worth stating
plainly: **one Stripe account (`acct_1TI9IK…`) sells both StageLink and
EnergyCurve.** Several Stripe settings are account-wide, which means the obvious
place to configure something is usually the wrong place — changing it there
silently reconfigures the other product.

### Statement descriptor: set it per product, not on the account

The account descriptor is `STAGELINK LLC`, with prefix `STAGELINK`. Measured on
a real test charge before any change:

```
ch_3U3zvs…  999 usd  calculated_statement_descriptor: "STAGELINK LLC"
```

So a DJ's statement said `STAGELINK LLC` and nothing more — exactly the charge
people don't recognise and dispute. **Do not fix this in Settings → Business →
Public details**: that field is account-wide and would relabel StageLink's
charges too. Set it on the **product** instead, which only affects
subscriptions for that product:

```bash
stripe post /v1/products/prod_… -d "statement_descriptor=ENERGYCURVE"
```

Both EnergyCurve products carry `ENERGYCURVE`. With the account prefix that
should render as `STAGELINK* ENERGYCURVE` (22 chars, exactly Stripe's limit) —
confirm on the next charge with `stripe charges list`, since the descriptor is
only computed at charge time.

### Customer Portal: use a dedicated configuration

An account has exactly one **default** portal configuration, and
`billingPortal.sessions.create` uses it whenever no `configuration` is passed.
StageLink's portal call (`apps/api/src/modules/billing/billing.service.ts`)
passes none, so configuring the dashboard's portal page for EnergyCurve would:

- offer **EnergyCurve** plans to StageLink's subscribers as switch targets, and
- replace the products StageLink's "switch to {plan}" deep link needs, which its
  own code logs a fallback for.

So EnergyCurve gets its own configuration, created by
`scripts/create-portal-config.mjs` and pinned via
`STRIPE_PORTAL_CONFIGURATION_ID`. `tests/billing.test.ts` fails if the route
stops passing it, because the failure mode is silent.

Two caveats found while setting this up:

- Stripe makes the **first** configuration in a mode the default, and there's no
  API field to opt out. In test mode ours became the default because none
  existed. Harmless while every caller passes an explicit id, but check
  `is_default` when creating the live one.
- This account is on the **redesigned-portal beta**. It accepts
  `features.subscription_update.products` but doesn't echo it back, so the
  plan restriction **cannot be verified from the API** — open the portal and
  look at which plans are offered. Verified visually on 2026-08-13: only the two
  EnergyCurve products are offered, so the restriction does apply.
- The beta also **ignores `business_profile.headline`**. It's set on our
  configuration and accepted by the API, but the portal renders only the
  account's public business name. So an EnergyCurve subscriber sees a portal
  headed "StageLink LLC", and the return link reads "Back to StageLink LLC"
  while actually going to `energycurve.app/dashboard` (the label comes from the
  account name, the destination from our per-session `return_url`). Neither is
  fixable per-product on a shared account — which is why the disclosure lives on
  the site instead.

### Product descriptions are customer-facing

The product `description` is what Stripe shows on the Checkout page and in the
portal's plan picker — i.e. on the screen where someone enters a card. Keep it to
what actually ships. As of 2026-08-13 PRO's description is accurate, but PRO+
still promises collaborative B2B sets, residency mode and Gig Mode, none of
which exist yet. **Fix before enabling live mode.**

## Production status (2026-08-14)

Stripe is **live-configured and verified**, and deliberately **not selling yet** —
the paid cards on `/pricing` still say "Tell me when it's ready", and there are
zero references to `/api/billing/checkout` in the served HTML.

Verified in production:

| | |
|---|---|
| Products | `EnergyCurve PRO` (`prod_V4FcyUkAyw7miA`), `EnergyCurve PRO+` (`prod_V4FeFb1FCUOM4v`) — both with `statement_descriptor=ENERGYCURVE` and `metadata.app=energycurve` |
| Prices | 999 / 9900 / 1999 / 19900 cents; a mistaken 19999 is archived |
| Env → Stripe mapping | Each of the four `STRIPE_PRICE_*` audited against the live API: right product, amount, interval, `livemode=true`, no id reused across two vars |
| Migrations | 0012 + 0013 applied to `iwzkzybzadsmnwilcity`; 7 columns + `billing_events` confirmed |
| Webhook | `we_1U4IwMEeN7BZpiyafczvNIm6`, enabled, livemode, exactly the 4 handled events |
| Routes | webhook `400 Missing signature` (was 503 → proves keys loaded), checkout + portal `401 Not signed in` |

Two things about this account worth knowing before touching it:

- The live secret key is **per product**: EnergyCurve got its own `sk_live_`
  rather than sharing StageLink's, which is 3 months old and in daily use.
  Rolling one no longer breaks the other.
- The webhook endpoint receives **`2026-03-25.dahlia`** while the SDK sends
  `2026-07-29.dahlia`. Harmless because `periodEndOf()` and `cancelAtOf()` both
  read the new shape first and fall back to the old one, and both paths are
  tested — but it means the payload shape validated in test mode is *not* the one
  production delivers. Check `plan_current_period_end` and `plan_cancel_at` on the
  first real subscription.

### Hard prerequisites before enabling the paid buttons

Not needed for the integration to exist; needed before anyone can be charged.

1. **PRO must unlock something.** Only the custom-taxonomy cap is enforced today,
   so a subscriber gets what a free user gets. See `docs/plan-gating.md`.
2. **The portal must work in live.** There is currently **no** portal
   configuration in live mode, and `STRIPE_PORTAL_CONFIGURATION_ID` is
   deliberately unset — so `/api/billing/portal` fails rather than opening
   StageLink's shared default and showing an EnergyCurve portal to a StageLink
   subscriber. Taking money with no self-serve way to cancel generates
   chargebacks and, in several jurisdictions, isn't legal.

   Resolving it requires a StageLink change, and the order matters: **StageLink
   pins its own `configuration` first, then EnergyCurve's is created.** Creating
   ours first would make it the account default (Stripe gives that to the first
   configuration in a mode, with no way to opt out), and StageLink passes no
   `configuration` — so its one real paying subscriber would land in our portal.

## Model

```
client                     our server                   Stripe
──────                     ──────────                   ──────
POST /api/billing/checkout
  { plan, interval }  ───▶ resolve price id from env
                           create Checkout Session ───▶
                      ◀─── { url }
redirect to url ─────────────────────────────────────▶ hosted payment page
                                                        │
                      ◀──── POST /api/billing/webhook ──┘  (signed)
                            verify signature
                            claim event id (idempotency)
                            write plan + status to profile
```

Three invariants worth stating, because breaking any of them is how billing bugs
become money bugs:

1. **The client never says what a plan costs.** It sends `plan` + `interval`; the
   server resolves the price id from the environment. A tampered request can't
   buy PRO+ at the PRO price.
2. **Only the webhook grants entitlement.** The success redirect is cosmetic — a
   user who closes the tab still gets their plan, and one who forges a redirect
   gets nothing.
3. **The webhook is idempotent.** Stripe retries on any non-2xx and can deliver
   the same event twice after a success. The event id is the primary key of
   `billing_events`, so the insert *is* the idempotency check.

### Scheduled cancellation

The portal cancels **at period end**, which means Stripe keeps
`status = 'active'` for the rest of the paid period. So `plan` and `plan_status`
don't move, and without extra state a cancelled subscriber is indistinguishable
from an active one until the date arrives. A user who cancels, sees nothing
change, and concludes it failed calls their bank next.

`plan_cancel_at` and `plan_cancellation_feedback` (migration 0013) carry it.

**Read `cancel_at`, not `cancel_at_period_end`.** Measured on a real
cancellation on 2026-08-13 under API version 2026-07-29.dahlia:

```
status:               active
cancel_at:            2026-09-13T14:48:35   ← the real signal
cancel_at_period_end: false                 ← the obvious field, and it's wrong
canceled_at:          1786650670
cancellation_details: { feedback: "too_complex", reason: "cancellation_requested" }
```

`cancelAtOf()` reads `cancel_at` first and falls back to the legacy boolean for
older API versions. `tests/billing.test.ts` pins both paths against that exact
payload.

Two behaviours worth keeping:

- `canceledSubscription()` clears `cancelAt` — once it has actually ended there's
  no future date, and a stale one renders "ends on «past date»" forever.
- The **feedback survives** the subscription, and is written back to `null` when
  someone clicks "don't cancel". It's the only churn signal Stripe gives us, and
  a customer who changed their mind must stop counting as one who left.

### Entitlement vs purchased plan

`profiles.plan` keeps the **purchased** plan even after a subscription lapses, so
the UI can say "your PRO subscription is past due" instead of silently demoting
someone. What they can actually *do* comes from `effectivePlan(plan, status)` in
`lib/product/plans.ts`: only `active` and `trialing` unlock paid limits.

Unrecognised values fail closed. An unknown Stripe status maps to `incomplete`,
and a subscription carrying a price id that isn't in the environment resolves to
free — granting the top tier on a value we don't understand would be worse than
granting nothing.

## Setup

### 1. Stripe dashboard (test mode first)

1. Create two **products**: `EnergyCurve PRO` and `EnergyCurve PRO+`.
2. Give each two **recurring prices**: monthly and yearly.
   - PRO: **US$9.99** / month, **US$99** / year
   - PRO+: **US$19.99** / month, **US$199** / year
3. Copy the four price ids (`price_…`).
4. Set the **per-product** statement descriptor — not the account one. See
   "The Stripe account is shared with StageLink" above.
5. Create EnergyCurve's portal configuration and pin it:

   ```bash
   node scripts/create-portal-config.mjs
   ```

   Do **not** configure the dashboard's Customer portal page instead: that edits
   the account default, which StageLink uses. Run the script once per mode (test
   and live each need their own id).

### 2. Environment

```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_PRO_MONTHLY=price_…
STRIPE_PRICE_PRO_YEARLY=price_…
STRIPE_PRICE_PRO_PLUS_MONTHLY=price_…
STRIPE_PRICE_PRO_PLUS_YEARLY=price_…
STRIPE_PORTAL_CONFIGURATION_ID=bpc_…
COMP_PRO_PLUS_EMAILS=owner@example.com,demo@example.com
```

Billing stays off until `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, **and** at
least one price id are present. A key with no prices can't sell anything, so it
counts as unconfigured rather than half-working.

`STRIPE_PORTAL_CONFIGURATION_ID` is **optional** to keep envs that don't sell
working, but on this account it is effectively required — without it the portal
falls back to the configuration StageLink shares. It's an id, not a secret.

`COMP_PRO_PLUS_EMAILS` grants PRO+ to listed emails without a Stripe
subscription — the owner's own account, plus anything comped for a demo. It is
read at request time in `getProfileBilling`, so a comped user goes through the
same gate code a paying PRO+ user does; testing a bypass instead would prove
nothing about the real product. It only ever **grants**: a live subscription is
never downgraded by an entry here, and the list is matched against the email on
the profile row, which only WorkOS writes — it is not reachable from client
input. Kept in the environment rather than in source so a comp can be added or
revoked without a code change, and so personal emails stay out of git history.

### 3. Migrations

Apply `supabase/migrations/0012_billing.sql` (plan columns on `profiles` +
`billing_events`) and `0013_subscription_cancellation.sql` (`plan_cancel_at`,
`plan_cancellation_feedback`).

**Order matters for production:** both must be applied *before* the Stripe keys
reach the environment. With keys but no columns, checkout 500s on the first
webhook write.

### 4. Webhook endpoint

Local, with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3010/api/billing/webhook
```

That prints a `whsec_…` for `STRIPE_WEBHOOK_SECRET`. In production, add the
endpoint in the dashboard pointing at
`https://energycurve.app/api/billing/webhook` and subscribe it to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Other event types get a 2xx and are ignored — Stripe sends dozens and retries
anything non-2xx for days.

## Testing it

With `stripe listen` running:

```bash
# Start a checkout (signed in, from the browser console or a REST client)
curl -X POST localhost:3010/api/billing/checkout \
  -H 'content-type: application/json' \
  -d '{"plan":"pro","interval":"monthly"}'
```

Open the returned URL and pay with `4242 4242 4242 4242`, any future expiry, any
CVC. Then check:

- `profiles.plan` is `pro` and `plan_status` is `active`
- a row landed in `billing_events`
- `POST /api/billing/portal` returns a URL that opens the portal
- cancelling in the portal flips `plan_status` to `canceled` while `plan` stays
  `pro`

Worth exercising deliberately, because these are the paths that cost money when
they're wrong:

| Card | What it tests |
|---|---|
| `4000 0000 0000 0341` | Attaches but fails on charge → `past_due` |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0025 0000 3155` | Requires 3D Secure |

Replaying the same event twice (`stripe events resend evt_…`) must be a no-op —
the response says `duplicate: true`.

## What's deliberately not here

- **No UI.** `/pricing` paid cards still say "Tell me when it's ready", the
  schema.org offers are still `PreOrder`, and exactly one plan is marked live.
  AGENTS.md ties flipping those to the change that ships working checkout.
- **No quota enforcement.** `PLAN_LIMITS` exists and is tested, but nothing reads
  it yet — applying the limits per feature is the next task.
- **No dunning emails.** `invoice.payment_failed` isn't handled; Stripe's own
  dunning emails cover the basics until there's a reason to do better.
- **No proration UI.** The customer portal handles plan changes.
