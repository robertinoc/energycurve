# ¿Qué más escondió el bug de `migration-status.mjs`? — 21/10/2026 (lote 22)

**La pregunta.** El lote 21 encontró que `scripts/migration-status.mjs` leía
sólo la primera columna de cada `alter table`: de la 0034 sondeaba 1 de 7. Esa
herramienta se usa desde el 22/09 (commit `3cd70fc`) para decidir qué
migraciones están aplicadas, y `scripts/seed-scale.mjs status` —lo que el
02/10 se citó como prueba de que dev tenía todas— reusa el mismo extractor.
Todos esos veredictos se dieron con el bug adentro.

## 1. Qué no se estaba mirando: columnas

La herramienta de antes del arreglo contra la de ahora, migración por
migración (comparando `deriveProbes` de `1983701^` con el actual):

| Migración | Columnas sondeadas antes | Ahora | Las que no se miraban |
|---|---|---|---|
| 0012_billing | 1 | 5 | `plan_status`, `plan_current_period_end`, `stripe_customer_id`, `stripe_subscription_id` |
| 0013_subscription_cancellation | 1 | 2 | `plan_cancellation_feedback` |
| 0015_playlist_slot | 1 | 2 | `slot_end_minutes` |
| 0024_set_edit_lock | 1 | 2 | `edit_lock_taken_at` |
| 0025_source_payload | 2 | 4 | `source_payload_format`, `energy_source` |
| 0033_profile_presence | 1 | 2 | `last_seen_country` |
| 0034_profile_first_touch | 1 | 7 | las seis `first_touch_*` restantes |
| **Total** | **27** (las 34) | **43** | **16 columnas en 7 migraciones** |

Las otras 27 migraciones no cambian: o no agregan columnas, o agregan una.

**Por qué el riesgo real de este bug es bajo, y por qué igual hay que
medirlo.** Las siete agregan sus columnas en **una sola sentencia
`alter table`** por tabla (la 0025 en dos, y la herramienta vieja sondeaba la
primera de cada una). Una sentencia es atómica en Postgres: si la primera
columna existe, existen todas las de esa sentencia. O sea que un pegado que
falló a mitad de camino **no** pudo dejar una de estas columnas afuera sin
dejar también la primera. Lo que el razonamiento no cubre: alguien que pegó
una parte del archivo a mano, o una columna borrada después. Eso sólo lo dice
la base.

## 2. El otro punto ciego, más grande: lo que no es tabla ni columna

Revisando el mismo patrón de sondeo contra los constructos que usan las 34
migraciones:

| Construcción | Cuántas | Dónde | ¿Se sondeaba? |
|---|---|---|---|
| `add constraint` | **10** | 0002 (1), 0012 (2), 0015 (4), 0016 (1), 0018 (1), 0034 (1) | **no** |
| `create function` | **3** | 0001 `set_updated_at`, 0014 `consume_feature_quota`, 0029 `consume_rate_limit` | **no** |
| `create trigger` | **2** | 0001 `profiles_set_updated_at`, `playlists_set_updated_at` | **no** |
| cambio de tipo o default (`alter column … type/set default`) | 3 | 0002 | no, y no se puede: no deja nada que distinga el antes del después |
| `create index` | — | todos con nombre | sí, sin huecos |
| `create type … as enum` | — | 0002 | sí; no hay tipos que no sean enum |

**Por qué importa.** Seis de las diez restricciones están escritas como
`drop constraint if exists` + `add constraint`: un pegado que se cortó entre
las dos dejó la tabla **sin** su check, y la herramienta decía `applied`.
`consume_feature_quota` y `consume_rate_limit` las llama la app en cada pedido
de IA (`services/usage-service.ts`, `services/rate-limit-service.ts`).

**Arreglado en este lote:** `deriveProbes` ahora lee restricciones, funciones y
triggers; `verdictFor` los compara; `readSchema` los pide al catálogo. Los
cambios de tipo y default siguen sin sondeo, a propósito.

**Probado contra un Postgres 16 descartable** con las 34 migraciones aplicadas
en orden:

| Base | Herramienta de antes del lote 21 | Herramienta de ahora (por Postgres) | `--sql` (en el SQL Editor) |
|---|---|---|---|
| Las 34 aplicadas | 34 applied | 34 applied | 34 applied |
| La misma, sin `profiles_preferred_locale_check`, sin `consume_rate_limit`, sin el trigger `playlists_set_updated_at` y sin la columna `first_touch_campaign` | **34 applied, 0 missing or partial** | **30 applied, 4 PARTIAL**: 0001, 0018, 0029, 0034, cada una nombrando lo que falta | igual, fila por fila |

Con la base rota de cuatro maneras, la herramienta de antes decía que estaba
todo aplicado.

`seed-scale.mjs status` (por REST) no puede ver restricciones, funciones ni
triggers: ahora los reporta como «no vistos» en vez de contarlos como
faltantes.

## 3. Cómo se corre sin la connection string

```bash
node scripts/migration-status.mjs --sql | pbcopy
```

Imprime un único `select` —sin `insert`, `update`, `delete`, `drop`, `alter`
ni `create`; un test lo afirma— generado de las mismas sondas. Se pega en el
SQL Editor de Supabase y devuelve una fila por migración: `file | status |
probes | missing`.

## 4. Resultado en dev y en producción

Corrido por **Robertino**, el 21/10/2026, en el SQL Editor de cada proyecto,
con la consulta de `--sql` generada en `dd3f0a3`. Pegó las dos tablas en la
sesión. El proyecto que llamó «TEST» es, por lo que se sabe hoy, dev
(`djoutoutkukpjrdgjqkb`); **sin confirmar** el id en la tabla misma.

| | Lo que se creía | Lo que dice ahora |
|---|---|---|
| **Dev** («TEST») | 0001–0032 aplicadas (02/10, por REST, con el bug y sin ver índices, RLS, restricciones, funciones ni triggers); 0033 sin confirmar; 0034 ESTÁ (21/10) | **34 de 34 `applied`**, ninguna parcial. Incluye las 16 columnas, 10 restricciones, 3 funciones y 2 triggers que nadie había mirado |
| **Producción** | **Nunca se preguntó** (banco DB.3). Sólo la 0034, ESTÁ desde el 21/10 | **33 de 34 `applied`. La 0032 `MISSING`**: `policy feature_usage.feature_usage_own_rows removed` no se cumple, la política sigue ahí |

Migración por migración, las sondas de cada una en los dos proyectos (34 filas
iguales salvo la 0032): 0001 8 · 0002 3 · 0003 3 · 0004 1 · 0005 7 · 0006 1 ·
0007 2 · 0008 4 · 0009 6 · 0010 1 · 0011 1 · **0012 11** · 0013 3 · 0014 4 ·
**0015 6** · 0016 2 · 0017 3 · 0018 2 · 0019 3 · 0020 3 · 0021 1 · 0022 2 ·
0023 5 · 0024 2 · 0025 4 · 0026 1 · 0027 3 · 0028 3 · 0029 3 · 0030 4 · 0031 2 ·
0032 1 · 0033 2 · 0034 8.

**Ninguna migración que figuraba como aplicada estaba a medias.** El bug de las
columnas no escondía nada en ninguno de los dos entornos.

### El hallazgo: la 0032 nunca corrió en producción (H-26)

`0032_drop_dead_rls_policy.sql` borra `feature_usage_own_rows`, una política
que `0014` creaba con `using (auth.uid() = profile_id)`. En producción sigue
existiendo. Producción tiene la 0031, la 0033 y la 0034: **la 0032 se salteó**.

**Qué se perdió: nada.** No es una migración que guarde datos. La política no
puede matchear ninguna fila —las identidades viven en WorkOS, ningún JWT de
Supabase llega a Postgres, `auth.uid()` es siempre null— y la app consulta con
la service role, que ignora RLS (decisión 22). El comportamiento es el mismo
con o sin ella.

**Qué sí está mal:** el esquema de producción dice que hay un control de dueño
en `feature_usage` que no existe, que es exactamente lo que la 0032 vino a
sacar. Y es la cuarta migración salteada en un entorno de este proyecto (antes
fueron la 0018, la 0019 y la 0021; ahora la 0032, en producción): ninguna avisó
sola.

**No se arregla en este lote** (el lote averigua). El arreglo es la línea de la
migración, idempotente, que corre Robertino en el SQL Editor de producción:

```sql
drop policy if exists feature_usage_own_rows on public.feature_usage;
```

y después volver a correr la consulta de `--sql`: la fila de la 0032 tiene que
decir `applied`. Pendientes, fila 34.
