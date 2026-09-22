# F1 · Auditoría de producto y UX — 22/09/2026

> **Qué se hizo.** Un recorrido del producto contra el producto corriendo, no
> contra el código: 33 rutas pedidas, el flujo de valor central ejercitado de
> punta a punta, cuatro estados de error provocados a propósito, y las
> afirmaciones de UX que otros documentos dan por ciertas verificadas en un
> navegador real.
>
> **Qué NO se hizo, y es la tarea que queda abierta de la fase:** poner a un DJ
> ajeno al desarrollo a hacer la tarea real y mirar dónde se traba. Eso no lo
> puede hacer esta auditoría, y ningún hallazgo de acá lo reemplaza — lo que
> sigue son defectos, no fricción observada.
>
> Además, **todo lo de acá se ejercitó SIN SESIÓN.** El dashboard, el import
> desde archivos, el reordenamiento, el export y el modo cabina siguen sin
> recorrer: necesitan las tres cuentas de prueba, que es el mismo bloqueante
> abierto desde F3 del plan de pruebas.

---

## 1. Hallazgos

Cuatro, ordenados por lo que le cuesta a alguien.

### F1-01 · La línea base declara 35 capabilities y el registro tiene 26 — **Medio**

`docs/audit360/baseline.md` §2 dice **28 `shipped` y 7 `planned`**.
`lib/product/capabilities.ts` tiene **24 `shipped` y 2 `planned`**, o sea 26 en
total contra 35.

Verificado de dos formas independientes, porque una sola habría sido un grep:
importando `CAPABILITIES` y contando las claves del objeto, y parseando el
archivo balanceando llaves. Las dos dan 26/24/2.

**Y no es que el registro haya cambiado.** El último commit que lo tocó es del
11/09 —*"give title lookup its own capability"*— y desde entonces no se modificó,
así que tenía 24/2 **el día que se escribió la línea base**. El número estuvo mal
desde el principio.

De dónde salió 28/7 no se pudo reconstruir. La tabla de precios tiene 27 filas
(26 capabilities más la fila de soporte, que `NON_GATED_MATRIX_ROWS` declara
aparte), así que tampoco es eso.

**Lo que hace que esto importe más que dos números:** la §3 de la propia línea
base dice *"sin esto, la tabla de arriba es una captura que nadie puede volver a
tomar"*, y da comandos para los tests, la cobertura, el conteo de E2E y los
archivos fuente. **Para las dos filas de producto no da ninguno.** Son
exactamente las dos filas que salieron mal, y son las únicas dos que nadie podía
comprobar. La estructura del documento predijo su propio defecto.

**Arreglo:** corregir las dos filas y agregarles el comando. No se corrigió en
este cambio a propósito: la línea base es el punto de referencia de la auditoría
entera y editarla es una decisión sobre el dossier, no sobre el producto.

### F1-02 · «an headliner» en la copia pública en inglés — **Bajo. CORREGIDO**

En `lib/content/tools-copy.ts`, en el bloque *"The shapes sets usually take"* de
`/tools/energy-curve` — la página gratis, sin cuenta, que es lo más probable que
lea primero un desconocido.

Corregido, y con un test que fija la clase entera:
`tests/copy-english-articles.test.ts` recorre el lado `en:` de las 1.516 entradas
bilingües y los artículos en inglés buscando artículos indefinidos mal puestos.

**El detalle que vale más que el arreglo: la primera versión del escáner que
encontró esto no podía encontrarlo.** Su clase de consonantes dejaba afuera la
letra h, para poder filtrar aparte las palabras de h muda como *"an hour"* — y
dejar la h afuera significaba que el filtro nunca corría y que `an headliner`
pasaba limpio por un chequeo escrito para encontrar justo eso.

Van **cinco** instrumentos de este repo midiendo un sustituto en vez de la cosa:

| Instrumento | Qué medía | Qué tenía que medir |
|---|---|---|
| `workflow-integrity.test.ts` | una palabra dentro de su propio comentario | el setting |
| `compliance-claims.test.ts` (v1) | el archivo | el documento que el archivo produce |
| El canario del Art. 17 | un path de archivo | si el usuario puede llegar a la supresión |
| El `lastmod` del sitemap | «no es hoy» | «sale del frontmatter del artículo» |
| Este escáner | `an` + consonantes sin la h | `an` + consonantes |

El patrón vale nombrarlo porque es el mismo cinco veces: **un chequeo con lista
de excepciones tiene que llegar de verdad a los casos de los que las excepciones
hablan.** El test nuevo trae su propio guardián de eso — una aserción que falla
si la h vuelve a salir de la clase, y que falla **mientras las aserciones sobre
la copia siguen verdes**, que es exactamente lo que pasó la primera vez.

Y una tercera vez, en chico: mientras escribía ese archivo edité **dos veces la
copia del regex que estaba en el comentario** creyendo que editaba el regex. El
comentario ya no lo cita.

### F1-03 · «This set is kept in your browser» se muestra antes de ser cierto — **Bajo**

En el resultado del análisis, debajo del CTA de registro, dice *"Este set queda
guardado en tu navegador, así no lo tenés que cargar de nuevo"*.

Medido en el navegador: después de un análisis exitoso **no hay nada guardado** —
`localStorage`, `sessionStorage`, cookies e IndexedDB de la app, los cuatro
vacíos — y al recargar la página el set no vuelve.

Pero la conclusión fácil sería falsa, y vale la precisión: **la persistencia
existe.** `lib/tools/stash.ts` escribe en `localStorage`, y
`energy-curve-tool.tsx` la llama desde `goToSignup` — o sea **al hacer clic en el
CTA**, no al terminar el análisis. Verificado disparando el handler del CTA en
aislamiento: `localStorage` pasa de cero claves a `energycurve:tool-stash` con
1.901 bytes.

