-- A queue for the rights that are not a button, with the clock written down.
--
-- Three of the GDPR rights this product owes are red in the gap assessment for
-- the same reason: the only way to exercise them is to email hello@. That IS a
-- valid mechanism — Art. 12 does not require self-service — but only while two
-- conditions hold: somebody answers within a month, and the person asking is
-- verified. `docs/compliance/dsar-procedure.md` wrote both rules down and then
-- said the uncomfortable part out loud: **the clock starts when the mail
-- arrives, not when it is read**, so with one operator and no queue, a week of
-- not looking at an inbox eats a third of the deadline.
--
-- This table is what turns that from a promise into a record. A request filed
-- from inside the account lands here with its own deadline, appears in the
-- panel, and can be shown back to the person who filed it. Nothing about the
-- legal obligation changes; what changes is that missing it becomes visible
-- while there is still time.
--
-- What it deliberately does NOT do: decide anything on its own. No automated
-- erasure, no automated rectification. Art. 22 is not in play, and a queue that
-- acts by itself is a queue that can act wrongly by itself.

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),

  -- Whose request it is.
  --
  -- A real foreign key WITH a cascade, which is the opposite of the choice in
  -- `admin_audit_log` — and for the opposite reason. That table exists to record
  -- something done TO a person, so the row has to outlive them. This one exists
  -- to serve a person, so once they are gone the request is moot, and keeping it
  -- would mean holding the free-text note of somebody who exercised erasure.
  profile_id uuid not null references public.profiles(id) on delete cascade,

  -- What is being asked for:
  --   'rectify_email' — change the address, which is also the login identity
  --   'object'        — Art. 21, for anything the cookie banner does not cover
  --   'restrict'      — Art. 18
  --   'other'         — anything else, because a fixed list of four is a guess
  --
  -- Text rather than an enum, same reasoning as `admin_audit_log.action`: adding
  -- a kind should need a deploy, not a migration. The writer is a single typed
  -- function and there is a check constraint below, so the openness is in the
  -- schema type and not in what can actually land.
  kind text not null,

  -- What the person wrote. **Personal data, and free-form**, which is the most
  -- unpredictable kind: someone asking about their data will name their venue,
  -- their sets, and sometimes their reasons.
  --
  -- Nullable because it does not stay forever. `sweepPrivacyRequestDetails`
  -- clears it once the request has been resolved and the window has passed,
  -- leaving the kind, the dates and the outcome — which is what proves the
  -- request was handled. Same shape as `billing_events.payload` and
  -- `admin_audit_log.target_email`: keep the row, drop the personal part.
  details text,

  -- The address to answer at, captured when the request was filed.
  --
  -- Stored rather than joined for a reason that is about the procedure and not
  -- about convenience: the DSAR rule is that a request arriving FROM the account
  -- address is already verified, and answering goes to the account address. This
  -- column is the record of which address that was at the time. If the request
  -- is to change the email, joining `profiles` later would show the new one and
  -- lose the evidence.
  --
  -- Cleared by the same sweep as `details`.
  requester_email text,

  -- 'open' | 'answered' | 'refused'. A refusal is still a resolution: Art. 12(4)
  -- requires answering a refusal within the deadline, with the reason and the
  -- right to complain.
  status text not null default 'open',

  -- The Art. 12(3) deadline: one month from arrival.
  --
  -- **Stored, not derived**, and this is the decision in the table worth
  -- defending. A computed deadline is a function of today's policy; a stored one
  -- is a fact about this request as of when it arrived. If the window is ever
  -- reconsidered, rows already in flight keep the promise that was made to them.
  -- It also makes "what is overdue" an index scan instead of arithmetic over
  -- policy.
  due_at timestamptz not null,

  resolved_at timestamptz,

  -- What was done about it, in one line, written by whoever closed it. Kept
  -- after the sweep: it is the half of the record that shows the obligation was
  -- met, and it is written by us rather than by the requester, so it does not
  -- carry free-form personal data unless someone puts it there.
  resolution_note text,

  created_at timestamptz not null default timezone('utc', now()),

  constraint privacy_requests_kind_check
    check (kind in ('rectify_email', 'object', 'restrict', 'other')),

  constraint privacy_requests_status_check
    check (status in ('open', 'answered', 'refused')),

  -- A resolved request has a date, and an open one does not. Without this the
  -- overdue query and the "how long did we take" question disagree the first
  -- time something is closed by hand in the SQL editor.
  constraint privacy_requests_resolution_check
    check (
      (status = 'open' and resolved_at is null)
      or (status <> 'open' and resolved_at is not null)
    )
);

-- The question the panel asks: what is open, and what is due soonest.
create index if not exists privacy_requests_open_idx
  on public.privacy_requests (due_at)
  where status = 'open';

-- The question the account page asks: my requests, newest first.
create index if not exists privacy_requests_profile_idx
  on public.privacy_requests (profile_id, created_at desc);

-- The question the retention sweep asks: what is resolved and old.
create index if not exists privacy_requests_resolved_idx
  on public.privacy_requests (resolved_at)
  where resolved_at is not null;

-- Decision 22: RLS on, zero policies, default-deny for anon and authenticated.
-- The service-role client is the only reader, and the service layer is the real
-- boundary.
alter table public.privacy_requests enable row level security;
