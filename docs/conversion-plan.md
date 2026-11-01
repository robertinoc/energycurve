# Plan de conversión Free → PRO

**Este archivo es la fuente de verdad del plan.** Sobre EnergyCurve trabajan dos
cuentas de Claude distintas (robertino.calcaterra@migbirds.com y
robertinoc@gmail.com) y ninguna puede editar los artifacts de la otra; el repo
es lo único que las dos ven. Cada paso que se hace actualiza la tabla de abajo
**en el mismo commit** que hace el trabajo, así el estado nunca queda atrás del
código.

Decidido por Robertino el 01/11/2026.

## 1. El embudo, medido al 01/11/2026

Los números salen del backstage (pestaña Users) ese día:

- **188** registrados.
- **121** crearon algo; **67** nunca usaron nada.
- **48** corrieron al menos un análisis.
- **1** paga.

**Una ambigüedad anotada, y lo que dice el código.** En el panel, el 48 aparece
debajo de la tarjeta «nuevos en 30 días», así que leído en pantalla no queda
claro si es sobre los 188 o sobre los 99 nuevos. El código lo cuenta sobre todos
los perfiles: `usersWithAnalyses` filtra la lista entera de usuarios
(`lib/backstage/users.ts`, en `computeUserKpis`), y la línea dice «of all users».
Según el código, entonces, son 48 de 188. Igual queda como paso de Robertino
(0.2) confirmarlo contra lo que ve, porque el panel lo presenta en un lugar que
invita a leerlo de la otra manera.

## 2. Diagnóstico

**El plan gratis hace el trabajo completo de un DJ.** Import, análisis, curva,
puntaje, reordenamiento heurístico y export nativo a Rekordbox, Traktor y M3U8
están todos en FREE, y `docs/plan-gating.md` lo dice con esas palabras: la
escalera pone en FREE «Import, analysis, curve, score», «Heuristic reordering» y
el export nativo, este último gratis para siempre. No es que la gente no quiera
pagar: no hay qué comprar. Lo que PRO agrega hoy (planificación por slot, formas
de curva con nombre, set sheet en PDF, historial de órdenes, planificado contra
tocado, BPM real del audio) mejora el trabajo, pero no hace uno que el plan
gratis no haga.

**No hay atribución.** El backstage no puede decir de dónde viene cada usuario
ni qué usó cada uno de las herramientas gratis, porque en producción faltan
`POSTHOG_PERSONAL_API_KEY` y `POSTHOG_PROJECT_ID`. Sin esas dos variables, las
columnas que leen de PostHog quedan vacías y el panel lo avisa.

**Los que nunca usaron y los dormidos son dos problemas distintos.** El panel
muestra 113 «dormidos», pero ojo con cómo se cuenta: en el código, `dormant`
suma a los inactivos **y** a los que nunca usaron nada (`lib/backstage/users.ts`).
Los 113 incluyen a los 67. Separados, si los dos números son de la misma foto:

- **67 nunca usaron nada.** Se registraron y no crearon ni un set. Es un problema
  de activación: no llegaron a ver lo que el producto hace.
- **46 usaron y dejaron** (113 − 67). Vieron el producto y no volvieron. Es un
  problema de valor: lo que vieron no les alcanzó para volver, o lo resolvieron
  una vez y no necesitaron más.

A unos se los arregla mostrando el producto antes; a los otros, dándoles algo
que no tengan en el plan gratis.

## 3. Las cinco fases

**Fase 0 — Ver.** Antes de cambiar nada, poder medirlo: las variables de
PostHog en producción, la duda del 48 resuelta, y el embudo de activación
instrumentado (registro → primer set → primer análisis → vuelta). Sin esta fase,
cualquier cambio de las siguientes se juzga a ojo.

**Fase 1 — Activación.** Que los que se registran lleguen a ver el producto
funcionando antes de tener que traer su propia lista. El primer paso es un set de
ejemplo precargado, para que el dashboard vacío no sea lo primero que ven.

**Fase 2 — Una razón para pagar.** Funciones con valor real para un DJ que
trabaja, que nacen en PRO desde el primer día. Las dos primeras eran los CUE
sugeridos y partir una lista larga en varios sets; los CUE quedaron frenados
el 01/11 (ver la sección 5). **No se le saca nada al plan
gratis**: el export nativo sigue en FREE y las 3 playlists siguen siendo 3.
Quitar algo que ya se dio quema confianza y no es parte de esta decisión.

**Fase 3 — Muros de venta en la app.** Que un usuario FREE vea las funciones de
PRO en el momento en que las necesita, en vez de no enterarse de que existen. Un
muro de venta, no una ausencia: la función se muestra, se explica y dice que es
de PRO.

**Fase 4 — Web y social.** Llevar lo nuevo de PRO a la web y a las redes, y
volver a hablarles a los que ya probaron el producto, empezando por los 48 que
corrieron un análisis.

## 4. Estado por paso

Se actualiza en el mismo commit que hace cada trabajo. «Hecho» quiere decir
mergeado en el código, no verificado en producción; si algo además se verificó
en producción, se dice al lado.

| # | Paso | Quién | Estado |
|---|---|---|---|
| 0.1 | Cargar las dos variables de PostHog en producción | Robertino | Pendiente |
| 0.2 | Confirmar si el 48 es sobre 188 o sobre 99 | Robertino | Pendiente. El código dice 188 (ver la sección 1); falta que Robertino lo confirme contra el panel |
| 0.3 | Instrumentar el embudo de activación | Claude Code | Pendiente |
| 2.1 | CUE sugeridos en PRO | Claude Code | **Frenado (01/11)**, por la decisión de la sección 5. La fila pública y el registro `cue_points` se sacaron: `/pricing` ya no los promete. El tier sigue decidido (PRO) y está anotado en la sección 5. Se retoma cuando se cumpla el prerrequisito de esa sección |
| 2.2 | Gating de varios sets a PRO | Claude Code | Hecho en el código (01/11): fila pública con «no» en FREE y «yes» en PRO y PRO+, registro `multi_set_split` con `minPlan: "pro"` y `status: "shipped"`. El servidor rechaza la división de una cuenta FREE antes de crear nada (`importAsSplitSets`), y el formulario le muestra la división como muro de venta: cuánto suena la lista, en cuántos sets se partiría, qué hace cada criterio, la insignia PRO y el enlace a los planes. La lista se sigue importando entera como un solo set |
| 1.1 | Set de ejemplo precargado | Claude Code | Pendiente |
| 3.1 | Los tres muros de venta en la app | Claude Code | Pendiente |
| 4.1 | Mail a los 48 que corrieron un análisis | Robertino | Pendiente |

## 5. Los CUE sugeridos: frenados, con el tier decidido

**Decidido por Robertino el 01/11/2026:** la promesa pública de los CUE se saca
porque la Fase A (PR #292) desaconsejó construirlos sobre la detección de beat
actual. Una promesa en la página de precios que no se puede cumplir es lo
contrario de lo que este plan necesita. **Cuando salgan, los CUE sugeridos van en
PRO**: el tier no cambia, sólo deja de estar publicado.

Qué se sacó: la fila `cue_points` de `/pricing` («soon» en PRO y PRO+) y la
entrada `cue_points` de `lib/product/capabilities.ts`. Las dos van juntas porque
`tests/capabilities.test.ts` no permite una entrada del registro sin su fila
pública. `tests/cue-points-not-promised.test.ts` falla si la promesa vuelve
sin que se haya decidido.

