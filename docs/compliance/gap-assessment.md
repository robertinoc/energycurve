# Marcos aplicables y matriz de cumplimiento

**Proyecto 3 · Privacy & Compliance · F7.** Fecha: 2026-09-11.

---

## 1. Qué marcos aplican, y por qué

El plan original asumía una lista fija. Lo que aplica depende de dónde están los
usuarios y qué se les vende, así que primero los hechos:

- **Operador:** StageLink LLC, Estados Unidos.
- **Precios:** en USD.
- **Idiomas:** inglés y español rioplatense.
- **Producto:** B2C, DJs. Sin vertical infantil, sin sector regulado.
- **Venta:** mundial — nada en el checkout restringe país.

| Marco | ¿Aplica? | Por qué |
|---|---|---|
| **GDPR** (UE/EEE) | **Sí, como marco base** | Art. 3(2)(a): ofrecer servicios a personas en la UE basta, sin establecimiento. Nada impide que un DJ de Berlín se suscriba hoy. |
| **UK GDPR** | Sí, mismo razonamiento | Sustancialmente idéntico; cumplir GDPR lo cubre. |
| **Ley 25.326** (Argentina) | **Sí, en la práctica** | Copy rioplatense y el usuario alpha es de ahí. Menos exigente que GDPR en casi todo. |
| **LGPD** (Brasil) | Probable, bajo volumen | Art. 3 tiene alcance extraterritorial equivalente. Cumplir GDPR lo cubre. |
| **CCPA/CPRA** (California) | **No hoy** | Requiere USD 25M de ingresos brutos, o datos de 100.000+ consumidores, o 50%+ de ingresos por venta de datos. Ninguno se cumple, ni cerca. |
| **PCI DSS** | **SAQ-A** | Checkout alojado por Stripe; los datos de tarjeta nunca tocan nuestros servidores. Es el nivel más bajo que existe. |
| **COPPA** | No | No dirigido a menores de 13. |
| **HIPAA / GLBA / FERPA** | No | Sin datos de salud, financieros regulados ni educativos. |

**Decisión: GDPR como marco base.** Es el más estricto de los que aplican;
cumplirlo cubre UK GDPR, LGPD y Ley 25.326 con margen. CCPA se revisa si el
volumen cambia — y el umbral que importa es el de 100.000 consumidores, no el
de ingresos.

---

## 2. Matriz de cumplimiento contra GDPR

Estado: ✅ cumple · ⚠️ parcial · ❌ brecha · ⬜ depende de una acción de Robertino

