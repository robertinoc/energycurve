# Lo que espera algo tuyo

**Podado el 21/10/2026 (lote 21).** Una tabla ordenada por **lo que destraba**,
no por antigüedad ni por número. El número de cada fila es su nombre, no su
puesto: no se renumera, para no romper las referencias de otros documentos
(«fila 10», «fila 16», «fila 20»).

Qué cambió en esta poda:

- **Sale la 13** (H-16): Robertino autorizó el rename y el lote 21 lo hizo.
  Lo que queda es validarlo en producción, y eso está en la fila 3 (L21.3).
- **Cambian la 3, la 10, la 11, la 14, la 15, la 18 y la 28.** La 28 pasa
  arriba de todo y tiene runbook. La 14 y la 15 pasan de «definir» a
  «elegir», porque las opciones ya están escritas. La 10 y la 18 tienen el
  costo corregido.
- **Entran la 32** (qué commit sirve producción) **y la 33** (las
  comparaciones que vencen el 31/10).
- Antes había **33 filas** (el pedido del lote decía 30; las conté: 33).
  Ahora hay **34**.

Cada fila nueva o cambiada se verificó al escribirla, con un comando o leyendo
el archivo que nombra. Las que no cambiaron dicen lo mismo que el lote 20 y
**no se volvieron a verificar**. Lo que no se pudo confirmar dice «sin
confirmar». Producción no se miró en este lote: el contenedor no llega a
`energycurve.app` ni a Vercel.

El costo es el tuyo, contando el rato de entrar a la consola. Donde una fila
abre trabajo de código después, va aparte. Los costos son estimaciones. Donde
la estimación es floja, lo dice.

## La tabla

