# ⚙️ Spec de Fase — F4 · Infraestructura y Cloud

**Proyecto:** EnergyCurve: 2. Auditoría de Seguridad. Escrito el 10/10/2026
(lote 19) desde la evidencia que ya existe, con la estructura de los specs de
fase de Asana y la del spec de QA que ya los trajo al repo
(`docs/qa/spec-f4-no-funcionales.md`). Hasta hoy esta fase tenía en Asana la
plantilla genérica y ningún documento.

**Lo que no se puede afirmar hoy, en una línea:** la auditoría de IAM —quién
tiene acceso a qué en Vercel y en Supabase, con qué rol, y qué variable está en
qué entorno— **no se hizo**, porque necesita las consolas de Vercel y Supabase,
que son de Robertino. Todo lo de abajo se miró desde afuera o desde el repo.

> **Implementado** y **verificado** son dos columnas distintas a propósito.
> «Implementado» dice que el control existe; «verificado» dice que alguien lo
> miró funcionando, con fecha y dónde. Este proyecto ya confundió las dos (el
> cron de retención estuvo dos meses respondiendo 503 con la política escrita).

---

🎯 **OBJETIVO**
Saber qué de la plataforma está expuesto, quién puede tocarla y con qué
privilegio, y que lo que no es nuestro (servidores, red) esté dicho como tal.

📦 **ALCANCE**
Exposición pública de servicios y almacenamiento, cabeceras y TLS del borde,
secretos a nivel infraestructura (dónde viven, en qué entorno), IAM de las
consolas (Vercel, Supabase, WorkOS, Stripe), protección de los deploys de
preview, región y plan. **No aplica, y está cerrado como «NO APLICA»:**
hardening de servidores y contenedores, y segmentación de red — el producto
corre entero en funciones serverless de Vercel y no hay host, imagen ni puerto
propio (Asana, 11/09).

**El inventario de partida** es `docs/security/threat-model.md` («Qué hay que
proteger» y «Superficies de ataque»): ocho activos, nueve superficies, y la
service-role key de Supabase como la llave maestra.

✅ **CRITERIOS DE ACEPTACIÓN**
1. Cada servicio expuesto está listado con su autenticación, y lo público está
   dicho como público a propósito.
2. Cada secreto tiene dónde vive y en qué entorno, y ninguno está en el
   historial de git.
3. **Cada consola tiene su lista de miembros y roles, revisada contra mínimo
   privilegio**, con fecha.
4. Los deploys de preview no son alcanzables sin autenticación, o está escrito
   qué exponen.
5. Lo que no se puede ver desde el repo está nombrado, con quién lo ve.

---

## Estado por ítem

