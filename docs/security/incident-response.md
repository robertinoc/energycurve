# Respuesta a incidentes y notificación de brechas

Fase F8 de la *Auditoría de Seguridad* y fase F5 de *Privacy & Compliance*: el
mismo documento sirve a los dos, porque separarlos garantiza que uno quede
desactualizado.

Escrito el 11/09/2026. **No existía ninguno.**

---

## Una advertencia sobre el tamaño del equipo

EnergyCurve lo opera una persona. Un plan que reparte roles entre un
coordinador, un responsable técnico y un responsable de comunicación es una
ficción que no va a servir a las tres de la mañana.

Este plan asume **una sola persona**, y su valor no está en asignar roles sino en
tener escritas de antemano las decisiones que uno no toma bien bajo presión:
qué apagar primero, qué no romper mientras se contiene, y cuándo empieza a correr
el reloj de las 72 horas.

Si algún día hay equipo, lo primero que hay que agregar es quién es el suplente.

---

## Severidad

Se decide en un minuto, no en una reunión.

| Nivel | Qué es | Ejemplo |
|---|---|---|
| **S1** | Datos personales expuestos o alterados por alguien que no debía | La service-role key se filtró · un IDOR sirvió sets de otros · un volcado de la base apareció afuera |
| **S2** | Acceso o integridad en riesgo sin exposición confirmada | Sesión de admin comprometida sin evidencia de uso · un bypass del middleware publicado que nos aplica |
| **S3** | Caída o degradación sin componente de datos | Supabase pausado · un deploy roto · el proveedor de IA caído |
| **S4** | Riesgo sin explotación | Un aviso de dependencia que nos aplica pero no fue usado |

**S1 y S2 arrancan el reloj regulatorio.** El resto no.

---

## Los primeros treinta minutos

En orden, y el orden importa.

### 1. Anotar la hora (1 minuto)

La hora en que **te enteraste**, no la hora en que pasó. El plazo de 72 horas del
Art. 33 corre desde que el responsable tiene conocimiento, y esa hora hay que
poder defenderla después. Abrí un archivo y escribí todo lo que hagas con hora.

### 2. Contener sin destruir la evidencia (10 minutos)

Lo que se apaga depende de qué se comprometió:

| Si se comprometió | Hacé esto | **No** hagas esto |
|---|---|---|
| La service-role key de Supabase | Rotarla en Supabase, actualizarla en Vercel, redeploy | Borrar los logs de acceso: son lo único que dice qué se leyó |
| Una sesión de admin | Sacar el mail de `BACKSTAGE_ADMIN_EMAILS`, redeploy | Borrar la cuenta: perdés el rastro |
| El secreto de webhooks de Stripe | Rotarlo en Stripe, actualizarlo en Vercel | Borrar filas de `billing_events`: es el registro de qué se procesó |
| `CURVE_SHARE_SECRET` | Rotarlo. Invalida **todos** los links públicos a la vez, que es el único mecanismo que hay | — |
| La clave de Anthropic | Rotarla en la consola de Anthropic | — |
| Una cuenta de usuario | Suspenderla desde el panel | — |

**Contener no es limpiar.** Sacar de circulación una credencial es contención;
borrar filas o logs es destruir la evidencia con la que después hay que
responderle a una autoridad.

### 3. Determinar el alcance (20 minutos, o lo que haga falta)

Tres preguntas, en este orden:

1. **¿Qué datos?** Contra el RoPA (`docs/compliance/ropa.md`), que dice exactamente
   qué hay en cada tabla. No adivines de memoria.
2. **¿De cuántas personas?** Consulta contra la base, no estimación.
3. **¿Se accedió, o solo se pudo acceder?** La diferencia cambia la obligación de
   notificar. Si no se puede distinguir, se asume que sí.

### 4. Decidir si hay que notificar

