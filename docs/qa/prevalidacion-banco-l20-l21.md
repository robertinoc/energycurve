# Las 16 filas pendientes de L20 y L21, pre-verificadas por máquina — 21/10/2026 (lote 22)

**Nada de esta tabla cambia el estado de una fila del banco.** Las marca
Robertino. Esto es lo que una comprobación mecánica pudo contestar, con el
comando y lo que devolvió, para que él sepa qué le queda.

**Contra producción, desde la Mac de Robertino.** El contenedor de Claude no
llega a `energycurve.app` (`curl -sI` → 403 del proxy). Todas las requests a
producción de abajo las corrió **Robertino**, el 21/10/2026, y pegó la salida
en la sesión. Producción servía lo mismo que `main` en `131d4df`
(deducido en `docs/seo/verificacion-produccion-2026-09.md`, lote 22).

Una comprobación mecánica no reemplaza la fila: que el texto correcto esté en
el HTML no prueba que la página se lea bien.

## Las que una máquina puede contestar

| Fila | Qué se comprobó | Comando | Qué devolvió | Qué le queda a Robertino |
|---|---|---|---|---|
| L20.1 | Los precios de Rekordbox en la comparación, en los dos idiomas: Core y Creative como planes, el «+ Cloud Option» como paquete, la fecha | `node /tmp/check-l20.js` (el script está en el resumen del lote 22) | en: `Core US$10, Creative US$15` sí · `Core + Cloud Option US$19` sí · `Core US$19` como plan **no** · «20 October 2026» sí. es: lo mismo con `u$s` y «20 de octubre de 2026» | Comparar contra `rekordbox.com/en/plan` (paso 3 de la fila): la máquina sabe qué dice la página, no si Rekordbox cambió sus precios |
| L20.7 | Enlaces salientes etiquetados y propios sin etiqueta | el mismo | Portada: 4 enlaces a StageLink, 4 con `utm_source=energycurve`, 0 propios con utm. Comparación: 12 externos, 12 etiquetados, 0 propios con utm. `llms.txt`: 1 URL con utm, la de StageLink | Nada mecánico. Pasar el mouse por los enlaces es lo mismo que esto; puede marcarla |
| L21.1 | La 0034 aplicada | la consulta del paso 3 de `docs/runbooks/aplicar-migracion-0034.md`, en el SQL Editor | dev: **ESTÁ** (ya estaba) · producción: NO ESTÁ → aplicada → **ESTÁ — 0034 aplicada: 7 de 7 columnas y la restricción** | Nada. Desde acá, L20.2 a L20.4 tienen la migración que necesitaban |
| L21.2 | La frase nueva de Serato, en las dos páginas | `curl -s …/compare/best-dj-software \| grep -c "DJ Pro page says as much"` y la gemela en español | **1 y 1** | Releer la página de Serato DJ Pro y mover `verifiedAt` (pendientes, fila 33). La fecha publicada sigue en 27/09 |
| L21.3 | «Gestionar suscripción» en el JS de Account, y ningún nombre viejo | en la consola del navegador, sobre `/dashboard/account`: recorrer los `<script>` y buscar las dos cadenas | **`{nuevo: 1, viejo: 0}`** | Verlo en pantalla con una cuenta **paga por Stripe**. La de Robertino es PRO+ de cortesía: no tiene el botón ni el aviso de borrado. Así apareció H-25 |
| L21.4 | El enlace a la guía en los cinco artículos | `curl -s …/es/blog/<slug> \| grep -c 'href="/es/guia/curva-de-energia-en-un-set-de-dj"'` | **1 en cada uno de los cinco** | Leer las cinco oraciones: que se lean naturales es juicio, no `grep` |
| L21.5 | Ninguna comparación con más de 35 días | `CHECK_REVIEW_AGE=1 npx vitest run tests/comparison-review-age.test.ts`, en el contenedor (no necesita producción: las fechas son las del repo, que es lo que se sirve) | **12 de 12** el 21/10. La primera vence el 31/10 | Correrlo otra vez antes del 31/10, y releer las cuatro que vencen |
| L21.6 | El censo de enlaces internos | `node scripts/inbound-links.mjs https://energycurve.app /tmp/il.json` + el resumen | 116 URLs · 0 con 0 enlaces · 1 con ≤ 2 (`/es/glosario/b2b`, con 1) · mediana 9 · guía en español 8. **Igual que el build local** | Nada. Puede marcarla |
| L21.7 | Fases 4 y 5 de SEO | `node scripts/verify-seo-phases.mjs https://energycurve.app` | **27 de 27 verdes** | Nada de la fila. Las fases siguen abiertas por las tareas externas |

## Las que necesitan a una persona

| Fila | Por qué una máquina no alcanza |
|---|---|
| L20.2 | Registrarse con una cuenta descartable aceptando la analítica, y mirar la fila en Supabase. Necesita un navegador con el banner y la consola de Supabase. La 0034 ya está, así que se puede correr hoy |
| L20.3 | Lo mismo, rechazando la analítica. Es la fila que prueba que el consentimiento se respeta: necesita a alguien que lo rechace |
| L20.4 | El tablero del backstage, comparado contra Supabase. Necesita la sesión de admin |
| L20.5 | Free → Pro contra Stripe. Necesita la consola de Stripe |
| L20.6 | La columna «Used» contra PostHog. Necesita la cuenta de PostHog y las variables de Vercel |
| L21.9 | H-1 y H-2: una decisión |
| L21.10 | H-6 y H-7: una decisión |

**Resumen:** 9 de las 16 tienen una respuesta mecánica, y las 9 dieron lo
esperado. De esas 9, a L20.7, L21.1, L21.6 y L21.7 no les queda nada que
mirar a ojo. A L20.1, L21.2, L21.3, L21.4 y L21.5 les queda la parte humana
que dice cada fila. Las otras 7 necesitan a Robertino desde el principio.
