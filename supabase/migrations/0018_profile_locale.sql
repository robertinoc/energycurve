-- The language a user chose, so things sent *to* them can be in it.
--
-- Until now the UI language lived only in a cookie. That works for rendering a
-- page — the request carries it — and is useless for anything the server sends
-- on its own: a purchase confirmation, a password reset. Those went out in
-- English to everyone, including people who had used the entire product in
-- Spanish and had just paid.
--
-- Nullable, and null means "never chose". That is deliberately different from
-- "chose English": someone who never touched the toggle has expressed no
-- preference, and a future Accept-Language fallback should be free to serve
-- them Spanish without overriding an explicit choice.

alter table public.profiles
  add column if not exists preferred_locale text;

alter table public.profiles
  drop constraint if exists profiles_preferred_locale_check;

alter table public.profiles
  add constraint profiles_preferred_locale_check
  check (preferred_locale is null or preferred_locale in ('en', 'es'));
