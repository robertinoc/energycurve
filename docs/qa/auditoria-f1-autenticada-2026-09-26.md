# Auditoría F1 — la mitad autenticada

**26/09/2026.** Contra el build de producción del commit de `plans/lote-9`,
corriendo en local, con las tres cuentas de prueba. **No se arregló nada de lo
de abajo**: el catálogo es el entregable y los arreglos son un lote aparte.

El PR #255 auditó la superficie pública —33 rutas, el flujo de valor sin cuenta,
cuatro estados de error— y dejó explícitamente afuera todo lo que necesita
sesión. Esto es esa mitad.

**Ordenado por lo que costaría si le llega a un usuario**, no por lo fácil que
sea arreglarlo.

---

## Antes de leer: lo que el instrumento se equivocó, y por qué importa

Tres veces en esta auditoría un "hallazgo" resultó ser mío:

1. `importPlaylist` devuelve **la URL**, no el id. Leerla como id produjo
   `/dashboard/playlists/http:/127.0.0.1:3010/...` y **cuatro 404 que parecían
   cuatro features faltantes**, incluida `analysis_core`, que es gratuita.
2. El marcador de ordenamiento con IA buscaba `AI`. El control se llama
   **"Smart ordering"**. Buscar la palabra equivocada produce una ausencia.
3. Un `getByRole("button", { name: /import/i })` resolvió al **`<input type=file>`**,
   cuyo nombre accesible también contiene "import".

Se dejan escritas porque el modo de fallar de una auditoría es reportar el
instrumento como si fuera el producto, y porque las tres se descubrieron
mirando el código de la página antes de escribir el hallazgo, no después.

---

## A1 · La cuenta de prueba PRO+ estaba en `plan=free` — **alta**

**Qué pasa.** La fila del perfil de la cuenta PRO+ decía `plan=free`,
`plan_status=null`, `stripe_customer_id=null`. Confirmado el 26/09 leyendo
`profiles` con el service-role client.

**Por qué es alta.** No es un defecto del producto: es que **un tercio de la
cobertura autenticada no estaba probando lo que su nombre dice**. El proyecto
`auth-proPlus` corría como FREE, y con él las ocho capabilities de tramo PRO+.
El primer barrido de esta auditoría mostró la cuenta PRO+ ofreciendo "upgrade"
en `/dashboard` y `/dashboard/account`, que es exactamente lo que ve un FREE.

**De dónde viene.** El paso A1.3 del banco de pruebas la iba a habilitar "por
lista de cortesía". Eso nunca se aplicó, y no hay ningún mecanismo de cortesía
en el código: el plan sale de la fila del perfil y lo único que lo escribe es el
webhook de Stripe.

**Qué se hizo.** Se puso la fila en `pro_plus` / `active` — **dato de prueba, no
código de producto** — para que la auditoría pudiera cubrir PRO+. Sin eso, ocho
capabilities quedaban sin auditar y el informe habría tenido un agujero del
tamaño de un tramo de precios. La cuenta queda en el estado que A1.3 pretendía.

**Cómo reproducirlo.** Leer `profiles` para el mail de `E2E_PROPLUS_EMAIL`.

---

## A2 · El banner de consentimiento intercepta clics en la parte baja de la pantalla — **media**

**Qué pasa.** El banner es `fixed inset-x-0 bottom-0 z-50`. Para una sesión
iniciada que todavía no lo respondió, **tapa lo que haya al fondo del viewport**,
y el navegador entrega los clics al banner y no al control de abajo.

**Cómo apareció.** Un intento de hacer clic en el botón de importar de
`/dashboard/playlists` reintentó durante **cuatro minutos** hasta agotar el
tiempo. El registro nombra al culpable sin ambigüedad:

```
<p class="mt-1 text-[13px] ...">We use PostHog to see which parts of the app get …</p>
from <div role="region" aria-live="polite" aria-label="Can we count this visit?"
class="fixed inset-x-0 bottom-0 z-50 ..."> subtree intercepts pointer events
```

