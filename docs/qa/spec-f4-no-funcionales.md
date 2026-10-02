# ⚙️ Spec de Fase — F4 · Pruebas No-Funcionales

**Proyecto:** EnergyCurve: 1. Plan Integral de Pruebas. Escrito el 02/10/2026
(lote 16) desde la evidencia que ya existe, con la misma estructura que los
specs de fase de Asana. La tarea de Asana de esta fase decía «HECHO — spec en
`docs/qa/test-strategy.md`»; ese documento es la estrategia de pruebas entera y
nombra F4 en dos líneas de su tabla de herramientas, así que el spec no existía.

> **Implementado** y **verificado** son dos columnas distintas a propósito. Este
> proyecto ya dio por hecho más de una vez algo que estaba escrito y no corría
> (A2.4: el cron de retención, dos meses con 503) o que corría y no se había
> mirado (H-12: los análisis, 76 días sin guardarse). «Implementado» dice que el
> instrumento existe; «verificado» dice que se corrió y qué devolvió, con fecha.

---

🎯 **OBJETIVO**
Saber cómo se comporta el producto bajo carga, a volumen, para alguien que no
usa el mouse y en una conexión mala — con un número contra un objetivo, no con un
gráfico.

📦 **ALCANCE**
Rendimiento por página, carga al pico objetivo, escalabilidad de la ingesta y
puntos de quiebre a volumen, accesibilidad WCAG 2.1 AA, presupuestos de
Lighthouse, memoria, payload. **Fuera:** la seguridad (proyecto 2) y la precisión
del motor (F5).

**El pico objetivo**, definido por Robertino el 20/09: 50 usuarios simultáneos,
30 análisis por hora, 2 s de latencia máxima en el dashboard.

✅ **CRITERIOS DE ACEPTACIÓN**
1. Hay un número contra cada uno de los tres valores del pico, con las
   condiciones en que se midió, y dice si se cumple.
2. Cada punto de quiebre conocido tiene el volumen a partir del cual se degrada
   y, si es silencioso, a partir del cual el usuario recibe datos incompletos.
3. El barrido automático de accesibilidad está en 100 en las páginas públicas,
   en los dos idiomas, y corre en CI.
4. Hay un presupuesto de rendimiento que corre en CI y frena un PR.
5. Lo que no se puede medir desde el repo está nombrado, con quién lo mide.

---

## Estado por ítem

| Ítem | Implementado | Verificado | Evidencia |
|---|---|---|---|
| Rendimiento de páginas públicas | ✅ | ✅ 11/09, local y producción (muestra de 10) | `docs/qa/performance-baseline-2026-09.md` |
| `/api/health` en producción | ✅ | ✅ 11/09 — hasta 3,57 s, probable arranque en frío | ídem. El timeout del monitor de uptime **sin confirmar** (Robertino) |
| Datos a escala para medir | ✅ `scripts/seed-scale.mjs` | ✅ 02/10 — determinístico (misma huella tras limpiar y re-sembrar) y reversible (dev vuelve a 9/1/12/1/0) | `docs/qa/carga-2026-10.md` |
| **Carga al pico objetivo** | ✅ arnés de carga y medición | ✅ 02/10, un proceso local contra dev. **No se cumple**: dashboard p95 1,8 s con 1 usuario, 13,3 s con 10, 56 s con 50. Análisis 3,7 s aun solo. Cuello: CPU del render (94–99 % de un núcleo con 10); la base aguanta 208 req/s a 50 concurrentes | `docs/qa/carga-2026-10.md` |
| Carga contra el despliegue real (Vercel) | ❌ | ❌ | Contra producción sólo hay lecturas pasivas. Necesita una ventana acordada con Robertino |
| **Puntos de quiebre con número** | ✅ `tests/perf/scale.perf.ts` | ✅ 02/10 — `in()` falla a ~400 ids; export en 0 temas desde ~400 playlists y cortado en 50.000; `listPlaylists` mal desde 1.000 temas; reordenar 1.000 en ~22 s | `docs/qa/carga-2026-10.md`, `docs/qa/breaking-points-2026-09.md` |
| Arreglo de los puntos de quiebre | Parcial (cuatro del 25/09) | Medido: aguantan menos de lo que decían | El arreglo de lo nuevo es otro PR |
| Accesibilidad WCAG 2.1 AA, barrido | ✅ `e2e/accessibility.spec.ts` | ✅ en cada PR, cuatro navegadores | CI |
| Accesibilidad, comportamiento que axe no ve | ✅ parcial — teclado, un h1, FAQ en HTML, Escape del tooltip (H-19) | ✅ en CI | El lector de pantalla sigue manual (banco: SEO2.4, SEO3.2, SEO5.7, TOOL.7, TOOL2.7 y L16.3, que reemplazó a CONT.3) |
| Presupuestos de Lighthouse | ✅ `lighthouserc.json` | ✅ en CI. TBT subido una vez, 200 → 350 ms, con los números del runner (PR #271) | `docs/qa/lighthouse-budgets.md` |
| LCP ≤ 2,5 s | ❌ objetivo, no asertado | ✅ medido: `/` 4,8 s mobile con el banner (02/10, SEO4.3) | Decisión de copy de Robertino (SEO5.3) |
| Memoria | ✅ | ⚠️ 11/09 — 43 MB tras ~700 requests, sin crecimiento. No es una sesión larga | Un perfilado de horas sigue pendiente |
| Payload | ✅ | ✅ 11/09 — landing 143 KB de HTML | `docs/qa/performance-baseline-2026-09.md` |

---

🔍 **PROMPT DE VERIFICACIÓN** (¿se hizo lo pedido, bien hecho?)
«Abrí `docs/qa/carga-2026-10.md` y confirmá que cada uno de los tres valores del
pico tiene un número, la condición en que se midió y un sí o un no. Corré
`npx vitest run --config vitest.perf.config.ts` contra dev después de sembrar los
cinco niveles y confirmá que los resultados coinciden con la tabla. Confirmá que
el barrido de accesibilidad y Lighthouse corren en el último PR.»

🧪 **PROMPT DE VALIDACIÓN** (¿cumple el objetivo real, con evidencia?)
«Con los números de arriba, ¿aguanta el producto 50 DJs a la vez un viernes a la
noche? Si la respuesta depende de cómo escala Vercel, decí qué medición la
contestaría y qué costaría hacerla. Y para cada punto de quiebre silencioso,
¿hay hoy un usuario real cerca del volumen en que se rompe?»

---

## Lo que esta fase no puede cerrar desde el repo

- **La carga contra producción.** Es lo único que contesta si Vercel absorbe lo
  que un proceso local no.
- **El timeout del monitor de uptime**, que se ve en la consola del monitor.
- **El lector de pantalla**, que es manual.
- **Una sesión larga** para la memoria.
