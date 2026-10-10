# ⚙️ Spec de Fase — F5 · Datos: Cifrado y Backups

**Proyecto:** EnergyCurve: 2. Auditoría de Seguridad. Escrito el 10/10/2026
(lote 19) desde la evidencia que ya existe, con la estructura de los specs de
fase de Asana y la de `docs/qa/spec-f4-no-funcionales.md`. Hasta hoy esta fase
tenía en Asana la plantilla genérica y ningún documento.

**Lo que no se puede afirmar hoy, en dos líneas:** **nunca se restauró un
backup**, así que el tiempo de recuperación es una hipótesis y no un número —
no hay RTO ni RPO. Y **ninguna de las 13 credenciales se rotó nunca**: la
rotación tiene runbook y está bloqueada en las consolas de Robertino.

> **Implementado** y **verificado** son dos columnas distintas a propósito. Un
> runbook es «implementado»; «verificado» es haberlo corrido y anotado cuánto
> tardó. Esta fase es la que más filas tiene en la primera columna y no en la
> segunda.

---

🎯 **OBJETIVO**
Que los datos de los usuarios viajen y descansen cifrados, que las claves que
los protegen se puedan cambiar sin improvisar, y que, si la base se pierde,
haya un número probado de cuánto tarda volver.

📦 **ALCANCE**
Cifrado en tránsito (todos los canales, entrantes y salientes), cifrado en
reposo, gestión y rotación de credenciales, backups y restauración, datos
personales en logs y en entornos que no son producción. **Fuera:** el contenido
de las políticas de privacidad (proyecto de compliance), salvo donde un dato de
esta fase las contradice.

**Lo que hay que respaldar**, de `docs/runbooks/backup-restore.md`: las 14
tablas de Supabase son lo único que es nuestro. Los usuarios y credenciales los
custodia WorkOS; las suscripciones, Stripe; el audio no sale nunca de la
máquina del DJ.

✅ **CRITERIOS DE ACEPTACIÓN**
1. TLS en todos los canales, con versión y certificado verificados.
2. Qué está cifrado en reposo, por quién, y por qué alcanza (o no).
3. Cada credencial tiene un procedimiento de rotación **y al menos una
   rotación de higiene corrida y cronometrada**.
4. **Una restauración real** a un proyecto descartable, cronometrada, con los
   chequeos de integridad del runbook: ése es el RTO.
5. Ningún dato personal en los logs sin necesidad, y ninguna copia de
   producción en dev.

---

## Estado por ítem

| Ítem | Implementado | Verificado | Evidencia |
|---|---|---|---|
| TLS en el borde | ✅ Vercel | ✅ 11/09 — `openssl s_client`: TLS 1.3, `AEAD-CHACHA20-POLY1305-SHA256`, verify 0 | Asana «Verificar cifrado en tránsito» |
| TLS saliente (Supabase, Stripe, WorkOS, Resend, Anthropic, PostHog, GetSongBPM) | ✅ `https` por construcción | ✅ 11/09, leído en el código | ídem |
| HSTS a subdominios (S-05) | ❌ | ✅ 11/09: falta `includeSubDomains`; `backstage.` queda afuera | Decisión de Robertino; ver el spec de F4 |
| Cifrado en reposo | ✅ el de disco de Supabase, para toda la base | ⚠️ documentado, no medido: es una garantía del proveedor | Asana «Verificar cifrado en reposo»; sin cifrado por columna, a propósito: el único camino de acceso es la service-role key |
| Tarjetas fuera de la base | ✅ las guarda Stripe | ✅ 11/09, leído en el esquema | `docs/compliance/ropa.md` |
| `billing_events` con retención | ✅ PR #183 | ⚠️ el barrido existe y `CRON_SECRET` responde 401 desde el 02/10; **una corrida con filas borradas no se vio** | `docs/pendientes-robertino.md` |
| Runbook de rotación | ✅ `docs/runbooks/secret-rotation.md` — 13 credenciales, radio de explosión, emergencia contra higiene | ❌ **ninguna rotada nunca**; la columna de tiempos está vacía a propósito | `docs/audit360/evidence-index.md` |
| Rotación de las tres que el usuario ve (`WORKOS_COOKIE_PASSWORD`, `CURVE_SHARE_SECRET`, …) | ✅ descrita | ❌ | Bloqueada: necesita las consolas de Vercel, WorkOS y Supabase |
| Backups automáticos de Supabase | ✅ por plan | ❌ **sin verificar cuáles, cada cuánto ni cuánto se retienen** | `docs/compliance/security-measures.md` |
| Point-in-time recovery | ❓ | ❌ **sin confirmar si está habilitado** — es la fila que mueve el RPO de «hasta 24 h» a «minutos» | Consola de Supabase — Robertino |
| Runbook de restauración | ✅ `docs/runbooks/backup-restore.md`, desde el 21/09 | ❌ nunca corrido; la tabla de resultados está vacía | Banco A4.2 |
| **Restauración real, RTO / RPO** | ❌ | ❌ **No existen.** Un backup que nunca se restauró es una hipótesis | Fila 10 de `docs/pendientes-robertino.md` |
| Datos personales en logs | ✅ S-03 corregido: el contacto ya no copia nombre, dirección, mensaje ni IP; T5(b): sin query strings a PostHog (PR #182) | ✅ por test, en cada PR | Asana «Detectar datos personales en logs» |
| Mails en los eventos de auth | ⚠️ siguen registrando la dirección | — | Decisión: depurar «no puedo entrar» contra minimizar. La alternativa es un hash estable |
| Sin datos de producción en dev | ✅ proyecto de Supabase propio | ✅ 06/10, según el traspaso (`node scripts/seed-scale.mjs status`: 9 perfiles); **no se corrió en este lote** | `docs/handoff-2026-09-17.md`, «Estado de hoy» |
| Región de los datos | ✅ | ✅ Supabase `us-east-2`, consola, 20/09 (Robertino). La política decía «región UE»: el mapa de transferencias lo rehízo en el lote 16 | `docs/compliance/international-transfers.md` |

---

🔍 **PROMPT DE VERIFICACIÓN** (¿se hizo lo pedido, bien hecho?)
«Abrí `docs/runbooks/backup-restore.md` y confirmá que la tabla de resultados
tiene una fecha, una duración y los ocho chequeos de integridad marcados. Abrí
`docs/runbooks/secret-rotation.md` y confirmá que al menos una credencial
tiene una rotación de higiene registrada. Si alguna de las dos sigue vacía, la
fase no está cerrada, diga lo que diga la tarea.»

🧪 **PROMPT DE VALIDACIÓN** (¿cumple el objetivo real, con evidencia?)
«Si mañana se borra el proyecto de Supabase de producción: ¿cuánto tiempo pasa
hasta que un DJ vuelve a ver sus sets en orden, y cuántas horas de cambios
pierde? Contestalo con el número de la restauración real, no con el del plan
de Supabase.»

---

## Lo que esta fase no puede cerrar desde el repo

- **La restauración**: una tarde de Robertino con el runbook ya escrito. Antes
  de empezar, leer en la consola si PITR está habilitado.
- **La rotación**: las credenciales viven en Vercel, WorkOS, Stripe y Supabase.
  Empezar por una de higiene que el usuario no vea, para cronometrar el
  procedimiento sin costo.
- **Los backups automáticos y su retención**, que se leen en la consola.
- **Nada de esta tabla se miró hoy contra producción**: el contenedor desde el
  que se escribió no alcanza `energycurve.app`.
