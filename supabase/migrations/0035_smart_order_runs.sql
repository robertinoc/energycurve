-- One row per smart ordering that reached the model call, saying who made the
-- order: the AI, or the local heuristic and why.
--
-- Smart ordering is the feature that carries the paid plans, and it fell back to
-- the heuristic for weeks — the Anthropic account had no credit — without
-- anything in the product saying so. The DJ got a usable order and a polite
-- banner, which is the right behaviour, and that is exactly why nobody noticed.
--
-- The facts already existed in a log line (`smart_order.completed`, with
-- `source` and `reason`), but a log nobody reads is not an alarm, and the panel
-- can't read Vercel's logs. `feature_usage` can't stand in for it either: the
-- quota is charged only when the AI produced the order, and never on an
-- unlimited plan, so a fallback leaves no trace there at all. PostHog is out
-- too: since #301 its events wait for consent, and an infrastructure failure
-- can't be measured on the share of people who accepted analytics.
--
-- Deliberately no `profile_id`, and nothing else about the person. The panel
-- needs counts and reasons, not who: this table holds no personal data, so it
-- stays out of the RoPA, the data export and account deletion.

create table if not exists public.smart_order_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),

  -- 'claude' when the model's order was used, 'fallback' when the heuristic's.
  source text not null check (source in ('claude', 'fallback')),

  -- Why the heuristic was used: a `SmartOrderFallbackReason` from
  -- lib/smart-order/stream.ts. Text rather than an enum so a new reason needs a
  -- deploy and not a migration. Null exactly when the AI made the order.
  reason text,

  constraint smart_order_runs_reason_matches_source check (
    (source = 'claude' and reason is null) or
    (source = 'fallback' and reason is not null)
  )
);

-- The panel reads the last few days, newest first.
create index if not exists smart_order_runs_created_at_idx
  on public.smart_order_runs (created_at desc);

-- Server only, like every table here: the service-role client writes and reads
-- it, and nobody else has a reason to.
alter table public.smart_order_runs enable row level security;
