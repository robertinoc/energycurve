# Tracker de visibilidad en IA — SEO-E04

**El instrumento, vacío.** Escrito el 10/10/2026 (lote 19). Correrlo es de
Robertino: los motores necesitan sus cuentas. Este archivo no tiene ni un
resultado; la primera corrida llena las tablas de abajo y queda fechada.

Lo que mide: si un asistente, cuando alguien le pregunta lo que EnergyCurve
resuelve, **nombra a EnergyCurve**, en qué lugar, con qué fuentes, y a quién
nombra en su lugar. Es el KPI «AI prompts citing EnergyCurve (of 10)» de
`docs/seo/SEO-PLAN.md` §4, cuya línea de base es «0 (to confirm)»: esta es la
confirmación.

---

## Las diez consignas

Ninguna es de criterio propio. Cada una es una consulta del baseline de agosto
(`docs/seo-aeo-baseline-2026-08.md`) o una fila del mapa de keywords
(`docs/seo/keyword-map.md`), reescrita como se le pregunta a un asistente — una
oración entera, en primera persona — sin nombrar a EnergyCurve ni a ningún
competidor (salvo la 5, donde el competidor *es* la pregunta).

**Se pegan tal cual, con la puntuación.** Cambiar una palabra entre corridas
invalida la comparación.

| # | Consigna | De dónde sale |
|---|---|---|
| E1 | `How do I know if the track order of my DJ set is any good?` | Baseline, hueco 1 («Is my set order actually good?», sin respuesta en ningún resultado) y consulta 2 (`how to order tracks in a DJ set`); mapa, `how to plan a dj set` |
| E2 | `Is there a free tool to analyze the energy curve of my DJ set before I play it?` | Baseline, consultas 1 (`DJ set energy curve`) y 4 (`analyze DJ setlist energy`), hueco 2 (antes de tocar, no después); mapa, `free dj set planner`, `analyzing dj sets` |
| E3 | `How big an energy jump between two tracks is too much in a DJ set?` | Baseline, hueco 4 («How big an energy jump is too big?») |
| E4 | `My tracks have no BPM or key tags. How can I still plan the energy of my DJ set?` | Baseline, hueco 3 (temas sin BPM ni tonalidad: «the entry with no competing answer anywhere»); mapa, `how to get the bpm of a song` |
| E5 | `What is a good Mixed In Key alternative for planning the structure of a DJ set?` | Mapa, `mixed in key alternative` (2 fuentes de autocompletado) y `mixed in key alternative free`; es también la quinta consigna inglesa que propone SEO-E04 |
| S1 | `¿Cómo ordeno los temas de un set de DJ?` | Baseline, consulta 8 (`cómo ordenar los tracks de un set de DJ`, cero productos en el resultado); mapa, `como armar un set de dj` |
| S2 | `¿Cómo analizo la energía de un set de DJ?` | Baseline, consulta 9 (`analizar la energía de un set de DJ`, la más débil del baseline) |
| S3 | `¿Hay alguna herramienta gratis para ver la curva de energía de mi set de DJ?` | Mapa, `curva de energia dj` (semilla sin autocompletado: la frase todavía no se escribe en español, y por eso es la que más dice si un motor la asocia al sitio); baseline, hueco 6 |
| S4 | `Mis temas no tienen BPM ni tonalidad, ¿cómo armo igual el set?` | Baseline, huecos 3 y 6; mapa, `como saber que tonalidad esta una cancion` y vecinas |
| S5 | `¿Cuál es el mejor programa gratis para preparar sets de DJ?` | Mapa, `programa gratis para dj`; baseline, consulta 7 (`DJ set planning software`) en su forma española |

`dj set planner` con la palabra «AI» no está a propósito: es la decisión de
la fila 20 de `docs/pendientes-robertino.md`, y una consigna que la presuponga
mediría una posición que el producto todavía no tomó.

---

## Qué se anota de cada respuesta

