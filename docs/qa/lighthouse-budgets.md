# Presupuestos de Lighthouse CI — SEO-E29 y SEO-E32

Qué vigila `lighthouserc.json`, de dónde sale cada número, y por qué el umbral
de LCP **no** es el objetivo que pide el plan.

> **Corrección del 19/09/2026.** La versión anterior de este documento culpaba
> del LCP a `components/marketing/section-reveal.tsx`. **Ese diagnóstico era
> incorrecto.** La causa real es el banner de consentimiento. Abajo está la
> evidencia; el error original está explicado al final para que no se repita.

---

## Lo medido

Build de producción local (`npx next start`), Lighthouse mobile con throttling
simulado (4G lento, CPU ×4), **mediana de 3 corridas** por ruta
(`npx @lhci/cli collect`, la configuración de `lighthouserc.json`).

Las dos columnas son antes y después de acortar el párrafo del banner
(SEO-E32, 19/09/2026). Las dos se midieron hoy con el mismo comando sobre el
mismo build; ninguna viene del historial.

| Ruta | LCP antes | LCP después | Elemento LCP después |
|---|---|---|---|
| `/` | 5,57 s | 5,64 s | el párrafo del banner, **todavía** |
| `/es` | 5,49 s | 5,56 s | el párrafo del banner, **todavía** |
| `/pricing` | 5,12 s | **3,62 s** | `header > p.mt-4` — contenido de la página |
| `/es/blog/antes-de-tocar-no-despues` | 3,46 s | 3,48 s | un párrafo del cuerpo (no cambió) |

Una sola ruta mejoró. `/` y `/es` se movieron ±0,07 s, que es ruido entre
corridas y no un cambio.

CLS quedó en 0,000 en las cuatro rutas antes y después. TBT varía bastante
entre corridas (9–48 ms hoy); sigue muy por debajo de su umbral, y el rango
está acá para que nadie lea un movimiento de 40 ms como una regresión.
Performance: `/` y `/es` 0,79; `/pricing` subió 0,81 → 0,90; el artículo 0,91.

---

## El LCP: qué elemento es, con evidencia

**En `/` y `/es` el elemento LCP sigue siendo el párrafo del banner de
consentimiento**, incluso después de acortarlo. En `/pricing` dejó de serlo, y
por eso esa ruta bajó 1,5 s.

El dato sale del campo del propio reporte, no de una inferencia:

```
/          selector: div.fixed > div.mx-auto > div.flex-1 > p.mt-1
           texto:    "We use PostHog to see which parts of the app get used. It ne…"
/pricing   selector: main.relative > div.relative > header.max-w-3xl > p.mt-4
           texto:    "EnergyCurve is free to use, and the free tier stays free. PR…"
```

### El techo: qué elemento gana cuando el banner no está

Con `PerformanceObserver` y throttling real (4G lento, CPU ×4, 412×823),
sembrando `localStorage` con `ec.analytics-consent.v1 = "granted"` para que el
banner no monte:

| Ruta | LCP sin banner | Elemento que gana | Su tamaño |
|---|---|---|---|
| `/` | **1168 ms** | una `<img>` | **17 856 px²** |
| `/es` | **1112 ms** | una `<img>` | **17 856 px²** |
| `/pricing` | 984 ms | `header > p.mt-4` | 38 372 px² |
| `/es/blog/antes-de-tocar…` | 956 ms | un párrafo del cuerpo | 43 344 px² |

Eso explica por qué el mismo párrafo, con el mismo tamaño, gana en unas rutas y
no en otras: **el rival más chico es el de `/` y `/es`, y mide 17 856 px².** Ése
es el techo real, y es el número que hay que bajar.

### Qué mide el párrafo, exactamente

Medido con `getBoundingClientRect` sobre el banner real en 412×823:

| | ancho | line-height | líneas | caracteres | tamaño que reporta el LCP |
|---|---|---|---|---|---|
| antes (en) | 380 px | 24 px | 5 | 250 | 43 206 px² |
| antes (es) | 380 px | 24 px | 4 | 238 | 33 480 px² |
| **después (en)** | 380 px | 24 px | **3** | **134** | **25 080 px²** |
| **después (es)** | 380 px | 24 px | **3** | **131** | **24 486 px²** |

