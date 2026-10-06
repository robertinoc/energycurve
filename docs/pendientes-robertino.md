# Lo que espera algo tuyo

**Escrito el 02/10/2026 (lote 16); el 06/10 (lote 17) se sumaron las filas 3b y 12b, y el lote 18 sumó la 0 y actualizó la 12b, la 16, la 17 y la 18**, numeradas así para no mover las referencias a las demás. Ninguna fila se pudo dar por resuelta en el lote 18: todo lo que espera acá sigue esperando algo tuyo. Una tabla, ordenada por **lo que destraba**,
no por antigüedad. Cada fila se verificó en el momento de escribirla —con un
comando o leyendo el archivo que se nombra— y no se copió de un handoff. Donde
no se pudo verificar, dice «sin confirmar».

El costo es el tuyo, contando el rato de entrar a la consola. Donde una fila
abre trabajo de código después, va aparte.

## La tabla

| # | Qué | Qué destraba | Tu costo | Esperando desde | Detalle |
|---|---|---|---|---|---|
| 0 | **Arrancar, mergear y deployar la actualización de Next.js** que corrige una ejecución remota de código crítica (GHSA-vcvr-r3jv-pc5j, `next/og` `ImageResponse`). El lockfile instala 16.3.4; el arreglo está desde 16.3.6 | Que producción deje de servir una versión con una vulnerabilidad crítica publicada, en un código que el sitio usa (`app/social-card.tsx`). Quedó como tarea aparte, lista para arrancar en un clic, para que salga en su propio PR | Un clic para arrancarla, la revisión del PR y el deploy | 06/10 | `docs/qa/quality-report-2026-09.md`, sección de octubre; `npm audit` |
| 1 | **PostHog → Settings → Project → «Discard client IP data»**: confirmar que está prendido, y si no, prenderlo | Que el banner y la política digan algo verdadero hoy. El código ya no manda `$ip` en el evento (lote 16), pero la IP llega igual en la conexión, y si PostHog la guarda depende **sólo** de este ajuste | 2 min | 02/10 | `docs/qa/output-test-tanda-01.md` §H-17 |
| 2 | **Aprobar la frase corregida** de la política, el banner, `privacy-by-design.md` y el export de datos | Publicar la corrección de H-17. Está escrita y **no aplicada**, a propósito: es copy legal. Depende de la fila 1 — si el ajuste está apagado, la frase es otra | 10 min de lectura | 02/10 | El resumen del lote 16 y §H-17. No es asesoramiento legal |
| 3 | **Correr la sesión L16 del banco** después del deploy (L16.2 a L16.6) | Pasar de «implementado» a «verificado» cinco arreglos: H-15, H-18, H-19, IMP.1 y el login en español. Ninguno se da por cerrado sin eso | ~40 min | 02/10 | Banco, sesión L16 |
| 3b | **Correr la sesión L17 del banco** después del deploy, empezando por **L17.1: exportar tus datos y contar los temas del archivo** | Pasar a «verificado» los arreglos del lote 17, casi todos silenciosos. L17.1 es un derecho del GDPR que hasta el lote 17 se entregaba con cero temas desde ~400 playlists. Que el export de más de ~7.000 temas pase el límite de 4,5 MB de Vercel sólo se puede ver en producción | ~45 min | 06/10 | Banco, sesión L17; `docs/qa/carga-2026-10.md`, sección del lote 17 |
| 4 | **Validar H-10 en producción (banco J.4), y recién después cargar crédito en Anthropic** (H-9) | El orden inteligente vuelve a ser IA para todos los usuarios — hoy cae siempre al heurístico — y destraba J.6. **El orden importa:** mientras no haya saldo es la única ventana para ver el mensaje nuevo de «sin crédito» contra el deploy; cargar primero la cierra | 5 min la validación + 5 min cargar + el dinero | 20/09 | Tanda 01 §H-9 y §H-10, banco J.4 |
| 5 | **R9: elegir** A con 12, 24 o 36 meses, o C con fecha de revisión | La regla de cuentas inactivas y el párrafo de retención de la política, que hoy toma la opción C por omisión | La decisión. Después, ~2 h de código | 27/09 | `docs/compliance/r9-cuentas-inactivas.md` §8 |
| 6 | **Correr `scripts/verify-deletion.mjs`** contra una cuenta descartable | Saber que borrar una cuenta borra de verdad. Nunca corrió | ~15 min | 25/09 | `docs/handoff-2026-09-17.md` §17.6 punto 3 |
| 7 | **DPAs** (A7.2): Vercel, Supabase, WorkOS, Stripe, PostHog, Resend, Anthropic, y **Sentry**, que no estaba en la lista | Las tres preguntas legales de transferencias internacionales (`international-transfers.md` §2.2) y el registro de encargados | ~2 h, la mayoría autoservicio | 17/09 (Sentry: 02/10) | Banco A7.2 |
| 8 | **Sentry (H-20): confirmar región de la cuenta y si el DSN está seteado en producción**, y decidir si se declara como encargado | Cerrar el mapa de transferencias. Hoy Sentry recibe datos y **no figura** en la lista pública de subencargados | 10 min en la consola + la decisión | 02/10 | `international-transfers.md` §2 |
| 9 | **Resend: confirmar la región del dominio** de envío | La última celda «sin confirmar» del mapa de transferencias | 5 min | 02/10 | `international-transfers.md` §2 |
| 10 | **Restaurar un backup** a un proyecto descartable y cronometrarlo (A4.2) | El número de tiempo de recuperación, y el único control de Operación que hoy es una hipótesis | 1–2 h | 17/09 | Banco A4.2, `docs/runbooks/backup-restore.md` |
| 11 | **`db:status` con `MIGRATION_DB_URL`**: contra producción (DB.3) y, de paso, contra dev (DB.2) | Saber qué migraciones tiene prod —nunca se preguntó— y confirmar en dev lo que REST no ve: índices y políticas | 10 min | 25/09 | Banco DB.3. El comando lo corrés vos: la connection string es un secreto |
| 12 | **Una ventana para cargar contra Vercel** | Contestar si se cumple el pico (50 usuarios, 2 s). Un proceso local **no** lo cumple; sólo una medición contra el despliegue real dice si Vercel lo absorbe | Elegir día y hora | 02/10 | `docs/qa/carga-2026-10.md` |
| 12b | **H-23: decidir si el orden sugerido sale del render** de la página de análisis (calcularlo cuando se pide) | El caso general del pico. La mitad que no necesitaba tu decisión se hizo en el lote 18: la sugerencia se memoriza por set, y con 10 usuarios sobre el **mismo** set el dashboard pasó de 15,0 s a 1,4 s de p95. Pero la primera vista de cada set sigue costando el cálculo entero (unos 0,9 s de CPU para 60 temas), así que con muchos sets distintos el pico no se resuelve con eso | La decisión. Después, código | 06/10 | Tanda 01 §H-23; `docs/qa/carga-2026-10.md` |
| 13 | **H-16: aprobar el rename** «Manage billing» → «Manage subscription» en dos textos | Que quien intenta dejar de pagar encuentre el botón. Es de billing, por eso espera tu sí | Un sí | 30/09 | Tanda 01 §H-16 |
| 14 | **H-6 y H-7: definir** qué entra en «Settings» y qué en un «Help Center» (y si existe un Discord) | Dos cambios de navegación que no se pueden diseñar sin esa lista | La decisión | 20/09 | Tanda 01 §H-6, §H-7 |
| 15 | **H-1 y H-2: el visto bueno de diseño.** H-1 tiene una trampa escrita: la tarjeta de plan es también el canal de pago fallido | Que un lote los haga sin adivinar | 10 min | 20/09 | Tanda 01 §H-1, §H-2 |
| 16 | **SEO5.3: elegir** una de las tres salidas para el LCP del banner | Cerrar el presupuesto de LCP. **Ahora cada salida tiene número** (06/10, lote 18): hoy `/` mide 5,72 s en local y 3,48 s en producción; recortar el texto o pintar el banner en el primer paint lo bajan a 4,09 s en local, y **ninguna llega a 2,5 s**. Los 4,8 s que decía esta fila no se reproducen | La decisión | 26/09 | `docs/qa/lighthouse-budgets.md`, sección del 06/10 |
| 17 | **PostHog: marcar key events** `content_cta_click`, `signup` y `analysis_completed`, y armar el embudo | Ver si el contenido convierte (SEO-E28). Los tres nombres se verificaron contra el código el 06/10. El plan SEO y la lista de verificación de producción pedían `signup_completed` y `first_analysis`, que nunca existieron: **se corrigieron**, y un test falla si el plan vuelve a pedir un evento que el código no emite | 15 min | 26/09 | `lib/analytics/posthog-server.ts`, `lib/analytics/content-events.ts`, `tests/key-events-docs.test.ts` |
| 18 | **SEO-E22: crear los perfiles** de Product Hunt, AlternativeTo, Crunchbase (bajo StageLink LLC), X, TikTok y Wikidata | El `sameAs` de la entidad. Hoy tiene uno solo (Instagram, vacío). **El texto de cada perfil ya está escrito** (lote 18), con el largo que acepta cada sitio, y el `sameAs` final está comentado en `lib/seo.ts`: sólo falta abrir las cuentas, pegar y pasar las URLs | ~1 h, ya sin redactar | 19/09 | `docs/seo/entidad-perfiles.md` |
| 19 | **SEO-E03: las diez búsquedas** de la línea de base, con Search Console abierto | La comparación contra agosto. `docs/seo-aeo-baseline-2026-09.md` no existe | ~1 h | 19/09 | `docs/seo/SEO-PLAN.md` SEO-E03 |
| 20 | **La palabra «AI»**: si el producto la quiere en su posicionamiento | Un hueco del mapa de keywords (`ai dj set planner free`) | La decisión | 27/09 | `docs/seo/keyword-map.md:251` |
| 21 | **J.3**: exportar un CSV, mirar el nombre y re-subirlo guardado desde Excel en español | Validar H-8 (el nombre ya no termina en `.app.csv`). Pasó la primera ronda; falta el nombre. J.4 es la fila 4 | ~10 min | 20/09 | Banco J.3, tanda 01 §H-8 |
| 22 | **A5.4: alguien que nunca usó el producto**, cronometrado | El hallazgo que más probablemente explique por qué la mayoría de los registrados tiene 0 o 1 playlist | Una persona y 30 min | 17/09 | Banco A5.4, `docs/qa/spec-auditoria360-f1-producto-ux.md` |

**H-14 no está acá a propósito.** No espera una decisión tuya: es un arreglo de
contenido que este lote dejó afuera por pedido, y lo hace cualquier lote que lo
incluya.

## Resuelto, verificado hoy

| Qué | Cómo se verificó |
|---|---|
| **`CRON_SECRET` en Vercel** | `curl https://energycurve.app/api/cron/retention` → **401** el 02/10. Antes era 503: el endpoint no tenía secreto y se negaba a correr. 401 quiere decir que tiene uno y no es el del request |
| **0005 y las migraciones en dev** (DB.1, y la mitad de DB.2) | `scripts/seed-scale.mjs status` el 02/10: los doce géneros en el enum y las 32 migraciones sin tablas, columnas ni enums faltantes. Sobre REST no se ven índices ni políticas; el chequeo completo es la fila 11 |
