# Estrategia de pruebas — EnergyCurve

Documento de la fase F0 del *Plan Integral de Pruebas*. Define qué se prueba, con
qué criterio, y cuál es el piso que no se puede bajar.

El plan original estaba escrito para un producto de consumo energético: hablaba de
medidores, tarifas por franja horaria y reconciliación de facturas. Lo que sigue
es la versión que corresponde a lo que EnergyCurve realmente es.

## Qué es el producto, a efectos de riesgo

Un DJ trae su tracklist —pegada a mano, o desde Rekordbox, Traktor, M3U8 o CSV, o
leyendo los tags de sus archivos de audio en el navegador—, EnergyCurve le dibuja
la curva de energía del set, le señala los problemas, le propone arreglos, y le
devuelve el orden corregido **al formato nativo de su programa**. Está vivo,
cobra, y tiene planes con cuotas.

De ahí salen las cuatro cosas que pueden salir caras:

1. **Escribimos sobre la librería de otro programa.** Un export defectuoso no
   muestra un número equivocado: le borra datos a alguien. Ya pasó.
2. **El producto puede fallar sin parecer roto.** Hay caminos degradados por
   diseño (la IA cae a un heurístico) y eso es correcto, salvo cuando el camino
   bueno lleva semanas sin tomarse y nadie se entera. También pasó.
3. **Hay dinero.** Un gate que no se aplica regala una feature paga; uno que se
   aplica de más le cobra a alguien lo que ya pagó.
4. **Los datos son de otros.** Un set es de un DJ y de nadie más.

## Matriz de riesgo por módulo

Ordenada por lo que ya falló o por lo que costaría más si fallara.

| Módulo | Riesgo | Por qué | Piso |
|---|---|---|---|
| `lib/playlists/export.ts` + `source_payload` | **Crítico** | Escribe sobre la librería del usuario. Bug P0 del 07/09: el writer de NML reconstruía las entradas desde 11 campos cuando una entrada real lleva 25, y borraba hotcues, loops y la huella de análisis. | Round-trip byte a byte, con cues |
| `services/*-service.ts` | **Crítico** | Es el límite de seguridad real. `AGENTS.md`: "RLS no lo va a atrapar". Toda consulta pasa por la service-role key, que saltea RLS por diseño. | Un filtro de dueño olvidado tiene que poner un test en rojo |
| `app/api/billing/webhook` | **Crítico** | Lo único que otorga permisos pagos. Cualquiera puede hacerle POST. | Firma real verificada, idempotencia real |
| `lib/engine/*` | Alto | El score y la curva son el producto. | 94% de sentencias |
| `lib/playlists/parse-*` | Alto | Puerta de entrada de datos ajenos y malformados. | 93% de sentencias |
| `lib/music/camelot.ts` | Alto | Una tonalidad mal convertida arruina una mezcla, en silencio. | 98% de sentencias |
| Cuotas y gates de plan | Alto | Toca dinero en las dos direcciones. | `can(...)` en el límite real, no en la UI |
| `lib/rate-limit.ts` | Medio | Vive en un `Map` en memoria: en serverless el límite es por instancia y se reinicia en frío. | Documentado como riesgo, medido en F4 |
| Gig Mode / PWA | Medio | Tiene que funcionar sin señal, en una cabina. | E2E offline |
| Copy y paridad EN/ES | Medio | Media docena de tests ya fijan la transparencia de StageLink LLC. | Se mantiene |

## Criterios de entrada y salida

**Entrada a una fase:** la anterior está en verde y sus artefactos están escritos.

**Salida de una fase:** todo lo que se afirma tiene evidencia enlazada, los gates
pasan, y los defectos abiertos están priorizados con severidad.

**Gate de merge** (ya en CI, en este orden): `lint` → `typecheck` → `test` con
cobertura → `build` → `e2e`. Los cinco son bloqueantes.

## Métricas y umbrales

Medidos el 11/09/2026 y fijados **un punto por debajo de lo ya alcanzado**. Un
umbral que falla el día que se instala se borra al día siguiente.

| Alcance | Sentencias | Ramas | Funciones | Líneas |
|---|---|---|---|---|
| Global | 64 | 63 | 72 | 64 |
| `lib/engine/**` | 94 | 85 | 95 | 94 |
| `lib/playlists/**` | 93 | 86 | 96 | 93 |
| `lib/music/**` | 98 | 92 | 99 | 98 |
| `lib/product/**` | 96 | 94 | 87 | 96 |
| `lib/smart-order/**` | 96 | 92 | 99 | 96 |
| `services/**` | 8 | 8 | 12 | 8 |
| `app/api/**` | 0 | 0 | 0 | 0 |

Los dos últimos están fijados bajo a propósito, no por descuido: el número tiene
que ser **visible**, no ausente. Suben a medida que llegan las suites de F2.

Se cuentan `lib/**`, `services/**` y `app/api/**`. Las páginas y los layouts son
composición y los cubre Playwright; contarlos haría que el número se mueva cuando
crece la app en vez de cuando crece lo probado. `lib/content/**` queda afuera:
son tablas de copy, datos y no comportamiento.

**Flakiness: objetivo cero, y el mecanismo es `retries: 0`.** Es una decisión ya
tomada y documentada en `playwright.config.ts`: un test que solo pasa al
reintentar es un test flaky, y una suite flaky es peor que una chica porque
entrena a re-correr en vez de a mirar. El plan original pedía cuarentena con
reintentos; se respeta la decisión existente y se detecta sin reintentar.

## Entorno

No hace falta provisionar staging: el entorno de dev ya es reproducible
(`npm run dev`, puerto 3010) con su propio proyecto de Supabase y Stripe en modo
test. Lo que falta de verdad es un **bootstrap de base de datos**. Hoy las
migraciones se aplican a mano en el SQL Editor: no hay `config.toml`, ni seed, ni
runner, ni test de orden de migraciones.

