# Tanda 01 — hallazgos pendientes de implementar

Cola de trabajo salida de la **primera ronda de pruebas manuales** (12/09 y
20/09/2026), corrida contra producción con el
[Banco de Pruebas](https://claude.ai/artifact/38iHNaBGmXVDtW5GfQCdsG).

**Nada de esto está implementado.** El acuerdo de la ronda fue relevar, no
tocar: las pruebas encuentran, y qué se arregla se decide después. Este archivo
existe para que esa decisión no dependa de la memoria de nadie.

Cada hallazgo tiene severidad, dónde vive, y —donde importa— la trampa que hay
que resolver **antes** de escribir el arreglo.

## Resumen

| # | Qué | Tipo | Dueño | Estado |
|---|---|---|---|---|
| H-1 | El plan debería ser un tag del usuario | Producto | Claude | Pendiente |
| H-2 | El bloque de primera vez ocupa demasiado | Producto | Claude | Pendiente |
| H-3 | ~~El logout no cerraba sesión~~ | Bug | — | ✅ PR #222 |
| H-4 | «Your payment went through» con importe $0 | Bug de copy | Claude | Pendiente |
| H-5 | El nombre de Google se descarta | **Bug** | Claude | Pendiente |
| H-6 | «Account» debería ser «⚙️ Settings» | Producto | Robertino decide | Pendiente |
| H-7 | El contacto no debería vivir en la cuenta | Producto | Robertino decide | Pendiente |
| H-8 | El export termina en `.app.csv` | Producto | Claude | Pendiente |
| H-9 | Sin crédito en la cuenta de Anthropic | Operación | **Robertino** | Pendiente |
| H-10 | Un problema de facturación se muestra como request mal formado | Bug | Claude | Pendiente |

---

## H-5 · El nombre de Google se descarta

**Severidad alta.** Es el único de la lista que afecta a casi todos los
usuarios reales de producción, porque casi todos entraron con Google.

La página de cuenta muestra `—` en el campo Nombre aunque Google sí manda el
nombre: el panel de WorkOS lo tiene («PAMEM SEX», «Mis Rutas de Viajes», «Nexus
Lab Agency»).

El dato llega al servicio y se tira ahí:

- `app/(en)/dashboard/account/page.tsx:58-63` llama a
  `syncProfileFromWorkOSUser` **pasándole** `firstName` y `lastName`.
- `services/profile-service.ts` hace un `upsert` que escribe **sólo**
  `workos_user_id` y `email`.

Arrastra tres cosas más: el saludo del dashboard, la precarga del formulario de
contacto (`page.tsx:135` pasa `undefined` cuando el nombre es `—`), y cualquier
otro lugar que muestre el nombre.

**Antes de escribirlo:** decidir qué pasa cuando el usuario ya editó su nombre
a mano. Un sync que pisa en cada carga le borraría la edición en el próximo
login; probablemente sólo deba escribir cuando la columna está vacía.

## H-10 · Un problema de facturación se reporta como request mal formado

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

Ejemplo real: `...-with-energycurve.app.csv`. Pedido:
`...energycurve-app.csv`. Un punto antes de la extensión real invita a que
algún sistema lea `.app` como la extensión.

Afecta a los cinco formatos de export, no sólo al CSV.

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
| El botón de login dice **«Login» también en español** — está hardcodeado, no sale del copy | `components/auth/password-auth-page.tsx` |
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
