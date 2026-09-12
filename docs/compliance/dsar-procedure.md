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
| Rectificación del email | 16 | Por mail. Cambia el usuario de login y las asociaciones de sets compartidos | 30 días |
| Supresión | 17 | Por mail → acción de admin en `/backstage` | 30 días |
| Limitación | 18 | Por mail → suspensión de la cuenta | 30 días |
| Oposición a analytics | 21 | **Self-serve**: banner y `/cookie-policy` | inmediato |
| Oposición (general) | 21 | Por mail | 30 días |

Los tres self-serve son los únicos que no dependen de que una persona esté
disponible. Para los otros cuatro, el plazo corre igual.

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

En `docs/security/incidents/` — misma carpeta que los incidentes, porque un
DSAR mal manejado deriva en uno.

Por cada pedido: fecha de recepción, derecho ejercido, cómo se verificó la
identidad, qué se hizo, fecha de respuesta. **Sin copiar el contenido del
pedido ni datos del titular**: el registro existe para demostrar cumplimiento
(Art. 5(2)), y un registro de DSAR que acumula datos personales se convierte en
el tratamiento que hay que justificar.

---

## 6. Lo que sigue sin estar

| Qué | Por qué importa | De quién |
|---|---|---|
| Segundo contacto en `hello@energycurve.app` | El plazo corre aunque no haya nadie | Robertino |
| Borrado self-serve | Hoy la supresión depende de una persona disponible | decisión de producto |
| Borrado de la persona en PostHog al borrar la cuenta | Queda fuera de `deleteUserEverywhere` | pendiente |
| Validación end-to-end del borrado | Nunca se corrió contra una cuenta real | bloqueado en las cuentas de prueba |