Columnas fijas. Una respuesta, una fila.

| Columna | Qué va | Cómo se decide |
|---|---|---|
| **Aparece** | `sí` / `no` | `sí` sólo si nombra **EnergyCurve, el producto de DJ**, o enlaza `energycurve.app`. Una mención de `energycurve.com` (la empresa agrícola, ver `docs/brand-name-collision.md`) es `no`, con nota |
| **Posición** | `1`, `2`, … o `—` | El lugar de EnergyCurve entre **los productos o herramientas que la respuesta nombra**, en orden de aparición. `—` si no aparece |
| **URL nuestra** | la ruta, o `—` | Qué página del sitio cita o enlaza, si alguna (`/tools/energy-curve`, `/es/blog/…`) |
| **Fuentes** | dominios, separados por coma | Los que el motor cita o enlaza, en su orden. `sin fuentes` si no muestra ninguna |
| **Competidores** | de la lista de abajo, separados por coma | Los que nombra, aparezca o no EnergyCurve |
| **Nota** | texto corto | Lo que no entra arriba: si respondió con una lista, si inventó una función, si confundió el producto |

**Lista fija de competidores**, para que la columna se pueda contar:
SetFlow, Mixgraph, HarmonySet, DJ.Studio, Mixed In Key, Lexicon, Rekordbox,
Traktor, Serato, Phaso, Pirate. Cualquier otro va como `otro: <nombre>`.

---

## La planilla

Una tabla por motor. Antes de empezar cada una, se llenan sus tres líneas de
condiciones; sin ellas, la tabla no vale.

### ChatGPT

Modelo exacto: ______ · Fecha y hora: ______ · Sesión: iniciada / sin iniciar · Memoria: apagada / prendida · Búsqueda web: sí / no / automática · Región (IP): ______

| # | Aparece | Posición | URL nuestra | Fuentes | Competidores | Nota |
|---|---|---|---|---|---|---|
| E1 | | | | | | |
| E2 | | | | | | |
| E3 | | | | | | |
| E4 | | | | | | |
| E5 | | | | | | |
| S1 | | | | | | |
| S2 | | | | | | |
| S3 | | | | | | |
| S4 | | | | | | |
| S5 | | | | | | |

### Perplexity

Modelo exacto: ______ · Fecha y hora: ______ · Sesión: iniciada / sin iniciar · Modo: ______ · Región (IP): ______

| # | Aparece | Posición | URL nuestra | Fuentes | Competidores | Nota |
|---|---|---|---|---|---|---|
| E1 | | | | | | |
| E2 | | | | | | |
| E3 | | | | | | |
| E4 | | | | | | |
| E5 | | | | | | |
| S1 | | | | | | |
| S2 | | | | | | |
| S3 | | | | | | |
| S4 | | | | | | |
| S5 | | | | | | |

### Google — AI Overviews / AI Mode

Superficie: AI Overview / AI Mode · Fecha y hora: ______ · Sesión: iniciada / sin iniciar (ventana privada) · `hl` / `gl`: ______ · Región (IP): ______

Si la búsqueda no muestra AI Overview, la fila dice `no` en Aparece y
`sin AI Overview` en Nota — no es lo mismo que un Overview que no nos nombra.

| # | Aparece | Posición | URL nuestra | Fuentes | Competidores | Nota |
|---|---|---|---|---|---|---|
| E1 | | | | | | |
| E2 | | | | | | |
| E3 | | | | | | |
| E4 | | | | | | |
| E5 | | | | | | |
| S1 | | | | | | |
| S2 | | | | | | |
| S3 | | | | | | |
| S4 | | | | | | |
| S5 | | | | | | |

### Claude

Modelo exacto: ______ · Fecha y hora: ______ · Sesión: iniciada · Búsqueda web: sí / no · Memoria / proyecto: ninguno · Región (IP): ______

