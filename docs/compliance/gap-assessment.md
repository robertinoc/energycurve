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
| 5(1)(e) | Limitación de conservación | ⬜ | **Cinco** ventanas implementadas y **ninguna corre**: falta `CRON_SECRET`. Una (`rate_limit_buckets`, 1 día, migración 0029) es housekeeping y no lleva obligación detrás — las otras cuatro sí. La quinta es `privacy_requests.details` (365 días **desde la resolución**, migración 0030) |
| 5(1)(f) | Integridad y confidencialidad | ✅ | Art. 32, abajo |
| 5(2) | Responsabilidad proactiva | ✅ | Este dossier, y con tests que lo verifican |
| 6 | Base legal | ✅ | Declarada al usuario, por tratamiento: contrato, obligación legal, interés legítimo y consentimiento |
| 7 | Consentimiento | ✅ | Opt-in, revocable con un clic, DNT respetado. PR #182 |
| 12–14 | Información al titular | ✅ | Base legal, plazos y derecho a reclamar, en los dos idiomas |
| 15 | Acceso | ✅ | `/api/account/export` |
| 16 | Rectificación | ⚠️ | Nombre self-serve en `/dashboard/account`. El email va por **pedido registrado con plazo** (`privacy_requests`, migración 0030) en vez de por mail suelto: cambia la identidad de login y descarta los sets compartidos por dirección, así que no es un botón de guardar. Sigue en ⚠️ y no en ✅ **a propósito**: hay canal y plazo, no ejecución automática |
| 17 | Supresión | ⚠️ | **Self-serve desde el 22/09/2026**: `/dashboard/account`, con confirmación escrita y 30 días de gracia reversibles. ⚠️ y no ✅ porque **la ejecución corre en el cron diario**, que responde 503 sin `CRON_SECRET` — y no está seteado. Un control escrito y no corriendo no puntúa como control, por la regla de puntuación de la propia auditoría |
| 18 | Limitación | ⚠️ | Canal ejercible con plazo registrado y visible para las dos partes (`/dashboard/account` → cola en el panel). No hay ejecución automática, y para este producto eso es correcto: limitar el tratamiento es una decisión sobre **qué** parar, no una operación mecánica |
| 20 | Portabilidad | ✅ | JSON estructurado, legible por máquina |
| 21 | Oposición | ⚠️ | Cubierto para analytics con un clic, y la revocación **llega al tercero** (`opt_out_capturing` + `reset`), no solo a nuestros call sites. Para todo lo demás hay ahora un canal registrado con plazo. Sigue en ⚠️: un pedido con fecha límite no es lo mismo que un interruptor |
| 24/25 | Responsabilidad y privacidad desde el diseño | ⚠️ | `privacy-by-design.md`; el link público sigue activo por defecto |
| 28 | Encargados | ⬜ | Inventario y página publicados; **DPAs sin firmar** |
| 30 | Registro de actividades | ✅ | `ropa.md`, verificado por test |
| 32 | Seguridad del tratamiento | ⚠️ | Medidas y evidencia en [`security-measures.md`](security-measures.md), con un test que verifica que cada archivo citado exista. **La restauración de backups nunca se ejecutó** — un backup que nadie restauró es una hipótesis, no un control |
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

**Hecho el 22/09/2026**, con las tres decisiones tomadas así:

- **Fricción: escribir el email de la cuenta.** No un tilde. Un tilde frena un
  clic accidental y nada más, y esto es lo único de la página que no vuelve. Lo
  que explícitamente **no** frena es una sesión robada —quien tiene la sesión lee
  la dirección en la misma página— y para eso está el mail de aviso, que va a la
  dirección de la cuenta y dice qué hacer.
- **Gracia: 30 días, reversibles, y la cuenta sigue funcionando.** No es una
  suspensión. Quien acaba de pedir el borrado es justamente quien más necesita
  poder descargar sus datos antes, así que bloquearlo sería contestar un pedido
  de supresión sacándole la portabilidad. Y como la cuenta sigue viva, cancelar
  es "entrá y apretá cancelar": **no hay que agregar un token en una URL**, que
  es el patrón que la auditoría de seguridad venía encontrando.
- **Suscripción: deja de renovarse al pedirlo**, el plan corre hasta el período
  ya pagado, sin reembolso, y todo vuelve atrás si se retira el pedido. Con la
  fecha exacta dicha **antes** de confirmar, porque una sorpresa sobre plata
  después es un chargeback.

**Y en el camino apareció un bug que ya existía:** `deleteUserEverywhere`
**nunca tocaba Stripe.** Borraba el usuario de WorkOS y la fila de `profiles` —
que es el único lugar donde vive `stripe_subscription_id` — así que una
suscripción activa seguía renovándose contra un cliente sin cuenta, y la persona
no podía entrar al portal a cancelarla porque ya no podía loguearse. Era cierto
del botón de admin desde que se lanzó; el borrado self-serve es lo que lo volvió
importante, porque convierte una acción rara de admin en algo que cualquier
suscriptor puede hacerse a sí mismo. Corregido, y la cancelación corre **antes**
del borrado de la fila, que es donde tiene que estar.
4. **Limitación (Art. 18)** es la de menor demanda real en un producto así.
   Suspender el tratamiento sin borrar se puede resolver con la suspensión que
   ya existe, pero hoy es una acción de admin, no un derecho ejercible.