**Por qué es media y no baja.** Le pasa a **todo usuario recién registrado**
—consentimiento sin responder es el estado inicial— y el control que tapaba en
la reproducción es la acción principal de la página. Un usuario puede scrollear
y destaparlo; que pueda no quiere decir que sepa que tiene que hacerlo.

**Qué se esperaba.** Que el banner no se apoye encima de un control
interactivo: que la página reserve el alto del banner mientras está visible, o
que el banner no cubra la zona de acciones.

**Cómo reproducirlo.** Sesión iniciada, `localStorage` sin
`ec.analytics-consent.v1`, ir a `/dashboard/playlists` y hacer clic en el botón
de importar con la ventana a una altura en la que el botón quede abajo.

**Lo que NO es.** No es que el banner atrape la página: no tiene overlay ni
bloquea el scroll, y eso está bien y es deliberado. Es que ocupa píxeles que
alguien más estaba usando.

---

## A3 · El formulario de importación dice "Ready to import" de archivos que no puede importar — **media**

**Qué pasa.** Elegido el archivo, el formulario responde **"Ready to import"**
para los tres casos malos que se probaron:

| Archivo | Lo que dice al elegirlo | Lo que pasa al enviar |
|---|---|---|
| XML de Rekordbox truncado a la mitad | `corrupt.xml` · **Ready to import** | la página menciona un fallo |
| Playlist válida con **cero temas** | `empty.xml` · **Ready to import** | la página menciona un fallo |
| `.txt` que es una lista de compras | `notes.txt` · **Ready to import** | **ni playlist ni mensaje** |

**Por qué importa.** El archivo **ya se parsea en el navegador** antes de
enviar — el formulario lo demuestra nombrándolo. O sea que en el momento en que
dice "Ready to import" ya tiene la información para decir "0 temas" o "esto no
parece una playlist", y en cambio afirma lo contrario. El usuario aprieta
Importar, espera, y recién ahí se entera; y en el tercer caso ni siquiera se
entera.

**Qué se esperaba.** Que lo que ya se sabe al elegir el archivo se diga al
elegir el archivo. Un "Ready to import" es una promesa.

**Cómo reproducirlo.** `/dashboard/playlists`, elegir cualquiera de los tres
archivos de la tabla, mirar el texto del formulario, después enviar.

**Sin confirmar.** El tercer caso — el `.txt` — no produjo ni playlist ni
mensaje. No se determinó si el archivo se rechazó en silencio o si el envío no
llegó a ocurrir. Es el que conviene mirar primero de los tres.

---

## A4 · Se ofrece el ordenamiento con IA con la cuota del mes ya gastada — **media-baja**

**Qué pasa.** FREE tiene **1 ordenamiento con IA por mes**
(`PLAN_LIMITS.free.aiOrderingsPerMonth = 1`). Gastado ése, al abrir el análisis
de **un set nuevo** el botón **"Smart ordering" sigue estando**, habilitado, y
**nada en la página dice que la cuota se agotó**. Verificado el 26/09: control
presente (1), y las únicas líneas de la página que hablan de límites o de planes
son las de la tarjeta de plan, que es otra cosa.

El servidor sí lo maneja bien: `/api/playlists/[id]/smart-order` responde **402
`quota_exceeded`** con `used`, `limit` y `upgradeTo`, y el comentario del código
dice que refuse antes de facturar, que es lo correcto.

**Por qué importa.** El usuario se entera apretando. Y el dato para decírselo
antes ya está del lado del servidor.

**Qué se esperaba.** Que la página diga "usaste tu ordenamiento con IA de este
mes" donde está el botón, en vez de dejar que el clic lo descubra.

**Cómo reproducirlo.** Con la cuenta FREE: correr un Smart ordering, importar
otro set, abrir su análisis.

**Sin confirmar.** Qué muestra la interfaz **después** del 402 — no se llegó a
observar el clic que lo provoca.

---

