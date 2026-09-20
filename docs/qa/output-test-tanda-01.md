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
| H-13 | El JSON-LD del artículo no emite `keywords`; el del índice sí | Bug menor | Claude | Pendiente |

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

Salió de SEO3.3 el 20/09, con `curl` contra producción. Es de una línea.

`buildBlogIndexStructuredData` (`lib/blog/structured-data.ts:80`) agrega
`keywords` a cada `BlogPosting` del índice cuando el post tiene tags. La página
del artículo usa `buildArticleStructuredData` (`:119`), que no lo hace. Los
tags están en el frontmatter de los cinco posts, así que el dato existe y se
omite justo en la página donde más lo lee un motor. Ningún test lo exige: al
agregarlo, agregar también la aserción.

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