```
¿Datos personales expuestos o alterados?
├─ No  → No es brecha de datos. Seguí con la remediación técnica.
└─ Sí  → ¿Es improbable que implique un riesgo para las personas?
         ├─ Sí (ej. datos cifrados y la clave no se comprometió)
         │   → No se notifica a la autoridad, PERO SE REGISTRA IGUAL.
         │     El registro es obligatorio aunque la notificación no lo sea.
         └─ No → NOTIFICAR A LA AUTORIDAD DENTRO DE LAS 72 HORAS.
                 ¿Riesgo ALTO para las personas?
                 └─ Sí → Notificar TAMBIÉN a cada persona afectada, sin demora.
```

**Una notificación incompleta dentro de plazo es mejor que una completa fuera de
plazo.** El Art. 33.4 permite expresamente entregar la información por fases. La
falta más cara no es no saberlo todo: es llegar tarde.

---

## Qué tiene que decir la notificación

Art. 33.3, los cuatro puntos, y no hace falta más:

1. **Qué pasó**, incluyendo las categorías de datos y el número aproximado de
   personas afectadas.
2. **A quién contactar** por más información.
3. **Qué consecuencias probables** tiene para las personas.
4. **Qué medidas** se tomaron o se van a tomar, incluidas las de mitigación.

Plantilla lista para completar en `docs/security/breach-notification-template.md`.

**A quién se le notifica** depende de dónde estén los usuarios. StageLink LLC es
una empresa de EE.UU. sin establecimiento en la UE, así que si hay usuarios en la
UE hace falta un representante del Art. 27 y se notifica a la autoridad del
estado miembro donde esté ese representante. **Esto no está resuelto hoy** y es
una decisión pendiente, no un detalle de este plan.

---

## Registro de incidentes

Obligatorio para **toda** brecha, se notifique o no (Art. 33.5). Un archivo por
incidente en `docs/security/incidents/`, con:

- Hora de conocimiento y hora de los hechos, si se sabe.
- Severidad y por qué.
- Qué datos, de cuántas personas.
- Qué se contuvo, cuándo, y qué se decidió sobre notificar, con el motivo.
- Qué cambió después para que no vuelva a pasar.

---

## Ejercicio de mesa: la service-role key se filtró

Corrido en papel el 11/09/2026, que es la única forma disponible con un equipo de
una persona. Sirve para encontrar los huecos del plan, y encontró tres.

**Escenario.** Una variable de entorno aparece en un log público de un build de
un repositorio de terceros. La clave da lectura y escritura a toda la base,
salteando RLS por diseño.

**Recorrido.**

| Paso | ¿Se puede hacer hoy? |
|---|---|
| Detectar que se filtró | ❌ **Hueco 1.** No hay alerta de ningún tipo. Nos enteraríamos por un tercero |
| Rotar la clave | ✅ Supabase, después Vercel, después redeploy. ~10 minutos |
| Saber qué se leyó con ella | ❌ **Hueco 2.** Los logs de Postgres de Supabase no están configurados para retener accesos por origen. Sin eso no se puede distinguir "se pudo acceder" de "se accedió", y hay que asumir lo peor |
| Saber a cuántos afecta | ✅ Es toda la base. `select count(*) from profiles` |
| Notificar en 72 horas | ⚠️ **Hueco 3.** Falta definir la autoridad y el representante del Art. 27 |
| Avisar a los usuarios | ⚠️ Se puede por Resend, pero no hay plantilla ni lista preparada |

**Conclusión del ejercicio.** La contención está bien: rotar una credencial es
rápido y está documentado. **Lo que falta es todo lo de antes y lo de después:**
no nos enteraríamos solos, y no podríamos decir qué se llevaron.

Las tres acciones que salen de acá están en el plan de remediación, no sueltas en
este documento.

---

## Lo que este plan no puede resolver, y hay que decirlo

- **No hay detección.** Ni alertas, ni Sentry, ni monitoreo de accesos anómalos.
  Un plan de respuesta sin detección responde a lo que alguien te cuenta.
- **No hay backups documentados.** No hay evidencia de PITR ni de una restauración
  probada. Un incidente de integridad — datos alterados, no filtrados — hoy no
  tiene procedimiento de recuperación.
- **No hay suplente.** Si la persona que opera esto no está disponible, no hay
  plan.