**Cerrado el 22/09/2026 para los puntos 1 (la mitad del email), 2 y 4**, y de
una forma que conviene justificar porque no es la que la lista suponía: no se
hicieron self-serve. Los tres pasaron a ser un **pedido registrado con plazo**
(`privacy_requests`, migración 0030) que se ve en `/dashboard/account` con su
fecha y en el panel ordenado por lo que vence antes.

La razón es que ninguno de los tres es mecánico. Limitar el tratamiento es una
decisión sobre qué parar; oponerse es una ponderación; y cambiar el email mueve
la identidad de login **y** descarta los sets compartidos con vos, porque
`set_collaborators` está keyeado por dirección — y si esos sets tienen que
seguir a la persona o quedarse con la dirección vieja es una pregunta de
producto con dos respuestas defendibles. Contestarla dentro de un botón de
guardar la contestaría para todos, en silencio, en el primer uso.

Lo que les faltaba no era un interruptor: era **un registro y un plazo**. El
procedimiento de DSAR ya había establecido que "mandá un mail" es válido bajo el
Art. 12 con una condición —que alguien conteste dentro del mes— y había dicho la
parte incómoda: el reloj arranca cuando llega el mail, no cuando se lee. Lo que
cambia ahora es que **incumplirlo es visible mientras todavía hay tiempo**, y
que la fecha la ve también la persona que hizo el pedido. Un reloj que ve un
solo lado es un reloj que se pasa en silencio.

---

## 4. Plan de remediación

### Autónomo (lo puedo hacer sin decisiones tuyas)

| # | Qué | Cierra |
|---|---|---|
| A1 | Rectificación de nombre en `/dashboard/account` | Art. 16 (la mitad) |
| A5 | Canal registrado con plazo para email, oposición y limitación | Arts. 16, 18, 21 |
| A2 | Procedimiento de DSAR: verificación de identidad y plazos | Arts. 12, 15–22 |
| A3 | Base legal y plazos de retención en la política, y sacar el "placeholder" | Arts. 5(1)(a), 6, 13 |
| A4 | Derecho a reclamar ante una autoridad de control, en la política | Art. 77 |

### Tuyo, por orden de impacto

| # | Qué | Cierra | Costo |
|---|---|---|---|
| R1 | `CRON_SECRET` en Vercel | 5(1)(e) — **cinco ventanas escritas y ninguna corriendo** · y desde el 22/09 también el **Art. 17**: es lo único que separa un borrado pedido de un borrado hecho | 2 min |
| R2 | **0027 y 0028 SIN aplicar en dev** (verificado 12/09/2026) · 0029 sí · **0030 y 0031 nuevas** | auditoría, retención de análisis, la cola de derechos, y el borrado self-serve | 5 min |
| R3 | Confirmar región de Supabase | 5(1)(a) — hoy la política puede estar diciendo algo falso | 2 min |
| R4 | Aceptar los DPAs | Art. 28 | 1 hora |
| R5 | Acceso de emergencia delegado | Art. 32 — bus factor 1 | 1 tarde |
| R6 | Probar una restauración de backup | Art. 32 | 1 tarde |
| ~~R7~~ | ~~Decidir: borrado self-serve~~ | Art. 17 | **Decidido y construido el 22/09/2026.** Lo que queda de esta fila es `CRON_SECRET` (R1): sin eso el pedido se registra y **nada lo ejecuta**, que es el peor de los tres estados posibles porque a la persona se le dio una fecha. El panel muestra los pedidos vencidos en rojo justamente para que eso no sea invisible |
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
que convierten cinco políticas de retención escritas en cinco que efectivamente
corren.

Las cinco ventanas: `billing_events.payload` (90 días),
`admin_audit_log.target_email` (365), los blobs de `analyses` (365),
`rate_limit_buckets` (1 día, agregada con el limitador distribuido en el PR
#206) y `privacy_requests.details` + `requester_email` (365 días, migración
0030). Cuatro tienen una obligación detrás; la de los buckets es housekeeping.

La quinta tiene una particularidad que vale escribir: **su ventana arranca en la
resolución, no en la llegada.** Un pedido todavía abierto a los 400 días es un
incumplimiento, y borrar lo que la persona escribió destruiría el registro de
qué pidió mientras el incumplimiento sigue vivo.

Las dos últimas aparecieron acá porque `tests/compliance-claims.test.ts` se puso
en rojo cuando llegaron — que es exactamente para lo que está ese test: la
matriz decía "tres" y el código ya decía cuatro, y después decía "cuatro" y el
código decía cinco.

---

## 5. Lo que esta matriz no es

No es una opinión legal. Es una lectura del reglamento contra el código, hecha
por quien escribió parte de ese código, y tiene el sesgo que eso implica. Antes
de usarla en un data room o frente a una autoridad, la revisa un abogado de
privacidad — y lo que le sirve no es esta tabla sino el RoPA y la evidencia
enlazada, que es lo que no puede producir solo.

Las casillas ⚠️ y ❌ son deliberadamente más largas que las ✅. Una matriz de
cumplimiento con todo en verde es, casi siempre, una matriz que no se miró.
