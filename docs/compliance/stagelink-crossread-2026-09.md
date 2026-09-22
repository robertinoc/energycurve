# Cruce con el plan de privacidad de StageLink — 22/09/2026

> **Para qué.** StageLink y EnergyCurve son de la misma familia, los opera la
> misma sociedad (StageLink LLC) y les aplican las mismas regulaciones, así que
> el plan de privacidad de StageLink —70 tareas, cerrado en mayo de 2026— es una
> lista de control que EnergyCurve no escribió. Este documento la recorre entera
> y dice, por cada ítem, si aplica y en qué estado está acá.
>
> **Lo que encontró: tres huecos reales de 70 ítems.** Dos ya están cerrados y
> uno es una decisión que no se puede tomar sin Robertino. El resto estaba
> cubierto, a veces mejor de lo que el plan de StageLink pedía y a veces por otra
> vía.
>
> **Lo que este cruce NO es:** una lista de tareas para copiar. Los dos productos
> tratan datos distintos —StageLink no tiene la librería de un DJ en la máquina
> del usuario, y EnergyCurve no tiene lo que StageLink tenga— así que varios
> ítems se marcan *no aplica* con el motivo, y eso es parte del resultado.

---

## 1. Los tres huecos

### H-1 · No había edad mínima declarada — **CERRADO acá**

El plan de StageLink tiene *"Definir edad mínima de uso"* en sus fundamentos
legales. **El plan de EnergyCurve no tiene esa tarea**, y ninguno de sus cuatro
documentos legales decía nada: ni los términos, ni la política de privacidad.

Es un hueco de verdad y no una formalidad. El Art. 8 del GDPR pone el
consentimiento de menores entre 13 y 16 años según el país, y un producto que no
declara edad mínima no tiene forma de sostener que no le aplica.

**Cerrado con 18 años**, que es decisión de Robertino y no la lectura más
conservadora del Art. 8 —16 alcanzaría para sacarse de encima el consentimiento
parental en toda la UE— sino la que coincide con lo que el producto es: una
herramienta profesional para gente que cobra por tocar, y una suscripción que es
un contrato.

Declarado en los dos documentos y en los dos idiomas, y con una decisión
explícita sobre qué **no** hacer: **no se pide fecha de nacimiento.** Pedírsela a
todo el mundo para filtrar un caso que no hay motivo para esperar significaría
guardar un dato personal nuevo de cada usuario — o sea, recolectar más para
proteger menos. La política lo dice con esas palabras.

Fijado por `tests/compliance-claims.test.ts`, en los dos documentos: los términos
hacen de la edad una condición de uso y la política dice qué implica para los
datos. Uno sin el otro es una regla sin consecuencia, o una afirmación sobre
datos sin regla detrás.

### H-2 · No había registro de solicitudes de derechos — **CERRADO en otro PR**

StageLink tiene *"Logging de solicitudes — auditoría de requests"* en derechos
del usuario. EnergyCurve tenía el procedimiento escrito
(`dsar-procedure.md`) y **ningún registro**: los pedidos llegaban a una casilla
de mail y el plazo corría sin que nada lo mirara.

Cerrado con la migración `0030` y la tabla `privacy_requests`: cada pedido queda
con su plazo almacenado, se ve en la página de cuenta con la fecha, y aparece en
el panel ordenado por lo que vence antes.

### H-3 · No hay política de cuentas inactivas — **ABIERTO, y es una decisión**

StageLink tiene *"Manejo de cuentas inactivas — reglas de expiración"*.
EnergyCurve **no tiene nada**: verificado buscando `inactiv`, `last_seen`,
`last_login` y `dormant` en servicios, librerías y migraciones — ni una columna,
ni una regla, ni una mención en el RoPA.

Es el hueco que queda, y es del Art. 5(1)(e): una cuenta que nadie tocó en tres
años sigue teniendo su mail, sus sets, sus locales y sus franjas horarias
guardados indefinidamente, y la finalidad que justifica guardarlos —darte acceso
a tu cuenta— dejó de existir en algún punto que nadie definió.

**No se implementó, y el motivo no es esfuerzo.** Cualquier regla de expiración
borra los datos de alguien que no pidió que se los borren, y las tres formas de
hacerlo son decisiones distintas:

| Opción | Qué implica |
|---|---|
| Avisar y borrar | Un mail a los 24 meses de inactividad y borrado a los 30 días si nadie entra. Es lo que hace la mayoría, y depende de que el mail llegue — una dirección abandonada es justo el caso donde no llega |
| Anonimizar y quedarse con los sets | Rompe el producto: un set sin dueño no le sirve a nadie, y el contenido del DJ es lo único que el RoPA dice explícitamente que se va cuando se va la persona |
| Declararlo y no hacerlo | Poner en la política "guardamos tu cuenta mientras exista" y dejarlo. Defendible para un producto con un alfa de usuarios; deja de serlo con volumen |

