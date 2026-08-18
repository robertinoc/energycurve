-- Three tables shipped without the RLS-on-no-policies posture every other
-- table in this schema uses (decision 22 in docs/decisions.md): billing_events
-- (0012), playlist_versions (0017), and curve_templates (0019).
--
-- Today this isn't reachable — no anon/publishable Supabase key exists
-- anywhere in this codebase, so nothing but the server-role client can query
-- Postgres at all. But that's an accident of the current architecture, not a
-- guarantee, and decision 22 exists specifically so a table is never the one
-- exception if a browser-side client or anon key gets introduced later. RLS
-- enabled with zero policies is default-deny for anon/authenticated; the
-- service layer's ownership checks remain the real boundary.

alter table public.billing_events enable row level security;
alter table public.playlist_versions enable row level security;
alter table public.curve_templates enable row level security;