Eso no es teórico. Verificado el 11/09/2026 contra dev: la migración **0021 nunca
se corrió**, así que las features espectrales no se persisten y nadie se enteró.
En agosto pasó lo mismo con la 0018 y la 0019, y el fallo se tragaba en la capa de
servicio, con lo que en la UI se veía como un botón que no confirmaba nunca.

**Reglas de ejecución contra producción:** solo lectura pasiva y sin sesión
(cabeceras, TLS, robots, `/api/health`, tiempos con volumen mínimo). Todo lo que
escribe corre en local contra Supabase dev y Stripe en modo test.

## Datos de prueba

Sintéticos, nunca la librería real de nadie. Lo que hace falta:

- Playlists en los cinco formatos de import.
- **Un NML con `CUE_V2`, `AUDIO_ID` e `INFO@FLAGS` reales**, que es lo único que
  permite verificar que el export no los pisa.
- Casos límite de tonalidad: las nueve grafías que el parser descartaba hasta el
  PR #177, más notaciones mezcladas.
- Tracks incompletos: sin BPM, sin tonalidad, sin duración. La regla del producto
  es decir qué parte de la curva es dato y qué parte es estimación.
- Ya existe `tests/fixtures-pride-bounce.json`, una playlist real de hard techno.

## Herramientas por capa

| Capa | Herramienta | Estado |
|---|---|---|
| Unitario e integración | Vitest 4 | Ya estaba |
| Cobertura | `@vitest/coverage-v8` | **Agregado en esta fase** |
| E2E | Playwright | Ya estaba, un solo spec |
| Base de datos en tests | Fake en memoria que **aplica** los filtros | **Agregado en esta fase** |
| Firma de webhooks | SDK real de Stripe (`generateTestHeaderString`) | **Agregado en esta fase** |
| Accesibilidad | `@axe-core/playwright` | F4 |
| Rendimiento | Lighthouse CI, `autocannon` (solo local) | F4 |

Sobre el fake de base de datos: aplica los filtros en vez de registrarlos. La
diferencia es el punto entero. Un fake que solo recuerda qué `.eq()` se llamaron
se conforma con una función que filtra por la columna equivocada, o que filtra una
consulta y se olvida de la siguiente. Uno que devuelve filas de verdad le entrega
el filtro olvidado al que llama, y ahí "un extraño no puede leer este set" quiere
decir lo que dice.

## Cómo se verifica que un test sirve

Un test que pasa contra código roto es peor que no tener test. Antes de dar por
buena una suite nueva, se le inyecta el bug que dice prevenir y tiene que ponerse
en rojo.

Hecho en esta fase, y no fue ceremonia:

- **Aislamiento de datos.** Se sacó el `.eq("user_id", profileId)` de
  `getOwnedPlaylist`: 7 de 16 tests en rojo. En el primer intento fueron solo 5, y
  las dos detecciones que faltaban estaban tapadas por defectos **del propio
  fake**: le faltaba `single()`, así que `addTrack` moría con un TypeError que el
  manejo de errores del servicio se tragaba, y "no se escribió la fila" parecía un
  rechazo cuando era una excepción. La semilla tampoco tenía dos tracks, así que
  `moveTrack` volvía temprano sin llegar nunca a escribir.
- **Idempotencia del webhook.** Se anuló la rama del código `23505`: test en rojo.
  Acá también hubo que arreglar el fake primero, que no aplicaba unicidad de clave
  primaria y dejaba pasar la segunda inserción.

- **Fidelidad del export nativo.** Se forzó a `preservedEntry` a devolver `null`
  siempre, que es literalmente el bug P0 del 07/09: volver a reconstruir cada
  entrada desde los campos que modelamos en vez de devolver la del usuario. 7
  tests en rojo, entre ellos "keeps every hotcue, with its position and number
  intact" y "survives a field this codebase has never heard of". Ese riesgo, que
  es el más caro del producto, **ya está cubierto de verdad**: se verificó en vez
  de suponerlo.

Las dos primeras veces, el defecto estaba en la herramienta de medición y no en
el producto. Es exactamente lo que este paso existe para encontrar.

### Resumen de las mutaciones corridas

| Módulo | Bug inyectado | Tests en rojo |
|---|---|---|
| `services/playlist-service.ts` | Sacar `.eq("user_id", profileId)` de `getOwnedPlaylist` | 7 de 16 |
| `services/billing-service.ts` | Anular la rama `23505` de `claimBillingEvent` | 1 de 6 |
| `lib/playlists/export.ts` | Forzar `preservedEntry` a `null` (el bug P0) | 7 de 63 |

Ninguna mutación sobrevivió sin detección. Dos mutaciones del primer caso
sobreviven a propósito y están documentadas: `deletePlaylist` y
`updatePlaylistDetails` vuelven a filtrar por `user_id` en el propio write, que
es defensa en profundidad y tiene su propio test para que no se "simplifique".

## Lo que esta estrategia no cubre, y hay que decirlo

- **Todo lo que está detrás del login sigue sin E2E.** Hace falta un juego de
  cuentas de prueba (FREE, PRO, PRO+) en dev. Hoy eso son dos planillas de Google
  de 89 y 118 filas que se corren a mano.
- **La verificación del lado de Traktor del fix P0 no se puede automatizar.**
  Solo Traktor puede decir qué hace Traktor al importar. Va con
  `scripts/traktor-fingerprint.mjs` sobre una copia de la colección.
- **La precisión de la detección de tonalidad está en 21%** y la calibración del
  Energy Model v3 está sin correr. Las dos dependen de una sesión de etiquetado
  por oído que tiene que hacer una persona.
