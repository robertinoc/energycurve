# Billing

Stripe Checkout + webhooks, **live and selling**. `/pricing` opens a real
Checkout session for PRO and PRO+, the schema.org offers in `lib/seo.ts` are all
`InStock`, and every counted quota has an enforcement site.

This paragraph used to say the opposite — that nothing was wired to the UI and
the paid cards still carried a waitlist prompt — and it kept saying it for months
after checkout shipped. `tests/doc-accuracy.test.ts` now fails on those sentences.
It found this instance; reading the file had only turned up the other one.

The forbidden phrases are matched as plain substrings, so this file must
*describe* the retired claims rather than quote them — a canary can't tell a claim
from a description of one, and the fix for that is to keep the canary dumb and the
prose careful, not to teach the test to parse English.

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
what actually ships. Re-checked 2026-08-20: PRO's description is accurate, and of
the three things PRO+ promises, Gig Mode and residency mode have both shipped.
**Collaborative B2B sets have not** — that one is still a promise on the screen
where someone enters a card, and it is the last remaining inaccuracy here.

## Production status (updated 2026-08-20)

Stripe is **live-configured, verified, and selling**. `/pricing` opens a real
Checkout session for PRO and PRO+.

This section previously recorded the opposite — live-configured but deliberately
not selling, with a waitlist prompt on the paid cards — and was left behind when
selling was switched on. It is one of three places in this file that said so.

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

Two of the four entries this section used to carry described a product that had
not shipped checkout yet, and stayed here for months after it did. Both are now
corrected and pinned by `tests/doc-accuracy.test.ts` — a doc that describes the
opposite of the code is worse than no doc, because someone acts on it.

- **No proration UI.** The customer portal handles plan changes.

### Dunning (added 2026-08-20)

`invoice.payment_failed` is handled: it sends one email and captures a
`payment_failed` event, and it writes neither plan nor status — the subscription
events remain the single authority on both.

The change worth knowing about is the entitlement, not the email. `past_due` and
`unpaid` used to be folded into one status, and `ENTITLED_STATUSES` excluded it,
so **a single declined card dropped a paying customer to FREE limits on the
spot** — while Stripe was still retrying and would probably succeed, with no
email and nothing on screen connecting the two. Three separate places in this
codebase already described the intended behaviour and none of them matched the
code: the status map's own comment ("we haven't been paid, don't revoke yet"),
the dashboard copy for that state ("PRO still works for now"), and this file.

Now: `past_due` is entitled (Stripe is retrying, days-long window), `unpaid` is
not (Stripe gave up), and they are separate statuses so the split is expressible
at all. `invoice.next_payment_attempt` is what tells the email which of the two
messages to send.
### Corrected (was wrong here)

- **UI shipped.** `/pricing` sells all three plans, and the schema.org offers in
  `lib/seo.ts` are all `InStock`. This section claimed the paid cards still showed
  a waitlist prompt and that the offers had not been flipped off pre-order.
- **Quotas are enforced.** Every counted limit has a call site — active playlists
  in `services/playlist-service.ts`, AI orderings in the smart-order route, custom
  taxonomies in `services/taxonomy-service.ts` — and `tests/capabilities.test.ts`
  fails when a numeric limit is declared with no code that could apply it. This
  section claimed nothing read `PLAN_LIMITS` yet.

## Conversion and churn events

Until this landed the billing webhook emitted **nothing**. The database knew
who was on which plan, but not how they got there — and the difference between
"on PRO" and "just bought PRO", "came back to PRO" or "stepped down from PRO+"
is the whole of conversion analysis. Worse, that data is not recoverable: a
funnel step nobody recorded on the day it happened cannot be reconstructed
afterwards from state.

All events are captured server-side through `captureServerEvent`, keyed by
profile id (the same distinct id the browser SDK identifies with). No email or
name is ever attached — PostHog gets an opaque id and the shape of the event.

| Event | Fires when | Properties |
|---|---|---|
| `checkout_started` | A Stripe Checkout session is minted | `plan`, `interval`, `fromPlan` |
| `subscription_started` | Free → paid, and the subscription is live | `plan`, `previousPlan`, `status` |
| `plan_upgraded` | PRO → PRO+ | `plan`, `previousPlan`, `status` |
| `plan_downgraded` | PRO+ → PRO, still paying | `plan`, `previousPlan`, `status` |
| `subscription_ended` | Cancelled, or lapsed on a failed payment | `plan`, `reason` |
| `plan_limit_reached` | A plan limit refuses an action | `capability`, `plan`, `used`, `limit` |

Two things worth knowing about how these are derived:

**The transition is classified, not the end state.** `classifyPlanTransition`
in `lib/analytics/billing-events.ts` compares the plan *before* the write to the
plan after it, and the new status outranks both: a subscription that lapses
while the `plan` column still reads `pro` has **ended**, and reading the plan
alone would file that as "nothing happened". The webhook therefore reads the
previous billing row before calling `applySubscription`, because afterwards the
previous plan is gone.

**Renewals are dropped on purpose.** Stripe fires
`customer.subscription.updated` for card replacements, metadata edits and every
period rollover. Those classify as `plan_unchanged`, and
`isReportableTransition` — a type predicate, so the compiler enforces it — keeps
them out. Letting them through would bury the four events that mean something.

### Language

Transactional emails are written in the language on `profiles.preferred_locale`,
which is set when a signed-in user picks one from the language toggle. Null means
they never chose, and resolves to English — the same thing the UI shows them, so
the email matches the product they actually saw rather than a guess about who
they are.

The statement warning is translated, not left in English. It's the sentence that
prevents a chargeback, and a warning somebody has to translate for themselves is
a warning that doesn't work. "STAGELINK LLC" itself survives translation, because
that is the string they will read on the statement.

Password resets look the language up by email address instead, since whoever
asks for one is by definition not signed in. An unknown address gets English —
also the only safe answer, because behaving differently for known and unknown
emails would turn the reset form into an account-existence probe.

### The dashboards these are for

Each of these is one PostHog insight; the events were chosen so that no
dashboard needs a property filter more complicated than the ones named here.

1. **Purchase funnel** — Funnel over `checkout_started` → `subscription_started`.
   The drop-off is abandonment on Stripe's own page, which is the one step our
   database can say nothing about.
2. **Monthly churn** — Trend of `subscription_ended`, broken down by `reason`
   (Stripe's own cancellation feedback, carried through). Divide by active
   subscribers for a rate.
3. **Net movement** — Trends of `plan_upgraded` and `plan_downgraded` on one
   chart. Upgrades outpacing downgrades is the tier split working; the reverse
   means PRO+ is priced or scoped wrong.
4. **What sells the plan** — Trend of `plan_limit_reached` broken down by
   `capability`, and a funnel from it to `checkout_started`. This answers the
   question the pricing matrix can only guess at: *which* wall actually makes
   someone reach for a card. Expect it to disagree with intuition.

AI cost per user is already covered by the `ai_usage` table (see
"Adding a new AI feature"), not by these events — token counts belong with the
call that spent them.
