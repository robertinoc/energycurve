# Automatizar el banco — octubre 2026

**Sesión de pruebas del 06/10/2026, rama `qa/automatizacion-banco`, base `b375896`.**
Corrió en paralelo con el lote 18. Tocó sólo `e2e/`, el banco y este documento:
nada de `app/`, `components/`, `lib/`, `services/`, `scripts/` ni `tests/`.

Las 146 filas de `docs/qa/banco-de-pruebas.html`, clasificadas una por una, y
lo que pasó con cada una. Cada número de este documento salió de un comando
corrido ese día y dice de dónde; lo que no se pudo confirmar dice «sin
confirmar».

## El resultado en una línea

**De 146 filas manuales quedan 116.** Salieron 30: **18** porque ahora las
corre un test de Playwright, y **12** porque un test ya las cubría y nadie lo
había anotado. Por los minutos que el propio banco declara para cada sesión,
eso son unas **2 h 40 menos de jornada manual** (2 h 55 brutas, menos los 15
minutos de correr la suite, que pasan a ser el primer paso del día). Los 26
tests nuevos se vieron en rojo contra el código sin el arreglo que verifican.
Apareció un defecto posible (un cambio sin guardar que se pierde justo después
de guardar) y quedó confirmado que la cuarta importación en FREE se rechaza
bien, que era lo último «sin confirmar» de la auditoría F1.

## Cómo se clasificó

Cuatro categorías, y una sola por fila: la de la parte que decide si la fila
sigue en el banco.

- **Automatizable ya** — un test de Playwright la puede expresar con lo que hay
  hoy: las tres cuentas, la base de dev, `scripts/seed-scale.mjs`.
- **Automatizable con trabajo** — se podría, pero falta algo que no existe: un
  buzón que el test lea, el listener de Stripe, la cuota escrita en la base.
  La fila dice qué falta.
- **No automatizable** — necesita un oído, un teléfono en la mano, un lector de
  pantalla, una consola de un tercero, una tarjeta de verdad o un juicio («¿un
  DJ firmaría esta frase?»).
- **Ya cubierta** — un test automático ya la verificaba. Se nombra con archivo
  y nombre del test. Es la categoría que nadie había mirado.

Una fila mitad automatizable y mitad humana queda en la categoría de su mitad
humana, y la razón nombra el test que ya cubre la otra mitad. Esas filas
quedan en el banco, recortadas a lo que sólo una persona puede hacer.

Lo que la clasificación **no** mira: «¿producción sirve el commit?». Las filas
de validación (L16, L17) pedían correr cada arreglo contra el deploy. Un test
corre contra un build local del mismo commit, así que lo que queda de «contra
producción» es una sola pregunta para todas — qué commit sirve Vercel — y no
una por fila. Está en la sección de arriba del banco.

## Las doce que ya estaban cubiertas

La pregunta que nadie había hecho: el banco creció durante diecisiete lotes, y
la suite también, por separado. Doce filas pedían a mano algo que un test ya
afirmaba en cada corrida.

| Fila | Qué pedía a mano | El test que ya lo hacía |
|---|---|---|
| L16.2 | Contar enlaces de glosario repetidos en dos artículos | `tests/link-terms.test.ts`, «a term the article already links by hand (H-18)»: los 23 artículos |
| J2.1 | Que 8A → 9B no se marque como choque | `tests/harmony.test.ts`: `harmonicTier("8A", "9B")` es `smooth` |
| J2.3 | El margen de ±7 % de BPM, reportado y sin puntuar | `tests/transitions.test.ts`, «measures the BPM gap without touching the verdict» |
| J2.4 | 174 contra 87 no es un salto | `tests/transitions.test.ts`, «reads a halftime mix as a matched tempo, not a 50% jump» |
| TOOL2.2 | La tabla de equivalencias contra el archivo de Jordi | `tests/harmonic-cheat-sheet.test.ts`, «gets the ten rows right that the reference file gets wrong» |
| TOOL2.5 | Mitad y doble tiempo en el chequeador | `e2e/harmonic-tools.spec.ts`, «half-time is a matched tempo, not a jump», y `tests/harmonic-transitions.test.ts` |
| AUD.2 | El importador lee el archivo antes de decir «listo» | `e2e/import-readiness.auth.spec.ts`, con los mismos cuatro archivos que la fila |
| GUIA.4 | El índice de guías volvió solo | `tests/empty-index.test.ts`, describe «now that a guide is published» |
| ARM.2 | La tabla armónica contra la rueda | `tests/harmonic-cheat-sheet.test.ts` y `tests/harmonic-tools.test.ts`: las dos contra la misma constante |
| PAY.2 | Que los pagos salteen sin listener | Cada `npm run test:e2e`: los tests saltean con el motivo escrito |
| E2E.1 | Correr la suite | No era una prueba: pasó a ser el primer paso de la jornada, arriba del banco |
| E2E.3 | La lista de lo que cubre el E2E | No era una prueba: era una lista, y su lugar es este documento |

**Lo que decía E2E.3**, que vive acá desde que salió del banco: la suite
autenticada importa en los cuatro formatos (Rekordbox XML, Traktor NML, M3U8,
CSV) y ve los temas; dibuja la curva; recarga y el set sigue; abre la
comparación de versiones; exporta los cinco formatos con el nombre exacto y un
solo punto; y verifica que `CUE_V2` y `AUDIO_ID` sobrevivan la ida y vuelta (el
P0 del 07/09, visto desde afuera). Desde el 06/10, además, todo lo de la tabla
de abajo. Lo que sigue siendo de una persona: si la curva se ve bien, si el
orden suena bien, y el export abierto en Rekordbox o Traktor de verdad.

## Qué se automatizó

Dieciocho filas, en este orden de prioridad: primero L17, porque sus seis
defectos eran silenciosos y se verifican contando; después L16; después lo que
quedaba, por tiempo manual liberado.