Mi recomendación es la primera, con 24 meses y aviso — y ahora tiene una pieza
que antes no existía: **el borrado con gracia de 30 días ya está construido.**
Una expiración por inactividad sería marcar `deletion_requested_at` en las
cuentas inactivas y dejar que el mismo barrido haga el resto, que es bastante
menos trabajo del que era la semana pasada.

---

## 2. El ítem que estaba resuelto y no declarado

### «Manejo downgrade PRO+ — persistencia controlada»

StageLink lo tiene como tarea. EnergyCurve **ya lo resolvió, y bien**, en
`services/playlist-service.ts`:

> *"Blocks creation and nothing else. Everything already saved stays visible and
> editable, including for someone who ends up over the cap after a downgrade —
> their playlists are their work, not leverage."*

Es la respuesta correcta y el comentario dice por qué. **Lo que falta es que no
está dicho en ningún lado que un usuario lea**: ni en la política de privacidad,
ni en los términos, ni en la página de precios. Alguien que baja de plan no tiene
forma de saber si va a perder los sets que pasan del límite, y la respuesta —no—
es buena noticia que nadie está dando.

No se agregó en este cambio porque es copy de producto en la página de precios, y
esa decisión es de Robertino. Queda anotado como lo que es: un comportamiento
correcto, sin declarar.

---

## 3. La lista completa, 70 ítems

Los estados: **✅** cubierto · **⚠️** cubierto por otra vía o parcialmente ·
**❌** hueco · **—** no aplica, con el motivo.

### Fundamentos legales (8)

| Ítem de StageLink | EnergyCurve |
|---|---|
| Definir rol legal (Data Controller) | ✅ `governance.md` §2: responsable = StageLink LLC |
| Identificar regulaciones aplicables | ✅ `gap-assessment.md` §1: GDPR como marco base, y CCPA excluido **por umbrales y no por geografía** |
| Definir base legal de procesamiento | ✅ Por tratamiento en el RoPA, y declarada al titular en la política |
| **Definir edad mínima de uso** | **H-1 — cerrado acá** |
| Definir jurisdicción legal | ✅ Términos, con el regulador nombrado para UE/UK y Argentina |
| Redactar Privacy Policy | ✅ EN + ES, con afirmaciones verificadas por test |
| Redactar Terms of Service | ✅ EN + ES |
| Redactar Cookie Policy | ✅ EN + ES, y es donde vive la retirada del consentimiento |

### Consentimiento y tracking (6)

| Ítem | EnergyCurve |
|---|---|
| Definir categorías de cookies | ✅ Dos: esenciales y analítica. No hay marketing |
| Implementar cookie banner UI | ✅ PR #182, y con test E2E de que rechazar cuesta lo mismo que aceptar |
| Bloquear scripts sin consentimiento | ✅ Verificado **vivo**: cero referencias a PostHog en el HTML antes de aceptar |
| Guardar consentimiento del usuario | ✅ Y el silencio se lee como **no**, que es la única lectura de "consentimiento" que lo es |
| Permitir cambio de consentimiento | ✅ En la política de cookies, y **borra en vez de invertir**, así la persona vuelve a responder con la explicación delante |
| Implementar rechazo de cookies | ✅ Y la revocación **llega al tercero** (`opt_out_capturing` + `reset`), que era el bug del PR #211 |

### Derechos del usuario (8)

| Ítem | EnergyCurve |
|---|---|
| Definir alcance de derechos DSAR | ✅ `dsar-procedure.md` §1, los siete derechos con su vía |
| Endpoint exportar datos | ✅ `GET /api/account/export`, con el límite de tasa más duro del producto |
| Endpoint eliminar cuenta | ⚠️ `deleteUserEverywhere` + self-serve con gracia de 30 días. La **ejecución** depende de `CRON_SECRET` |
| Endpoint actualizar datos | ⚠️ Nombre self-serve; el email va por pedido registrado, porque mueve la identidad de login |
| UI botón eliminar cuenta | ⚠️ Construido, sin mergear |
| UI descargar mis datos | ✅ En la página de cuenta, **no** en la política — un derecho que hay que leer un documento legal para descubrir es un derecho que casi nadie ejerce |
| Verificación de identidad | ✅ Y con la regla que resiste el error obvio: un pedido que llega **desde** la cuenta ya está verificado; pedir un documento sería recolectar datos nuevos para proteger datos viejos |
| **Logging de solicitudes** | **H-2 — cerrado en otro PR** |

### Data mapping (7)

Los siete **✅**, y el RoPA va más lejos que lo que el plan de StageLink pide: no
es un inventario, es un documento que **nombra su tabla y sus columnas** por
tratamiento, así que se puede correr contra la base — y hay un test que lo corre.
Un *Data Inventory Sheet* aparte sería una segunda copia de lo mismo, sin el test.

### Privacy by design (8)

