# QA handoff — ronda de smoke tests de agosto 2026

Estado de la ronda de pruebas manuales que arrancó el 16/08/2026. Este archivo
existe para poder retomar el trabajo desde otra sesión o desde otra cuenta sin
tener que reconstruir el contexto: **si estás retomando, leé esto primero.**

Tracker de casos de prueba (89 filas + hallazgos):
<https://docs.google.com/spreadsheets/d/1pXiGpKv5rEJAXZMzY0YXBpHqXsf_Ns_OpxYonw65liQ/edit>

---

## Dónde quedó

Base probada: `main` @ `871c325`, producción en <https://energycurve.app>.

| Bloque | Estado |
| --- | --- |
| Superficie pública (SEO, legales, pricing, FAQ) | Probado — 12 filas |
| Salud del repo (suite, typecheck, lint) | Verde — 764 tests en 64 archivos |
| Auth, ingesta, motor, resultados | **Sin probar** — necesita la app corriendo |
| Audio real, historial, librería, v3 PRO | **Sin probar** — necesita archivos y cuenta PRO |
| Monetización end-to-end | **Sin probar** — implica un pago real |

Lo que falta son ~60 filas y casi todas necesitan a un humano con la app
levantada, archivos de audio propios y una cuenta de prueba.

## Lo que se encontró y ya está arreglado (sin mergear)

Todo esto está escrito en el working tree, en la rama
`energycurveapp/smoke-test-findings`, **sin commitear** (ver "Pendiente" abajo).

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

## Feature nueva en la misma rama

Progreso real del ordenamiento inteligente. El endpoint pasó de devolver JSON a
streamear NDJSON (`lib/smart-order/stream.ts`) y la UI muestra una barra
determinada con "Ubicando temas: 23 de 40", contando los ids que el modelo va
comprometiendo. No hay mensajes rotativos inventados: todo lo demás del flujo
tarda milisegundos, así que "leyendo metadata…" sería describir trabajo ya
terminado.

## Pendiente inmediato

1. **Commitear y separar en dos PRs.** Quedó todo sin commitear porque el
   entorno no pudo borrar `.git/index.lock`. En la Mac:
   `rm -f .git/index.lock`, después commitear los archivos de fixes y los de la
   feature por separado (la lista exacta está en el mensaje del chat).
2. **Correr `npm run build` localmente.** No se pudo verificar en el sandbox
   porque no llega a Google Fonts. `npm test`, `npm run typecheck` y
   `npm run lint` sí corrieron y están verdes.
3. **Re-correr los smoke tests públicos después del deploy**, para confirmar
   las filas 91, 94, 95 y 98 del tracker contra producción.
4. Recién ahí, seguir con el bloque de auth e ingesta, que destraba el resto.

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
