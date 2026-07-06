-- Analysis engine V2 ("target curve" model) ships alongside this migration.
-- Snapshots now record which engine produced their score so V1 rows (penalty
-- subtraction) and V2 rows (weighted sub-scores) are distinguishable in KPIs
-- and never compared as equals. Existing rows default to 1 (the engine they
-- were scored with); the app writes CURRENT_ANALYSIS_ALGORITHM_VERSION from
-- lib/product/strategy.ts on every new snapshot.

alter table public.analyses
  add column if not exists algorithm_version integer not null default 1;

comment on column public.analyses.algorithm_version is
  'Scoring engine version that produced this snapshot (see CURRENT_ANALYSIS_ALGORITHM_VERSION).';
