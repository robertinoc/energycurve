# Medidas técnicas y organizativas (Art. 32) y su vínculo con compliance

**Proyecto 3 · Privacy & Compliance · F5.** Fecha: 2026-09-12.

El Art. 32 pide medidas "apropiadas al riesgo". Este documento dice cuáles hay,
**con la evidencia al lado**, y —más importante— cuáles no hay.

La regla que se aplicó al escribirlo: **ninguna fila afirma un control sin
apuntar a un archivo**. `tests/security-measures-evidence.test.ts` verifica que
cada archivo citado exista, así que una medida que se borre del código deja de
poder afirmarse desde acá sin que algo se ponga rojo. Esa regla nació de un
error concreto: la matriz de cumplimiento llegó a declarar aplicadas dos
migraciones que no lo estaban, y un tachado no es algo que un test pueda leer.

---

## 1. Art. 32(1)(a) — Seudonimización y cifrado

| Medida | Evidencia | Estado |
|---|---|---|
| Analytics identifica por `profileId`, nunca por email; sin IP | `components/analytics/analytics-runtime.ts` | ✅ |
| Logs estructurados con identificadores opacos, no direcciones | `lib/observability/logger.ts`, `lib/backstage/guard.ts` | ✅ |
| El email del afectado se borra del log de auditoría al año | `services/retention-service.ts` | ✅ código · ⬜ no corre (falta `CRON_SECRET`) |
| Cifrado en tránsito: TLS en todos los canales | verificado con `openssl s_client` (P2 F5) | ✅ |
| Cifrado en reposo | lo gestiona Supabase; no lo administramos | ✅ heredado |
| Tokens de compartir firmados con HMAC, comparados en tiempo constante | `lib/playlists/share-token.ts` | ✅ |
| Contraseñas | nunca las vemos: viven en WorkOS | ✅ por diseño |

**Dónde la seudonimización no puede aplicarse** está razonado en
`privacy-by-design.md` §4. Resumen: `profiles.email` es la clave de identidad
contra WorkOS y cifrarlo con una clave guardada al lado sería teatro.

---

## 2. Art. 32(1)(b) — Confidencialidad, integridad, disponibilidad, resiliencia

### Confidencialidad

| Control | Evidencia |
|---|---|
| Toda consulta de datos ajenos pasa por una verificación de propiedad en la capa de servicios | `tests/services-tenancy.test.ts`, `tests/access-control.test.ts` |
| El loader sin scope tiene callers fijados y una regla que lo vigila | `tests/object-access-callers.test.ts`, `.semgrep/energycurve.yml` |
| RLS habilitada sin políticas en toda tabla (decisión 22) | `tests/migrations.test.ts` |
| El panel de administración es una allowlist, probada en tres niveles de privilegio | `tests/backstage-rbac.test.ts` |
| La suspensión es una compuerta de autorización, no de página | `lib/auth/suspension.ts`, `tests/suspension.test.ts` |
| La página pública de curvas no revela tracklist ni dueño | `tests/public-curve-exposure.test.ts` |
| Los endpoints que mutan cuentas exigen mismo origen | `lib/http/trusted-origin.ts` |
| Sin PII en los reportes de error | `tests/sentry-no-pii.test.ts` |

### Integridad

| Control | Evidencia |
|---|---|
| Los webhooks de pago se verifican por firma antes de leer un byte | `tests/api-billing-webhook.test.ts` |
| Idempotencia por primary key: un evento redelivered no otorga plan dos veces | `tests/billing-events.test.ts` |
| Las importaciones XML se rechazan por DOCTYPE, entidades y profundidad **antes** de parsear | `lib/playlists/xml-guard.ts`, `tests/xml-guard.test.ts` |
| El JSON-LD no puede cerrar su propio `<script>` | `tests/structured-data-escaping.test.ts` |
| Registro durable de acciones administrativas | `services/admin-audit-service.ts` · ⬜ migración 0027 sin aplicar |

### Disponibilidad

| Control | Evidencia |
|---|---|
| Límite de tasa compartido entre servidores | `services/rate-limit-service.ts`, `tests/rate-limit.test.ts` |
| Degradación declarada: sin Anthropic, el orden cae al heurístico y lo dice en pantalla | `tests/smart-order-classify.test.ts` |
| `/api/health` consulta la base de verdad | `tests/api-health.test.ts` |
| Ping programado que evita que Supabase pause el proyecto | `.github/workflows/keep-supabase-alive.yml` |

⚠️ **`/api/health` tardó hasta 3.57 s en producción** (`docs/qa/performance-baseline-2026-09.md`). Un monitor con timeout por debajo de 4 s va a reportar caídas inexistentes.

### Resiliencia

Acá es donde el documento deja de poder decir que sí. Ver §3.

---

## 3. Art. 32(1)(c) — Restaurar disponibilidad tras un incidente

**Esta es la brecha más seria del Art. 32, y no está cerrada.**

| Qué | Estado |
|---|---|
| Backups automáticos de Supabase | Existen por plan. **Sin verificar cuáles, con qué frecuencia ni cuánto se retienen** |
| Point-in-time recovery | **Sin confirmar si está habilitado** |
| Restauración probada | **Nunca se hizo** |
| Runbook de restauración | **No existe** |
| RTO / RPO definidos | **No existen** |

Un backup que nunca se restauró es una hipótesis, no un control. Es honesto
decirlo así en vez de escribir "backups: sí" en una fila verde, porque esa fila
es exactamente la que un comprador prueba en due diligence.