| # | Qué | Qué destraba | Tu costo | Esperando desde | Detalle |
|---|---|---|---|---|---|
| 28 | **Aplicar la migración `0034_profile_first_touch.sql`** en dev (`djoutoutkukpjrdgjqkb`) y en producción (`iwzkzybzadsmnwilcity`). **Desde el lote 21 es copiar y pegar:** `docs/runbooks/aplicar-migracion-0034.md` tiene el chequeo previo («¿ya está?»), el SQL exacto entre `begin;` y `commit;`, y una consulta que contesta «ESTÁ» o «NO ESTÁ». Correrla dos veces no rompe nada: se probó en un Postgres 16 descartable | Que el producto empiece a guardar de dónde llega cada usuario. **Sin ella, cada registro en producción se pierde para la medición** (la ruta contesta 503 y el navegador guarda el contacto, pero el servidor lo acepta sólo durante las 24 h siguientes al registro) y el tablero dice «not measured». En dev, además, `seed-scale.mjs seed` frena hasta que se aplique. Comprobado el 20/10: dev contesta `42703 column profiles.first_touch_source does not exist`. En producción: **sin confirmar** (este contenedor no llega) | ~10 min por proyecto, con el chequeo | 20/10 | `docs/runbooks/aplicar-migracion-0034.md`; banco L21.1 (y L20.2) |
| 11 | **`db:status` con `MIGRATION_DB_URL`**: contra producción (DB.3) y, de paso, contra dev (DB.2) | Saber qué migraciones tiene prod —nunca se preguntó— y confirmar en dev lo que REST no ve: índices y políticas. Desde el lote 21 también detecta las siete columnas de la 0034 (antes veía una sola de siete), así que sirve como paso 1 del runbook de la fila 28 | 10 min | 25/09 | Banco DB.3. El comando lo corrés vos: la connection string es un secreto |
| 32 | **Confirmar qué commit sirve producción, y desplegar `main`** si no es el último. La última vez que alguien lo miró (20/10, API de Vercel) servía `472535c`, el merge del #286. El lote 20 se mergeó después, en `786e97b` | Todas las filas de validación del banco (L20 y L21) y la fila 28, que importa recién cuando el código del lote 20 está en producción. Si el lote 20 está desplegado: **sin confirmar**; este contenedor no llega a Vercel | 5 min mirar; el deploy, lo que tarde Vercel | 21/10 | Vercel → Deployments; `docs/handoff-2026-09-17.md`, «Estado de hoy» |
| 1 | **PostHog → Settings → Project → «Discard client IP data»**: confirmar que está prendido, y si no, prenderlo | Que el banner y la política digan algo verdadero hoy. El código ya no manda `$ip` en el evento (lote 16), pero la IP llega igual en la conexión, y si PostHog la guarda depende **sólo** de este ajuste | 2 min | 02/10 | `docs/qa/output-test-tanda-01.md` §H-17 |
| 2 | **Aprobar la frase corregida** de la política, el banner, `privacy-by-design.md` y el export de datos | Publicar la corrección de H-17. Está escrita y **no aplicada**, a propósito: es copy legal. Depende de la fila 1 — si el ajuste está apagado, la frase es otra | 10 min de lectura | 02/10 | El resumen del lote 16 y §H-17. No es asesoramiento legal |
| 29 | **Aprobar la frase de la política** sobre el primer contacto. Propuesta, sin aplicar: «Si aceptás la analítica, guardamos además, con tu cuenta, de dónde llegó tu primera visita: el sitio o la campaña que te trajo (por ejemplo, Instagram o Google), la página pública por la que entraste y cuándo. Nunca la dirección completa de la que venías. Lo usamos sólo para contar, en conjunto, qué canales traen gente a EnergyCurve.» / «If you accept analytics, we also keep, with your account, where your first visit came from: the site or campaign that sent you (for example Instagram or Google), the public page you arrived on, and when. Never the full address you came from. We use it only to count, in aggregate, which channels bring people to EnergyCurve.» | Que la política diga lo que el producto guarda. El dato es nuevo; el consentimiento es el mismo de la analítica, y el banner no se tocó. **No es asesoramiento legal** | 10 min de lectura | 20/10 | `docs/seo/primer-contacto.md`; RoPA T5, fila «Primer contacto» |
| 30 | **Decidir qué pasa con el primer contacto ya guardado cuando alguien retira el consentimiento** | Hoy el retiro borra lo que espera en el navegador, y no lo que ya está en el perfil (que sí se va al borrar la cuenta y sale en el export de datos). Las dos salidas: borrarlo también del perfil cuando el retiro pasa con sesión iniciada (código chico), o dejarlo porque ya se procesó con consentimiento válido. Es una decisión de privacidad, no de código | La decisión | 20/10 | `docs/seo/primer-contacto.md`, «Consentimiento» |
| 4 | **Validar H-10 en producción (banco J.4), y recién después cargar crédito en Anthropic** (H-9) | El orden inteligente vuelve a ser IA para todos los usuarios — hoy cae siempre al heurístico — y destraba J.6. **El orden importa:** mientras no haya saldo es la única ventana para ver el mensaje nuevo de «sin crédito» contra el deploy; cargar primero la cierra | 5 min la validación + 5 min cargar + el dinero | 20/09 | Tanda 01 §H-9 y §H-10, banco J.4 |
| 3 | **Correr las sesiones del banco después de cada deploy**: L16 (L16.2 a L16.6), L20 (las siete) y L21 (L21.1 a L21.7) | Pasar de «implementado» a «verificado» todo lo que ya está en `main`: H-15, H-18, H-19, IMP.1 y el login en español (L16); el lote 20 entero; y del lote 21, H-16, H-24, los enlaces a la guía y las fases 4 y 5 de SEO. Ninguno se da por cerrado sin eso | ~40 min L16 + ~1 h L20 + ~1 h L21, sin confirmar: son estimaciones, no se cronometró ninguna | 02/10 (L20: 20/10; L21: 21/10) | Banco, sesiones L16, L20 y L21 |
| 33 | **Releer las fuentes de las comparaciones que vencen**: mixed-in-key, setflow y dj-studio el 31/10, best-dj-software el 01/11 (con la página de Serato DJ Pro, que el lote 21 no pudo abrir). O pedírselo a un lote que tenga acceso a esos sitios | Que la fecha «revisado» de cada comparación sea verdadera. El umbral es 35 días (`tests/comparison-review-age.test.ts`, con `CHECK_REVIEW_AGE=1`); pasado eso, la página publica una revisión que nadie hizo. Corrige también la mitad que faltó de H-24 | ~1 h las cuatro | 21/10 | `docs/seo/competitor-facts-2026-09-26.md`, «Antigüedad de cada página»; banco L21.2 y L21.5 |
| 3b | **Exportar tus datos en producción con una librería de más de ~7.000 temas** y contar los temas del archivo | Saber si el export pasa el tope de 4,5 MB de Vercel: sale en streaming desde el lote 17 y eso sólo se ve en producción. El resto de la sesión L17 se automatizó en el #279 (`e2e/large-library.auth.spec.ts`), contra dev; ésta es la parte que un test local no puede hacer | ~20 min, si hay una cuenta con esa librería | 06/10 | `docs/qa/carga-2026-10.md`, sección del lote 17 |
| 6 | **Correr `scripts/verify-deletion.mjs`** contra una cuenta descartable | Saber que borrar una cuenta borra de verdad. Nunca corrió | ~15 min | 25/09 | `docs/handoff-2026-09-17.md` §17.6 punto 3 |
| 31 | **`POSTHOG_PERSONAL_API_KEY` y `POSTHOG_PROJECT_ID` en producción** — confirmar que están, y si no, cargarlas | La columna «Used» del panel de herramientas (tarea 6) y las columnas Country/Source del backstage. Sin ellas, el panel dice que no tiene datos de uso en vez de mostrar ceros. Si están: **sin confirmar** — nadie lo miró desde este lote. La consulta de uso nunca corrió contra PostHog (no hay clave en esta Mac): banco L20.6 | 5 min | 20/10 | `lib/backstage/posthog-reporting.ts`, `fetchToolUsage` |
| 15 | **H-1 y H-2: elegir A o B** en cada una. Hay maquetas de las cuatro opciones. En las dos de H-1, el aviso de pago fallido sigue donde está hoy: la franja en todas las páginas y la tarjeta arriba del dashboard | Que un lote los haga sin adivinar | ~10 min de lectura | 20/09 | `docs/qa/decisiones-h1-h2.md`; banco L21.9 |
| 14 | **H-6 y H-7: elegir** sobre la propuesta escrita: qué entra en «Settings / Ajustes» y qué en «Help Center / Ayuda», si la ruta `/dashboard/account` se mantiene, y si el formulario de contacto va al pie del Help Center | Dos cambios de navegación. **La lista ya no hay que armarla** (lote 21): está ítem por ítem, sacada de lo que el producto tiene. Faltan cinco sí o no | ~15 min de lectura | 20/09 | `docs/qa/propuesta-h6-h7.md`; banco L21.10 |
| 17 | **PostHog: marcar key events** `content_cta_click`, `signup` y `analysis_completed`, y armar el embudo | Ver si el contenido convierte (SEO-E28). Los tres nombres se verificaron contra el código el 06/10. El plan SEO y la lista de verificación de producción pedían `signup_completed` y `first_analysis`, que nunca existieron: **se corrigieron**, y un test falla si el plan vuelve a pedir un evento que el código no emite | 15 min | 26/09 | `lib/analytics/posthog-server.ts`, `lib/analytics/content-events.ts`, `tests/key-events-docs.test.ts` |
| 23 | **Cargar `PAGESPEED_API_KEY`** como secret del repo (GitHub → Settings → Secrets and variables → Actions) y correr una vez el workflow «Core Web Vitals log» | SEO-E31 deja de ser una tarea manual: cada lunes una fila en `docs/seo/cwv-log.md`, con commit del bot. La key sale de Google Cloud (PageSpeed Insights API); nadie más la ve | 10 min | 10/10 | Banco L19.2; `scripts/psi-log.mjs` |
| 24 | **Confirmar la excepción de escritura del workflow de CWV** | Es el primer workflow del repo con `contents: write`, en un job que no corre node ni npm; `tests/workflow-integrity.test.ts` lo permite sólo con esas condiciones. Si preferís que ningún workflow escriba, la salida es que el job abra un PR en vez de empujar a `main` | Una decisión, leyendo `.github/workflows/cwv-log.yml` | 10/10 | Resumen del lote 19 |
| 18 | **SEO-E22: crear los perfiles** de Product Hunt, AlternativeTo, Crunchbase (bajo StageLink LLC), X, TikTok y Wikidata | El `sameAs` de la entidad. Hoy tiene uno solo (Instagram, vacío). **El texto de cada perfil ya está escrito** (lote 18), con el largo que acepta cada sitio, y el `sameAs` final está comentado en `lib/seo.ts`: sólo falta abrir las cuentas, pegar y pasar las URLs | ~1 h de cargar, ya sin redactar. Crunchbase y Wikidata pueden tardar días en aprobar una entrada nueva, o rechazarla: sin confirmar | 19/09 | `docs/seo/entidad-perfiles.md`. Desde el lote 20, el enlace de cada perfil hacia el sitio va etiquetado: el ejemplo de Product Hunt está en `docs/seo/utm-convention.md`, «Tres ejemplos reales» |
| 25 | **La primera revisión mensual (SEO-E27)**: Search Console y la corrida de visibilidad en IA (SEO-E04), el primer lunes | Los dos instrumentos existen desde el lote 19 y están vacíos a propósito: correrlos necesita tus cuentas de los cinco motores y la consola | ~1 h por mes | 19/09 | `docs/seo/runbook-revision-mensual.md`, `docs/seo/ai-visibility-tracker.md` |
| 19 | **SEO-E03: las diez búsquedas** de la línea de base, con Search Console abierto | La comparación contra agosto. `docs/seo-aeo-baseline-2026-09.md` no existe | ~1 h | 19/09 | `docs/seo/SEO-PLAN.md` SEO-E03 |
| 16 | **SEO5.3: elegir** una de las tres salidas para el LCP del banner | Cerrar el presupuesto de LCP. **Ahora cada salida tiene número** (06/10, lote 18): hoy `/` mide 5,72 s en local y 3,48 s en producción; recortar el texto o pintar el banner en el primer paint lo bajan a 4,09 s en local, y **ninguna llega a 2,5 s**. Los 4,8 s que decía esta fila no se reproducen | La decisión | 26/09 | `docs/qa/lighthouse-budgets.md`, sección del 06/10 |
| 12 | **Una ventana para cargar contra Vercel** | Contestar si se cumple el pico (50 usuarios, 2 s). Un proceso local **no** lo cumple; sólo una medición contra el despliegue real dice si Vercel lo absorbe | Elegir día y hora | 02/10 | `docs/qa/carga-2026-10.md` |
| 12b | **H-23: decidir si el orden sugerido sale del render** de la página de análisis (calcularlo cuando se pide) | El caso general del pico. La mitad que no necesitaba tu decisión se hizo en el lote 18: la sugerencia se memoriza por set, y con 10 usuarios sobre el **mismo** set el dashboard pasó de 15,0 s a 1,4 s de p95. Pero la primera vista de cada set sigue costando el cálculo entero (unos 0,9 s de CPU para 60 temas), así que con muchos sets distintos el pico no se resuelve con eso | La decisión. Después, código | 06/10 | Tanda 01 §H-23; `docs/qa/carga-2026-10.md` |
| 21 | **J.3**: exportar un CSV, mirar el nombre y re-subirlo guardado desde Excel en español | Validar H-8 (el nombre ya no termina en `.app.csv`). Pasó la primera ronda; falta el nombre. J.4 es la fila 4 | ~10 min | 20/09 | Banco J.3, tanda 01 §H-8 |
| 22 | **A5.4: alguien que nunca usó el producto**, cronometrado | El hallazgo que más probablemente explique por qué la mayoría de los registrados tiene 0 o 1 playlist | Una persona y 30 min | 17/09 | Banco A5.4, `docs/qa/spec-auditoria360-f1-producto-ux.md` |
| 10 | **Restaurar un backup** a un proyecto descartable y cronometrarlo (A4.2). Antes, leer en la consola si PITR está habilitado | El número de tiempo de recuperación, y el único control de Operación que hoy es una hipótesis | 1–2 h, sin confirmar: nunca se corrió, y la primera vez suele tardar más | 17/09 | Banco A4.2, `docs/runbooks/backup-restore.md` |
| 26 | **IAM de Vercel y Supabase** (A6.1): miembros, roles, tokens; variables por entorno; si los deploys de preview abren sin sesión | El criterio que falta de la fase F4 de Seguridad. Hoy no se puede afirmar quién puede leer la service-role key ni hacer un deploy | ~1 h | 11/09 | `docs/security/spec-f4-infraestructura-cloud.md` |
| 27 | **Una rotación de higiene** de una credencial que el usuario no vea, cronometrada (A6.2) | Ninguna de las 13 credenciales se rotó nunca; el runbook existe y no se probó. La primera rotación dice cuánto tarda el procedimiento sin costo para nadie | ~30 min | 21/09 | `docs/runbooks/secret-rotation.md`, `docs/security/spec-f5-datos-cifrado-backups.md` |
| 7 | **DPAs** (A7.2): Vercel, Supabase, WorkOS, Stripe, PostHog, Resend, Anthropic, y **Sentry**, que no estaba en la lista | Las tres preguntas legales de transferencias internacionales (`international-transfers.md` §2.2) y el registro de encargados | ~2 h, la mayoría autoservicio | 17/09 (Sentry: 02/10) | Banco A7.2 |
| 8 | **Sentry (H-20): confirmar región de la cuenta y si el DSN está seteado en producción**, y decidir si se declara como encargado | Cerrar el mapa de transferencias. Hoy Sentry recibe datos y **no figura** en la lista pública de subencargados | 10 min en la consola + la decisión | 02/10 | `international-transfers.md` §2 |
| 9 | **Resend: confirmar la región del dominio** de envío | La última celda «sin confirmar» del mapa de transferencias | 5 min | 02/10 | `international-transfers.md` §2 |
| 5 | **R9: elegir** A con 12, 24 o 36 meses, o C con fecha de revisión | La regla de cuentas inactivas y el párrafo de retención de la política, que hoy toma la opción C por omisión | La decisión. Después, ~2 h de código | 27/09 | `docs/compliance/r9-cuentas-inactivas.md` §8 |
| 20 | **La palabra «AI»**: si el producto la quiere en su posicionamiento | Un hueco del mapa de keywords (`ai dj set planner free`) | La decisión | 27/09 | `docs/seo/keyword-map.md:251` |

