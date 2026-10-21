# Aplicar la migración 0034 en producción — un copiar y pegar

**Escrito el 21/10/2026 (lote 21).** Fila 0 de `docs/pendientes-robertino.md`.

La 0034 agrega a `profiles` las siete columnas del primer contacto (de dónde
vino cada usuario) y su restricción de formato. **Mientras no esté en
producción, cada persona que se registra queda sin origen, y ese dato no se
reconstruye después**: el servidor sólo lo acepta dentro de las 24 h del
registro. Cuatro tareas esperan esto (el tablero por fuente, L20.2, L20.4 y el
seed de dev).

Lo corrés vos: la connection string y las claves de producción son secretos y
no pasan por ningún chat ni por el repo.

## 1. ¿Ya está? (10 segundos, sin abrir Supabase)

Desde la raíz del repo, con la URL y la service role **de producción** en tu
entorno (las de Vercel → Settings → Environment Variables):

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  "$SUPABASE_URL/rest/v1/profiles?select=first_touch_source,first_touch_medium,first_touch_campaign,first_touch_referrer,first_touch_landing,first_touch_at,first_touch_recorded_at&limit=0" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

- **`200`** → las siete columnas existen. Saltá al paso 3 para confirmar la
  restricción.
- **`400`** → falta al menos una (PostgREST contesta `42703`). Seguí con el 2.

Si preferís la connection string, el mismo dato con el script del repo
(abre una transacción `READ ONLY`, no puede escribir):

```bash
MIGRATION_DB_URL='postgresql://…producción…' npm run db:status
```

Busca la fila de `0034_profile_first_touch.sql`: `applied` o `missing`. Desde el
lote 21 mira las siete columnas, no sólo la primera.

## 2. Aplicarla (30 segundos)

Supabase → el proyecto de **producción** (`iwzkzybzadsmnwilcity`; ojo, los dos
proyectos muestran la insignia verde `main PRODUCTION`) → SQL Editor → pegá
esto entero y Run:

```sql
begin;

-- Where a profile came from the first time (lote 20).
--
-- The backstage could only say where users came from by asking PostHog for
-- `$initial_utm_source`, which exists for visitors who accepted analytics and
-- whose PostHog person was merged with their profile — none of the users
-- registered before this. These columns are the product's own record.
--
-- Written once, by services/attribution-service.ts, for a profile created in
-- the last 24 hours that has no touch yet, and only from a browser where the
-- analytics consent is "granted". Everything is re-validated in
-- lib/attribution/first-touch.ts before it gets here; the checks below are the
-- same formats, so a bug there cannot store a URL, a token or an address.
--
-- Deliberately no backfill. `first_touch_recorded_at IS NULL` means unknown —
-- no consent, or registered before this was measured — and the backstage shows
-- unknown as its own category, never as zero or as "direct".

alter table public.profiles
  add column if not exists first_touch_source text,
  add column if not exists first_touch_medium text,
  add column if not exists first_touch_campaign text,
  add column if not exists first_touch_referrer text,
  add column if not exists first_touch_landing text,
  add column if not exists first_touch_at timestamptz,
  add column if not exists first_touch_recorded_at timestamptz;

-- Added only when it is not there (lote 21). It used to be drop + add, which
-- re-runs without error but rebuilds the constraint and re-checks every row of
-- profiles on each paste. Pasting this file into a database that already has
-- 0034 now changes nothing.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_first_touch_format_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_first_touch_format_check
      check (
        (first_touch_source is null or first_touch_source ~ '^[a-z0-9-]{1,32}$')
        and (first_touch_medium is null or first_touch_medium ~ '^[a-z0-9-]{1,32}$')
        and (
          first_touch_campaign is null
          or (char_length(first_touch_campaign) <= 64
              and first_touch_campaign ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
        )
        and (
          first_touch_referrer is null
          or (char_length(first_touch_referrer) <= 100
              and first_touch_referrer ~ '^[a-z0-9.-]+$')
        )
        and (
          first_touch_landing is null
          or (char_length(first_touch_landing) <= 160
              and first_touch_landing ~ '^/[a-z0-9/\[\]-]*$')
        )
      );
  end if;
end
$$;

commit;
```

**Es seguro pegarlo dos veces.** Las columnas usan `add column if not exists`
y la restricción se agrega sólo si no está: sobre una base que ya tiene la 0034
no cambia nada. Probado el 21/10 contra un Postgres 16 descartable: aplicada,
vuelta a aplicar, y la restricción conservó el mismo identificador (no se
recreó).

## 3. Verificar (una fila, sin ambigüedad)

En el mismo SQL Editor:

```sql
select case
  when (
    select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name in (
        'first_touch_source', 'first_touch_medium', 'first_touch_campaign',
        'first_touch_referrer', 'first_touch_landing', 'first_touch_at',
        'first_touch_recorded_at'
      )
  ) = 7
  and exists (
    select 1 from pg_constraint
    where conname = 'profiles_first_touch_format_check'
      and conrelid = 'public.profiles'::regclass
  )
  then 'ESTÁ — 0034 aplicada: 7 de 7 columnas y la restricción'
  else 'NO ESTÁ — falta 0034, o está a medias'
end as migracion_0034;
```

Tiene que decir **`ESTÁ — 0034 aplicada: 7 de 7 columnas y la restricción`**.
Cualquier otra cosa es `NO ESTÁ`, incluida una aplicación a medias.

Después: banco L20.2 y L20.4, y la fila 0 de pendientes se cierra.
