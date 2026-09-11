-- Let the heavy analysis blobs be dropped without dropping the row.
--
-- `analyses` stores, for every analysis ever run: the full energy `curve`, every
-- `issue` found, the complete score `breakdown`, and the `suggested_order` the
-- reorder produced. All four are `not null`, all four are written on every run,
-- and — verified by reading every query against this table — **none of them is
-- read by any feature**:
--
--   analysis-service   select("input_hash")                          dedupe
--   dashboard-service  select("playlist_id, set_score, created_at")  sparkline
--   backstage-service  select("id, user_id, set_score, created_at")  KPIs
--   data-export        select("*")                                   portability
--
-- Only the export touches them, and an export returning data is a consequence of
-- holding it, not a reason to hold it. This is the same shape as
-- `billing_events.payload`: kept forever because nothing ever decided how long.
--
-- The row itself stays, and that part is not negotiable: `input_hash` is what
-- stops re-analysing an unchanged set from writing a duplicate, and `set_score`
-- plus `created_at` are the score history on the dashboard. So the row stays and
-- the blobs go, exactly as with billing.
--
-- Nullable rather than defaulted-to-empty on purpose. `curve: []` in an export
-- reads as "this analysis had no curve", which is false; `curve: null` reads as
-- "we no longer hold this", which is true.

alter table public.analyses
  alter column curve drop not null,
  alter column issues drop not null,
  alter column breakdown drop not null;