| Ítem | Implementado | Verificado | Evidencia |
|---|---|---|---|
| Sin almacenamiento de objetos | ✅ por arquitectura: el audio nunca sale del navegador | ✅ 11/09 — no hay buckets de Supabase, S3 ni equivalente | Asana «Revisar exposición pública…»; `docs/research-server-side-batch.md` |
| Base de datos denegada por defecto | ✅ RLS activo con cero políticas en todas las tablas | ✅ 11/09 — REST de Supabase sin key → 401, desde afuera | ídem; `docs/runbooks/backup-restore.md` lo repite como chequeo de restauración |
| Superficies públicas, a propósito | ✅ marketing, `/api/health`, `/api/contact`, `/c/[token]`, webhook de Stripe | ✅ 11/09 | `docs/security/threat-model.md` |
| TLS del borde | ✅ Vercel | ✅ 11/09 — TLS 1.3, certificado válido | Asana F5 «cifrado en tránsito» |
| Cabeceras de seguridad | ✅ `next.config.ts` | ✅ 11/09 en producción; ✅ 10/10 en el build local | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; `X-Powered-By` apagado |
| CSP (S-04) | ⚠️ `Content-Security-Policy-Report-Only`, sin `report-uri` | ✅ 10/10 sobre el build: se sirve en modo reporte | `docs/security/remediation-register.md`. Sin recolección, las violaciones no se ven en ningún lado |
| HSTS con subdominios (S-05) | ❌ `max-age=63072000` sin `includeSubDomains` | ✅ 11/09 en producción | **Decisión de Robertino**: se cachea dos años, no se revierte esperando |
| Secretos fuera de git | ✅ `.gitignore` cubre `.env*` | ✅ 11/09 — `git log --all -p` sin claves live, ids de AWS, tokens ni claves privadas | Asana «Verificar gestión de secretos…» |
| Secretos sólo en el servidor | ✅ `import "server-only"` en `lib/env.ts`, `lib/supabase/server.ts`, los servicios | ✅ 11/09; sólo cuatro `NEXT_PUBLIC_`, todas legítimas | ídem |
| `CRON_SECRET` en producción (S-18) | ✅ | ✅ 02/10 — `/api/cron/retention` → 401 (antes 503) | `docs/pendientes-robertino.md`, «Resuelto» |
| Runbook de rotación | ✅ `docs/runbooks/secret-rotation.md`, 13 credenciales | ❌ **ninguna se rotó nunca** | `docs/audit360/evidence-index.md` |
| Pipeline de CI con privilegio mínimo | ✅ acciones fijadas por SHA, `permissions:` en cada workflow, token no persistido | ✅ en cada PR — `tests/workflow-integrity.test.ts` | Desde el lote 19 con una excepción con nombre: el job `commit` de `cwv-log.yml`, sin node ni npm |
| Región y cómputo | ✅ | ✅ Supabase `us-east-2` (consola, 20/09, Robertino); Vercel `iad1` (cabecera, 02/10); Fluid compute en plan Hobby (API de Vercel, 06/10) | `docs/compliance/international-transfers.md`; `docs/qa/carga-2026-10.md` |
| **IAM de Vercel** (miembros, roles, tokens) | ❓ | ❌ **no se miró** | Consola de Vercel — Robertino |
| **IAM de Supabase** (miembros, roles, claves) | ❓ | ❌ **no se miró** | Consola de Supabase — Robertino |
| Variables por entorno en Vercel | ❓ varias figuran en Preview | ❌ sin confirmar si también en Production, y cuáles | Consola de Vercel — Robertino |
| Protección de los deploys de preview | ❓ | ❌ sin confirmar si son alcanzables sin autenticación; usan las variables de Preview | Consola de Vercel — Robertino |
| MFA en las cuentas de administración (S-17) | ❌ | ❌ | WorkOS — Robertino, 15 min |
| Admin del panel por variable, no por código (S-08) | ⚠️ `BACKSTAGE_ADMIN_EMAILS` existe | ❌ no está seteada en producción (registro, 21/09): corre con el fallback del código | Vercel — Robertino |
| Hardening de servidores, red | — NO APLICA | — | Asana, 11/09 |

---

🔍 **PROMPT DE VERIFICACIÓN** (¿se hizo lo pedido, bien hecho?)
«Abrí la tabla de arriba y, para cada fila con ✅ en "Verificado", repetí la
comprobación que nombra: `curl` sin key al REST de Supabase (401), las
cabeceras de `curl -I https://energycurve.app/`, `git log --all -p` con los
patrones de secretos, `npx vitest run tests/workflow-integrity.test.ts`.
Confirmá que las filas de IAM siguen en ❌ hasta que haya una lista de
miembros con fecha.»

🧪 **PROMPT DE VALIDACIÓN** (¿cumple el objetivo real, con evidencia?)
«Con las consolas abiertas: ¿cuántas personas y cuántos tokens pueden hoy leer
la service-role key de Supabase o hacer un deploy a producción? ¿Alguno es de
alguien que ya no trabaja en el producto, o es un token sin vencimiento? Un
deploy de preview de la última rama, ¿abre sin sesión?»

---

## Lo que esta fase no puede cerrar desde el repo

- **La auditoría de IAM**, en las consolas de Vercel y Supabase. Es el
  criterio 3 entero y es de Robertino. Hasta entonces, el estado de la tarea
  «Auditar configuración de cloud e IAM» en Asana es «en curso», y es correcto.
- **Las variables por entorno y la protección de preview**, en Vercel.
- **MFA de las cuentas admin** (S-17) y **`BACKSTAGE_ADMIN_EMAILS`** (S-08).
- **S-05**, que no es una tarea sino una decisión.
- **Nada de esta tabla se miró hoy contra producción**: el contenedor desde el
  que se escribió no alcanza `energycurve.app`. Las fechas de la columna
  «Verificado» son las de la última vez que alguien lo miró.
