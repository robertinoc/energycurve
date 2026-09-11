# Alertas y detección de anomalías

**Proyecto 2 · Auditoría de Seguridad · F8.** Fecha: 2026-09-11.

## El punto de partida, dicho sin vueltas

**Hoy no hay ninguna alerta.** No hay Sentry, no hay log drain configurado, no
hay nadie ni nada mirando los logs. Todo lo que el app emite va a stdout, lo
retiene Vercel (un día en Hobby, un mes en Pro) y se lee solo si alguien entra a
buscarlo después de que algo ya pasó.

Eso significa que este documento no describe un sistema: describe **qué habría
que vigilar y con qué**, para que la decisión de gastar en ello se tome viendo
la lista concreta y no en abstracto.

Lo que sí se hizo en esta pasada, porque es la parte que no depende de ninguna
herramienta: **asegurar que los eventos que una alerta necesitaría existan**.
Una alerta sobre un evento que nadie emite es un documento, no un control.

---

## Dos eventos que faltaban

Se encontraron enumerando los 179 eventos estructurados que el código emite y
buscando los caminos que **devuelven un rechazo sin dejar rastro**.

### `billing.webhook.missing_signature`

Un webhook con firma **inválida** ya emitía `billing.webhook.bad_signature`. Uno
**sin header de firma** devolvía 400 en silencio.

Es al revés de como debería: el request sin firma es el sondeo barato —alguien
POSTeando contra una ruta de billing conocida a ver qué contesta— y era
justamente el invisible. Ahora se loguea.

### `backstage.non_admin_attempt`

Un usuario autenticado que entra a `/backstage` sin estar en la allowlist es
redirigido a su dashboard, en silencio total.

El redirect silencioso se queda: el panel no debe anunciar su existencia. Lo que
no se queda es que no hubiera registro, porque "una cuenta autenticada está
golpeando `/backstage` repetidamente" es literalmente la única anomalía de
autorización que este producto puede tener. Se emite a nivel `warn`, no `error`:
un hit suele ser un bookmark viejo, y lo que significa algo es la **frecuencia**.

Loguea el `workosUserId`, no el email — el logging sin PII en claro es un
requisito que ya se cerró en esta misma fase y no se rompe acá.

---

## Catálogo de alertas propuesto

Cada fila nombra un evento que el código **realmente emite hoy**. Los nombres
están fijados por `tests/alerting-events.test.ts`: si alguien renombra un evento,
el test se pone rojo y este documento no queda mintiendo en silencio.

### P1 — despertar a alguien

| Evento | Umbral | Qué significa | Qué hacer |
|---|---|---|---|
| `admin_audit.write_failed` | 1 | Se ejecutó una acción privilegiada y **no quedó registrada**. | Verificar si la migración 0027 está aplicada; reconstruir qué pasó desde los logs antes de que expiren. |
| `backstage.user_deleted` | cualquiera fuera de una ventana esperada | Un borrado irreversible de una cuenta. | Confirmar contra `admin_audit_log` que fue intencional. |
| `billing.webhook.bad_signature` | >5 en 10 min | O el secreto está mal configurado, o alguien está forjando eventos de pago. | Comparar `STRIPE_WEBHOOK_SECRET` contra el dashboard antes de asumir ataque. |
| `analysis.record_failed` + `playlist.create_failed` | >10 en 5 min | La base no acepta escrituras. Probablemente Supabase pausado o caído. | Runbook de incidente. |

### P2 — mirar el mismo día

| Evento | Umbral | Qué significa |
|---|---|---|
| `backstage.non_admin_attempt` | >3 del mismo `workosUserId` en 1 h | Alguien está probando el panel. |
| `billing.webhook.missing_signature` | >20 en 1 h | Sondeo contra la ruta de billing. |
| `backstage.untrusted_origin` | 1 | Un request al panel desde otro origen. No debería pasar nunca desde la UI. |
| `auth.login_blocked_suspended` | >5 del mismo usuario | Una cuenta suspendida insistiendo. |
| `retention.audit_email_sweep_failed` / `retention.orphan_sweep_failed` | 1 | El barrido de retención no corre ⇒ obligación de borrado incumplida. |
| `account.data_exported` | >3 de la misma cuenta en 1 h | El rate limit ya lo corta en 3/hora; llegar al techo repetidamente es raro. |

### P3 — tendencia semanal

| Evento | Qué vigilar |
|---|---|
| `playlist.action_rate_limited`, `contact.rate_limited`, `auth.password_reset_rate_limited` | Un salto sostenido es abuso o un límite mal calibrado. Distinguir cuál requiere mirar la distribución por clave, no el total. |
| `workos.runtime_error` | Degradación del proveedor de identidad. |
| `playlist.title_lookup_failed` | GetSongBPM caído o con la cuota agotada. |
| `backstage.posthog_query_failed` | El panel de analytics dejó de resolver. |

---

## Lo que este catálogo **no** puede detectar

Honestidad sobre los límites, porque una lista de alertas invita a creer que
cubre todo:

1. **El rate limiter es por instancia.** `lib/rate-limit.ts` guarda su estado en
   memoria, y en serverless cada instancia tiene la suya. Los eventos
   `*_rate_limited` cuentan lo que una instancia vio, no lo que un atacante hizo.
   Un umbral sobre ellos mide el tráfico contra la instancia más ocupada.
   Arreglar esto es la decisión pendiente sobre un limitador distribuido, no un
   problema de alertas.
2. **No hay correlación entre eventos.** Sin un destino que agregue, "5 logins
   fallidos seguidos de un cambio de contraseña exitoso" no es detectable — cada
   línea existe, la secuencia no.
3. **La lectura de datos no deja rastro.** Un acceso legítimo a un set propio no
   se loguea, y no debería: loguear cada lectura crearía un registro de qué
   escucha cada DJ, que es exactamente el dato que este producto promete no
   acumular. El control contra lectura indebida es la verificación de propiedad,
   no la detección.

---

## Cómo llegar a tener alertas, de más barato a más caro

Decisión de Robertino en los tres casos.

1. **Vercel Log Drains a una herramienta gratuita** (Better Stack / Axiom tienen
   planes free). Requiere plan Pro de Vercel. Es lo que menos código toca: los
   eventos ya son JSON con `event` como campo, así que las consultas de la tabla
   de arriba se escriben directo.
2. **Sentry** (free tier: 5k errores/mes). Captura excepciones con stack, que es
   lo que los `logError` de arriba no dan. Agrega un SDK al bundle — verificar
   contra la promesa de privacidad y el banner de consentimiento antes de
   activarlo en el cliente; en el server no toca esa promesa.
3. **Un endpoint propio + cron** que consulte y notifique. Más barato en dinero y
   más caro en todo lo demás; no lo recomiendo para un equipo de una persona.

Mientras tanto, el mínimo honesto que ya existe: el monitor de uptime sobre
`/api/health` (con la salvedad de que ese endpoint tardó hasta **3.57 s** en
producción — ver `docs/qa/performance-baseline-2026-09.md` — así que el timeout
tiene que estar por encima de 4 s o va a reportar caídas que no son).