| Art. | Requisito | Estado | Evidencia / qué falta |
|---|---|---|---|
| 5(1)(a) | Licitud, lealtad, transparencia | ✅ | Política EN/ES con base legal por tratamiento, plazos de retención y derecho a reclamar. Se quitó la afirmación **"Supabase (región UE)"**: nadie la confirmó (R3), y era un hecho declarado en un documento del que la gente puede fiarse |
| 5(1)(b) | Limitación de finalidad | ✅ | Finalidad por tratamiento en el RoPA |
| 5(1)(c) | Minimización | ⚠️ | Dos hallazgos: blobs de `analyses` (resuelto), `plan_cancellation_feedback` (decisión pendiente) |
| 5(1)(d) | Exactitud | ❌ | **No hay rectificación self-serve.** Ni nombre ni mail se pueden editar |
| 5(1)(e) | Limitación de conservación | ⬜ | **Cuatro** ventanas implementadas y **ninguna corre**: falta `CRON_SECRET`. La cuarta (`rate_limit_buckets`, 1 día, migración 0029) es housekeeping y no lleva obligación detrás — las otras tres sí |
| 5(1)(f) | Integridad y confidencialidad | ✅ | Art. 32, abajo |
| 5(2) | Responsabilidad proactiva | ✅ | Este dossier, y con tests que lo verifican |
| 6 | Base legal | ✅ | Declarada al usuario, por tratamiento: contrato, obligación legal, interés legítimo y consentimiento |
| 7 | Consentimiento | ✅ | Opt-in, revocable con un clic, DNT respetado. PR #182 |
| 12–14 | Información al titular | ✅ | Base legal, plazos y derecho a reclamar, en los dos idiomas |
| 15 | Acceso | ✅ | `/api/account/export` |
| 16 | Rectificación | ⚠️ | Nombre self-serve en `/dashboard/account`. El email sigue por mail: cambia la identidad de login y descarta los sets compartidos |
| 17 | Supresión | ❌ | **Solo como acción de admin.** Un usuario tiene que mandar un mail |
| 18 | Limitación | ❌ | No implementado |
| 20 | Portabilidad | ✅ | JSON estructurado, legible por máquina |
| 21 | Oposición | ⚠️ | Cubierto para analytics, y ahora la revocación **llega al tercero** (`opt_out_capturing` + `reset`), no solo a nuestros call sites. Sin mecanismo general |
| 24/25 | Responsabilidad y privacidad desde el diseño | ⚠️ | `privacy-by-design.md`; el link público sigue activo por defecto |
| 28 | Encargados | ⬜ | Inventario y página publicados; **DPAs sin firmar** |
| 30 | Registro de actividades | ✅ | `ropa.md`, verificado por test |
| 32 | Seguridad del tratamiento | ⚠️ | Fuerte en app; **backups y restauración sin probar**, sin alertas activas |
| 33/34 | Notificación de brechas | ⚠️ | Procedimiento y plantilla escritos; **sin ensayar** y con bus factor 1 |
| 35 | DPIA | ✅ | Screening documentado: no requerida |
| 37 | DPO | ✅ | No requerido, razonado |
| 44–49 | Transferencias | ⬜ | Mapeadas; **mecanismos sin verificar** |

**Resumen: 11 ✅ · 8 ⚠️ · 2 ❌ · 4 ⬜** (era 8/9/4/4 el 11/09)

---

## 3. Las cuatro brechas rojas, que son una sola

Los Arts. 16, 17, 18 y la mitad del 21 son todos lo mismo: **el usuario no puede
hacer nada con sus propios datos salvo exportarlos.** No puede corregir su
nombre, no puede borrar su cuenta, no puede pedir que se limite un tratamiento.

Lo que hoy hay para todo eso es "mandá un mail a hello@", que es un mecanismo
válido bajo GDPR — **siempre que alguien conteste dentro de 30 días**. Con bus
factor 1 y sin proceso escrito de DSAR, esa condición no está asegurada.

El orden de arreglo importa y no es el que sugiere la numeración:

1. **Rectificación de nombre y mail.** Lo más barato de todo (una server action
   y un formulario), cierra el Art. 16, y de paso quita el escenario absurdo de
   alguien que tiene que escribir un mail para corregir un typo en su nombre.
2. **Plazos y verificación de identidad de DSAR** — escrito, no código. Cierra la
   condición que hace válido al "mandá un mail".
3. **Borrado self-serve.** El más caro y el que más piensa: es irreversible,
   toca WorkOS y Stripe, y necesita confirmación fuerte. `deleteUserEverywhere`
   ya hace el trabajo pesado y está probado; lo que falta es la superficie de
   usuario y la decisión de producto sobre qué pasa con una suscripción activa.
4. **Limitación (Art. 18)** es la de menor demanda real en un producto así.
   Suspender el tratamiento sin borrar se puede resolver con la suspensión que
   ya existe, pero hoy es una acción de admin, no un derecho ejercible.

---

## 4. Plan de remediación

### Autónomo (lo puedo hacer sin decisiones tuyas)

| # | Qué | Cierra |
|---|---|---|
| A1 | Rectificación de nombre y mail en `/dashboard/account` | Art. 16 |
| A2 | Procedimiento de DSAR: verificación de identidad y plazos | Arts. 12, 15–22 |
| A3 | Base legal y plazos de retención en la política, y sacar el "placeholder" | Arts. 5(1)(a), 6, 13 |
| A4 | Derecho a reclamar ante una autoridad de control, en la política | Art. 77 |

