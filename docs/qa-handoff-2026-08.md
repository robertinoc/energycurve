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