| Fila | Test | Qué cuenta o mira | Visto en rojo contra |
|---|---|---|---|
| L17.1 | `e2e/large-library.auth.spec.ts` · «L17.1 · the data export carries every track, counted by id» | Ids distintos del export contra un `count` de la base, con 401 playlists y 2.400 temas | `b3498b3` (antes del lote 17): esperaba 2.400, recibió **0** |
| L17.2 | ídem · «L17.2 · every playlist in the sidebar shows its own track count» | El conteo de cada una de las 401 playlists del menú lateral contra la base | `b3498b3`: esperaba 401 playlists listadas, recibió **0** |
| L17.3 | ídem · «L17.3 · the global library is not empty, and reaches the oldest set» | Un tema de la playlist más vieja aparece en la librería | `b3498b3`: la librería vacía, el tema no aparece |
| L17.4 | ídem · «L17.4 · a shared set shows its real track count to the reader» | La línea del conteo, anclada al principio, en «Compartidos conmigo» | `b3498b3`: «**1000** · Shared by…», esperaba 1200 |
| L17.5 | ídem · «L17.5 · a big set reorders, reorders again, and keeps the order» | Ordenar 1.200 temas por BPM, guardar, al revés, guardar: el orden de la base contra el calculado | `b3498b3`: la tabla tiene **1.000** filas de 1.200 (H-22.5), así que falla antes de guardar. El otro defecto del punto 4 —el guardado que trababa el set— está en el mismo commit y no se aisló por separado |
| L17.6 | ídem · «L17.6 · a set of more than 1,000 tracks is shown whole» | La tabla tiene 1.200 filas y la última dice 1200 | `b3498b3`: **1000** filas |
| L16.5 | `e2e/import-arriving.auth.spec.ts` · «L16.5 · …says so, and fills in by itself» | Una playlist importada sin temas escrita por la base; el aviso, y los temas que aparecen sin recargar | `8668d69` (antes del lote 16): no hay aviso |
| L16.6 | `e2e/public-surface.spec.ts` · «the login button speaks Spanish when the visitor does» | El texto del botón con la cookie de idioma en `es` | `61b9d08` (antes del #249): «**Login**» |
| N.1 | `e2e/banco-public.spec.ts` · «N.1 · opens with Enter, takes Tab inside, and Escape gives focus back» | `aria-expanded`, el foco dentro del panel, y el foco de vuelta en el botón | Mutante: sin `triggerRef.current?.focus()` → el foco no vuelve |
| N.2 | ídem · «N.2 · the panel fits a 1440px / 1280px laptop screen» | La caja del panel contra el viewport | Mutante: panel de 96rem → se sale |
| N.3 | ídem · «N.3 · at 390px the menu is one column with no sideways scroll» | Sin scroll horizontal, y un solo borde izquierdo en todos los ítems | Mutante: dos columnas → bordes `[37, 201]`. **La primera versión del test pasó contra este mutante** (toleraba dos bordes); se ajustó y se volvió a ver en rojo |
| N.5 | ídem · «N.5 · in Spanish, the free tools land on their Spanish pages» | Los `href` de las herramientas en `/es` y que respondan 200 | Mutante: una ruta escrita a mano en inglés |
| CMP.5 | ídem · «CMP.5 · the toggle on … goes to …», las dos direcciones | La URL después de tocar el idioma | Mutante: el toggle resuelve a la home |
| TOOL.8 | ídem · «TOOL.8 · …, given …, says why and stays usable», 3 archivos × 2 idiomas | El mensaje exacto de cada rechazo, y que el set de ejemplo ande después | Mutante: el error de «un tema» genérico y los otros dos en silencio → los 6 en rojo |
| SEO4.1 | ídem · «SEO4.1 · / and /es show their whole hero with scripts off» | Ningún texto de la primera pantalla con opacidad 0, sin JavaScript | Mutante: el hero sin `eager` → texto a opacidad 0 |
| AUD.4 | `e2e/free-plan-cap.auth.spec.ts` · «AUD.4 · a fourth import on FREE is refused, and the refusal says why» | El mensaje del tope y que no se guarde una cuarta playlist | Mutante: tope de FREE en 4 → la cuarta entra y no hay mensaje |
| AUD.1 | `e2e/consent-dashboard.auth.spec.ts` · «AUD.1 · at 390 px the banner covers nothing on /dashboard/playlists» | Cada control de la página, llevado a la vista, contra la caja del banner | Mutante: sin el espacio reservado → «Drag your playlist here…» y cuatro controles más debajo del banner |
| E2E.2 | `e2e/large-library.auth.spec.ts`, su `afterAll` | Ninguna fila de las semillas, y las cuentas con lo mismo que antes | Mutante en una copia del helper: `deleteSeeds` que no borra → «playlists of seed 1701 left in dev» |

Y uno que no era una fila: **`e2e/public-surface.spec.ts`, «the Spanish index
lists the articles»**, ya no tiene el 8 escrito a mano. Cuenta los artículos
publicados desde `content/blog/es`, con la regla de `listPosts`. Lo pidió la
sesión del lote 18: su artículo nuevo lo hacía fallar con la página correcta.
En esta rama da 8 y en la del lote 18, 9.

### Cómo se vio cada uno en rojo

Ningún test se dio por bueno sin verlo fallar. Hubo dos formas, según si el
defecto tenía un commit que lo arregló o no:

- **Contra el código de antes del arreglo**, en un worktree aparte: `b3498b3`
  para L17 (el merge del lote 16, justo antes del 17), `8668d69` para L16.5 y
  `61b9d08` para L16.6. Se compiló cada uno y se corrió sólo el spec nuevo.
- **Contra un mutante**, para las filas que no son el arreglo de un commit: un
  worktree de `main` con el defecto inyectado a mano, uno por test (diez
  cambios en siete archivos), compilado una vez. Ninguno de esos cambios
  llegó a esta rama: la rama no toca `app/`, `components/` ni `lib/`.

El resultado, test por test, está en la última columna de la tabla de arriba:
**los 26 tests nuevos (contando cada idioma y cada archivo de TOOL.8) se vieron
en rojo, y cada uno en la aserción de su defecto**. Uno pasó la primera vez
contra su mutante (N.3), y otro tenía una aserción que hubiera pasado por la
razón equivocada (L17.4: el nombre del set termina en un dígito y se pegaba al
conteo). Los dos se corrigieron y se volvieron a ver en rojo.

## Dónde paré, y por qué

De las 21 filas **automatizables ya**, se automatizaron 18. Paré en tres, y
por la misma razón: el test cuesta más que la prueba que reemplaza.

| Fila | Por qué no |
|---|---|
| J.2 | Exportar el CSV de un set y volver a importarlo. Las dos mitades ya están probadas por separado (`e2e/playlist-export.auth.spec.ts` exporta el CSV con su contenido; `e2e/import-and-visualise.auth.spec.ts` lo importa), y Robertino abre la sesión J igual, por J.3, J.5 y J.6, que necesitan su Excel y su oído. La fila le cuesta un minuto dentro de una sesión que va a hacer de todos modos. |
| J.8 | Tildar «Colorear las tonalidades», recargar, seguir tildado: un minuto, en la misma sesión J. |
| A5.6 | Que un set de más de 80 temas no ofrezca reordenar. El corte ya lo cubre `tests/reorder.test.ts` («declines past it rather than hanging the render»), y la sesión A5 es un recorrido humano completo que no desaparece por sacarle una fila. |

El criterio no fue «automatizar todo lo automatizable». Una fila que se saca de
una sesión que igual hay que hacer libera un minuto; una sesión entera que se
vacía, como L17 o E2E, libera la sesión.

**Las doce automatizables con trabajo**, y qué falta para cada una:

| Fila | Lo que falta |
|---|---|
| J.1 | Un buzón de prueba que el test pueda leer. En dev Resend sólo entrega a una dirección |
| J.4 | La mitad del arrastre se puede ya; la de H-10 necesita la cuenta de Anthropic sin crédito, un estado que el test no controla |
| J.7 | Un CSV con tonalidades importado en PRO+ (una hora). Los nombres ya los cubren unitarios |
| TOOL.3 | Un build con clave de PostHog y su filtro de navegadores automatizados apagado |
| UX.2 | El listener de Stripe, como el spec de pagos |
| UX.3 | Confirmar que el service worker de Gig Mode se registra en el build de prueba |
| UX.4 | Escrito el 10/10 (`e2e/share-revoke-live.auth.spec.ts`); falta verlo en rojo y en verde con las cuentas. Ver «Seguimiento 10/10» |
| UX.5 | Escrito el 10/10 (`e2e/quota-mid-flow.auth.spec.ts`); falta verlo en rojo y en verde con las cuentas. Ver «Seguimiento 10/10» |
| SEO3.1 | Hecho el 10/10: `page.route` retiene los chunks hasta después de elegir |
| SEO4.2 | Hecho el 10/10: se espera la opacidad final, sin dormir |
| PAY.1 | El `stripe listen` logueado con la cuenta de Robertino |
| AUD.3 | La cuota de IA del mes de FREE escrita en la base, y devuelta |

UX.4 y UX.5 son las más baratas de esa lista y las primeras que convendría
hacer: con lo que este documento dejó (`e2e/helpers/dev-db.ts`) son una tarde.

## Defectos que aparecieron al automatizar

Ninguno se arregló: esta sesión no toca el producto, y el lote 18 estaba
trabajando en paralelo.

**1 · Un cambio sin guardar se puede perder justo después de guardar.**
*Posible, severidad baja. Lo vio el test; no se confirmó a mano.*

La página de un set le pone a `PlaylistWorkspace` una `key` hecha con los ids
y las posiciones de los temas (`app/(en)/dashboard/playlists/[id]/page.tsx:547`).
Al guardar un orden, `reorderTracksAction` revalida la página, llegan las
posiciones nuevas, cambia la `key` y el workspace se monta de nuevo con el
orden del servidor, descartando su estado: el orden local, el «Deshacer» y
la barra de «sin guardar». Si la persona hizo otro cambio entre el aviso de
«guardado» y la llegada del refresco, ese cambio desaparece sin aviso.

Con 1.200 temas y la máquina ocupada, ese rato fue de varios segundos: en
dos corridas el segundo arrastre se registró (apareció la barra) y se esfumó
antes del clic en «Save order». Reproducción a mano: un set de 1.000 temas o
más, arrastrar un tema, guardar, y apenas aparece «Set order saved» arrastrar
otro; mirar si la barra de «sin guardar» desaparece sola. En un set chico el
rato es demasiado corto para verlo.

**2 · AUD.4, la que la auditoría dejó «sin confirmar»: funciona.** Con tres
playlists en FREE, la cuarta importación se rechaza con «You've reached 3
playlists on your plan. Delete one, or upgrade for unlimited.» y no se guarda
nada (el test cuenta las playlists en la base después del intento). Una
observación, no un defecto: en el tope la página de playlists se ve igual que
siempre; el límite se descubre al intentar.

**3 · Del instrumento, no del producto:**
- `e2e/public-surface.spec.ts` tenía el número de artículos del índice en
  español escrito a mano (8); el artículo del lote 18 lo ponía en rojo con la
  página correcta. Ahora cuenta desde el corpus (arreglado en esta rama).
- `scripts/seed-scale.mjs clean` borra todas las filas marcadas de dev, de
  quien sean. Le costó una medición al lote 18 (ver «La base de dev»). El lote
  18 le agregó `--seed` en su rama.

## Seguimiento 10/10: UX.4 y UX.5, escritos y sin correr

Escritos en un contenedor sin `.env.local` ni `.env.e2e.local`, así que **no
corrieron nunca**: un spec que no corrió es un borrador (lo dice
`e2e/helpers/import-playlist.ts`, con el costo). Las dos filas siguen en el
banco hasta que se vean en rojo y en verde.

| Fila | Spec | Proyecto | Qué afirma |
|---|---|---|---|
| UX.4 | `e2e/share-revoke-live.auth.spec.ts` | `auth-proPlus` (usa también la sesión de `pro`) | PRO+ comparte por el panel, PRO abre el set y se queda; PRO+ revoca con el botón «Remove». La sugerencia que PRO manda desde la página vieja no se guarda (cuenta `set_suggestions` en la base), la página no se rompe, al recargar sale el 404 del dashboard y el set deja la lista de «compartidos conmigo» |
| UX.5 | `e2e/quota-mid-flow.auth.spec.ts` | `auth-free` | Con 1 ordenamiento disponible, la página lo dice; la persona mueve un tema a mano; la cuota se gasta por la base; el clic recibe 402, la frase propia de la cuota, el orden a mano sigue y el contador no sube. Recargada, el botón sale deshabilitado con «More on PRO» a `/pricing`. Devuelve la fila de `feature_usage` como estaba |

**Cómo verlos en rojo** (en un worktree descartable, nunca en la rama):

- UX.4: en `services/collaboration-service.ts`, que `addSuggestion` no corte
  con `no_access` (borrar ese `return`). Tiene que ponerse en rojo: la
  sugerencia se guarda y no aparece ningún mensaje.
- UX.5: en `app/api/playlists/[id]/smart-order/route.ts`, cambiar
  `if (!quota.allowed)` por `if (false)`. Tiene que fallar el 402.

**Un hallazgo que salió de escribirlo, arreglado el mismo 10/10.** Cuando a
un colaborador le revocan el acceso con la página abierta y manda una
sugerencia, `addSuggestionAction` traducía `no_access` al error genérico:
«Something went wrong while saving. Please try again.» Era honesto en que no
se guardó nada y falso en que reintentar sirviera. Lo mismo pasaba al tomar
el turno de edición (`takeEditTurnAction`). Ahora `no_access` tiene frase
propia en las dos acciones (`suggestionNoAccess`, `turnNoAccess`): el set ya
no está compartido, no se envió nada, pedile al dueño que lo vuelva a
compartir. La frase es verdadera también para un id que nunca se compartió, así
que no confirma que el set exista. Lo cubre
`tests/collaboration-action-messages.test.ts` (visto en rojo contra el código
sin el arreglo: fallan justo los tres casos de `no_access`), y UX.4 ahora
afirma la frase en vez de adjuntarla. **Sin confirmar a mano.**

`reorderSharedTracksAction` no se tocó a propósito: responde `turnLost` («se te
terminó el turno») igual para quien perdió el turno y para quien no tiene
acceso, y el comentario de la acción dice por qué: un tercero no tiene que
poder distinguir una cosa de la otra. Para un colaborador revocado con el turno
en la mano, esa frase es engañosa («tomalo de nuevo»), pero tomarlo de nuevo
lo lleva a `turnNoAccess`, que ahora sí dice la verdad.

**Dos supuestos que la primera corrida tiene que confirmar:**

- El arrastre de UX.5 usa `dragTo` sobre `li[draggable]` (drag and drop HTML5).
  Chromium lo soporta en Playwright; si el contador «1 moved by hand» no
  aparece, el problema es el instrumento.
- UX.4 no afirma el status 404 del recargado: el dashboard transmite en
  streaming y un `notFound()` puede llegar después de un 200. Afirma el
  título del 404 del dashboard y adjunta el status.

## Seguimiento 10/10: SEO3.1 y SEO4.2, y lo que encontró SEO4.2

Las dos estaban en «automatizables con trabajo» porque, escritas de la forma
obvia, dependen de la velocidad de la máquina. Ahora no:

- **SEO3.1** retiene **todos** los chunks de JavaScript en la red
  (`page.route("**/_next/static/chunks/**")`) hasta que se eligió el tema, y
  afirma que la página todavía no hidrató antes de elegir. No es un throttle,
  que acorta la carrera: la saca. Después suelta los chunks, espera a que React
  se pegue al `<select>` y afirma que la lista quedó filtrada.
- **SEO4.2** espera estados, nunca tiempo: la opacidad final de cada sección,
  que Playwright sondea. Afirma que el hero nace visible, que la sección de más
  abajo sigue oculta después de hidratar (no aparecieron todas de golpe), que al
  llegar con el scroll aparece, y que con movimiento reducido todas se ven sin
  scroll.

Los tres tests se vieron en rojo por la razón correcta: SEO3.1 sacándole el
`<select>` a `useTypedBeforeHydration` («the list is filtered by it» falla), el
SEO4.2 normal haciendo que todas las secciones nazcan visibles («a section far
down waits for the scroll» falla), y el de movimiento reducido contra `main`
sin tocar nada, que es el defecto de abajo. En verde, tres corridas seguidas
sólo con Chromium (el contenedor no tiene los otros navegadores; CI los corre).

**El defecto, confirmado en un build de producción local: con «reducir
movimiento» activado, todas las secciones de la landing debajo del hero
quedaban invisibles para siempre**, con o sin scroll. `SectionReveal` leía
`prefers-reduced-motion` en el inicializador de `useState`: el servidor
renderizaba `opacity-0`, el cliente arrancaba en `visible = true`, React 19
conserva los atributos del servidor ante un desajuste de hidratación, y el
efecto, viendo `visible` ya en `true`, nunca armaba el observer. Afectaba a `/`
y `/es` (es el único uso de `SectionReveal`), para quien tiene activado
«Reducir movimiento» en iOS, macOS, Windows o Android. Arreglado en el mismo
PR: el estado arranca igual en servidor y cliente, y la preferencia la resuelve
sólo el CSS (`motion-reduce:opacity-100`), así que no hay nada en qué
desacordar. **Desde cuándo estaba en producción: sin confirmar.**

Una trampa del instrumento, anotada: con el Chromium del contenedor,
`test.use({ reducedMotion: "reduce" })` no llegó a `matchMedia` (dio `false`).
El test usa `page.emulateMedia` y afirma que `matchMedia` da `true` antes de
seguir, para que un test de movimiento reducido no pueda pasar sin movimiento
reducido.

## La base de dev, que es compartida

Los proyectos `auth-*` comparten la base de dev y corren en serie, en un shard
propio de `npm run test:e2e`. Sembrar volumen desde un test podía romperle la
corrida a otro spec, o a otra sesión. La decisión, y por qué:

- **Dónde corre.** El spec de volumen (`e2e/large-library.auth.spec.ts`) corre
  **sólo en `auth-proPlus`**, dentro del shard autenticado, que va con un solo
  worker cuando hay cuentas (`playwright.config.ts`). Mientras sus filas
  existen no corre ningún otro test autenticado. Un proyecto aparte no servía:
  `scripts/e2e-sharded.mjs` no es de esta sesión y un proyecto que no está en
  sus shards no corre en `npm run test:e2e`.
- **Sembrar y limpiar en el mismo archivo.** Siembra en `beforeAll` y borra en
  `afterAll`. Las filas sembradas llevan `created_at` de septiembre, así que la
  limpieza por fecha de los otros specs nunca las ve.
- **Borrar sólo lo propio.** No usa `seed-scale.mjs clean` a secas, que borra
  **todas** las filas marcadas de dev, sean de quien sean. Borra sus tres
  semillas (1701–1703) con `clean --seed N`, una por una (desde el 10/10; antes
  era un delete directo, ver abajo); todas las claves foráneas a `playlists`
  son `on delete cascade`, así que se van los temas, análisis, versiones y la
  fila de compartir.
- **No arrancar si hay filas marcadas.** Si al empezar dev tiene filas de
  cualquier semilla, el spec se saltea con el motivo escrito. Sembradas por
  otro, podrían caer en las mismas cuentas y cambiar los números que afirma.
- **Cerrar afirmando.** El `afterAll` afirma que no quedó ninguna fila de sus
  semillas y que las dos cuentas tienen las mismas playlists que antes de
  empezar. Era la fila E2E.2 del banco; ahora es un test que falla.
- **Los demás specs nuevos no siembran.** Escriben una o tres filas comunes por
  service role (L16.5 y AUD.4) y las borran en un `finally`.
- **El generador sigue negándose a producción.** No se tocó; los specs lo
  llaman como proceso aparte. El helper de los specs (`e2e/helpers/dev-db.ts`)
  además se niega a cualquier `SUPABASE_URL` que no sea el proyecto de dev.

**Lo que pasó el 06/10, y por qué existe la regla de borrar sólo lo propio.**
Una corrida de depuración de esta sesión llamó a `clean` y borró 31 playlists
marcadas donde había sembrado una: las otras 30 eran de la sesión del lote 18,
que estaba midiendo contra ellas. Se le avisó en el momento y rehízo la
medición. Desde entonces el spec no llama a `clean`, y el lote 18 agregó
`clean --seed N` al generador en su rama. Ya está en `main` (lote 18), y el
10/10 el delete directo de `e2e/helpers/dev-db.ts` se cambió por
`clean --seed`: el generador que escribe las filas es el único que las borra.
El cierre del spec sigue leyendo las semillas por su cuenta
(`seededPlaylistIds`), así que un `clean --seed` que no borre lo suyo pone el
`afterAll` en rojo. **Ese cambio no corrió todavía con la base de dev**: se
hizo en un contenedor sin `.env.local`.

## Lo que aprendió el instrumento

Tres cosas costaron corridas y no hace falta volver a descubrirlas:

- **La hidratación.** Una tabla de 1.200 filas llega en el HTML del servidor
  segundos antes de que React la escuche, y un clic o un arrastre en ese rato
  se pierde sin error. Las props de React en la fila **no** son la señal (estaban
  y el arrastre igual se perdía). La señal es que la tabla responda: al pasar el
  mouse por una fila, la curva dibuja su marcador. En el formulario de
  importación, la espera es `networkidle`, la misma del helper existente.
- **El remontaje después de guardar.** La página de un set le pone al workspace
  una `key` hecha con las posiciones de los temas: después de guardar, el
  servidor manda las posiciones nuevas y el workspace se monta de nuevo. Hasta
  que eso pasa, lo que se haga se pierde (ver «Defectos»). La señal es que la
  tabla vieja salga del documento.
- **Arrastrar en una tabla de 1.200 filas no es confiable con Playwright.** La
  página se desplaza bajo el puntero en medio del arrastre y el test guardó
  órdenes que nadie pidió. L17.5 reordena ordenando por la columna BPM, que
  reescribe todas las posiciones (el caso que fallaba) y cuyo resultado se
  calcula exacto. Lo que no prueba es que un arrastre corto escriba sólo los
  temas que se mueven; eso lo cubre `tests/reorder-round-trips.test.ts`, «writes only the tracks a drag moves: ten places is 22 writes, not 2,000».

Y una de entorno: los navegadores de Playwright 1.62.1 (revisión 1234) no
estaban en la Mac; había sólo los de otra versión. Se reinstalaron con
`npx playwright install chromium firefox webkit`.

**Lo que mostraron las tres corridas completas, antes de cerrar.** La primera
tanda de tres (sobre el árbol de antes de los dos arreglos de abajo) dio
1333 / 67 / 3, 1334 / 67 / 2 y 1333 / 67 / 3 (pasan / saltean / fallan):

- **SEO4.1 en mobile-safari, tres de tres.** No era el producto: el menú
  cerrado del teléfono es un panel colapsado a 0 px y con opacidad 0, a
  propósito, y la aserción lo contaba como texto del hero escondido. En
  escritorio ese panel no existe (`lg:hidden`), por eso pasaba en los otros
  tres navegadores. Ahora sólo cuenta cajas con altura. También contaminaba la
  prueba en rojo de mobile-safari, que se repitió: los ocho en rojo contra el
  mutante, por el texto del hero («A layer between your selection…»).
- **L16.5, una de tres:** dos encabezados «Still bringing your tracks in» a la
  vez (violación de modo estricto). La página se refresca sola cada segundo y,
  mientras un refresco entra por streaming, el árbol viejo y el nuevo conviven
  un instante en el documento; el banco ya lo documentaba para otra página. Es
  el localizador del test, no el producto: ahora toma el primero.
- **`e2e/import-and-visualise.auth.spec.ts`, «reads Rekordbox XML and shows the
  tracks», en PRO+, una de tres. Flaky, sin causa determinada, y no es un test
  nuevo.** El helper de importación esperó 30 s a que la página mostrara los
  temas y no los mostró. Corrió **antes** de que el spec de volumen sembrara
  nada (fue el test 87 de 123 del shard autenticado; la siembra empieza en el
  100), y el servidor no registró ningún error ni el `playlist.create_rolled_back`
  de IMP.1. El trace se perdió porque la corrida siguiente limpió
  `test-results/`. No se reintentó ni se tocó; queda caracterizado acá, y desde
  la segunda tanda se guardan los `test-results/` de cada corrida.

## Verificación

Todo corrido el 06/10 sobre esta rama, con la máquina sin otra suite andando.

| | |
|---|---|
| `npx tsc --noEmit` | limpio |
| `npx eslint .` | limpio |
| `npm run build` | pasa, sobre `.next` borrado |
| `npm run test:e2e`, tres corridas seguidas | **1336 pasan · 67 saltean · 0 fallan** las tres, en 368, 376 y 375 s. Sin reintentos (`retries: 0`) |
| La tanda de tres anterior | 1333/67/3, 1334/67/2, 1333/67/3 — caracterizada arriba, en «Lo que aprendió el instrumento» |
| Los saltos | 46 de antes + 21 de los specs nuevos, que corren en un solo proyecto (o en escritorio) y en los demás saltean con su motivo |
| Cada test nuevo en rojo | Los 26, contra el código de antes del arreglo o contra un mutante — tabla de «Qué se automatizó» |
| Base de dev al cerrar | `seed-scale.mjs status`: 9 perfiles, 1 playlist, 12 temas, 1 análisis, 0 versiones, **0 filas marcadas** — lo mismo que al empezar |
| Las tres cuentas al cerrar | **0 playlists** cada una, contadas por service role |
| El banco | **146 → 116** filas; el número declarado arriba, 116, igual al que cuenta la página (abierta en Chromium: 116 filas, 29 sesiones, sin errores de script) |

## Las 146 filas

Destino: **Sale** — un test la cubre (nombrado); **Queda** — sigue en el banco.

| Fila | Título | Categoría | Por qué | Destino |
|---|---|---|---|---|
| L17.1 | Exportá tus datos y contá los temas del archivo | Automatizable ya | Volumen sembrado con `seed-scale.mjs` (400 playlists) en la cuenta PRO, el export pedido por HTTP con la sesión del test, y los ids distintos del archivo contados contra un `count` de la base. | **Sale.** `e2e/large-library.auth.spec.ts` · «L17.1 · the data export carries every track, counted by id» |
| L17.2 | El conteo de temas de cada playlist en el menú lateral | Automatizable ya | Mismo volumen (más de 1.000 temas en total): el conteo de cada playlist del menú lateral contra su `count` en la base. | **Sale.** `e2e/large-library.auth.spec.ts` · «L17.2 · every playlist in the sidebar shows its own track count» |
| L17.3 | La librería global con muchas playlists | Automatizable ya | Mismo volumen (400 playlists): la librería global muestra los discos y encuentra un tema de una playlist vieja. | **Sale.** `e2e/large-library.auth.spec.ts` · «L17.3 · the global library is not empty, and reaches the oldest set» |
| L17.4 | Los sets compartidos con vos muestran su cantidad de temas | Automatizable ya | Un set de 1.200 temas sembrado en PRO+ y compartido con PRO escribiendo la fila de `set_collaborators` con service role; la PRO lee su cantidad en «Compartidos conmigo». | **Sale.** `e2e/large-library.auth.spec.ts` · «L17.4 · a shared set shows its real track count to the reader» |
| L17.5 | Reordenar y volver a reordenar un set grande | Automatizable ya | Arrastrar es drag-and-drop HTML5 nativo, que Playwright maneja en Chromium. Sobre el set de 1.200 temas: un arrastre corto, uno largo, guardar, recargar y leer el orden. | **Sale.** `e2e/large-library.auth.spec.ts` · «L17.5 · a big set reorders, reorders again, and keeps the order» |
| L17.6 | Un set de más de 1.000 temas se ve entero | Automatizable ya | Un set de 1.200 temas sembrado en la cuenta PRO: la tabla tiene 1.200 filas y la última es la 1.200. | **Sale.** `e2e/large-library.auth.spec.ts` · «L17.6 · a set of more than 1,000 tracks is shown whole» |
| L16.1 | PostHog no guarda tu IP | No automatizable | Es un ajuste en la consola de PostHog. La mitad de código (que el evento no lleva `$ip`) ya la verifica `e2e/posthog-payload.spec.ts`. | Queda |
| L16.2 | Cada término del glosario, enlazado una vez | Ya cubierta | `tests/link-terms.test.ts`, describe «a term the article already links by hand (H-18)»: recorre los 23 artículos y falla si un término se enlaza dos veces (visto en rojo en el lote 16 con los 4 duplicados de producción). | **Sale.** Ya la cubría el test que nombra la razón |
| L16.3 | El tooltip de término se cierra con Escape | No automatizable | La mitad de teclado ya está cubierta por `e2e/accessibility.spec.ts`, «…: Escape closes a term's tooltip without moving focus», en los dos idiomas y los cuatro navegadores. Lo que queda es VoiceOver, que es oído. | Queda, **recortada** a la mitad que necesita una persona |
| L16.4 | La cita de precios de Lexicon, literal otra vez | No automatizable | Compara contra el sitio de Lexicon, que cambia cuando ellos quieren; y la regla «gana su página» es un juicio sobre qué hacer con la diferencia. | Queda |
| L16.5 | La playlist recién importada avisa que está llegando | Automatizable ya | La ventana se fabrica: una playlist importada sin temas, escrita por service role con `created_at` de ahora; la página tiene que avisar y mostrar los temas solos cuando se insertan. | **Sale.** `e2e/import-arriving.auth.spec.ts` · «L16.5 · a playlist whose tracks are still arriving says so, and fills in by itself» |
| L16.6 | El botón de login dice «Iniciar sesión» en español | Automatizable ya | La cookie de idioma en `es`, `/login`, y el texto del botón. | **Sale.** `e2e/public-surface.spec.ts` · «the login button speaks Spanish when the visitor does» |
| N.1 | Teclado, de punta a punta | Automatizable ya | Teclado puro: Tab hasta Recursos, Enter, Tab adentro, Escape, y dónde quedó el foco. | **Sale.** `e2e/banco-public.spec.ts` · «N.1 · opens with Enter, takes Tab inside, and Escape gives focus back» |
| N.2 | El panel entra en una laptop | Automatizable ya | Medible: la caja del panel contra el viewport a 1440 y 1280. Que el cian se distinga de los items es lo único visual, y es menor. | **Sale.** `e2e/banco-public.spec.ts` · «N.2 · the panel fits a 1440px / 1280px laptop screen» |
| N.3 | Mobile a 390 px | Automatizable ya | Medible: a 390 px, `scrollWidth` del documento contra el ancho de la ventana con el menú abierto. | **Sale.** `e2e/banco-public.spec.ts` · «N.3 · at 390px the menu is one column with no sideways scroll» |
| N.4 | El copy dice algo, en los dos idiomas | No automatizable | Juicio de copy: si cada item dice qué ganás entrando. | Queda |
| N.5 | Las tres herramientas llegan a donde dicen | Automatizable ya | Los `href` de «Probalo gratis» en español tienen que empezar con `/es/herramientas/`, y responder 200. | **Sale.** `e2e/banco-public.spec.ts` · «N.5 · in Spanish, the free tools land on their Spanish pages» |
| J.1 | Contacto sin cerrar sesión | Automatizable con trabajo | Que el formulario venga prellenado es automatizable ya; que el mail llegue necesita un buzón de prueba que el test pueda leer, y en dev Resend sólo entrega a una dirección. | Queda |
| J.2 | Importar CSV | Automatizable ya | Exportar el CSV de un set del test, volver a importarlo y comparar orden y metadata. | Queda — no se automatizó (ver «Dónde paré») |
| J.3 | CSV con punto y coma | No automatizable | Necesita Excel. El nombre del archivo (H-8) ya lo verifica `e2e/playlist-export.auth.spec.ts`, «downloads csv with the right name and content», y el separador `;` `tests/parse-csv.test.ts`, «reads a semicolon file, which is what a European spreadsheet saves». | Queda, **recortada** a la mitad que necesita una persona |
| J.4 | Mover tracks después de reordenar | Automatizable con trabajo | Arrastrar después de reordenar es automatizable; el mensaje de H-10 necesita que la cuenta de Anthropic esté sin crédito, un estado externo que el test no controla y que deja de existir el día que se cargue. | Queda |
| J.5 | El punto de la curva | No automatizable | Visual: si el disco y la línea se ven. Una captura comparada contra otra sería un test que se rompe con cualquier cambio de estilo. | Queda |
| J.6 | El orden de respaldo ahora respeta armonía | No automatizable | Oído: si el orden de respaldo suena bien. El optimizador ya tiene sus unitarios. | Queda |
| J.7 | Boost y drop separados | Automatizable con trabajo | Automatizable con un CSV de temas con tonalidad importado en PRO+; los nombres de los movimientos ya los cubren `tests/transitions.test.ts` y `tests/harmony.test.ts`, así que lo que agregaría es sólo que la interfaz los muestre. | Queda |
| J.8 | Colorear tonalidades | Automatizable ya | PRO+: tildar, recargar, seguir tildado. | Queda — no se automatizó (ver «Dónde paré») |
| J2.1 | El diagonal dejó de ser un choque | Ya cubierta | `tests/harmony.test.ts`: `harmonicTier("8A", "9B")` es `smooth` («The diagonal: A minor into G major…»). | **Sale.** Ya la cubría el test que nombra la razón |
| J2.2 | Los nombres de los ocho niveles | No automatizable | Compara contra el archivo de Jordi, que no está en el repo. Que la constante produzca esos niveles lo cubre `tests/transitions.test.ts` (p. ej. 8A→3A = `boost_3`, `secondary`). | Queda |
| J2.3 | El margen de ±7% de BPM | Ya cubierta | `tests/transitions.test.ts`, «measures the BPM gap without touching the verdict»: 124 → 136, +9,68 %, `beyondMargin`, veredicto intacto. | **Sale.** Ya la cubría el test que nombra la razón |
| J2.4 | Mitad de tiempo no es un salto del 50% | Ya cubierta | `tests/transitions.test.ts`, «reads a halftime mix as a matched tempo, not a 50% jump», y `e2e/harmonic-tools.spec.ts`, «half-time is a matched tempo, not a jump». | **Sale.** Ya la cubría el test que nombra la razón |
| SEO.2 | El navegador deja de ofrecer traducir | No automatizable | Es el navegador reaccionando al atributo: el cartel de traducir de Chrome no existe en un navegador automatizado. | Queda |
| SEO.3 | Rich Results Test sobre un post | No automatizable | Rich Results Test: un validador de Google, ajeno. | Queda |
| SEO.4 | La tarjeta social en un scraper real | No automatizable | Scrapers de WhatsApp, X y Slack. | Queda |
| SEO.5 | Sitemap en producción y Search Console | No automatizable | Search Console. El conteo y las rutas ya los afirman `e2e/public-surface.spec.ts` («sitemap.xml lists the public routes») y `e2e/sitemap-links.spec.ts`. | Queda, **recortada** a la mitad que necesita una persona |
| TOOL.1 | Tu colección entera, y el selector de playlist | No automatizable | Tu colección real. El caso que la fila protege (leer sólo la primera playlist) ya lo cubre `tests/tool-energy-curve.test.ts`, «lists every playlist in a Rekordbox export, not just the first». | Queda |
| TOOL.2 | Los otros formatos, con archivos tuyos | No automatizable | Archivos tuyos: los casos raros son justamente los que ningún fixture tiene. | Queda |
| TOOL.3 | Nada del archivo sale por red — en producción | Automatizable con trabajo | Sin PostHog ya lo afirma `e2e/tools.spec.ts`, «no request carries a track title or an artist». Con PostHog cargado haría falta un build con clave y desactivar su filtro de navegadores automatizados, que descarta todo lo que sale de Playwright. | Queda |
| TOOL.4 | El pase a signup, de punta a punta | No automatizable | Necesita registrar una cuenta nueva: el signup es de WorkOS, con verificación de mail en el medio. | Queda |
| TOOL.5 | En el teléfono, con datos móviles | No automatizable | Un teléfono con datos móviles y Lighthouse contra producción. | Queda |
| TOOL.6 | Los cuatro eventos en PostHog | No automatizable | La consola de PostHog. | Queda |
| TOOL.7 | Accesibilidad de las cuatro páginas nuevas | No automatizable | El lector de pantalla. El barrido de axe ya cubre las páginas de herramientas en `e2e/accessibility.spec.ts`. | Queda |
| TOOL.8 | Lo que la herramienta rechaza | Automatizable ya | Tres archivos que la herramienta tiene que rechazar explicando: dos temas, uno corrupto, un PDF. | **Sale.** `e2e/banco-public.spec.ts` · «TOOL.8 · …, given …, says why and stays usable» (3 archivos × 2 idiomas) |
| TOOL.9 | Que Google la encuentre | No automatizable | Indexación de Google. | Queda |
| TOOL2.1 | La rueda contra el archivo de Jordi | No automatizable | Compara contra el archivo de Jordi. Que la rueda ofrezca lo que la constante dice ya lo cubre `tests/harmonic-tools.test.ts`, «the wheel offers what the table offers». | Queda |
| TOOL2.2 | La tabla de equivalencias, contra su sección 2.1 | Ya cubierta | `tests/harmonic-cheat-sheet.test.ts`, «gets the ten rows right that the reference file gets wrong», y `tests/harmonic-tools.test.ts`, describe «the key table». | **Sale.** Ya la cubría el test que nombra la razón |
| TOOL2.3 | El pitch sin key lock, contra un deck real | No automatizable | Un CDJ o un controlador de verdad. | Queda |
| TOOL2.4 | Key lock encendido | No automatizable | El equipo. El lado de la herramienta ya lo cubre `e2e/harmonic-tools.spec.ts`, «key lock holds the key». | Queda |
| TOOL2.5 | Mitad y doble tiempo con temas reales | Ya cubierta | `e2e/harmonic-tools.spec.ts`, «half-time is a matched tempo, not a jump», en los dos idiomas y cuatro navegadores; y `tests/harmonic-transitions.test.ts`, «matches half and double time instead of flagging them». Lo que importa del «tema real» son sus dos BPM. | **Sale.** Ya la cubría el test que nombra la razón |
| TOOL2.6 | La rueda en el teléfono | No automatizable | Un dedo sobre un teléfono real; la emulación táctil no dice si se le erra a la clave. | Queda |
| TOOL2.7 | Lector de pantalla sobre la rueda | No automatizable | El lector de pantalla. | Queda |
| TOOL2.8 | Los dos eventos nuevos en PostHog | No automatizable | La consola de PostHog. | Queda |
| A2.7 | Setear BACKSTAGE_ADMIN_EMAILS | No automatizable | Una variable en la consola de Vercel. | Queda |
| A4.1 | Inventariar qué backups existen | No automatizable | La consola de Supabase. | Queda |
| A4.2 | Restaurar de verdad y cronometrar | No automatizable | Restaurar un backup en un proyecto nuevo: consola y cuenta tuyas. | Queda |
| A5.1 | Recorrido funcional y catálogo de features | No automatizable | Juicio de auditor sobre 28 capabilities. | Queda |
| A5.2 | Bugs residuales | No automatizable | Abrir el export en Rekordbox y en Traktor de verdad. | Queda |
| A5.3 | Consistencia de UX y estados de error | No automatizable | Juicio sobre si un error explica bien. | Queda |
| A5.4 | Fricción en flujos críticos | No automatizable | La fricción es una reacción humana, cronometrada. | Queda |
| A5.5 | Catalogar hallazgos por severidad | No automatizable | Catalogar por severidad es un juicio. | Queda |
| A5.6 | Set largo | Automatizable ya | Un set de 100 temas sembrado: la página carga en segundos y no ofrece reordenar. | Queda — no se automatizó (ver «Dónde paré») |
| A6.1 | IAM y configuración de cloud | No automatizable | Consolas de terceros. | Queda |
| A6.2 | KMS y rotación de claves | No automatizable | Consolas de terceros. | Queda |
| A6.3 | Acceso de emergencia delegado | No automatizable | Gestor de contraseñas y una persona de confianza. | Queda |
| A7.1 | Contratar el pentest | No automatizable | Contratar a una empresa. | Queda |
| A7.2 | Firmar y verificar los DPAs | No automatizable | Firmar contratos. | Queda |
| A8.1 | Fijar las tres anclas | No automatizable | Oído. Y el arnés de etiquetado está fuera de alcance. | Queda |
| A8.2 | Puntuar los 60 | No automatizable | Oído. Fuera de alcance. | Queda |
| A8.3 | Medir tu propia consistencia | No automatizable | Oído. Fuera de alcance. | Queda |
| UX.1 | Estados vacíos autenticado | No automatizable | Que cada estado vacío *explique* es un juicio. Que exista ya lo cubren `e2e/onboarding-activation.auth.spec.ts` («shows a way to bring a set in, before there is any set») y `e2e/import-and-visualise.auth.spec.ts`. | Queda |
| UX.2 | Errores de Stripe en checkout | Automatizable con trabajo | Tarjeta de rechazo y sesión vencida de Stripe: necesita el listener del CLI de Stripe, como `e2e/subscription-billing.auth.spec.ts`. | Queda |
| UX.3 | Gig Mode sin conexión | Automatizable con trabajo | El service worker de Gig Mode con la red cortada (`context.setOffline`). Falta saber si el SW se registra en el build de prueba. | Queda |
| UX.4 | Revocación de acceso en vivo | Automatizable con trabajo | Dos sesiones a la vez (PRO+ y PRO), compartir, revocar mientras la otra mira. Escrito el 10/10, sin correr todavía. | Queda hasta verlo en rojo |
| UX.5 | Cuota agotada a mitad de flujo | Automatizable con trabajo | Gastar la cuota de FREE escribiendo `feature_usage` desde la base, y devolverla al terminar. Escrito el 10/10, sin correr todavía. | Queda hasta verlo en rojo |
| CONT.1 | Los componentes en un teléfono real | No automatizable | Un teléfono real, girado. | Queda |
| CONT.2 | La escala de energía contra el score real | No automatizable | Contrastar con un set tuyo analizado. Que la tabla y el motor no se separen ya está garantizado por construcción: `components/content/escala-energia.tsx` dibuja desde `ENERGY_SCORE_BPM_BANDS` de `lib/product/strategy.ts`. | Queda |
| CONT.4 | Las 21 definiciones, leídas por un DJ | No automatizable | Un DJ leyendo 21 definiciones. | Queda |
| CONT.5 | Rich Results Test sobre el glosario y la guía | No automatizable | Rich Results Test. | Queda |
| CONT.8 | El glosario en producción y en Search Console | No automatizable | Search Console. | Queda |
| SEO2.1 | Rich Results Test sobre las dos páginas de referencia | No automatizable | Rich Results Test. | Queda |
| SEO2.2 | Los dos HowTo de /install | No automatizable | Rich Results Test. | Queda |
| SEO2.3 | La tarjeta social de un artículo, en un scraper real | No automatizable | Scrapers sociales. | Queda |
| SEO2.4 | Las FAQ nuevas con teclado y lector de pantalla | No automatizable | El lector de pantalla. El `<details>` es nativo y el barrido de axe lo cubre. | Queda |
| SEO2.5 | La respuesta de «anda sin conexión» contra la realidad | No automatizable | La app instalada en un teléfono, en modo avión. Que la FAQ no prometa de más lo cubre `tests/reference-seo.test.ts`, «does not claim the whole app works offline». | Queda |
| SEO2.6 | Lighthouse mobile de las dos páginas de referencia | No automatizable | Lighthouse contra producción. | Queda |
| SEO2.7 | /llms.txt leído por un modelo | No automatizable | Un modelo leyendo el archivo: juicio. | Queda |
| SEO2.8 | El lastmod nuevo, en Search Console | No automatizable | Search Console. | Queda |
| SEO3.1 | El filtro del índice antes de que hidrate | Automatizable con trabajo | Elegir en el desplegable antes de hidratar: hay que retener el JavaScript en la red de forma determinística para que el test no dependa de la velocidad de la máquina. | **Sale el 10/10.** `e2e/banco-public.spec.ts` · «SEO3.1 · a topic picked before the JavaScript arrives survives hydration» |
| SEO3.2 | El desplegable con teclado y lector de pantalla | No automatizable | El lector de pantalla. | Queda |
| SEO3.3 | Rich Results Test sobre el índice y un artículo | No automatizable | Rich Results Test. | Queda |
| SEO3.4 | Las respuestas de la FAQ, arrancadas de contexto | No automatizable | Si la oración responde es un juicio; el «Sí.» pelado ya lo prohíbe un unitario. | Queda |
| SEO3.8 | La entrada build-up, leída por un DJ | No automatizable | Un DJ leyendo una definición. | Queda |
| SEO4.1 | La primera pantalla sin JavaScript | Automatizable ya | Un contexto con JavaScript apagado: el hero entero visible en `/` y `/es`. | **Sale.** `e2e/banco-public.spec.ts` · «SEO4.1 · / and /es show their whole hero with scripts off» |
| SEO4.2 | El revelado de abajo del pliegue sigue andando | Automatizable con trabajo | Medir una animación al hacer scroll sin que el test dependa del tiempo; con `reducedMotion: reduce` es fácil, la otra mitad no. | **Sale el 10/10.** `e2e/banco-public.spec.ts` · «SEO4.2 · the hero is painted at once…» y «SEO4.2 · with reduced motion…». Encontró un defecto: ver «Seguimiento 10/10: SEO3.1 y SEO4.2» |
| SEO4.3 | Lighthouse mobile y el elemento LCP | No automatizable | Lighthouse contra producción. | Queda |
| SEO4.5 | Los CTAs de contenido y el evento | No automatizable | El evento en la consola de PostHog. | Queda |
| SEO4.6 | El embudo en PostHog | No automatizable | Configurar PostHog. | Queda |
| SEO4.7 | La entidad en el Rich Results Test | No automatizable | Rich Results Test. | Queda |
| SEO4.8 | Los dos artículos corregidos, leídos por un DJ | No automatizable | Un DJ leyendo. | Queda |
| SEO5.1 | El banner nuevo, leído como declaración de privacidad | No automatizable | Leer la promesa de privacidad y juzgar si los dos idiomas dicen lo mismo. | Queda |
| SEO5.2 | El LCP después de acortar, en producción | No automatizable | Lighthouse contra producción. | Queda |
| SEO5.3 | Los 95 caracteres: la decisión que queda | No automatizable | Una decisión tuya. | Queda |
| SEO5.5 | El mapa de consultas, leído por vos | No automatizable | Leer el mapa de consultas. | Queda |
| SEO5.6 | El pase de Reddit que falta | No automatizable | Reddit desde tu navegador: la API da 403 sin OAuth. | Queda |
| SEO5.7 | El banner con teclado y lector de pantalla | No automatizable | El lector de pantalla. El rechazo que persiste y los botones con el mismo peso ya los cubre `e2e/consent.spec.ts` («is remembered on the next page, so it is not asked twice», «refusing is exactly as easy as accepting»). | Queda, **recortada** a la mitad que necesita una persona |
| DB.2 | El semáforo completo en dev | No automatizable | Necesita la connection string de dev, que es un secreto tuyo. | Queda |
| DB.3 | Correlo contra producción, en lectura | No automatizable | Necesita la connection string de producción. | Queda |
| DB.4 | El seed, en una base de dev que puedas ensuciar | No automatizable | Necesita la connection string. Lo que la fila mira del producto —un set sin tags dice que no sabe— ya lo cubre `e2e/import-and-visualise.auth.spec.ts`, «says which part of the curve is data and which is a guess». | Queda |
| E2E.1 | La suite entera, como línea de base del día | Ya cubierta | No es una prueba: es correr la suite. Sale como fila y pasa a ser el primer paso de la jornada, en la sección de arriba del banco, porque todo lo demás se interpreta contra ese número. | **Sale.** Ya la cubría el test que nombra la razón |
| E2E.2 | Que la base quede como estaba | Automatizable ya | Contar las playlists de dev antes y después y exigir el mismo número: el spec de volumen lo afirma al cerrar. | **Sale.** `e2e/large-library.auth.spec.ts` · el `afterAll` afirma que las dos cuentas quedan con lo que tenían y que no queda ninguna fila de las semillas |
| E2E.3 | Lo que el E2E ahora cubre y vos ya no tenés que hacer a mano | Ya cubierta | Es una lista de lo que ya automatizó el E2E, no una prueba. Su contenido pasa a este documento. | **Sale.** Ya la cubría el test que nombra la razón |
| PAY.1 | El arco completo, con el listener puesto | Automatizable con trabajo | El spec existe y corre; lo que falta es el `stripe listen`, que necesita el CLI de Stripe logueado con tu cuenta. | Queda |
| PAY.2 | Que sin listener saltee en vez de mentir | Ya cubierta | Cada `npm run test:e2e` sin listener lo ejercita: los tests de pagos saltean con el motivo escrito, y la suite termina en 0 fallos. Se ve en el resumen de cualquier corrida. | **Sale.** Ya la cubría el test que nombra la razón |
| PAY.3 | Lo que el test no puede contestar y sigue siendo tuyo | No automatizable | Es la lista de lo que el spec de pagos no puede hacer (3-D Secure real, el portal por dentro, el downgrade, los mails de Stripe): cada ítem es manual. | Queda |
| PAY.4 | Un botón que el copy llama por un nombre que no existe | No automatizable | Una decisión tuya (H-16). | Queda |
| CMP.1 | Leer la de SetFlow como si fueras ellos | No automatizable | Tono: juicio. | Queda |
| CMP.2 | Verificar dos filas contra la fuente | No automatizable | Contra la página del competidor, que cambia. | Queda |
| CMP.3 | Los precios envejecen | No automatizable | Precios de terceros. | Queda |
| CMP.4 | Rich Results Test sobre una comparación | No automatizable | Rich Results Test. | Queda |
| CMP.5 | El toggle de idioma va a la gemela, no a un índice | Automatizable ya | Cambiar el idioma en `/compare/lexicon` y leer la URL a la que se llega. | **Sale.** `e2e/banco-public.spec.ts` · «CMP.5 · the toggle on … goes to …» (las dos direcciones) |
| AUD.1 | El banner ya no tapa nada — validar el fix | Automatizable ya | La mitad pública ya la cubre `e2e/consent.spec.ts`, «leaves every control reachable while it is showing»; lo que queda es `/dashboard/playlists` a 390 px con sesión, que es una caja contra otra. | **Sale.** `e2e/consent-dashboard.auth.spec.ts` · «AUD.1 · at 390 px the banner covers nothing on /dashboard/playlists» |
| AUD.2 | El importador lee el archivo antes de decir «listo» — validar el fix | Ya cubierta | `e2e/import-readiness.auth.spec.ts`, «the import form, given …», con los mismos cuatro archivos que la fila: el XML cortado, el export vacío, el .txt que no es playlist y el control sin BPM. | **Sale.** Ya la cubría el test que nombra la razón |
| AUD.3 | La cuota de IA se ve antes del clic — validar el fix | Automatizable con trabajo | Gastar el ordenamiento del mes de FREE escribiendo la cuota en la base, y devolverla al terminar. | Queda |
| AUD.4 | La cuarta importación en FREE | Automatizable ya | FREE con tres playlists (sembradas por la base) e intentar una cuarta importación por la interfaz. | **Sale.** `e2e/free-plan-cap.auth.spec.ts` · «AUD.4 · a fourth import on FREE is refused, and the refusal says why» |
| AUD.5 | Las ocho capabilities que quedaron sin ejercitar | No automatizable | Una decisión tuya. | Queda |
| ART.1 | Leerlos como DJ, no como redactor | No automatizable | Un DJ leyendo. | Queda |
| ART.2 | Los enlaces a las comparaciones caen donde el tema los pide | No automatizable | Juicio: si el enlace cae donde el tema lo pide. | Queda |
| ART.3 | Rich Results Test sobre uno de los tres | No automatizable | Rich Results Test. | Queda |
| GUIA.1 | Leerla como DJ, no como redactor | No automatizable | Un DJ leyendo. | Queda |
| GUIA.2 | El vocabulario de la decisión 29 | No automatizable | La fila existe para juzgar si el voseo suena natural; la búsqueda de palabras prohibidas sí se puede automatizar, pero es la mitad que no la justifica. | Queda |
| GUIA.3 | Rich Results Test sobre la guía | No automatizable | Rich Results Test. | Queda |
| GUIA.4 | El índice de guías volvió solo | Ya cubierta | `tests/empty-index.test.ts`, describe «now that a guide is published» (indexable, en el sitemap, hreflang y en el footer), más `e2e/sitemap-links.spec.ts`. | **Sale.** Ya la cubría el test que nombra la razón |
| A2B.1 | Leerlos como DJ, no como redactor | No automatizable | Un DJ leyendo. | Queda |
| A2B.2 | La gemela en español y el vocabulario de la decisión 29 | No automatizable | Juicio de vocabulario («crate» en la cabina). | Queda |
| A2B.3 | Los pasos contra el software de verdad | No automatizable | Traktor, Rekordbox y Serato abiertos. | Queda |
| A2B.4 | Rich Results Test sobre uno de los cuatro | No automatizable | Rich Results Test. | Queda |
| A2B.5 | La lista de recorridos en /import-formats | No automatizable | Juicio: si la lista estorba o se entiende. Que los tres enlaces estén lo ve `e2e/sitemap-links.spec.ts` sólo en parte (que no estén rotos). | Queda |
| ARM.1 | Mirar la rueda y reconocer la tonalidad | No automatizable | Oído o piano. | Queda |
| ARM.2 | Una fila de movimientos contra la rueda interactiva | Ya cubierta | `tests/harmonic-cheat-sheet.test.ts`, describe «the page is the transition table, cell for cell», y `tests/harmonic-tools.test.ts`, describe «the wheel offers what the table offers»: las dos leen la misma constante y cada una está comparada contra ella. | **Sale.** Ya la cubría el test que nombra la razón |
| ARM.3 | La descarga | No automatizable | Visores e impresora. Que el archivo traiga los 24 códigos y se sirva como SVG ya lo cubre `tests/harmonic-cheat-sheet.test.ts`, describe «the downloadable wheel». | Queda |
| ARM.4 | Rich Results Test sobre la tabla | No automatizable | Rich Results Test. | Queda |
| CMP2.1 | Ninguna fila afirma lo que el fabricante no afirma | No automatizable | Contra la página del fabricante. | Queda |
| CMP2.2 | Leerla como si fueras cada uno de los cinco | No automatizable | Tono: juicio. | Queda |
| CMP2.3 | Los precios envejecen | No automatizable | Precios de terceros. | Queda |
| CMP2.4 | Rich Results Test sobre una de las dos | No automatizable | Rich Results Test. | Queda |
| F45.1 | Repetir las dos filas rojas después del deploy | No automatizable | Es contra producción después del deploy. El contenido del `llms.txt` ya lo cubre `tests/reference-seo.test.ts`, «lists every comparison page, with its verification date». | Queda |
| F45.3 | E22: los cinco perfiles que faltan | No automatizable | Crear perfiles en sitios ajenos. | Queda |
| F45.4 | E25, E26, E27 y E31: lo externo | No automatizable | Menciones, StageLink, PSI: todo externo. | Queda |
