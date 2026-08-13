-- Records that a subscription is scheduled to end, and why.
--
-- Without this a cancelled subscriber is indistinguishable from an active one
-- until the period actually ends: Stripe keeps `status = 'active'` for the rest
-- of the paid period, so `plan` and `plan_status` don't move. The user cancels,
-- sees nothing change, assumes it failed, and calls their bank.
--
-- Verified against a real cancellation on 2026-08-13: on API version
-- 2026-07-29.dahlia Stripe expresses this as `cancel_at` (a timestamp) plus
-- `canceled_at`, and leaves the older `cancel_at_period_end` boolean **false**.
-- Reading that boolean would silently conclude nobody ever cancels.

alter table public.profiles
  -- When access actually ends. NULL = no cancellation scheduled. Distinct from
  -- plan_current_period_end, which keeps moving on every renewal: this one is
  -- set once and means "it stops here".
  add column if not exists plan_cancel_at timestamptz,
  -- Stripe's `cancellation_details.feedback` — the reason the customer picked in
  -- the portal ('too_expensive', 'missing_features', 'switched_service',
  -- 'unused', 'customer_service', 'too_complex', 'other'). Free-text rather than
  -- a CHECK constraint: it's Stripe's enum, and a value we don't recognise is
  -- worth keeping, not worth rejecting a webhook over.
  add column if not exists plan_cancellation_feedback text;

-- Lets the churn question ("who is leaving, and why") be answered without a
-- full scan, and stays small because most rows are NULL.
create index if not exists profiles_plan_cancel_at_idx
  on public.profiles (plan_cancel_at)
  where plan_cancel_at is not null;
