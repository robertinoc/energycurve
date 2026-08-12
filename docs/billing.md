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

Set the **statement descriptor** in the Stripe dashboard to something a DJ will
recognise, e.g. `STAGELINK ENERGYCURVE` (Stripe allows 5–22 characters). This is
the single highest-leverage thing for avoiding "what is this charge?" disputes.

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
4. Set the statement descriptor (see above).
5. Enable the **customer portal** (Settings → Billing → Customer portal) and
   allow plan changes and cancellation. `/api/billing/portal` depends on it.

### 2. Environment

```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_PRO_MONTHLY=price_…
STRIPE_PRICE_PRO_YEARLY=price_…
STRIPE_PRICE_PRO_PLUS_MONTHLY=price_…
STRIPE_PRICE_PRO_PLUS_YEARLY=price_…
```

Billing stays off until `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, **and** at
least one price id are present. A key with no prices can't sell anything, so it
counts as unconfigured rather than half-working.

### 3. Migration

Apply `supabase/migrations/0012_billing.sql`. It adds the plan columns to
`profiles` and creates `billing_events`.

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