(El tamaño que reporta el LCP para texto es la suma del ancho de cada línea por
el `line-height`, no la caja entera: la última línea va a media asta. Por eso
25 080 y no los 27 360 px² de la caja de 380×72.)

---

## Qué se hizo en SEO-E32, en dos lotes

### Lote 4 — `SectionReveal` en modo `eager`

Se cambió `SectionReveal` para que acepte `eager` y se aplicó al hero: la
primera pantalla se renderiza visible desde el servidor en vez de revelarse con
un `IntersectionObserver`.

**Eso no movió el LCP, y no podía moverlo**: el elemento medido es el banner.

**Se hizo igual, y se deja, porque arregla un problema real que no es esta
métrica.** Antes, todo el contenido de la primera pantalla vivía dentro de un
`opacity: 0` hasta que React atachaba. Con JavaScript deshabilitado — o en la
ventana de varios segundos antes de hidratar en un teléfono lento — la página
llegaba completa y se veía vacía. Verificado con una captura a JS apagado.

### Lote 5 — el párrafo del banner, acortado

Texto aprobado por Robertino el 19/09/2026, en `lib/content/site-copy.ts`
(`consent.body`). Pasó de 250 a 134 caracteres en inglés y de 238 a 131 en
español, conservando las tres promesas — pantalla, IP, música — y que decir que
no no rompe nada. El link a la política de cookies no se tocó.

**Resultado: el párrafo bajó de 43 206 a 25 080 px², pero el objetivo no se
cumplió.** Sigue ganando el LCP en `/` y `/es`. Ganó `/pricing`, donde el rival
es más grande: −1,5 s.

Lo que **no** se hizo, y no hay que hacer: mover el banner fuera del viewport,
pintarlo con `opacity` baja, o retrasarlo con `requestIdleCallback` para que
Lighthouse no lo cuente. Todo eso mejora el número sin mejorar nada de lo que el
número mide.

El banner sigue sin renderizarse en el servidor, y eso es correcto:
`components/privacy/consent-banner.tsx` lo explica en el archivo — la respuesta
vive en `localStorage`, así que un render de servidor se lo mostraría a quien ya
respondió. Ese bug ya se arregló una vez.

---

## Los presupuestos, y por qué

| Métrica | Umbral | Nivel | Margen contra lo medido |
|---|---|---|---|
| CLS | ≤ 0,1 | error | grande: el peor es 0,013 |
| TBT | ≤ 200 ms | error | grande: el peor es 100 ms |
| Accesibilidad | = 100 | error | exacto: hoy es 100 |
| SEO | = 100 | error | exacto: hoy es 100 |
| LCP | ≤ 7000 ms | **error** | ~24% sobre el peor medido (5,64 s) |
| LCP | ≤ 2500 ms | *objetivo del plan, no asertado* | **no se cumple** |
| Performance | ≥ 90 | warn | hoy 0,79–0,91 |

**El umbral de LCP sigue en 7000 ms y no se bajó en el lote 5 tampoco**, porque
el objetivo no se cumple: dos de las cuatro rutas siguen en 5,6 s. Un techo que
falla desde el primer commit deja `main` en rojo y termina desactivado; eso es
lo que el lote 3 evitó a propósito y sigue valiendo.

Bajarlo a 2500 era condicional a que las cuatro rutas cumplieran. Cumplieron
dos. Un techo que no se cumple es peor que uno alto y honesto.

---

## Qué falta para llegar a 2,5 s

El lote 5 acortó el párrafo y no alcanzó. Esto es por qué, con la aritmética a
la vista, para que la próxima decisión se tome sabiendo cuánto cuesta.

### El párrafo tendría que entrar en menos de dos líneas

El tamaño que el LCP le asigna a un bloque de texto es **la suma del ancho de
cada línea por el `line-height`**. Con las medidas reales del banner — líneas de
380 px, `line-height` 24 px:

| | ancho total de texto | tamaño LCP |
|---|---|---|
| 1 línea llena | 380 px | 9 120 px² |
| 2 líneas llenas | 760 px | **18 240 px²** |
| 3 líneas (hoy) | ~1 045 px | 25 080 px² |
| el techo a batir | **744 px** | **17 856 px²** |

