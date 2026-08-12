-- Billing foundation: Stripe subscription state on the profile, plus an
-- append-only log of processed webhook events.
--
-- Stripe is the authority on entitlement. These columns are a local mirror so
-- gating doesn't need a network round-trip on every request; they are only ever
-- written from a signature-verified webhook (or the checkout confirmation),
-- never from client input.

alter table public.profiles
  -- 'free' | 'pro' | 'pro_plus'. Kept as the *purchased* plan even when the
  -- subscription lapses, so the UI can explain the lapse instead of silently
  -- demoting. Entitlement = plan + plan_status (see lib/product/plans.ts).
  add column if not exists plan text not null default 'free',
  -- Mirrors Stripe's subscription status. NULL for users who never subscribed.
  add column if not exists plan_status text,
  -- End of the paid period; used to show "active until…" after a cancellation.
  add column if not exists plan_current_period_end timestamptz,
  -- Stripe's customer id. Stable across subscriptions, so it's what we reuse to
  -- open the billing portal and to prevent duplicate customers per profile.
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'pro', 'pro_plus'));

alter table public.profiles
  drop constraint if exists profiles_plan_status_check;

alter table public.profiles
  add constraint profiles_plan_status_check
  check (
    plan_status is null
    or plan_status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')
  );

-- One Stripe customer maps to at most one profile. A duplicate here would mean
-- two accounts sharing a subscription, so it's enforced rather than assumed.
create unique index if not exists profiles_stripe_customer_id_key
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Webhook idempotency. Stripe retries on any non-2xx and can deliver the same
-- event more than once even on success, so every handler checks here first.
-- Append-only: rows are a record of what we processed, not mutable state.
create table if not exists public.billing_events (
  -- Stripe's event id (evt_…). Primary key *is* the idempotency guarantee.
  id text primary key,
  type text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  -- The event payload, kept for debugging a bad transition after the fact.
  payload jsonb,
  processed_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_events_profile_id_idx
  on public.billing_events (profile_id);

create index if not exists billing_events_processed_at_idx
  on public.billing_events (processed_at desc);
