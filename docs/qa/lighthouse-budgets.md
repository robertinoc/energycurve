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
simulado (4G lento, CPU ×4), dos corridas por ruta después de calentar cada una.
Peor de las dos.

| Ruta | LCP | CLS | TBT | Perf | A11y | SEO |
|---|---|---|---|---|---|---|
| `/` | 5,72 s | 0,013 | 100 ms | 78 | 100 | 100 |
| `/es` | 5,57 s | 0,000 | 32 ms | 79 | 100 | 100 |
| `/pricing` | 5,15 s | 0,000 | 20 ms | 81 | 100 | 100 |
| `/es/blog/antes-de-tocar-no-despues` | 3,49 s | 0,000 | 36 ms | 91 | 100 | 100 |

TBT y CLS varían bastante entre corridas (TBT se vio entre 6 y 100 ms en la
misma ruta). Los dos siguen muy por debajo de su umbral; el rango está acá para
que nadie lea un movimiento de 40 ms como una regresión.

---

## El LCP: qué elemento es, con evidencia

**En `/`, `/es` y `/pricing` el elemento LCP es el párrafo del banner de
consentimiento**, no el contenido de la página:

```
selector: div.fixed > div.mx-auto > div.flex-1 > p.mt-1
texto:    "We use PostHog to see which parts of EnergyCurve get used, so we know…"
```

En el artículo el LCP sí es contenido — un párrafo del cuerpo — y por eso es la
única de las cuatro rutas que anda por 3,5 s en vez de 5,5 s.

### La medición que lo aísla

Con `PerformanceObserver` y el mismo throttling en las dos corridas, sobre `/`
en mobile:

| Escenario | LCP | Tamaño del elemento |
|---|---|---|
| Primera visita, el banner aparece | **2856 ms** | 43 206 px² (el párrafo del banner) |
| Consentimiento ya respondido, sin banner | **1104 ms** | 17 856 px² (contenido de la página) |

**El banner cuesta 1,75 segundos de LCP.** Sin él la página cumple el objetivo
de 2,5 s con holgura. (Estos números son de `PerformanceObserver` con throttling
real, no de la simulación de Lighthouse — por eso 2,9 s y no 5,7 s. Lo que vale
es el contraste entre las dos filas, medidas igual.)

### Por qué el banner llega tarde, y por qué eso es correcto

`components/privacy/consent-banner.tsx` no se renderiza en el servidor, a
propósito y con la razón escrita en el archivo: la respuesta vive en
`localStorage`, así que un render de servidor mostraría el banner a quien ya
respondió. Eso se arregló una vez y el comentario lo documenta.

O sea: el banner **sólo puede existir después de hidratar**, y es el elemento de
texto más grande de la primera pantalla en mobile. Las dos cosas son decisiones
razonables por separado y juntas producen este LCP.

---

## Qué se hizo en SEO-E32, y qué no movió

Se cambió `SectionReveal` para que acepte `eager` y se aplicó al hero: la
primera pantalla ahora se renderiza visible desde el servidor en vez de
revelarse con un `IntersectionObserver`.

**Eso no movió el LCP** (5,65 → 5,72 s en `/`; 5,56 → 5,57 s en `/es`), y no
podía moverlo: el elemento medido es el banner.

**Se hizo igual, y se deja, porque arregla un problema real que no es esta
métrica.** Antes, todo el contenido de la primera pantalla vivía dentro de un
`opacity: 0` hasta que React atachaba. Con JavaScript deshabilitado — o en la
ventana de varios segundos antes de hidratar en un teléfono lento — la página
llegaba completa y se veía vacía. Verificado con una captura a JS apagado: el
hero ahora se ve entero.

La animación de las secciones de abajo del pliegue no cambió, y las capturas
antes/después de `/`, `/es` y `/pricing` en mobile y desktop son visualmente
idénticas (`/pricing` byte a byte; en `/` y `/es` difieren sólo por la animación
ambiental del fondo, que corre siempre).

---

## Los presupuestos, y por qué

| Métrica | Umbral | Nivel | Margen contra lo medido |
|---|---|---|---|
| CLS | ≤ 0,1 | error | grande: el peor es 0,013 |
| TBT | ≤ 200 ms | error | grande: el peor es 100 ms |
| Accesibilidad | = 100 | error | exacto: hoy es 100 |
| SEO | = 100 | error | exacto: hoy es 100 |
| LCP | ≤ 7000 ms | **error** | ~22% sobre el peor medido |
| LCP | ≤ 2500 ms | *objetivo del plan, no asertado* | **no se cumple** |
| Performance | ≥ 90 | warn | hoy 78–91 |

**El umbral de LCP sigue en 7000 ms y no se bajó**, porque el objetivo no se
cumple. Un techo que falla desde el primer commit deja `main` en rojo y termina
desactivado; eso es lo que el lote 3 evitó a propósito y sigue valiendo.

---

## Qué falta para llegar a 2,5 s

Una sola cosa, y es una decisión de producto, no de código:

**Acortar el párrafo del banner de consentimiento.** Hoy tiene ~47 palabras y
mide 43 206 px². El elemento que ganaría el LCP si el banner dejara de ser el
más grande mide 17 856 px², así que el párrafo tiene que bajar de ahí — algo más
de la mitad. Según la medición de arriba, eso llevaría el LCP de 2,9 s a 1,1 s
en esa escala, o sea de ~5,6 s a ~2 s en la de Lighthouse.

**No se hizo en este lote porque el texto es una declaración de privacidad
deliberada**, no relleno: dice que nunca se graba la pantalla, nunca se guarda
la IP y nunca se ve la música. Acortarlo es defendible — el link a la política
de cookies ya está ahí, y nadie lee siete líneas en un banner — pero es de
Robertino, no de una tarea de performance.

Lo que **no** hay que hacer: mover el banner fuera del viewport, pintarlo con
`opacity` baja, o retrasarlo con `requestIdleCallback` para que Lighthouse no lo
cuente. Todo eso mejora el número sin mejorar nada de lo que el número mide.

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