Así que la frase es cierta para el flujo al que está pegada (analizar → clic →
registro → dashboard) y falsa para la lectura que su tiempo verbal invita
("cierro esto y vuelvo después"). Es un defecto de **tiempo verbal**, no de
feature.

**Y el arreglo es la copia, no el código.** Mover el guardado al final del
análisis escribiría la lista de temas de un DJ en `localStorage` sin que haya
pedido nada — el repertorio de un DJ es información profesional, y el
comportamiento actual es el más respetuoso de los dos. La frase tiene que
prometer en futuro.

### F1-04 · `upgrade-insecure-requests` en una CSP `Report-Only` — **Bajo. YA DECLARADO**

Cada carga de página emite en consola *"The Content Security Policy directive
'upgrade-insecure-requests' is ignored when delivered in a report-only policy"*.
Observado seis veces en una sola navegación a `/es/herramientas/curva-de-energia`.

**No es un hallazgo nuevo**, y eso es lo que corresponde decir:
`e2e/console-errors.spec.ts` ya lo tiene en su lista de ignorados **con el
razonamiento escrito** — es idéntico en las dieciséis páginas, no es un defecto
de página, y dejarlo sin ignorar haría fallar el barrido entero por una
cabecera. Por la regla de puntuación de esta auditoría, un hallazgo conocido y
declarado pesa menos que uno desconocido.

Lo que se agrega es que **sigue abierto y no tiene dueño**: el spec dice que
arreglar la cabecera *"le corresponde al cambio que sea dueño de la CSP"*, y ese
cambio no llegó. Cuesta una línea y tiene dos consecuencias — hoy es una
directiva inerte que ensucia la consola de todos los visitantes, y el día que la
política pase a enforcement va a empezar a hacer algo que nadie probó. Va junto a
**F4-01 / G-5**, que es el otro pendiente de la misma cabecera.

---

## 2. Lo que se verificó y está bien

Esto no es relleno: la fase pide confirmar que lo prometido existe y anda, y un
informe que sólo lista defectos no contesta eso.

### El flujo de valor central funciona sin cuenta

`/tools/energy-curve` → *"Try it with an example set"* → **score 4.1/10**, curva
dibujada con la forma de referencia detrás, el selector de tipo de set
(warm-up / peak / cierre), los tres conteos (1 salto de energía, 1 choque
armónico, 1 pico mal ubicado), el link a la rueda Camelot, y el bloque cerrado
que nombra qué da una cuenta. La promesa de la página —curva, score y conteo de
problemas gratis y sin registro— se cumple.

### 33 rutas pedidas, todas con el estado que corresponde

31 con 200 y 2 con 404. Los 404 incluyen el de `/es/...`, que es el que se olvida.
`/es/tools` da 404 **y está bien**: el slug en español es `/es/herramientas`, que
responde 200 — un 200 en los dos sería la página duplicada que la tabla de slugs
existe para evitar.

### Cuatro estados de error, provocados

| Entrada | Respuesta | Bien |
|---|---|---|
| Analizar con el campo vacío | *"Nothing to read. One track per line, 'Artist - Title'."* | `role="alert"`, así que un lector de pantalla lo recibe |
| Un solo tema | *"A curve needs at least two tracks."* | Conserva lo escrito: no hay que volver a pegar nada |
| Ruta inexistente, EN y ES | 404 propio | — |

El botón de analizar **no** se desactiva con el campo vacío, y está bien: un
botón desactivado no explica por qué, y el mensaje sí.

### El banner de consentimiento: la afirmación se sostiene en vivo

El proyecto de Privacy afirma que rechazar cuesta lo mismo que aceptar, y que el
banner no atrapa la página. Medido con `getComputedStyle` en el navegador:

| | Aceptar | Rechazar |
|---|---|---|
| `background-color` | `rgba(0,0,0,0)` | `rgba(0,0,0,0)` |
| `color` | `rgb(255,255,255)` | `rgb(255,255,255)` |
| `font-weight` | 500 | 500 |
| Altura | 38 px | 38 px |
| Ancho | 108 px | 99 px |

Los dos idénticos salvo el ancho, que es el largo del texto. `body` con
`overflow: visible` —sin bloqueo de scroll— y el banner ocupa **13%** del
viewport, bien debajo de la mitad. Las tres afirmaciones se cumplen.

### Paridad de copia EN/ES

Cero entradas con un solo idioma, sobre **1.516 entradas bilingües** en
`lib/content/`. Verificado que el escáner no es vacío: la misma familia de regex
encuentra las 1.516 con los dos lados.

---

## 3. Lo que esta fase no puede afirmar

- **Nada de lo que hay detrás de un login.** Todo lo de arriba es sin sesión. El
  dashboard, el import desde archivos reales, el reordenamiento, el export a
  Rekordbox/Traktor, las colaboraciones, el modo cabina y la facturación siguen
  sin recorrer.
- **Nada de fricción observada.** Un defecto no es fricción. La tarea de poner un
  DJ ajeno a hacer la tarea real sigue abierta y es la única de la fase que no
  depende de nadie más que de conseguir la persona.
- **El recorrido fue contra un servidor de desarrollo local**, con variables de
  entorno de relleno: sin Stripe, sin WorkOS real, sin PostHog. Lo que se
  ejercitó es exactamente lo que no depende de ellos.
- **Un error de consola conocido quedó sin arreglar a propósito** (F1-04), porque
  la decisión sobre esa cabecera ya tiene dueño declarado en otro documento.
