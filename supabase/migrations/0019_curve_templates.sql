-- A DJ's own target curve shapes.
--
-- The five built-in shapes cover the ordinary nights. A resident who has found
-- *their* shape — the one that works in their room — had no way to aim at it
-- again, and describing it in words is exactly the imprecision the named shapes
-- already are.
--
-- Templates are made by pointing at a set that went well, so the anchors are
-- read from a real curve rather than drawn from memory.

create table if not exists public.curve_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  -- [[progress, energy], …] with progress 0…1 and energy 0…10, in order.
  -- Validated in TypeScript on the way in and on the way out — jsonb can hold
  -- anything, and a half-valid shape would silently score a set against
  -- something nobody designed.
  anchors jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists curve_templates_user_idx
  on public.curve_templates (user_id, created_at desc);

-- Which template a playlist aims at, when it aims at a custom one.
--
-- A separate column from `target_shape` rather than a magic value inside it:
-- that column has a CHECK naming the five built-ins, and widening it to accept
-- arbitrary ids would mean the database could no longer tell a typo from a
-- shape. ON DELETE SET NULL so deleting a template falls back to the derived
-- target instead of orphaning the playlist.
alter table public.playlists
  add column if not exists target_template_id uuid
  references public.curve_templates(id) on delete set null;
