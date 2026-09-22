# Procedimiento de DSAR

**Proyecto 3 · Privacy & Compliance · F2.** Fecha: 2026-09-11.

Qué hacer cuando alguien ejerce un derecho. Existe porque el gap assessment
encontró que "mandá un mail a hello@" **sí es** un mecanismo válido bajo GDPR —
siempre que alguien conteste dentro de los plazos y verifique quién pregunta.
Ninguna de esas dos condiciones estaba asegurada, y ninguna es código.

---

## 1. Qué puede pedir alguien, y qué hay hoy

| Derecho | Art. | Cómo se ejerce hoy | Plazo |
|---|---|---|---|
| Acceso y portabilidad | 15, 20 | **Self-serve**: `/dashboard/account` → "Download my data" | inmediato |
| Rectificación del nombre | 16 | **Self-serve**: `/dashboard/account` | inmediato |
| Rectificación del email | 16 | **Pedido registrado**: `/dashboard/account`. Cambia el usuario de login y las asociaciones de sets compartidos | 30 días |
| Supresión | 17 | **Self-serve**: `/dashboard/account`, con confirmación escrita. Se ejecuta a los 30 días y es reversible durante todos ellos | 30 días |
| Limitación | 18 | **Pedido registrado**: `/dashboard/account` | 30 días |
| Oposición a analytics | 21 | **Self-serve**: banner y `/cookie-policy` | inmediato |
| Oposición (general) | 21 | **Pedido registrado**: `/dashboard/account` | 30 días |

Los tres self-serve son los únicos que no dependen de que una persona esté
disponible. Para los otros cuatro, el plazo corre igual.

### El borrado, que ahora sí es un botón

Y conviene decir qué hace y qué no, porque es el único de los siete que ejecuta
algo sin que intervenga una persona:

- **Se ejecuta a los 30 días**, no en el momento, y es reversible durante todos
  ellos desde la misma página. La gracia está declarada en la política de
  privacidad, porque una política que dice "borramos tus datos" sobre un proceso
  que tarda un mes está diciendo algo distinto de lo que pasa.
- **La cuenta sigue funcionando** durante la gracia, y eso no es tibieza: quien
  acaba de pedir el borrado es justamente quien más necesita exportar sus datos
  antes. Contestar un pedido de supresión sacándole la portabilidad sería
  contestarlo con un problema nuevo.
- **Cancela la suscripción**: deja de renovarse al pedirlo, el plan corre hasta
  el período ya pagado, y vuelve atrás si se retira el pedido. Y al ejecutarse,
  la suscripción se cancela del todo — antes de borrar la fila, porque la fila es
  el único lugar donde vive el id de la suscripción.
- **Lo que sigue sin borrar**, dicho acá para que no se lea como total: la
  persona en PostHog (queda fuera de `deleteUserEverywhere`, sigue pendiente),
  las filas de `billing_events` sin payload (garantía de idempotencia de Stripe),
  y el registro de Stripe, que se conserva por obligación fiscal. Un borrado
  descrito como total que no lo es es peor que uno descrito con precisión.

### Lo que cambió el 22/09/2026 en los otros tres, y lo que no

Tres de los que decían "por mail" ahora son un **pedido registrado**
(`privacy_requests`, migración 0030): entra desde la cuenta, queda con su plazo
guardado en la fila, se ve en `/dashboard/account` con la fecha, y aparece en el
panel ordenado por lo que vence antes.

**Lo que no cambió: sigue contestando una persona, y el plazo es el mismo.**
Nada se ejecuta solo. Esto no es automatización de derechos — es el registro que
les faltaba, y existe por una frase de la §2 de este mismo documento: el reloj
arranca cuando llega el pedido, no cuando se lee. Con un operador, eso convierte
una casilla de mail en una superficie de cumplimiento, y una casilla de mail no
ordena por vencimiento ni dice qué está vencido.

Dos consecuencias que valen más que la tabla:

- **La fecha la ve también quien pidió.** Un reloj que ve un solo lado es un
  reloj que se pasa en silencio, y es la mitad del problema que "mandá un mail"
  nunca resolvió.
- **La verificación de identidad sale gratis y hay que no arruinarla.** El
  pedido llega desde una sesión autenticada, o sea desde la cuenta. Por la regla
  de la §3, eso ya está verificado: pedir un documento para confirmar lo que el
  propio canal confirma es recolectar datos nuevos para proteger datos viejos.
  El mail de aviso lo dice explícitamente, porque es la instrucción que más
  fácil se olvida a las nueve de la mañana.

---

## 2. Plazos

- **30 días corridos** desde la recepción (Art. 12(3)), no días hábiles.
- Prorrogable **2 meses más** si el pedido es complejo, **avisando dentro del
  primer mes**. La prórroga sin aviso no existe: el aviso es lo que la crea.
- Si no se va a actuar, hay que decirlo **dentro del mismo mes**, con el motivo
  y el derecho a reclamar ante una autoridad. Ignorar un pedido no es una
  respuesta válida ni siquiera cuando el pedido es improcedente.
- **Sin costo.** Solo se puede cobrar ante pedidos manifiestamente infundados o
  excesivos, y hay que poder demostrarlo. En la práctica: no cobrar.

