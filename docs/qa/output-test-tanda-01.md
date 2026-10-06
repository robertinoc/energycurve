# Tanda 01 — hallazgos pendientes de implementar

Cola de trabajo salida de la **primera ronda de pruebas manuales** (12/09 y
20/09/2026), corrida contra producción con el
[Banco de Pruebas](https://claude.ai/artifact/38iHNaBGmXVDtW5GfQCdsG).

El acuerdo de la ronda fue relevar, no tocar: las pruebas encuentran, y qué se
arregla se decide después. Este archivo existe para que esa decisión no dependa
de la memoria de nadie.

**Actualizado el 20/09.** Cuatro se implementaron y están en `main` —
H-4 ([#247](https://github.com/robertinoc/energycurve/pull/247)),
H-8 ([#248](https://github.com/robertinoc/energycurve/pull/248)),
H-10 ([#246](https://github.com/robertinoc/energycurve/pull/246)) y el botón de
login en español ([#249](https://github.com/robertinoc/energycurve/pull/249)).
Que estén mergeados no los da por buenos: cada uno deja su prueba en **Validar
fix** en el Banco hasta que alguien la corra otra vez contra el deploy. Y H-5
resultó ser un diagnóstico equivocado — ver su ficha.

**Actualizado el 02/10 (lote 16).** H-15, H-18 y H-19 implementados; H-17 en
su mitad de código (el ajuste de PostHog y la frase de la política son de
Robertino); la playlist vacía de IMP.1 también. Cada uno tiene un test que
falla sin el arreglo —verificado sacándolo— y una fila en **Validar fix** en la
sesión L16 del Banco. Dos hallazgos nuevos salieron del mismo lote: H-20
(Sentry) y H-21 (`listPlaylists`). Lo que espera algo de Robertino, ordenado,
está en `docs/pendientes-robertino.md`.

**Actualizado el 06/10 (lote 17).** H-21 implementado, junto con los otros
cuatro puntos de quiebre de `docs/qa/carga-2026-10.md`. Al arreglarlos a
volumen aparecieron dos hallazgos más: H-22 (seis defectos del mismo origen,
todos arreglados en el lote) y H-23 (dónde se va la CPU en el pico,
diagnosticado y sin arreglar). Las filas nuevas están en la sesión L17 del
Banco.

Cada hallazgo tiene severidad, dónde vive, y —donde importa— la trampa que hay
que resolver **antes** de escribir el arreglo.

## Resumen

| # | Qué | Tipo | Dueño | Estado |
|---|---|---|---|---|
| H-1 | El plan debería ser un tag del usuario | Producto | Claude | Pendiente |
| H-2 | El bloque de primera vez ocupa demasiado | Producto | Claude | Pendiente |
| H-3 | ~~El logout no cerraba sesión~~ | Bug | — | ✅ PR #222 |
| H-4 | «Your payment went through» con importe $0 | Bug de copy | — | ✅ PR #247 · validar |
| H-5 | ~~El nombre de Google se descarta~~ | **Mal diagnosticado** | Claude | Re-diagnosticar |
| H-6 | «Account» debería ser «⚙️ Settings» | Producto | Robertino decide | Pendiente |
| H-7 | El contacto no debería vivir en la cuenta | Producto | Robertino decide | Pendiente |
| H-8 | El export termina en `.app.csv` | Producto | — | ✅ PR #248 · validar |
| H-9 | Sin crédito en la cuenta de Anthropic | Operación | **Robertino** | Pendiente |
| H-10 | Un problema de facturación se muestra como request mal formado | Bug | — | ✅ PR #246 · validar |
| — | El botón de login dice «Login» en español | Bug de copy | — | ✅ PR #249 · validar |
| H-13 | El JSON-LD del artículo no emite `keywords`; el del índice sí | Bug menor | — | ✅ PR #267 |
| H-14 | La comparación publica el precio del paquete «+ Cloud Option» como si fuera el plan de Rekordbox | **Bug de contenido** | Claude | Pendiente |
| H-15 | ~~Tres~~ **Una** cita de Lexicon ya no era literal en su sitio | Deriva de fuente | — | ✅ lote 16 · validar (L16.4) |
| H-16 | Dos textos mandan a un botón «Manage billing» que se llama «Manage subscription» | Bug de copy | Robertino decide | Pendiente |
| H-17 | La promesa «no guardamos tu IP» se apoya en una opción de PostHog que no hace nada | **Privacidad · alta** | **Robertino** (ajuste + aprobar la frase) | Código ✅ lote 16 · el resto espera a Robertino (L16.1) |
| H-18 | Dos artículos en inglés enlazan el mismo término de glosario dos veces | Bug menor | — | ✅ lote 16 · validar (L16.2) |
| H-19 | El tooltip de término no se cierra con Escape (WCAG 1.4.13) | Accesibilidad · media | — | ✅ lote 16 · validar (L16.3) |
| — | IMP.1: una playlist recién importada se ve vacía, y si fallan los temas queda vacía | Bug | — | ✅ lote 16 · validar (L16.5) |
| H-20 | Sentry recibe datos y no figura en la lista pública de subencargados | Compliance | **Robertino** | Pendiente |
| H-21 | La lista de playlists del menú lateral cuenta mal desde 1.000 temas en total | Bug silencioso | — | ✅ lote 17 · validar (L17.2) |
| H-22 | Seis defectos más del mismo origen, encontrados al arreglar: el export repetía temas y no entraba en una respuesta de Vercel, la librería y los sets compartidos, sets de más de 1.000 temas, y un reordenamiento que falla y traba el set | Bugs silenciosos y uno ruidoso | — | ✅ lote 17 · validar (L17.1, L17.3–L17.6) |
| H-23 | En el pico, la CPU se va en el orden sugerido de la página de análisis, calculado en cada render | Rendimiento | Claude propone · **Robertino decide** | La mitad sin decisión ✅ lote 18 (memorizada) · sacarla del render espera a Robertino (L18.2) |

---

## H-5 · El nombre de Google se descarta — **DIAGNÓSTICO EQUIVOCADO**

**No implementar lo que decía esta ficha.** El síntoma que se anotó el 20/09 es
real —la página de cuenta muestra `—` en el campo Nombre— pero la causa que se
le atribuyó no lo es, y el arreglo que se derivaba de ella no habría cambiado
nada.

Lo que decía: que `syncProfileFromWorkOSUser` recibe `firstName` y `lastName` y
los tira, porque el `upsert` de `services/profile-service.ts` escribe sólo
`workos_user_id` y `email`. Eso último es cierto. **Lo que no es cierto es que
importe para el síntoma**: la página no lee el nombre del perfil de Supabase.
Lo arma en el momento, de WorkOS:

```ts
// app/(en)/dashboard/account/page.tsx:71
const displayName =
  [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "—"
```

O sea que si WorkOS tuviera el nombre, la página lo mostraría, escriba lo que
escriba el `upsert`. Que muestre `—` significa que `user.firstName` y
`user.lastName` vienen **nulos** para esas cuentas. Lo que se vio en el panel de
WorkOS («PAMEM SEX», «Mis Rutas de Viajes») puede ser el nombre crudo del perfil
de OAuth, que no es lo mismo que esos dos campos.

**Qué falta antes de tocar código:** mirar, para una de esas cuentas, qué trae
exactamente `withAuth()` en `user.firstName` / `user.lastName`. Si vienen nulos,
el arreglo está del lado de WorkOS o del mapeo del perfil de Google, no en el
servicio de Supabase.

Lo único que la ficha vieja acertó y conviene no perder: la precarga del
formulario de contacto (`page.tsx:135` pasa `undefined` cuando el nombre es
`—`) y el saludo del dashboard arrastran el mismo dato, así que se arreglan
juntos cuando se arregle la causa de verdad.

**Cómo se coló:** el error fue leer el servicio y no la página. Se afirmó una
cadena causal que nunca se comprobó de punta a punta. Es el cuarto instrumento
defectuoso de esta auditoría, y el primero que fue un razonamiento y no un test.

## H-10 · Un problema de facturación se reporta como request mal formado

**IMPLEMENTADO — PR #246.** `classifyFailure` reconoce ahora el saldo agotado
(`type === "billing_error"`, o el mensaje que dice «credit balance») y devuelve
un motivo propio, `unfunded`. Hacia el usuario el copy nuevo es
*«AI ordering is unavailable right now — that one's on our side, and retrying
won't change it»*: dice que es nuestro sin contarle nuestra facturación, y le
ahorra el reintento. **Falta validarlo contra el deploy** — y hoy se puede,
justamente porque todavía no hay crédito. Queda en `Validar fix` sobre J.4.

**Severidad alta**, y es el hallazgo más instructivo de la ronda: es la razón
de que H-9 durara semanas sin que nadie lo mirara.

Anthropic devuelve el saldo agotado como un **400 `invalid_request_error`**.
`lib/smart-order/classify-failure.ts` mapea todo 400 a `bad_request`, y el
banner termina diciendo *«We asked the AI service for something it wouldn't
accept — that one's on us»*.

O sea: el producto afirma que la culpa es del código. Nadie va a mirar la
factura leyendo eso.

El mensaje de la API es distintivo y se puede detectar para darle un motivo
propio. Dos audiencias distintas, dos textos distintos: el usuario no tiene por
qué enterarse de nuestra facturación —algo como «el servicio de IA no está
disponible ahora mismo» alcanza— pero del lado nuestro tiene que gritar.

**Nota que conviene no perder:** en el camino de fallback `quotaCharged` es
`false`, así que a nadie se le cobró cupo de IA por un orden que produjo el
heurístico. Eso ya está bien y no hay que tocarlo.

## H-4 · «Your payment went through» con importe cero

**IMPLEMENTADO — PR #247.** La frase falsa salió. El copy nuevo no afirma
ningún importe: dice que la cuenta quedó lista y que, si hay cobro, aparece en
el resumen como StageLink LLC. La variante «importe cero» de verdad no se hizo,
y el comentario del archivo explica por qué: el importe real no está disponible
en ese punto —`BillingSnapshot` no lo trae, la URL de éxito es un `?checkout=success`
pelado, y el precio de lista miente justo en el caso del cupón— así que
conseguirlo sería trabajo de billing, que esta ronda tiene prohibido tocar.
**Falta validarlo** con un checkout nuevo: queda en `Validar fix` sobre A1.2.

Tras suscribirse con un cupón del 100%, la app muestra *«You're in — welcome to
PRO / Your payment went through.»* No pasó ningún pago: fueron $0,00.

Verificado en **los dos planes** el 12/09 —idéntico en PRO y en PRO+—, así que
el texto es incondicional y le aparece a cualquier cuenta con cupón, promoción
o cortesía.

No es cosmético: el producto le afirma al usuario un hecho falso sobre su
dinero, y es el tipo de frase que alguien cita cuando reclama. Necesita una
variante para importe cero. Copy en `lib/content/dashboard-copy.ts`.

## H-1 · El plan debería ser un tag del usuario, no un bloque

Hoy es una tarjeta al pie del dashboard. Referencia pedida: StageLink, donde el
plan es una píldora al lado del nombre en el sidebar. El lugar natural es
`components/dashboard/dashboard-shell.tsx`, que ya recibe `name` y `email`.

**La trampa, y hay que resolverla antes de mover nada:** el `planCard` tiene
**dos** trabajos. Se renderiza en dos posiciones distintas según
`planNeedsAttentionNow` — arriba cuando algo requiere atención, abajo cuando
no. O sea que también es el canal del *dunning*: pago fallido, suscripción por
vencer.

Un tag puede reemplazar el primer trabajo. **No puede reemplazar el segundo sin
que un pago fallido se vuelva más silencioso**, que es exactamente lo contrario
de lo que se quiere.

## H-2 · El bloque de primera vez ocupa demasiado

`firstRun` en `lib/content/dashboard-copy.ts` («Get your first set scored»,
tres pasos, se autodescarta solo). Pedido: más estético y más compacto.

## H-6 · «Account» debería ser «⚙️ Settings»

Con «My Account» adentro, junto al resto de lo que se pueda configurar. Es un
cambio de arquitectura de información, no un rename — **necesita que Robertino
defina qué más entra** antes de tocar nada.

## H-7 · El formulario de contacto no debería vivir en la página de cuenta

Pedido: un **«🛟 Help Center»** al estilo Migbirds/StageLink, con buscador de
ayuda, guías, docs, blog y Discord.

Depende de dos decisiones que no son de código: qué contenido va adentro, y que
exista el espacio de Discord de EnergyCurve, que hoy no existe.

## H-8 · El nombre del archivo exportado termina en `.app.csv`

**IMPLEMENTADO — PR #248.** `EXPORT_BADGE` pasó a
`optimized-with-energycurve-app`, así que el punto de más ya no está, en los
cinco formatos. **Falta validarlo** exportando de verdad: queda en `Validar fix`
sobre J.3.

Ejemplo real: `...-with-energycurve.app.csv`. Pedido:
`...energycurve-app.csv`. Un punto antes de la extensión real invita a que
algún sistema lea `.app` como la extensión.

Afecta a los cinco formatos de export, no sólo al CSV.

## H-13 · El artículo no emite `keywords` en su JSON-LD; el índice sí

Salió de SEO3.3 el 20/09, con `curl` contra producción. `buildBlogIndexStructuredData`
(`lib/blog/structured-data.ts:80`) agrega `keywords` a cada `BlogPosting` del
índice cuando el post tiene tags; `buildArticleStructuredData` (`:119`) no lo
hacía. **Arreglado en el PR #267** (mergeado), verificado por mutación
sacando sólo la línea del artículo — la misma expresión aparece dos veces.

## H-14 · La comparación vende los precios de Rekordbox más caros de lo que son

**Severidad media, y es de las que la regla de evidencia existe para evitar.**
Salió de CMP2.1 el 30/09, leyendo `rekordbox.com/en/plan` con el selector en
Yearly.

`/compare/rekordbox-vs-serato-vs-traktor` (y su gemela `/es/comparar/…`) dice:
*«Core US$19, Creative US$23, Professional US$30 per month, quoted as the
monthly conversion of US$228, US$276 and US$360 a year»*.

Lo que Rekordbox publica hoy, mismo selector:

| Plan | Solo | + Cloud Option |
|---|---|---|
| Core | **US$10**/mes · US$120/año | US$19/mes · US$228/año |
| Creative | **US$15**/mes · US$180/año | US$23/mes · US$276/año |
| Professional | US$30/mes · US$360/año | — |
| Free | US$0 | US$9/mes · US$108/año |

O sea: US$19 y US$23 son los paquetes con Cloud Option, y la página los
presenta como el precio del plan. Professional y Free + Cloud están bien. **El
archivo de hechos sí lo tenía bien** — `competitor-facts-2026-09-26.md` dice
«Creative + Cloud Option $23» y «Core + Cloud Option $19»; el calificador se
perdió entre el archivo y `market-comparisons.ts`. En la única página donde
comparamos a otros entre sí, a uno le cobramos el doble en su plan de entrada.

**Al arreglar:** la página, el archivo de hechos no (ya está bien), y el
`lastReviewed` de esa página. `/compare/best-dj-software` no repite el error.
Lo demás de la página sostiene contra los fabricantes (Serato, Traktor,
VirtualDJ, djay), verificado el mismo día.

## H-15 · Tres citas de Lexicon ya no son literales — **eran una**

**IMPLEMENTADO — lote 16, 02/10.** Releída la página ese día, sólo la tercera
había cambiado. Las otras dos seguían literales, y lo que falló fue el
instrumento del 30/09: aplanar el HTML reemplazando etiquetas por espacios
rompía «Windows & macOS», que en su hero tiene cada palabra
en su propio `<span>`; y la de los programas convive en la misma página con
una segunda redacción en otro orden, que es la que se encontró. La cita nueva,
literal: «Downloading Lexicon and converting your library between any of the DJ
apps we support is 100% free.» Cambiaron la página (los dos idiomas), la fila de
la tabla, `verifiedAt` y su leyenda (2 de octubre de 2026) y
`competitor-facts-2026-09-26.md`. Precios releídos: sin cambios. Queda en
**Validar fix** como L16.4.

Lo que sigue es el texto del 30/09, que se deja como estaba porque el error
también es un dato.

**Severidad baja.** Salió de CMP.2 el 30/09. Las tres siguen siendo verdad en
sustancia; lo que cambió es la redacción del sitio de ellos, y la página las
publica entre comillas bajo una regla que dice «su página gana».

| Decimos | Su sitio dice hoy |
|---|---|
| «Lexicon works on Windows & macOS.» | «works on Windows and macOS.» |
| «Supports Rekordbox, Serato, Traktor, VirtualDJ, Engine DJ and djay Pro.» | «supports Rekordbox, Serato, Engine DJ, Traktor, VirtualDJ and djay Pro.» |
| «Lexicon is free to download and convert your library to and from any DJ app we support, this is 100% free…» | «library conversion… completely free» / «converting your library between any of the DJ apps we support is 100% free» |

La primera está entre comillas en `/compare/lexicon` tal cual. Los precios de
Lexicon (10,49 / 20,99 / 249 / 499) siguen coincidiendo. SetFlow y DJ.Studio:
todas las citas y precios literales al 30/09.

## H-16 · «Manage billing» no existe; el botón dice «Manage subscription»

Hallazgo del 25/09 (PAY.4), **confirmado sin arreglar al 30/09** en
`origin/main`:

- `lib/content/dashboard-copy.ts:1690` → el botón: «Manage subscription» /
  «Gestionar suscripción».
- `:1230` → «…If all you want is to stop paying, use **Manage billing** above
  instead…»
- `:1291` → «…Open **Manage billing** and cancel it there, or write to us and
  we will.»

Dos textos mandan a un control que no existe, justo cuando alguien intenta
dejar de pagar. Es un rename de dos strings y sus versiones en español. Está
en la cola porque es copy de billing y la regla de esta ronda es no tocar
billing sin que lo decidas.

## H-17 · «No guardamos tu IP» se apoya en una opción que no hace nada

**MITAD DE CÓDIGO IMPLEMENTADA — lote 16, 02/10.** El `ip: false` muerto salió
y en su lugar `before_send: stripClientIp` (`lib/analytics/posthog-privacy.ts`)
borra `$ip` de las propiedades, de `$set` y de `$set_once` de cada evento.
**Verificado mirando el request, no la configuración:**
`e2e/posthog-payload.spec.ts` carga el SDK instalado, captura el cuerpo que
sale, lo descomprime y afirma que no hay `$ip`; tiene un control sin el hook
que sí la muestra (con una IP de documentación, 203.0.113.7), así que el test
no puede pasar por no estar mirando. Ocho tests unitarios más en
`tests/posthog-privacy.test.ts`.

**Tres capas, que no son lo mismo:**

| Capa | Quién la controla | Estado |
|---|---|---|
| `$ip` dentro del evento | El código | ✅ ya no viaja (lote 16) |
| La IP de la conexión, que PostHog ve igual | El ajuste «Discard client IP data» del proyecto | **Sin confirmar** — Robertino (L16.1) |
| Que PostHog no vea la IP del visitante en absoluto | Un proxy propio delante de PostHog | No existe. No hace falta si el ajuste está prendido |

**Un cuarto lugar que promete lo mismo**, que la tanda no había visto: el
export de datos personales dice *«PostHog holds product-usage events keyed to
your account id, with your IP address disabled»*
(`services/data-export-service.ts:222`).

**La frase corregida, escrita y no aplicada** (es copy legal; espera el OK de
Robertino; no es asesoramiento legal). Supone el ajuste **prendido**:

- **Banner** (`lib/content/site-copy.ts:1417-1418`): **no cambia.** «Nunca
  graba tu IP» es verdad si PostHog la descarta, y alargar el párrafo empeora el
  LCP (SEO5.3). Si el ajuste está apagado, la salida es prenderlo, no reescribir.
- **Política** (`lib/content/legal-copy.ts:235` y `:461`; eran `:225`/`:451`
  antes del lote 16):
  - en: «Identifies you by an internal account id, never by email. Your IP
    address reaches PostHog with each request, as it does any website, and
    PostHog discards it instead of storing it.»
  - es: «Te identifica con un id interno de cuenta, nunca con tu mail. Tu
    dirección IP le llega a PostHog con cada pedido, como a cualquier sitio, y
    PostHog la descarta en vez de guardarla.»
- **`docs/compliance/privacy-by-design.md:146`**: «No se guarda la IP: no viaja
  en el evento (`before_send` borra `$ip`) y PostHog descarta la de la conexión
  (ajuste «Discard client IP data»).»
- **Export** (`services/data-export-service.ts:222`): «PostHog holds
  product-usage events keyed to your account id. It does not store your IP
  address.»

Lo que sigue es la ficha del 02/10 tal como se escribió antes del arreglo.

**Severidad alta — es una promesa de privacidad publicada.** Salió de TOOL.3 el
02/10, revisando qué manda PostHog.

Lo que decimos, en tres lugares:

- El banner: «Nunca graba tu pantalla, **tu IP** ni tu música» / «It never
  records your screen, **your IP** or your music» (`lib/content/site-copy.ts:1417-1418`).
- La política de privacidad sobre PostHog: «**we do not send it your IP
  address**» (`lib/content/legal-copy.ts:225`, y su gemela en `:451`).
- `docs/compliance/privacy-by-design.md:146`: «No se envía IP».

Lo que lo respalda en el código es una línea: `ip: false` en el `posthog.init` de
`components/analytics/analytics-runtime.ts:49`. En la versión instalada
(`posthog-js` 1.396.6) esa opción no existe más, y el SDK lo dice en su propio
código:

> The `ip` config option has NO EFFECT AT ALL and has been deprecated. Use a
> custom transformation or "Discard IP data" project setting instead.

Los eventos van directo a `us.i.posthog.com`, sin proxy, así que cada request le
llega a PostHog con la IP del visitante en la conexión. Si la guarda o no
depende sólo del ajuste «Discard client IP data» del proyecto, que ningún
documento del repo menciona.

Dos consecuencias, y la segunda no depende del ajuste:

1. Si el ajuste está apagado, el banner y la política afirman algo falso hoy.
2. Aun prendido, «we do not send it your IP address» es literalmente falso: se
   la mandamos en cada request y PostHog la descarta. Lo verdadero es «PostHog
   no la guarda».

**Qué hace falta, en orden:** Robertino confirma (y si hace falta prende) el
ajuste en PostHog → Settings → Project. Después: corregir la frase de la
política y de `privacy-by-design.md`, y sacar el `ip: false` muerto o
reemplazarlo por un `before_send` que borre `$ip`. Es copy legal y compliance;
no se tocó. No es asesoramiento legal.

Es el patrón del repo, otra vez: un instrumento que mide un sustituto. La
promesa se respaldó con una opción de configuración y se asumió que la opción
hacía lo que dice su nombre.

## H-18 · Dos artículos en inglés enlazan el mismo término dos veces

**IMPLEMENTADO — lote 16, 02/10.** Se eligió que `link-terms` cuente los
enlaces que ya existen (`termsLinkedByHand`) en vez de sacar los manuales: los
enlaces a mano están puestos donde el autor quiso, y el enlazador automático es
el que no sabía que existían. Además, sacar los manuales dejaba la puerta
abierta a que el próximo artículo repitiera el problema. Un test recorre los 23
artículos y falla si un término se enlaza dos veces; sin el arreglo devuelve
exactamente los cuatro duplicados de producción. Validar: L16.2.

**Severidad baja.** Salió de CONT.7 el 02/10. De 23 artículos, 21 enlazan cada
término de glosario una sola vez. Los otros dos:

- `/blog/how-djs-prepare-their-sets` — `warm-up` dos veces.
- `/blog/how-does-a-dj-set-work` — `bpm`, `key` y `transition` dos veces cada
  uno (17 enlaces de glosario en 1100 palabras).

Causa: en esos dos `.md` hay enlaces escritos a mano
(`how-djs-prepare-their-sets.md:31`, `how-does-a-dj-set-work.md:26/38/45`) y
`lib/blog/link-terms.ts` además enlaza la primera aparición por su cuenta, sin
saber que el término ya tiene un enlace. Se arregla sacando los enlaces
manuales o haciendo que `link-terms` cuente los existentes.

## H-19 · El tooltip de término no se cierra con Escape

**IMPLEMENTADO — lote 16, 02/10.** Un solo listener por página
(`components/content/term-tooltip-dismiss.tsx`, montado en
`components/layout/site-html.tsx`): Escape marca `data-dismissed` en el término
abierto y el CSS lo oculta sin mover el foco; el próximo foco o pasar el mouse
desde afuera lo rearman. El tooltip sigue siendo CSS para todo lo demás, así
que funciona sin JavaScript como antes. E2E en los dos idiomas y cuatro
navegadores (`e2e/accessibility.spec.ts`); sin el listener, los dos casos
fallan — verificado con un build sin él. La prueba manual con teclado de
verdad y VoiceOver es L16.3.

**Severidad media (accesibilidad).** Salió de CONT.3 el 02/10. El término
(`components/content/termino.tsx`) es un enlace con `aria-describedby`; el
tooltip aparece al recibir foco, pero **Escape no lo cierra**: es sólo CSS
(`.ec-term:focus-within`, `app/globals.css:523`), y el comentario del bloque
dice que no hace falta porque perder el foco lo oculta.

Eso choca con WCAG 2.1 · 1.4.13 (nivel AA): lo que aparece al enfocar tiene que
poder descartarse sin mover el foco, y este tooltip se dibuja encima de la
línea anterior. Se arregla con un handler de Escape en el componente que oculte
el tip hasta el próximo foco.

## IMP.1 · La playlist recién importada se ve vacía — y puede quedar vacía

**IMPLEMENTADO — lote 16, 02/10.** Era la fila IMP.1 del banco (lote 14). Dos
problemas, no uno: la ventana en la que la playlist existe sin temas, y que si
guardar los temas fallaba la playlist **quedaba** vacía para siempre.

Camino elegido: **compensación + estado «llegando»**, sin migración.
`createPlaylistWithTracks` (`services/playlist-service.ts`) crea, guarda los
temas, y si eso falla borra la playlist, lo registra
(`playlist.create_rolled_back`) y deja subir el error. La página de la playlist,
si la encuentra sin temas, importada y con menos de 60 s, dice «Todavía estamos
trayendo tus temas» y se refresca sola (`components/playlists/import-arriving.tsx`).

El camino más correcto es una función de Postgres que haga las dos cosas en una
transacción: no deja ventana ninguna. Se descartó por ahora por dos razones:
necesita una migración en los dos proyectos, y las migraciones aplicadas a mano
son exactamente lo que causó H-11 y H-12; y duplicaría en SQL la lista de
columnas de `tracks`, que hoy vive en un solo lugar. Si un día se hace, esto se
reemplaza sin tocar a quien lo llama.

Test: `tests/create-playlist-with-tracks.test.ts`, en rojo sin el arreglo. Suite
autenticada entera en verde. Validar: L16.5.

## H-20 · Sentry recibe datos y no figura como subencargado

**Compliance, media. Salió del lote 16 (02/10)** al rehacer el mapa de
transferencias internacionales: el código manda reportes de error a Sentry
—sin PII, lo vigila `tests/sentry-no-pii.test.ts`—, y Sentry no estaba ni en la
lista pública de subencargados ni en el RoPA. Este lote lo sumó al RoPA y al
mapa con dos cosas **sin confirmar**: la región de la cuenta (`us` o `de`, sale
del `SENTRY_DSN`) y si el DSN está siquiera seteado en producción. Lo que espera
a Robertino: esas dos, el DPA, y decidir si se agrega a la página pública. La pregunta legal
está en `docs/compliance/international-transfers.md` §2.2. No es asesoramiento
legal.

## H-21 · La lista de playlists del menú lateral cuenta mal desde 1.000 temas

**Bug silencioso, medio. Salió del lote 16 (02/10)** al medir los puntos de
quiebre con datos sembrados. `listPlaylists` (`services/playlist-service.ts`),
que corre en el layout de **todas** las páginas del dashboard, trae una fila por
tema para contarlos y choca con el techo de mil filas de PostgREST: con 1.000
temas en total los conteos suman 1.000 y la mayoría de las playlists muestra 0
(8 de 25, 96 de 100 y 59 de 60 en los tres niveles medidos). Con 400 playlists, además, falla el filtro por lista de ids. Es el
quinto punto de quiebre; el detalle y el arreglo propuesto (contar sin traer
filas, partir la lista de ids) están en `docs/qa/carga-2026-10.md`. **No se
arregló**: el lote medía.

**IMPLEMENTADO — lote 17, 06/10.** `listPlaylists` cuenta con `tracks(count)`,
el conteo embebido de PostgREST: un número por playlist, ninguna fila de temas
y ninguna lista de ids en la URL. Las playlists paginan. Medido contra dev en
los cinco niveles: conteos exactos en cada playlist, incluidas 400. Test:
`tests/scale-breaking-points.test.ts`, en rojo sin el arreglo. Validar: L17.2.

## H-22 · Seis defectos más del mismo origen

**Implementados — lote 17, 06/10.** Salieron de arreglar los puntos de quiebre
**al volumen en que fallaban**, con el arnés extendido. Detalle y números en
`docs/qa/carga-2026-10.md`, sección del lote 17.

1. **El export repetía temas.** Paginaba ordenando por `position`, que se repite
   una vez por playlist. Con 60.000 temas, el archivo de `main` traía 50.000
   filas y 49.635 ids distintos (bajado por HTTP). Ahora: orden único, y cada
   tabla comparada con un conteo de la base; si no coinciden, el export no se
   entrega.
2. **El export no entraba en una respuesta de Vercel.** Vercel corta en 4,5 MB
   un cuerpo que no es stream; el export pesa ~600 bytes por tema (18,5 MB con
   30.000). Ahora sale en streaming. **Sin verificar en producción.**
3. **La librería global** se mostraba vacía con 400 playlists y perdía discos a
   30.000 temas (paginaba sin orden).
4. **Los sets compartidos conmigo** contaban sus temas trayendo filas, y ante
   un error mostraban todo en 0. Ahora un conteo que no se pudo leer no se
   muestra.
5. **Un set de más de 1.000 temas** se veía con 1.000 en su propia página.
6. **Reordenar fallaba desde ~1.000 temas, y después ese set no se podía
   volver a guardar nunca**: el fallo dejaba temas estacionados justo donde el
   próximo guardado estaciona. Pasó con dos sets en esta sesión. Ahora se
   escriben sólo los temas que cambian, 32 a la vez, y el estacionamiento
   arranca arriba de lo que el set ya tiene.

Tests en rojo sin cada arreglo: `tests/scale-breaking-points.test.ts`,
`tests/reorder-round-trips.test.ts`, `tests/api-account-export.test.ts`.

## H-23 · En el pico, la CPU se va en el orden sugerido

**Rendimiento. Diagnosticado en el lote 17 (06/10), sin arreglar.** Perfilado
con `node --cpu-prof` bajo la mezcla de 10 usuarios: el **89,4 %** de la CPU
ocupada es una sola llamada, `suggestReorder` desde
`services/analysis-service.ts`, que la página de análisis hace en cada render.
Cada análisis de 80 temas cuesta unos 2,6 s de CPU; el render de React, 0,9 %
del total. El dashboard solo, con 10 usuarios, da p95 por debajo de 2 s: en la
mezcla espera detrás del análisis.

Arreglar los otros cuatro puntos **no** bajó el p95 de la mezcla (11,4 s en
`main`, 10,8 s en la rama, una corrida cada uno: ruido). Las cuatro opciones,
con su costo, están en `docs/qa/carga-2026-10.md`. La que más cambia sin
tocar el motor —sacar la sugerencia del render y calcularla cuando se pide— es
una decisión de producto, de Robertino.

**La mitad sin decisión, implementada — lote 18, 06/10.** La sugerencia se
memoriza por proceso con una clave SHA-256 de todo lo que la determina —cada
campo de la energía de cada tema en su orden, el género, el contexto, el puntaje
del set, la forma, el idioma y la versión del motor— así que editar un set
cambia la clave y no hay invalidación a mano (`services/reorder-suggestion-cache.ts`).
Medido contra dev con la misma mezcla de 10 usuarios: el dashboard pasó de
**15,0 s a 1,4 s** de p95 y la CPU media de 94 % a 38 %. **Es el mejor caso**:
los diez pedían el mismo set. La primera vista de cada set sigue costando el
cálculo entero (911 ms en el arnés para 60 temas), así que sacarla del render
sigue siendo lo que resolvería el caso general, y sigue siendo decisión de
Robertino. Validar: L18.2, en `docs/qa/pendiente-banco-lote-18.md`.

## H-9 · Sin crédito en la cuenta de Anthropic

**Es de Robertino y no hay código que tocar.** El ordenamiento con IA cae al
heurístico porque la cuenta se quedó sin saldo:

```
400 invalid_request_error — "Your credit balance is too low to access the
Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."
```

Se descartaron por inspección, y ninguno era el problema: modelo
(`claude-opus-5`, sin override de `SMART_ORDER_MODEL`), streaming, `max_tokens`,
`effort`, el schema de structured outputs, el clasificador y la versión del SDK.

Bloquea la prueba **J.6** del banco: mientras la IA falle siempre, medir el
orden de respaldo no dice nada sobre el comportamiento normal del producto.

---

## Menores, salidos de los logs

No tienen ficha propia porque ninguno amerita una, pero se pierden si no quedan
escritos:

| Qué | Dónde se vio |
|---|---|
| ~~El botón de login dice **«Login» también en español**~~ — **arreglado, PR #249**: sale de `modeCopy.submit[locale]`. Falta validarlo en la pantalla en español | `components/auth/password-auth-page.tsx:202` |
| Las desconexiones normales del navegador se loguean como `level: "error"` · `request.unhandled` · «The destination stream closed early» | Logs del E2E. En producción, cualquiera que cierre una pestaña mientras carga el dashboard escribe una línea de error |
| Error de hidratación en `/signup` | Consola del navegador en dev |
| En dev, Resend rechaza con **403** todo mail que no vaya a `robertinoc@gmail.com` — falta dominio verificado | Log de `email.send_failed` durante A1 |
| `RESEND_FROM_EMAIL` tiene espacios sin comillas en `.env.local`, lo que rompe cualquier `set -a; . .env.local` **a mitad de archivo y en silencio** | Al preparar el E2E |
| El marcador de la curva: el halo blanco tapa parcialmente el color de energía a tamaño real | J.5 |

## Lo que la ronda confirmó que funciona

Vale decirlo, porque una lista que sólo enumera defectos da una impresión falsa
del estado del producto: pasaron el contacto sin cerrar sesión, el round-trip
de CSV en sus dos separadores, mover tracks después de reordenar (el callejón
sin salida que había reportado Jordi **no volvió**), el marcador de la curva,
la separación de boost y drop en las transiciones, y el coloreado de
tonalidades con su preferencia persistida.