## A5 · Las cuatro compuertas de plan hacen exactamente lo que dice el registro — **sin hallazgo**

Un resultado negativo, y vale escribirlo: es la parte que el PR #255 no pudo
mirar y la que más caro sale si está mal, porque la matriz de precios la vende.

| Ruta | capability | mínimo | FREE | PRO | PRO+ |
|---|---|---|---|---|---|
| `/dashboard/playlists/[id]/analysis` | `analysis_core` | free | abre | abre | abre |
| `/dashboard/playlists/[id]/set-sheet` | `printable_set_sheet` | pro | muro | abre | abre |
| `/dashboard/playlists/[id]/compare` | `set_comparator` | pro_plus | muro | muro | abre |
| `/dashboard/playlists/[id]/gig` | `gig_mode` | pro_plus | muro | muro | abre |
| `/dashboard/library` | `global_library` | pro_plus | muro | muro | abre |

Las cinco devuelven **200**, no 404 ni redirección: el muro es una tarjeta que
explica qué es la feature, que es lo que el código dice que quiere
("An explanatory card rather than a redirect, so whoever lands here learns what
it is"). Y el muro está **del lado del servidor**, así que una URL adivinada se
lo come igual.

Los afordances por plan en la página de detalle también siguen el registro:
`transition_suggestions` aparece sólo en PRO+, y `global_library` sólo abre ahí.

---

## A6 · El tope de 3 playlists de FREE se comporta — **sin hallazgo**

Tres importaciones seguidas entran; en el tope, la página dice algo sobre el
límite. Lo que **no** se verificó es qué pasa con la cuarta: el control de
importación sigue presente en el tope, y no se determinó si el intento se
rechaza con un mensaje útil o si falla de otra manera. **Sin confirmar** — es el
primer hueco a cerrar de esta lista.

---

## Ruido de servidor, anotado y no perseguido

Durante toda la auditoría, navegar fuera de `/dashboard` y
`/dashboard/playlists/[id]` mientras renderizan produce en el log del servidor:

```
Error: The destination stream closed early.
{"event":"request.unhandled","kind":"App Router","source":"/dashboard","status":"render"}
```

Es la otra mitad del streaming ya documentado en `e2e/helpers/import-playlist.ts`
(dos árboles del DOM conviviendo durante el swap). No se vio ninguna
consecuencia visible para el usuario. **Severidad baja**, anotado para que la
próxima persona que lo vea en un log no lo persiga de nuevo.

---

## Lo que esta auditoría NO cubre

Dicho para que el verde de arriba no se lea como más de lo que es.

- **La fricción medida con un usuario real.** Necesita una persona haciendo el
  recorrido por primera vez y cronometrándolo. No se puede simular, y no se
  simuló. **Queda para Robertino.**
- **Compartir un set y abrirlo desde la otra cuenta.** No se ejercitó.
- **El interior del modo cabina**, más allá de que abre en PRO+ y muestra muro
  en los otros dos.
- **`residency_mode`, `b2b_sets`, `custom_curve_templates`, `title_lookup`,
  `slot_aware_planning`, `planned_vs_played`, `version_history` leída, y
  `audio_analysis`.** Ocho capabilities `shipped` sin superficie de ruta propia:
  se confirmó que el registro y la matriz de precios coinciden
  (`tests/capabilities.test.ts` lo ata), pero **no se verificó que cada una
  ande** contra el producto corriendo.
- **Sets de más de 80 temas** y sets sin BPM. No se probaron.
- **Los cinco formatos de export desde la página de detalle.** Hay un control de
  export y el E2E de `playlist-export` los cubre; esta auditoría no los volvió a
  abrir.

## Estado de la base de dev al terminar

**0 playlists** en las tres cuentas, contadas con el service-role client antes y
después. Todo lo creado durante la auditoría se borró con el mismo registro de
limpieza que usan las suites autenticadas.

El único cambio que queda es el de A1: la cuenta PRO+ pasó de `free` a
`pro_plus` / `active`, a propósito y explicado arriba.