### Tuyo, por orden de impacto

| # | Qué | Cierra | Costo |
|---|---|---|---|
| R1 | `CRON_SECRET` en Vercel | 5(1)(e) — **cuatro ventanas escritas y ninguna corriendo** | 2 min |
| R2 | **0027 y 0028 SIN aplicar en dev** (verificado 12/09/2026) · 0029 sí | auditoría y retención de análisis | 5 min |
| R3 | Confirmar región de Supabase | 5(1)(a) — hoy la política puede estar diciendo algo falso | 2 min |
| R4 | Aceptar los DPAs | Art. 28 | 1 hora |
| R5 | Acceso de emergencia delegado | Art. 32 — bus factor 1 | 1 tarde |
| R6 | Probar una restauración de backup | Art. 32 | 1 tarde |
| R7 | Decidir: borrado self-serve | Art. 17 | decisión + ~1 día de build |
| R8 | Decidir: link público opt-in | Art. 25 | decisión |

### Estado real de las migraciones, medido y no asumido

Consultado contra la base de **dev** por PostgREST el 12/09/2026:

| Migración | Qué trae | dev | producción |
|---|---|---|---|
| 0027 | `admin_audit_log` | ❌ la tabla no existe | sin verificar |
| 0028 | `curve`, `issues` y `breakdown` nullable en `analyses` | ❌ los tres siguen `not null` | sin verificar |
| 0029 | `rate_limit_buckets` | ✅ presente | reportada como corrida |

Una versión anterior de esta fila las daba por aplicadas. No lo estaban, y el
efecto no es cosmético:

- **El log de auditoría no registra nada.** Cada suspensión y cada borrado emiten
  `admin_audit.write_failed` a nivel error, y el panel muestra el estado vacío
  que dice exactamente eso. Degrada como fue diseñado —la acción no se bloquea—
  pero la garantía de trazabilidad no existe hasta que la migración corra.
- **`sweepAnalysisBlobs` no puede funcionar**: poner en null tres columnas
  `not null` falla, y el cron lo atrapa en su propio `try` y lo reporta como
  `retention.analysis_sweep_failed`.

Se verifica en dos comandos, sin abrir el dashboard:

```
curl -s -o /dev/null -w "%{http_code}\n" \
  "$SUPABASE_URL/rest/v1/admin_audit_log?select=id&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
```

404 = sin aplicar, 200 = aplicada. Para la 0028, el `required` de `analyses` en
`GET /rest/v1/` deja de incluir `curve`.

**R1 es el de mejor relación de todos los proyectos**: dos minutos de trabajo
que convierten cuatro políticas de retención escritas en cuatro que
efectivamente corren.

Las cuatro ventanas, y cómo llegaron a ser cuatro: `billing_events.payload`
(90 días), `admin_audit_log.target_email` (365), los blobs de `analyses` (365) y
`rate_limit_buckets` (1 día, agregada con el limitador distribuido en el PR
#206). Las tres primeras tienen una obligación detrás; la cuarta es
housekeeping. La cuarta apareció acá porque `tests/compliance-claims.test.ts` se
puso en rojo cuando llegó — que es exactamente para lo que está ese test: la
matriz decía "tres" y el código ya decía cuatro.

---

## 5. Lo que esta matriz no es

No es una opinión legal. Es una lectura del reglamento contra el código, hecha
por quien escribió parte de ese código, y tiene el sesgo que eso implica. Antes
de usarla en un data room o frente a una autoridad, la revisa un abogado de
privacidad — y lo que le sirve no es esta tabla sino el RoPA y la evidencia
enlazada, que es lo que no puede producir solo.

Las casillas ⚠️ y ❌ son deliberadamente más largas que las ✅. Una matriz de
cumplimiento con todo en verde es, casi siempre, una matriz que no se miró.
