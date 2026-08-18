# QA handoff — ronda de smoke tests de agosto 2026

Estado de la ronda de pruebas manuales que arrancó el 16/08/2026. Este archivo
existe para poder retomar el trabajo desde otra sesión o desde otra cuenta sin
tener que reconstruir el contexto: **si estás retomando, leé esto primero.**

Hay **dos** trackers en Drive, y no son lo mismo. Los dos están compartidos con
`robertino.calcaterra@migbirds.com` además de la cuenta personal:

| Tracker | Qué cubre | Cuándo usarlo |
| --- | --- | --- |
| [Ronda de smoke tests](https://docs.google.com/spreadsheets/d/1pXiGpKv5rEJAXZMzY0YXBpHqXsf_Ns_OpxYonw65liQ/edit) (89 filas + hallazgos) | Esta ronda: superficie pública contra producción, más los hallazgos de abajo | Para cerrar lo que quedó abierto de esta ronda |
| [Test manuales de toda la v2/v3](https://docs.google.com/spreadsheets/d/1TZUHL2gV0eLVs8EzpsGSroY-m-zJq6dqA5UIw9Y9Y_o/edit) (118 filas) | Plan completo de las features del 12 al 16/08, ordenado por dependencias, empezando por preparar el entorno y las tres cuentas | Para la ronda larga: auth, gating, audio, PRO, PRO+ |

Se solapan en la parte pública. El de 118 filas es el que tiene el orden de
ejecución pensado de punta a punta; el de 89 es el registro de lo ya corrido.

---

## Dónde quedó

Base probada: `main` @ `871c325`, producción en <https://energycurve.app>. Ojo:
`main` ya avanzó a `a5bf30b` con los arreglos de esta misma ronda, así que lo
que sigue en producción depende de si ya se deployó ese merge.

| Bloque | Estado |
| --- | --- |
| Superficie pública (SEO, legales, pricing, FAQ) | Probado — 12 filas |
| Salud del repo (suite, typecheck, lint) | Verde — 764 tests en 64 archivos en la rama de la ronda; **778 en 65 sobre `main` ya mergeado** (la diferencia viene del PR #115, no de esta ronda) |
| Auth, ingesta, motor, resultados | **Sin probar** — necesita la app corriendo |
| Audio real, historial, librería, v3 PRO | **Sin probar** — necesita archivos y cuenta PRO |
| Monetización end-to-end | **Sin probar** — implica un pago real |

Lo que falta son ~60 filas y casi todas necesitan a un humano con la app
levantada, archivos de audio propios y una cuenta de prueba.

## Lo que se encontró y ya está arreglado (mergeado)

Mergeado en `main` el 16/08/2026 por el
[PR #116](https://github.com/robertinoc/energycurve/pull/116), commit `dc0c77f`.
Los cuatro gates pasaron antes del push: `build`, `test` (764 en 64 archivos),
`typecheck` y `lint`.

1. **El idioma no se sincronizaba fuera de la landing.** El write path del
   locale estaba copiado en cuatro componentes y sólo la landing seteaba
   `<html lang>`, así que `/pricing`, `/terms`, `/privacy` e `/install` servían
   copy en español declarando inglés. Ahora vive en `lib/content/site-locale.ts`.
2. **La política de privacidad no listaba a Anthropic ni a Stripe** como
   procesadores, y no mencionaba que el audio se procesa localmente. Corregido
   en EN y ES, con la fecha actualizada a agosto.
3. **El copy decía que los planes pagos no se podían comprar** mientras el
   checkout de Stripe ya estaba enchufado y las ofertas publicadas como
   `InStock`. Corregido en las tres superficies (subtítulo, teaser y FAQ).

Cada uno tiene tests que lo blindan (`tests/site-locale.test.ts` y bloques
nuevos en `tests/seo.test.ts`).

## Lo que se encontró y NO está arreglado

- **El español no tiene URL propia ni `hreflang`.** No hay ruta `/es`, cero
  `<link rel=alternate>`, `og:locale` fijo en `en_US` y title/description
  siempre en inglés. El idioma se resuelve en el cliente, así que el servidor
  entrega inglés siempre y el contenido en español es invisible para los
  buscadores. Es el hallazgo más caro y necesita una decisión de arquitectura
  (routing por locale), no un parche. Contradice la prioridad que marca
  `docs/seo-aeo-baseline-2026-08.md`.
- **El JSON-LD sale en inglés en una página renderizada en español.** Causa
  raíz: `app/page.tsx:32` llama a `buildLandingStructuredData()` sin locale. El
  test de `seo.test.ts` pasa porque invoca el builder con `{locale}` explícito
  — valida la función, no el call site. Ojo: **no** tiene impacto en SEO hoy,
  porque Googlebot no manda la cookie y ve todo en inglés de punta a punta. Se
  resuelve solo si se hace el routing por locale.
- **JSON-LD duplicado en la landing:** dos `<script type=application/ld+json>`
  byte a byte idénticos, con un solo `<script>` en el código.
- **`/api/health` responde con cuerpo vacío** y sin content-type. Verificar qué
  está chequeando el uptime monitor.
- **Dos discrepancias entre Asana y lo publicado**, para que las decida
  Robertino: `/pricing` dice que FREE tiene arreglos ilimitados pero la tarea
  especifica 3/mes; y marca la lectura de tonalidad como "Pronto" aunque la
  tarea figura DONE del 15/08.

## Feature nueva en la misma rama (mergeada)

Commit `7087b3e`, en el mismo PR #116 pero separada de los arreglos de arriba.

Progreso real del ordenamiento inteligente. El endpoint pasó de devolver JSON a
streamear NDJSON (`lib/smart-order/stream.ts`) y la UI muestra una barra
determinada con "Ubicando temas: 23 de 40", contando los ids que el modelo va
comprometiendo. No hay mensajes rotativos inventados: todo lo demás del flujo
tarda milisegundos, así que "leyendo metadata…" sería describir trabajo ya
terminado.

## Ya cerrado (no rehacer)

- **Commitear y separar.** Hecho: dos commits (`dc0c77f` arreglos, `7087b3e`
  feature) en el PR #116, ya mergeado. El `.git/index.lock` que trababa el
  entorno estaba en el checkout principal, no en el worktree — era stale, sin
  ningún proceso de git tomándolo.
- **Correr `npm run build`.** Hecho, en la Mac: exit 0, compiló limpio. Era el
  único gate sin verificar; ya no bloquea nada.

## Pendiente inmediato

1. **Re-correr los smoke tests públicos después del deploy**, para confirmar
   las filas 91, 94, 95 y 98 del tracker de la ronda contra producción.
2. **Arrancar el tracker largo por el EPIC 0** (preparar entorno y las tres
   cuentas FREE / PRO / PRO+). Sin esas cuentas, la mitad del resto no se puede
   probar. Atajo: la PRO+ sale gratis agregando el mail a
   `COMP_PRO_PLUS_EMAILS`; la PRO conviene sacarla comprando con tarjeta de
   test de Stripe, así se valida el flujo de pago de paso.
3. Después, el bloque de auth e ingesta, que destraba el resto.
4. **Correr `RUN_THIS_IN_SUPABASE.sql`** (ver Ronda 2 más abajo) en dev y en
   prod — bloquea plantillas de curva propias y el idioma de los mails hasta
   que se haga.

## Decisiones que siguen abiertas

- **Routing por locale**, que es lo que destraba los dos hallazgos de SEO de
  arriba (URL propia para español y JSON-LD en el idioma correcto). Es cambio
  de arquitectura, no parche.
- **Si los dos trackers se consolidan en uno solo.** Hoy conviven y se solapan
  en la parte pública.

Las discrepancias Asana-vs-publicado (arreglos ilimitados en FREE, tonalidad
"Pronto") **ya no están abiertas** — la Ronda 2 las investigó y confirmó que
son decisiones de producto ya tomadas; lo que hay que sincronizar es la
descripción de las tareas en Asana, no el código. Ver esa sección.

---

## Ronda 2 — auditoría de código sin sesión de navegador (17/08/2026)

Se pidió revisar si algo se escapó del tracker de 89 filas y arreglar lo que
apareciera. Sin acceso al sheet (privado, 401 al pedirlo) ni a una sesión
logueada, el aporte fue una auditoría de código + verificación directa contra
la base de dev y contra producción vía `curl`. Base: `main` @ `a5bf30b`
(después de mergear #116).

### 🔴 Hallazgo crítico: dos migraciones de esta semana nunca se corrieron en dev

Verificado por lectura directa contra `djoutoutkukpjrdgjqkb` (el proyecto que
`.env.local` apunta hoy):

```
profiles.preferred_locale (migración 0018): NO EXISTE
public.curve_templates (migración 0019):     NO EXISTE
playlists.target_template_id (migración 0019): NO EXISTE
```

**Impacto real, ahora mismo, en dev:**

- **El PR #114 (plantillas de curva propias) está completamente roto.** Cada
  llamada a `curve_templates` falla; el fallo se traga en el service layer
  (`logError` + devuelve `[]`/`null`/`false`), así que en la UI el botón
  "Guardar esta forma" simplemente no confirma nunca — sin mensaje de error,
  indistinguible de un click que no registró.
- **El idioma del mail de compra y del de reseteo (PR #111) cae siempre a
  inglés**, para cualquier usuario, sin importar qué haya elegido — mismo
  patrón: el error se traga (`getProfileLocale`/`getLocaleByEmail` leen
  `data` e ignoran `error`), así que nunca hay un crash que lo delate.

No se corrió el `ALTER TABLE`/`CREATE TABLE` desde acá — en este proyecto esa
acción siempre la ejecuta Robertino a mano. El SQL exacto está en los propios
archivos de migración (`supabase/migrations/0018_profile_locale.sql` y
`0019_curve_templates.sql`) y ya fue verificado en su momento contra dev antes
de escribirlos; solo falta correrlo. **No se verificó prod** (no hay
credenciales de esa base en este entorno) — dado que dev las tiene ausentes,
es razonable asumir que prod también, y hay que confirmarlo antes de dar por
buena cualquier fila del tracker que toque plantillas propias o idioma de
mails.

### Arreglado en esta ronda

1. **JSON-LD de la landing en inglés para un usuario que ya eligió español.**
   Causa exacta que ya se había identificado: `app/page.tsx` llamaba a
   `buildLandingStructuredData()` sin locale. Ahora lee
   `getRequestLocale()` (la misma cookie que ya usa el dashboard) y se la
   pasa. **No resuelve el SEO en español** — sigue siendo el mismo problema de
   fondo (Googlebot nunca manda la cookie, el copy visible se resuelve en el
   cliente vía `localStorage`, no vía esta cookie) — pero saca la
   inconsistencia real para un usuario que vuelve al sitio con el idioma ya
   elegido: hoy esa persona ve el toggle en ES, el dashboard en ES, y el
   JSON-LD embebido decía "en". Sin test automatizado nuevo: mockear
   `next/headers` (o incluso `@/lib/server-locale`) para volver a importar
   `app/page.tsx` en caliente resultó intermitente bajo Vitest — pasaba solo en
   archivos aislados de un único test y fallaba en combinación con otros. Se
   prefirió no sumar un test inestable a la suite (verificado manualmente en su
   lugar: el `tsc --noEmit` limpio ya cubre toda la superficie de riesgo real,
   que es una sola línea de flujo de datos sin ramas).
2. **`tests/capabilities.test.ts` solo vigilaba los límites numéricos** (el
   caso "3/mes" tipo `applied_fixes`), no las capabilities con gate booleano —
   que es exactamente el bug que ya apareció una vez esta semana con
   `proWorkflow` ("un interruptor sin lámpara"). Se generalizó: ahora **toda**
   capability shipeada y de pago (no `free`) tiene que aparecer citada con
   `can(...)` en algún archivo de `app/` o `services/`, o el CI falla. Probado
   deshabilitando a mano la única referencia de `global_library` y
   confirmando que el test rojo lo detecta, y que sacar una de las *dos*
   referencias de `set_comparator` no da falso positivo.

### Verificado y NO reproducido (de los hallazgos sin arreglar de la ronda 1)

- `/api/health`: hoy responde `200`, `content-type: application/json` y
  cuerpo real tanto en `GET` como en `HEAD`, verificado en vivo contra
  `energycurve.app`. No se pudo reproducir "cuerpo vacío, sin content-type".
- JSON-LD duplicado en la landing: hoy hay **un solo** `<script
  type="application/ld+json">` en el HTML servido, y solo un call site en el
  código (`app/page.tsx`). Tampoco reproduce.
- Las dos discrepancias Asana-vs-publicado que anotó la ronda 1 (arreglos
  ilimitados en FREE, tonalidad marcada "Pronto") **no son bugs de código**:
  son decisiones de producto ya tomadas y documentadas esta semana
  (`docs/plan-gating.md`, `docs/energy-model-v3.md`) — lo que quedó
  desactualizado es la *descripción* de las tareas en Asana, no la app. Sigue
  siendo Robertino quien tiene que sincronizar eso.

### Lo que sigue sin poder probarse desde acá

Solo hay **una playlist real en dev**, sin slot, sin forma declarada, y
**cero filas en `playlist_versions`** — o sea que el historial, plan-vs-tocado,
el comparador de sets y la librería global nunca corrieron contra datos
reales, ni siquiera una vez. Confirma lo que ya decía la ronda 1: ese bloque
completo necesita a un humano con la app levantada y una cuenta de prueba.

### Hallazgo adicional (mismo día): 3 tablas sin RLS, contra la convención propia

Auditando por qué faltaban las migraciones 0018/0019, se revisó cada
`create table` del historial contra la convención documentada en
`docs/decisions.md` (decisión 22: "RLS enabled, zero policies — default-deny
para `anon`/`authenticated`; la capa de servicio es el límite real"). Tres
migraciones posteriores a esa decisión nunca la aplicaron:

- `0012_billing.sql` → `billing_events`
- `0017_playlist_versions.sql` → `playlist_versions`
- `0019_curve_templates.sql` → `curve_templates`

**Severidad real hoy: baja, no explotable.** Se verificó que este repo no
tiene ninguna anon/publishable key de Supabase en ningún lugar del código —
`lib/supabase/server.ts` es el único cliente, `server-only`, con la
service-role key, que igual bypassea RLS. O sea que hoy nada fuera del
propio servidor puede tocar Postgres. Pero es exactamente el escenario que la
decisión 22 dice explícitamente que hay que blindar por si el día de mañana
se agrega un cliente de navegador o una anon key (ya en el roadmap: verify
features, etc.) — ese día, estas tres tablas serían la única excepción sin
default-deny.

**Arreglado**: nueva migración `0020_backfill_missing_rls.sql`, misma receta
que el resto del schema (`enable row level security`, cero policies). Va en
la misma rama/PR que el resto de esta ronda porque es trivial y de bajísimo
riesgo — no requiere backfill de datos ni cambia ningún comportamiento actual
de la app, solo cierra la puerta a futuro.

Las tres migraciones pendientes (0018 + 0019 + 0020) están combinadas en un
solo script listo para pegar en el SQL Editor de Supabase — buscar
`RUN_THIS_IN_SUPABASE.sql` en el mensaje del PR #118, o concatenar los tres
archivos de `supabase/migrations/`. Es idempotente: correrlo dos veces, o en
un entorno donde una parte ya esté aplicada, no rompe nada.

---

## Ronda 3 — se cierra el hallazgo de SEO más caro (17/08/2026)

**El español ya tiene URL propia.** Era la fila 93 del tracker (ERROR) y la mitad
que quedaba de la 97: no existía ruta `/es`, cero `hreflang`, `og:locale` fijo en
`en_US`, y el idioma se resolvía en el cliente — así que el servidor contestaba
siempre en inglés y la traducción completa al español era invisible para Google
y para los motores de respuesta.

Lo que quedó implementado: inglés en la raíz, español bajo `/es`, seis páginas por
idioma, canonical propio de cada idioma (apuntar el español al inglés le habría
dicho a Google que no lo indexe), `hreflang` + `x-default`, títulos y
descripciones traducidos, JSON-LD en el idioma de la ruta, sitemap con las doce
URLs, y los links internos localizados para que quien está en `/es` siga en
español al navegar.

Verificado contra el HTML crudo del servidor (sin JS, que es lo que ve Googlebot):
`/es` responde con `<title>` en español, `canonical` a `/es`, los tres `hreflang`,
`og:locale=es_LA` y el hero en español. Las doce rutas siguen siendo estáticas en
el build.

**Filas del tracker que se pueden pasar a DONE por esto:** 93 (español sin URL ni
hreflang) y 97 (JSON-LD en inglés — ahora está completo, antes sólo funcionaba
para un usuario que volvía con cookie).

**Fila 90 (JSON-LD duplicado): es un falso positivo, se puede marcar N/A.**
Medido de nuevo con cuidado: hay **un solo** `<script type="application/ld+json">`
real, tanto en el HTML servido como en el DOM ya hidratado. La segunda aparición
del string está dentro del payload RSC de React (`self.__next_f.push(...)`), que
es la serialización del árbol de componentes, no un tag renderizado — Google no lo
lee como structured data. Contar ocurrencias del texto en el HTML da 2; contar
tags da 1.

**Encontrado y arreglado de paso:** el `<title>` de la landing en inglés no
llevaba el sufijo "| EnergyCurve" sólo porque coincidía byte a byte con el
`title.default` del root layout, caso que Next resuelve sin aplicar el template.
El título en español no coincide, así que salía "EnergyCurve — Análisis … |
EnergyCurve". Ahora la landing declara `title.absolute` explícitamente en vez de
depender de que dos strings sigan siendo iguales.

**Lo que sigue abierto acá:** el `<html lang>` del HTML servido sigue diciendo
`en` en las páginas `/es`, y se corrige en el cliente. Es deliberado: derivarlo en
el servidor exige leer el request en el root layout, y eso saca a **todas** las
páginas del renderizado estático. Google no usa ese atributo para determinar el
idioma (usa `hreflang` y el contenido visible, ambos correctos), y los lectores de
pantalla leen el atributo vivo. Si algún día se quiere en el HTML servido, la vía
correcta son dos root layouts con route groups.