| Ítem | EnergyCurve |
|---|---|
| Revisar minimización de datos | ✅ `privacy-by-design.md` §1, auditado leyendo **todas** las consultas y no la intención del código |
| Separación multi-tenant | ✅ Y es el control central del producto: RLS con cero políticas, así que `services/` **es** la frontera. Auditado sin hallar IDOR, con tests |
| Encriptación en tránsito | ✅ TLS 1.3 verificado contra producción |
| Encriptación en reposo | ✅ De disco, por Supabase. Sin cifrado por columna, **y con el motivo escrito**: cifrar contra un atacante que ya tiene la service-role key no compra nada |
| Evitar logs sensibles | ✅ Hallazgo S-03 corregido, con test de que el cuerpo, la dirección y la IP no aparecen |
| Anonimización de datos | ⚠️ Donde se puede. Y `privacy-by-design.md` §4 dice **dónde no y por qué**, que importa más que la lista de dónde sí |
| Control de acceso RBAC | ✅ `rbac-matrix.md`, con la corrección de que acá hay **dos** niveles y no tres |
| Auditoría de accesos | ⚠️ De **acciones de admin**, sí (`admin_audit_log`). De **lecturas de datos, no, a propósito**: loguear cada lectura construiría un registro de qué escucha cada DJ, que es justo el dato que el producto promete no acumular |

### Data retention (5)

| Ítem | EnergyCurve |
|---|---|
| Definir políticas de retención | ✅ Cinco ventanas, cada una con el criterio de por qué ese número |
| Implementar borrado automático | ⚠️ Escrito y **no corriendo**: falta `CRON_SECRET` |
| Implementar anonimización | ✅ El audit log pierde el email a los 365 días; `billing_events` pierde el payload a los 90 |
| **Manejo de cuentas inactivas** | **H-3 — abierto, y es una decisión** |
| **Manejo downgrade PRO+** | ⚠️ **Resuelto en el código y sin declarar** — ver §2 |

### Terceros y transferencias (9)

Todos **✅** salvo el que no es código: los **DPAs siguen sin firmar**, y
`international-transfers.md` marca los mecanismos como *sin verificar* en vez de
poner un tilde sobre un supuesto. El inventario, el mapa de transferencias, el
TIA y la página pública `/subprocessors` existen, y la página tiene un test que
la ata al software — incluida la afirmación de que Crisp **no** es un encargado,
que el RoPA decía que sí.

Un ítem de StageLink no aplica: *"Limitar scopes de APIs"* — acá la única
integración con scopes es WorkOS, y las demás son claves de servidor sin
granularidad que limitar.

### Incidentes (5)

Cuatro **✅** —protocolo, notificación a 72 h, plantilla y registro— y uno **❌**:
*"Sistema de detección"*. `alerting.md` lo dice arriba de todo: **hoy no hay
ninguna alerta corriendo.** Desde el 11/09 hay Sentry, pero la alerta hay que
crearla en su panel. El tabletop encontró que ante una filtración de la
service-role key **no nos enteraríamos**.

### Analytics (5)

Los cinco **✅**, y dos por encima de lo que el plan pide: no se manda la IP, y no
hay autocapture. *"Definir profiling"* está contestado en la DPIA con el
razonamiento y no con un sí o un no: el producto puntúa **un set de música**, no
a una persona, y nada del resultado describe, evalúa ni predice al DJ.

### Documentación (4)

Los cuatro **✅**, con una diferencia de método que vale nombrar: acá la *"revisión
periódica"* no es un recordatorio sino **tests que fallan cuando un documento
miente**. Lo que sigue sin tener fecha es la revisión de lo que **no** vive en el
repo —permisos de consolas, DPAs, backups—, anotada como semestral en
`security-measures.md` §4.

### UX privacy (4)

| Ítem | EnergyCurve |
|---|---|
| Diseñar Privacy Settings UI | ⚠️ No hay un panel llamado así. Está repartido donde se usa: el consentimiento en el banner y en la política de cookies, el idioma y la notación donde se cambian, y export / pedidos / borrado en la página de cuenta. **Es deliberado** y está escrito en esa página: duplicar los controles crearía dos lugares donde mirar y uno se desincronizaría |
| Mostrar uso de datos | ⚠️ El export dice **qué no tiene** (una lista `heldElsewhere` que nombra a WorkOS, Stripe y PostHog), que es la mitad que nadie muestra. Lo que no hay es una pantalla de "esto es lo que sabemos de vos" |
| UX de consentimiento claro | ✅ El banner **es** el aviso en el punto de recolección: dice quién recolecta, para qué, y —lo que casi nunca se dice— **qué no hace**, más que rechazar no rompe nada |
| Integrar privacidad en onboarding | ❌ No está. Prioridad baja con un banner que ya aparece antes de recolectar nada |

---

## 4. Lo que este cruce no puede decir

- **No leí el código de StageLink.** El cruce es contra su **plan**, no contra su
  implementación, así que un ítem marcado ✅ allá puede estar en cualquier estado
  y este documento no lo sabe. Lo que compara es *qué se propusieron controlar* y
  *qué controla EnergyCurve*.
- **No es una opinión legal**, igual que la matriz de cumplimiento.
- **Los tres huecos son los que encontró esta lista.** Un hueco que ninguno de los
  dos planes contempla sigue siendo invisible para los dos, y compartir una
  familia de producto también significa compartir los puntos ciegos.