| # | Aparece | Posición | URL nuestra | Fuentes | Competidores | Nota |
|---|---|---|---|---|---|---|
| E1 | | | | | | |
| E2 | | | | | | |
| E3 | | | | | | |
| E4 | | | | | | |
| E5 | | | | | | |
| S1 | | | | | | |
| S2 | | | | | | |
| S3 | | | | | | |
| S4 | | | | | | |
| S5 | | | | | | |

### Gemini

Modelo exacto: ______ · Fecha y hora: ______ · Sesión: iniciada / sin iniciar · Actividad en apps: apagada / prendida · Región (IP): ______

| # | Aparece | Posición | URL nuestra | Fuentes | Competidores | Nota |
|---|---|---|---|---|---|---|
| E1 | | | | | | |
| E2 | | | | | | |
| E3 | | | | | | |
| E4 | | | | | | |
| E5 | | | | | | |
| S1 | | | | | | |
| S2 | | | | | | |
| S3 | | | | | | |
| S4 | | | | | | |
| S5 | | | | | | |

### Resumen de la corrida

| Motor | Consignas que nombran a EnergyCurve (de 10) | EN (de 5) | ES (de 5) | Competidor más nombrado |
|---|---|---|---|---|
| ChatGPT | | | | |
| Perplexity | | | | |
| Google | | | | |
| Claude | | | | |
| Gemini | | | | |

---

## El procedimiento

1. **Una sola sesión, un solo día.** Las cincuenta respuestas en la misma
   tarde. Los motores cambian de modelo sin avisar; una corrida repartida en
   una semana mezcla dos versiones de lo mismo.
2. **Anotá el modelo exacto antes de la primera consigna**, como lo muestra el
   selector o la página de ayuda del motor ese día, y la fecha. «ChatGPT» no es
   un modelo. Si el motor no lo dice, escribí «no lo informa» — no lo
   deduzcas.
3. **Conversación nueva por consigna.** Nunca dos consignas en el mismo hilo:
   la segunda respuesta hereda la primera.
4. **Sin historial ni memoria.** Memoria apagada o chat temporal donde exista
   (ChatGPT), sin proyectos ni instrucciones personalizadas (Claude),
   actividad apagada (Gemini). Google en ventana privada.
5. **Ninguna visita a `energycurve.app` desde ese navegador ese día**, antes de
   correr. Tu propia navegación es la señal que más personaliza un resultado de
   Google, y sos el visitante más frecuente del sitio.
6. **Región anotada.** La IP decide qué fuentes ve un motor con búsqueda. Si
   corrés desde Argentina, anotalo así; repetir desde otra región es otra
   corrida, no la misma.
7. **Pegá la consigna tal cual y no repreguntes.** La primera respuesta es la
   que se anota. Si el motor pide una aclaración, la fila dice `pidió
   aclaración` en Nota y no se contesta.
8. **Guardá cada respuesta** (captura o texto exportado) en una carpeta con la
   fecha. Una fila que alguien discuta después se resuelve mirando la captura,
   no la memoria.

### Lo que invalida una fila, o la corrida

| Si pasó esto | Qué hacer |
|---|---|
| La sesión tenía memoria prendida, o el hilo traía conversación previa | Fila inválida: se repite en un hilo nuevo |
| Se cambió una palabra de la consigna | Fila inválida |
| Se repreguntó | Se anota sólo la primera respuesta |
| El motor cambió de modelo a mitad de la corrida (se ve en el selector) | Se anota en las condiciones y se separan las filas de antes y de después |
| Las respuestas de un motor se tomaron en días distintos | La tabla de ese motor no se compara con otras corridas |
| Se visitó `energycurve.app` antes, en ese navegador | Las filas de Google de ese día no valen |

---

## Cada cuánto

Una vez por mes, el primer lunes, dentro de la revisión mensual
(`docs/seo/runbook-revision-mensual.md`, SEO-E27). Cada corrida es una copia de
la planilla con la fecha en el título, en este mismo archivo, debajo de la
anterior; la planilla vacía de arriba no se toca.
