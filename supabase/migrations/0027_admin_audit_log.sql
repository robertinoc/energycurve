-- A record of privileged actions that outlives the log stream.
--
-- The backstage panel can suspend an account and delete one everywhere — WorkOS
-- user, profile row, and everything that cascades off it. Until now the only
-- record of either was a `logInfo` line: `backstage.user_deleted` with the actor
-- and the target email, written to stdout.
--
-- That is a trail with a shelf life. Vercel keeps runtime logs for a day on the
-- Hobby plan and a month on Pro, and neither is queryable after the fact by
-- "who deleted this account". Six weeks after an irreversible action against a
-- paying customer, the honest answer to that question is currently "we can't
-- tell" — which is the one thing an audit trail exists to prevent.
--
-- So the same events are written here as well. The log lines stay: this table is
-- the durable copy, not a replacement for the one you can tail while debugging.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),

  -- Who acted. The email from the backstage session, which is also the value the
  -- allowlist matched on, so the record and the authorisation decision agree.
  actor_email text not null,

  -- What they did: 'user.suspended' | 'user.unsuspended' | 'user.deleted'.
  -- Text rather than an enum so adding an action needs a deploy and not a
  -- migration; the writer is a single typed function.
  action text not null,

  -- Who it was done to.
  --
  -- Deliberately NOT a foreign key to profiles. The whole point of the
  -- 'user.deleted' row is that the profile is gone by the time anyone reads it,
  -- and an FK — with or without a cascade — would either refuse the write or
  -- delete the evidence of the deletion. A dangling uuid is the correct shape
  -- here.
  target_profile_id uuid,

  -- The target's email at the time of the action, so the row is readable by a
  -- human without a join that can no longer resolve.
  --
  -- Nullable because it does not stay forever: `sweepAuditLogEmails` clears it
  -- after the retention window, leaving the action, the actor and an unresolvable
  -- uuid. An audit log that holds a deleted person's address indefinitely is a new
  -- version of the problem the erasure work just fixed.
  target_email text,

  -- Anything action-specific worth keeping. Small and non-personal by contract;
  -- the writer controls what goes in.
  detail jsonb,

  created_at timestamptz not null default timezone('utc', now())
);

-- The two questions actually asked of this table: "what happened lately" and
-- "what was ever done to this account".
create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_profile_id);

-- Decision 22: RLS on, zero policies, default-deny for anon and authenticated.
-- The service-role client is the only reader, and the service layer is the real
-- boundary.
alter table public.admin_audit_log enable row level security;
