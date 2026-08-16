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

## Decisiones que siguen abiertas

Ninguna de estas se resolvió en el PR #116 y las tres necesitan que decidas vos:

- **Routing por locale**, que es lo que destraba los dos hallazgos de SEO de
  arriba (URL propia para español y JSON-LD en el idioma correcto). Es cambio
  de arquitectura, no parche.
- **Las dos discrepancias entre Asana y lo publicado** de la sección anterior
  (arreglos ilimitados en FREE, y lectura de tonalidad marcada como "Pronto").
- **Si los dos trackers se consolidan en uno solo.** Hoy conviven y se solapan
  en la parte pública.