## Resuelto

Podado el 10/10 (lote 19). Lo resuelto vive en el historial de este archivo y
en el traspaso, no acá: las dos filas que había (`CRON_SECRET` en Vercel, 401
desde el 02/10, y las 32 migraciones de dev) se verificaron el 02/10 y no
esperan nada tuyo.

**La fila 0 se resolvió el 20/10 (lote 20), mirando producción:** la API de
Vercel (`vercel api /v9/projects/energycurve`, sólo lectura) dice que el target
de producción es **`472535c`**, READY, con los alias `energycurve.app`,
`www.energycurve.app` y `backstage.energycurve.app`; `f59cf52` es ancestro de
`472535c` y su lockfile tiene `next` **16.3.8**. La RCE de `next/og` ya no está
en producción. Lo que sigue abierto de ese deploy es el banco L19.1 (mirar las
tarjetas sociales).

**La 13 se hizo en el lote 21** (21/10): «Manage billing» pasó a «Manage
subscription» en los dos textos, en los dos idiomas, con un test que falla si
vuelven a divergir. Falta verlo en producción (L21.3).

**L19.1:** después del deploy que trajo `f59cf52`, Robertino mandó una captura de
`https://energycurve.app/opengraph-image` con la tarjeta bien. El estado de
esa fila del banco lo marca él: el lote 21 no toca filas existentes.
