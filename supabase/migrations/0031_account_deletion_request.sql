-- Self-serve erasure, Art. 17, with a grace period.
--
-- Until now the only way to delete an account was to email support and wait for
-- somebody to press a button in `/backstage`. That is a valid mechanism under
-- Art. 12 — the same argument that applies to the other rights — but erasure is
-- the one where "valid conditionally" sits worst, because the person asking has
-- already decided they are leaving and every day of waiting is a day they did
-- not consent to.
--
-- One column, and NULL means active. Same shape as `suspended_at` from
-- migration 0004, and deliberately so: the schema already had one "this account
-- is in an unusual state" timestamp and a second one should read the same way.
--
-- What it does NOT do, and this is the decision that shapes everything else:
-- **it does not suspend the account.** A pending deletion leaves the product
-- fully usable, which sounds like hedging and is the opposite. Somebody who just
-- asked to be deleted is exactly the person who most needs to download their
-- data first (Art. 20), and locking them out would mean answering an erasure
-- request by removing their access to portability.
--
-- It also removes the need for a token in a URL. Because the account still
-- works, cancelling is "log in and press cancel" — no signed link, no one-time
-- token in a query string. That pattern is the one the security audit kept
-- finding (`/reset-password?token=`, `/verify-email?email=`), and not adding a
-- third instance of it is worth more than the convenience of a cancel link.

alter table public.profiles
  add column if not exists deletion_requested_at timestamptz;

-- The sweep's only question: whose grace period has run out.
--
-- Partial, because the overwhelming majority of rows have NULL here and an index
-- over all of them would be a full copy of the table to answer a question about
-- a handful of accounts.
create index if not exists profiles_deletion_requested_idx
  on public.profiles (deletion_requested_at)
  where deletion_requested_at is not null;
