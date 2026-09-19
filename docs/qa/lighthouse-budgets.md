# Presupuestos de Lighthouse CI — SEO-E29

Qué vigila `lighthouserc.json`, de dónde sale cada número, y por qué uno de
ellos **no** es el objetivo que pide el plan.

Medido el 19/09/2026 contra el build de producción local (`npx next start`),
Lighthouse mobile con throttling simulado (4G lento, CPU ×4), dos corridas por
ruta después de calentar cada una.

---

## Lo que se midió

| Ruta | LCP (peor de 2) | CLS | TBT | Accesibilidad | SEO |
|---|---|---|---|---|---|
| `/` | 5,64 s | 0,000 | 23 ms | 100 | 100 |
| `/es` | 5,56 s | 0,000 | 26 ms | 100 | 100 |
| `/pricing` | 5,26 s | 0,000 | 18 ms | 100 | 100 |
| `/es/blog/antes-de-tocar-no-despues` | 4,97 s | 0,000 | 13 ms | 100 | 100 |

No hay con qué comparar: `docs/qa/performance-baseline-2026-09.md` mide latencia
de servidor en milisegundos, no Core Web Vitals. Ésta es la primera medición de
CWV del repo.

---

## Los presupuestos, y por qué

| Métrica | Umbral | Nivel | Margen contra lo medido |
|---|---|---|---|
| CLS | ≤ 0,1 | error | enorme: hoy es 0,000 en las cuatro |
| TBT | ≤ 200 ms | error | grande: el peor es 26 ms |
| Accesibilidad | = 100 | error | exacto: hoy es 100 |
| SEO | = 100 | error | exacto: hoy es 100 |
| LCP | ≤ 7000 ms | **error** | ~24% sobre el peor medido |
| LCP | ≤ 2500 ms | *objetivo del plan, no asertado* | **no se cumple hoy** |
| Performance | ≥ 90 | warn | hoy 79–91 |

**CLS, TBT, accesibilidad y SEO son los guardianes de verdad.** Los cuatro están
en el valor que pide el plan, se cumplen hoy, y cualquier regresión los rompe.
Accesibilidad y SEO en 100 exacto son los más filosos: no hay margen, así que
una sola violación nueva pone el CI en rojo.

---

## El LCP, que es el problema honesto

**El plan pide LCP ≤ 2,5 s y hoy estamos en 5,0–5,6 s.** No se asevera ese
umbral porque un gate que falla desde el primer commit no es un gate: deja `main`
en rojo y termina desactivado en un mes. Lo que se asevera es un techo de 7 s,
que atrapa una regresión real sin fallar por la varianza de un runner compartido.

### Por qué el LCP es alto, con evidencia

No es el servidor ni el peso de la página:

- `server-response-time`: **30 ms**
- First Contentful Paint: **1,2 s**
- Speed Index: **1,2 s**
- Time to Interactive: **5,6 s** — y el LCP cae prácticamente encima

La página **pinta rápido**. Lo que llega tarde es el elemento más grande, y la
causa está en `components/marketing/section-reveal.tsx`: las secciones arrancan
con `visible: false` en el servidor y se revelan después de hidratar, cuando un
`IntersectionObserver` las ve entrar. Lighthouse marca el LCP cuando el elemento
se vuelve visible, no cuando llega su HTML.

O sea: el contenido está en el HTML desde el primer byte — que es lo que importa
para un crawler, y por eso el SEO da 100 — pero para la métrica aparece cuando
React termina.

### Qué haría falta

Arreglarlo significa que la primera pantalla no dependa del revelado: renderizar
visible el bloque que contiene el LCP y dejar la animación para lo que está abajo
del pliegue. Es un cambio en la animación de la landing con riesgo visual real, no
entra en el lote 3, y merece su propia tarea con capturas antes y después.

**Mientras tanto el techo de 7 s protege de empeorar**, y esta tabla es contra qué
comparar el día que se toque.

---

## Cómo correrlo a mano

```bash
npm run build && npx @lhci/cli autorun
```

Contra un servidor que ya está levantado, sin que LHCI levante el suyo:

```bash
npx @lhci/cli collect --url=http://127.0.0.1:3011/ && npx @lhci/cli assert
```
