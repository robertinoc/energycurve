# ⚙️ Spec de Fase — F1 · Auditoría de Producto y UX

**Proyecto:** EnergyCurve: 4. Auditoria360. Escrito el 02/10/2026 (lote 16)
desde la evidencia que ya existe — el recorrido funcional, los hallazgos A1–A6
de `docs/qa/auditoria-f1-autenticada-2026-09-26.md` y los H-1 a H-19 de la
tanda 01 (`docs/qa/output-test-tanda-01.md`) —, no desde una plantilla. Misma
estructura que los otros specs de fase del proyecto (F2 a F7).

> **Implementado** y **verificado** son dos columnas distintas a propósito: un
> arreglo mergeado no está verificado hasta que alguien lo corre contra el
> deploy. El banco de pruebas tiene un estado para eso, «Validar fix», desde el
> 20/09.

---

🎯 **OBJETIVO**
Saber si el producto hace lo que la página de precios promete, para alguien que
lo usa por primera vez, y dónde se traba.

📦 **ALCANCE**
Recorrido funcional autenticado por plan, compuertas de plan contra el registro
de capabilities, estados vacíos y de error, la fricción de un usuario nuevo, y
la consistencia del copy entre lo que la app dice y lo que hace. **Fuera:** la
arquitectura (F2), el código (F3), seguridad y privacidad (F4).

✅ **CRITERIOS DE ACEPTACIÓN**
1. Cada capability `shipped` del registro tiene un veredicto: anda, anda a
   medias, o no está.
2. Cada hallazgo tiene severidad, dónde vive en el código y un estado que separa
   arreglado de verificado.
3. Lo que quedó sin confirmar está nombrado, con lo que hace falta para
   confirmarlo.
4. La fricción del recorrido de un usuario nuevo está medida con una persona, en
   minutos y en dudas.

---

## Hallazgos de la auditoría autenticada (26/09)

| | Qué | Severidad | Implementado | Verificado |
|---|---|---|---|---|
| A1 | La cuenta PRO+ de prueba estaba en `free` | Alta (para las pruebas) | ✅ corregido en el dato | ✅ 30/09 — `pro_plus` / `active`, leído en `profiles` (la fila E2E.1c del banco se retiró el 02/10) |
| A2 | El banner de consentimiento tapaba clics abajo | Media | ✅ `54517d4` | ⚠️ 01/10 en `/` a 390 px, sí (AUD.1). **`/dashboard/playlists` sin verificar** — necesita sesión |
| A3 | «Ready to import» de archivos que no se pueden importar | Media | ✅ `95db80a` | ❌ AUD.2 pendiente — necesita tus archivos |
| A4 | Ordenamiento con IA ofrecido con la cuota gastada | Media-baja | ✅ `7066c64` | ❌ AUD.3 pendiente |
| A5 | Las cuatro compuertas hacen lo que dice el registro | Sin hallazgo | — | ✅ 26/09 |
| A6 | El tope de 3 playlists de FREE | Sin hallazgo | — | ⚠️ ver abajo |

### Los dos que quedaron «sin confirmar»

1. **A6 — qué pasa con la cuarta importación en FREE.** Tres importaciones
   entran y en el tope la página dice algo. No se determinó si la cuarta se
   rechaza con un mensaje útil o falla de otra forma. **Para confirmarlo:** la
   cuenta FREE con 3 playlists, intentar una cuarta, leer qué dice. Es AUD.4 en el
   banco. Severidad si falla sin explicar: media.
2. **A4 — qué muestra la interfaz después del 402.** El arreglo agregó una frase
   propia para el rechazo del servidor, pero nadie vio el clic que lo provoca con
   la interfaz delante. **Para confirmarlo:** la cuenta FREE, usar el ordenamiento
   del mes, abrir otro análisis desde una pestaña vieja y apretar. Es AUD.3.

(El tercero que la auditoría marcó sin confirmar, el `.txt` de A3, quedó
explicado en el lote 10: el mensaje existía y la auditoría no lo había buscado
con las palabras correctas.)

## Hallazgos de la tanda 01 (12/09 al 02/10)

| | Qué | Implementado | Verificado |
|---|---|---|---|
| H-3 | El logout no cerraba sesión | ✅ #222 | ✅ 12/09, en producción |
| H-4 | «Your payment went through» con $0 | ✅ #247 | ✅ 30/09, en producción (A1.2) |
| H-8 | Archivo exportado terminaba en `.app.csv` | ✅ #248 | ❌ J.3 pendiente |
| H-10 | Saldo agotado de Anthropic informado como request mal formado | ✅ #246 | ❌ J.4 pendiente |
| H-13 | El artículo no emitía `keywords` | ✅ #267 | ✅ por test |
| H-17 | La promesa de la IP se apoyaba en una opción muerta | ✅ mitad de código, lote 16 | ✅ request real (`e2e/posthog-payload.spec.ts`). El ajuste de PostHog y la frase: Robertino |
| H-18 | Enlaces de glosario duplicados | ✅ lote 16 | ✅ test sobre los 23 artículos |
| H-19 | Tooltip sin Escape | ✅ lote 16 | ✅ E2E en los dos idiomas |
| H-15 | Una cita de Lexicon ya no literal (eran tres según la tanda; dos seguían literales) | ✅ lote 16 | ✅ releído el 02/10 |
| H-1, H-2, H-6, H-7, H-14, H-16 | Decisiones de producto o de contenido | — | Esperan a Robertino |
| H-5 | El nombre de Google | ❌ re-diagnosticar | — |
| H-9 | Sin crédito en Anthropic | — | Robertino |

---

🔍 **PROMPT DE VERIFICACIÓN** (¿se hizo lo pedido, bien hecho?)
«Recorré las 28 capabilities `shipped` del registro (`lib/product/capabilities.ts`)
y confirmá que cada una tiene un veredicto con evidencia. Confirmá que cada
hallazgo de A1–A6 y H-1–H-19 tiene implementado y verificado por separado, y que
los dos sin confirmar tienen el paso que los confirma.»

🧪 **PROMPT DE VALIDACIÓN** (¿cumple el objetivo real, con evidencia?)
«Sentá a alguien que nunca usó EnergyCurve frente a una cuenta vacía, cronometrá
desde el signup hasta su primera curva y anotá cada duda con la frase exacta que
la provocó. Contrastá con el dato de producción: 61 registrados al 20/09, la
mayoría con 0 o 1 playlist y última visita igual al alta. Si la fricción explica
eso, es el hallazgo más importante de la fase.»

---

## Lo que la fase no cubre todavía

- **La fricción con un usuario real** (A5.4 en el banco). Necesita una persona.
  **Pendiente de Robertino.**
- **Ocho capabilities sin ejercitar contra el producto corriendo:**
  `residency_mode`, `b2b_sets`, `custom_curve_templates`, `title_lookup`,
  `slot_aware_planning`, `planned_vs_played`, `version_history` leída y
  `audio_analysis` (AUD.5). Están en el registro y en la matriz de precios; no
  está probado que anden.
- **Compartir un set y abrirlo desde otra cuenta**, y el interior del modo cabina.
- **Sets de más de 80 temas** desde la interfaz (A5.6). Lo que pasa a volumen en
  los servicios ya está medido en `docs/qa/carga-2026-10.md`.