**Lo desbloquea Robertino** y cuesta una tarde: restaurar a un proyecto
descartable, contar cuánto tardó, y escribir el runbook con ese número.

---

## 4. Art. 32(1)(d) — Probar y evaluar la eficacia regularmente

| Mecanismo | Cadencia | Evidencia |
|---|---|---|
| Suite completa y gates en cada PR | por PR | `.github/workflows/ci.yml` |
| Análisis estático con reglas propias, a nivel bloqueante | por PR | `.semgrep/energycurve.yml` |
| Cobertura con pisos por carpeta que solo suben | por PR | `vitest.config.ts` |
| Auditoría de dependencias (informativa) | por PR | `npm audit` en CI |
| Actions pinneadas a SHA con vigilante | mensual | `.github/dependabot.yml` |
| Esta auditoría | primera vez | los cuatro proyectos |

**La parte que falta es la cadencia.** Todo lo de arriba corre por PR, que es lo
correcto para controles de código; lo que no existe es una revisión periódica de
lo que no vive en el repo — permisos en consolas, DPAs, backups. **Propuesta:
una revisión semestral con esta misma lista.** Sin una fecha, "regularmente" se
convierte en "una vez".

### Verificación por inyección, que es lo que hace creíble al resto

No alcanza con que un test exista: tiene que poder fallar. A lo largo de esta
auditoría se inyectaron **más de 40 defectos deliberados** para confirmar que el
control los detecta. Dos veces el test pasó igual, y las dos veces el defecto
estaba en el instrumento: un regex que leía la palabra dentro de un comentario
en lugar de la configuración, y un canario que medía el archivo en vez del
documento que el archivo produce.

Que eso haya pasado dos veces es el argumento más fuerte a favor del método: sin
inyectar el defecto, los dos controles se habrían reportado como funcionando.

---

## 5. Medidas organizativas

| Medida | Estado |
|---|---|
| Procedimiento de respuesta a incidentes | ✅ `docs/security/incident-response.md` |
| Notificación de brechas en 72 h, con plantilla | ✅ `docs/security/breach-notification-template.md` |
| Registro de incidentes | ✅ `docs/security/incidents/` |
| Procedimiento de DSAR con plazos y verificación de identidad | ✅ `docs/compliance/dsar-procedure.md` |
| Reglas internas, cinco de seis verificadas por un test | ✅ `docs/compliance/governance.md` §3 |
| **Acceso de emergencia delegado** | ❌ **bus factor 1** |
| Capacitación formal | N/A — una persona, que escribió el producto |

**El bus factor 1 es la medida organizativa que falta, y pesa más que cualquier
otra fila de este documento.** Si Robertino no está disponible: nadie contesta
un DSAR, nadie ejecuta un borrado, nadie notifica una brecha dentro de las 72
horas. Los procedimientos están escritos y son seguibles; los accesos no están
compartidos.

---

## 6. Vínculo entre controles de seguridad y requisitos de compliance

La otra dirección de lectura: qué obligación satisface cada control. Sirve para
lo que un data room pregunta —"¿cómo cumplen X?"— sin releer el dossier entero.

| Requisito | Controles que lo satisfacen |
|---|---|
| **Art. 5(1)(f)** Integridad y confidencialidad | Todo §2 |
| **Art. 5(1)(c)** Minimización | Sin IP en analytics; sin autocapture; blobs de análisis con ventana; `plan_cancellation_feedback` reportado |
| **Art. 5(1)(e)** Limitación de conservación | Las cuatro ventanas de `retention-service.ts` ⬜ ninguna corre |
| **Art. 5(2)** Responsabilidad proactiva | Este dossier, más los tests que verifican sus afirmaciones |
| **Art. 7(3)** Retiro del consentimiento | `analytics-runtime.ts`: el retiro llega al tercero, no solo a nuestros call sites |
| **Art. 15/20** Acceso y portabilidad | `services/data-export-service.ts` |
| **Art. 16** Rectificación | `app/dashboard/account/actions.ts` (nombre) |
| **Art. 17** Supresión | `deleteUserEverywhere` ⚠️ solo como acción de admin |
| **Art. 25** Privacidad desde el diseño | `privacy-by-design.md` §5 ⚠️ el link público sigue activo por defecto |
| **Art. 28** Encargados | `/subprocessors` + test ⬜ DPAs sin firmar |
| **Art. 30** Registro de tratamientos | `ropa.md` + `tests/ropa-accuracy.test.ts` |
| **Art. 32** Seguridad | Este documento ❌ falta restauración probada |
| **Art. 33/34** Brechas | Procedimiento y plantilla ⚠️ sin ensayar |
| **Art. 35** DPIA | `governance.md` §1: no requerida, razonado |
| **PCI SAQ-A** | Checkout alojado por Stripe; la tarjeta nunca toca nuestros servidores |

---

## 7. Lo que este documento no prueba

- **Nada fue probado contra el sistema corriendo con cuentas reales.** Todos los
  controles de §2 están verificados a nivel de código y de handler. El pentest y
  el IDOR entre dos cuentas reales siguen bloqueados en las cuentas de prueba.
- **La restauración de backups nunca se ejecutó.**
- **Las consolas no se auditaron**: permisos de Vercel, región y plan de
  Supabase, MFA de WorkOS. No se ven desde el repo y no tengo acceso.
- **Tres controles están escritos y no corren**: las cuatro ventanas de
  retención y el log de auditoría, por `CRON_SECRET` sin setear y las
  migraciones 0027 y 0028 sin aplicar.