**El reloj arranca cuando llega el mail, no cuando se lee.** Es la razón por la
que el bus factor 1 es un riesgo de cumplimiento y no solo operativo: una
semana sin mirar la casilla se come un tercio del plazo.

---

## 3. Verificación de identidad

El Art. 12(6) permite pedir información adicional **solo si hay dudas
razonables** sobre quién pregunta. No es una licencia para pedir documentos.

**La regla que se aplica acá:**

1. **Si el pedido llega desde la dirección de la cuenta** → esa es la
   verificación. No se pide nada más. Pedir un documento de identidad para
   confirmar lo que el propio canal ya confirma es recolectar datos nuevos para
   proteger datos viejos, y empeora la situación.
2. **Si llega desde otra dirección** → responder a la **dirección de la cuenta**,
   no a la que escribió, pidiendo confirmación. Eso verifica sin pedir nada: solo
   el titular puede contestar desde ahí.
3. **Si la cuenta ya no existe** → no hay nada que entregar y no hay a quién
   verificar. Contestar eso.
4. **Nunca pedir foto de documento, selfie ni datos de tarjeta.** Para los datos
   que este producto tiene — mail, nombre y metadata de sets — el riesgo de esa
   recolección supera al que evita.

El único caso que justifica pedir algo más es un pedido de **supresión** llegado
desde otra dirección y sin respuesta a la confirmación: ahí no se actúa, porque
borrar la cuenta de alguien por pedido de un tercero es el daño irreversible que
esta verificación existe para prevenir.

---

## 4. Cómo se ejecuta cada uno

**Acceso / portabilidad.** Decirle que entre a `/dashboard/account` y use
"Download my data". Si no puede entrar, el export se puede correr desde
`services/data-export-service.ts` con su `profileId`. El JSON nombra
explícitamente lo que **no** contiene (WorkOS, Stripe, PostHog).

**Rectificación del email.** Cambiarlo en WorkOS. **Antes de hacerlo, avisarle
que los sets compartidos con él dejan de aparecer**, porque `set_collaborators`
está keyeado por dirección (migración 0023). Quien invitó tiene que volver a
invitar a la dirección nueva.

**Supresión.** `/backstage` → usuario → borrar. Eso ejecuta
`deleteUserEverywhere`: borra en WorkOS, borra el perfil, cascada a playlists,
tracks, análisis, versiones, plantillas, taxonomías, colaboraciones y uso, y
limpia los payloads de `billing_events`. **Lo que no se borra y hay que decirle:**
las filas de `billing_events` sobreviven sin payload (son la garantía de
idempotencia de Stripe), Stripe conserva el registro de la transacción por
obligación fiscal propia, y PostHog conserva los eventos ya recolectados salvo
que se pida el borrado por su API.

**Limitación.** Suspender desde `/backstage`. La cuenta deja de poder escribir
en toda la aplicación, no solo de ver el dashboard.

**Oposición a analytics.** Ya es self-serve. Si pregunta igual, indicar
`/cookie-policy`.

---

## 5. Qué registrar

**Los pedidos que entran por `/dashboard/account` se registran solos** en
`privacy_requests`, con fecha de recepción, derecho ejercido, plazo, estado y —
al cerrarlos— fecha y nota de resolución. Cerrarlo desde el panel además escribe
una fila en `admin_audit_log`. No hay nada que anotar a mano.

**Los que llegan por mail siguen siendo a mano**, en `docs/security/incidents/`
— misma carpeta que los incidentes, porque un DSAR mal manejado deriva en uno.
Por cada uno: fecha de recepción, derecho ejercido, cómo se verificó la
identidad, qué se hizo, fecha de respuesta.

En los dos casos vale la misma regla, y la tabla la respeta de una forma que
conviene explicar porque a primera vista parece contradecirla: **el registro no
acumula datos personales indefinidamente.** `privacy_requests` sí guarda lo que
la persona escribió, porque sin eso no se puede atender el pedido — pero
`sweepPrivacyRequestDetails` lo borra a los 365 días **de la resolución**, y lo
que queda es el derecho ejercido, las fechas y el resultado. Eso es lo que
demuestra cumplimiento (Art. 5(2)) sin convertir el registro en el tratamiento
que hay que justificar.

---

## 6. Lo que sigue sin estar

| Qué | Por qué importa | De quién |
|---|---|---|
| Segundo contacto en `hello@energycurve.app` | El plazo corre aunque no haya nadie. **La cola nueva lo hace visible, no lo resuelve**: un vencimiento en rojo en un panel que nadie abre es lo mismo que un mail sin leer | Robertino |
| Aplicar la migración `0030` | Hasta que corra, el formulario de la página de cuenta falla al guardar y muestra el mensaje que apunta a `hello@` — que es el fallo correcto, y también significa que la cola está vacía por el motivo equivocado | Robertino |
| ~~Borrado self-serve~~ | **Hecho el 22/09/2026.** Lo que queda es `CRON_SECRET`: el pedido se registra y nada lo ejecuta, y a la persona se le dio una fecha. El panel muestra los vencidos en rojo | Robertino |
| Borrado de la persona en PostHog al borrar la cuenta | Queda fuera de `deleteUserEverywhere` | pendiente |
| Validación end-to-end del borrado | Nunca se corrió contra una cuenta real | bloqueado en las cuentas de prueba |
