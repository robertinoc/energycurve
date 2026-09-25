-- Removes the one RLS policy in this schema that could never match.
--
-- `0014` created `feature_usage_own_rows` with `using (auth.uid() = profile_id)`.
-- Decision 22 in `docs/decisions.md` is explicit about why that is dead code:
-- identities live in WorkOS, no Supabase JWT ever reaches Postgres, so
-- `auth.uid()` is always null and the policy matches no row for anybody. Every
-- query the app makes goes through the service-role client, which bypasses RLS
-- entirely, so removing it changes no behaviour.
--
-- What it changes is what the schema *says*. A policy that looks like an owner
-- check invites the next person to assume there is one, and the posture this
-- codebase actually relies on — RLS enabled, zero policies, default-deny for
-- `anon` and `authenticated`, ownership enforced in `services/*` — is stronger
-- than the thing it was pretending to be.
--
-- `0014` has been edited so a fresh database never creates it. This is for the
-- databases that already did.

drop policy if exists feature_usage_own_rows on public.feature_usage;