**Dos líneas llenas ya se pasan.** El techo de 17 856 px² cae *por debajo* de lo
que ocupan dos líneas completas, así que el párrafo tiene que entrar en unos
744 px de texto: a los 7,8 px por carácter medidos, **unos 95 caracteres**.

El texto aprobado tiene 131 en español y 134 en inglés. Faltan ~36 caracteres,
un 27% más corto que lo que ya se acortó.

Ojo con una salida falsa: **achicar la caja no sirve.** El tamaño depende del
ancho total del texto, no del ancho del contenedor — una caja más angosta da más
líneas, no menos píxeles. Los únicos dos parámetros que mueven el número son la
cantidad de caracteres y el `line-height`.

### La otra vía, que no toca el texto

El párrafo pesa 25 080 px² **y aparece tarde**: el banner sólo puede montar
después de hidratar, o sea a los ~2,8 s en la escala de `PerformanceObserver`.
De los dos problemas, el que domina el LCP es el segundo — bajar el tamaño sin
bajar el momento deja el número donde está, que es exactamente lo que pasó en
`/` y `/es`.

Si el banner se pintara en el primer paint en vez de después de hidratar, sería
el elemento LCP **a ~1,2 s**, y el objetivo se cumpliría sin borrar una sola
palabra. El patrón conocido es el mismo del "no-flash" de tema oscuro: un script
inline chico en el `<head>` que lee `localStorage` antes del primer paint y
marca el `<html>`, más una regla CSS que esconde el banner para quien ya
respondió. Así el banner puede renderizarse en el servidor sin volver a
mostrárselo a quien ya contestó, que es el bug que el comentario de
`consent-banner.tsx` documenta.

**Es una hipótesis, no una promesa: habría que medirla.** Y tiene su costo — un
script bloqueante, chico pero bloqueante, y bytes de banner para todo el mundo.
No se hizo en este lote porque no estaba pedido.

### Lo tentador que no hay que hacer

Partir el párrafo en dos `<p>`. El LCP mide por elemento, así que dos mitades de
12 500 px² pasarían el techo y el número bajaría solo. **El visitante vería
exactamente lo mismo.** Es la definición de mejorar la métrica sin mejorar nada
de lo que la métrica mide, igual que esconderlo con `opacity` o retrasarlo con
`requestIdleCallback`.

---

## El error que hay que no repetir

La versión anterior de este documento decía que el LCP lo causaba
`SectionReveal`, a partir de dos observaciones correctas — FCP 1,2 s, TTI 5,6 s,
y el hero efectivamente oculto hasta hidratar — y una inferencia que nadie
comprobó: que el elemento medido era el hero.

La comprobación costaba un campo del reporte,
`largest-contentful-paint-element`, y decía otra cosa. La prueba más barata de
todas estaba a mano y tampoco se hizo: **`/pricing` no usa `SectionReveal` en
absoluto y tenía exactamente el mismo LCP**. Eso solo descartaba la hipótesis.

---

## Cómo correrlo a mano

```bash
npm run build && npx @lhci/cli autorun
```

Para ver **qué elemento** es el LCP, que es la pregunta que importa antes de
tocar nada:

```bash
npx lighthouse http://127.0.0.1:3011/ --output=json --output-path=/tmp/lh.json --quiet
node -e "const a=require('/tmp/lh.json').audits['largest-contentful-paint-element'];console.dir(a.details.items,{depth:9})"
```

Y para ver **cuánto mide** ese elemento, que es lo que decide si gana o no, hace
falta `PerformanceObserver` — el reporte de Lighthouse nombra el elemento pero
no imprime su tamaño:

```js
new PerformanceObserver((l) => {
  const e = l.getEntries().at(-1)
  console.log(e.size, e.element)
}).observe({ type: "largest-contentful-paint", buffered: true })
```

Para medir el techo — qué elemento ganaría si el banner no estuviera — sembrá
`localStorage.setItem("ec.analytics-consent.v1", "granted")` antes de navegar.
Es el string pelado, no un JSON: `lib/privacy/consent.ts` guarda el estado tal
cual.
