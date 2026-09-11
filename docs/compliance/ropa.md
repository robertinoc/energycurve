# Registro de Actividades de Tratamiento (RoPA)

Fase F0 del proyecto *3. Privacy & Compliance*. Art. 30 del GDPR.

Derivado **del código y del esquema**, no de una entrevista. Cada fila dice en
qué tabla y columna vive el dato, así que se puede verificar contra la base en
vez de creerle al documento. Fecha: 11/09/2026.

**Responsable del tratamiento:** StageLink LLC, que opera EnergyCurve.
**Contacto:** hello@energycurve.app

---

## Aclaración de alcance, porque el plan asumía otra cosa

El plan pedía clasificar la sensibilidad de "los datos de consumo" porque
"los patrones de consumo revelan hábitos de vida". Eso es cierto de un producto
de energía eléctrica domiciliaria y **no aplica acá**: EnergyCurve analiza la
curva de energía de un set de DJ, que es una propiedad de la música, no de una
persona. No hay medidores, no hay domicilio, no hay horarios de vida.

Lo que sí hay es una cantidad modesta de datos personales, más una inferencia
que conviene nombrar: el repertorio y los horarios de trabajo de un DJ son
información profesional que un competidor podría querer.

---

## Tratamientos

### T1 · Cuenta y autenticación

| | |
|---|---|
| **Datos** | Dirección de mail, nombre, credenciales |
| **Dónde** | WorkOS (identidad y contraseña). Nosotros guardamos `profiles.email` y `profiles.workos_user_id` |
| **Finalidad** | Dar acceso a la cuenta |
| **Base legal** | Ejecución de un contrato (Art. 6.1.b) |
| **Encargado** | WorkOS, EE.UU. |
| **Retención** | Mientras la cuenta exista |
| **Borrado** | `deleteUserEverywhere` borra el usuario de WorkOS y la fila de `profiles`, que cascadea al resto |

### T2 · Playlists y tracks

| | |
|---|---|
| **Datos** | Nombre del set, descripción, género, contexto, franja horaria (`slot_start_minutes`, `slot_end_minutes`), **local** (`playlists.venue`), y por track: título, artista, BPM, tonalidad, comentario, duración, energía |
| **Dónde** | `playlists`, `tracks` |
| **Finalidad** | Es el producto |
| **Base legal** | Ejecución de un contrato |
| **Encargado** | Supabase |
| **Retención** | Hasta que el usuario borre el set o la cuenta |
| **Nota de sensibilidad** | `venue` más `slot_*` más la fecha equivale a **dónde y cuándo trabaja una persona**. No es dato especial del Art. 9, pero es lo más identificante que guardamos y merece decirse |

### T3 · Historial de análisis y versiones

| | |
|---|---|
| **Datos** | Snapshots de curva y puntaje, órdenes guardados |
| **Dónde** | `analyses`, `playlist_versions` |
| **Finalidad** | KPI de adopción, y comparar versiones del mismo set |
| **Base legal** | Ejecución de un contrato (comparar) e interés legítimo (KPI) |
| **Retención** | **Indefinida. Sin política ni job de limpieza.** Brecha |

### T4 · Facturación

| | |
|---|---|
| **Datos** | Id de cliente y de suscripción de Stripe, plan, estado, fin de período, motivo de cancelación. Nombre, dirección y últimos cuatro dígitos viven en Stripe |
| **Dónde** | Columnas de `profiles` + `billing_events` |
| **Finalidad** | Cobrar y dar los permisos pagos |
| **Base legal** | Ejecución de un contrato, y obligación legal para los registros contables |
| **Encargado** | Stripe, EE.UU. |
| **Retención** | **`billing_events` guarda el evento completo de Stripe en `payload jsonb`, para siempre, sin limpieza.** Eso incluye nombre, mail, dirección de facturación y país. Brecha, y la más clara de todas |
| **Borrado** | El borrado de cuenta **no** toca el cliente de Stripe ni depura `billing_events`: la FK es `on delete set null`, así que el payload sobrevive al usuario |

### T5 · Analítica de producto

| | |
|---|---|
| **Datos** | `profileId` como identificador, eventos de producto, URL de página vista |
| **Dónde** | PostHog |
| **Finalidad** | Entender uso y retención |
| **Base legal** | Debería ser consentimiento. **Hoy no se pide ninguno** |
| **Encargado** | PostHog, **región EE.UU.** por defecto |
| **Configuración** | IP desactivada, autocapture desactivado, grabación de sesión desactivada, DNT respetado. Es una configuración deliberadamente conservadora |
| **Brechas** | (a) Sin banner de consentimiento y las cookies se ponen en la primera carga. (b) Las vistas de página incluyen la query string, y `/reset-password?token=…` y `/verify-email?pending=…&email=…` son páginas donde la gente aterriza. (c) La política dice "Supabase (región UE)" y eso es sobre Supabase, no sobre analytics |

### T6 · Mensajes del formulario de contacto

| | |
|---|---|
| **Datos** | Nombre, mail, texto libre. IP y user-agent en el momento del envío |
| **Dónde** | Mail vía Resend al buzón de soporte. **Ya no en los logs** (corregido el 11/09, hallazgo S-03) |
| **Base legal** | Interés legítimo en responder |
| **Retención** | La del buzón de correo. Sin política |
| **Brecha** | La política de privacidad no menciona que se guarde la IP |

### T7 · Sets colaborativos

| | |
|---|---|
| **Datos** | Mail del invitado, mail del dueño, texto de las sugerencias |
| **Dónde** | `set_collaborators`, `set_suggestions` |
| **Base legal** | Ejecución de un contrato |
| **Brecha** | **La invitación no requiere aceptación.** Cualquiera puede asociar tu dirección a su set, y aparece en tu lista de "compartidos conmigo" apenas te registres. Y los dos mails quedan mutuamente expuestos |

### T8 · Enriquecimiento por título

| | |
|---|---|
| **Datos** | Artista y título enviados a GetSongBPM |
| **Base legal** | Consentimiento: **es opt-in por playlist**, que es la forma correcta |
| **Encargado** | GetSongBPM, EE.UU. |
| **Brecha** | No hay DPA disponible con ellos. Es una API gratuita con backlink obligatorio |

### T9 · Ordenamiento inteligente

| | |
|---|---|
| **Datos** | Metadata de tracks (título, artista, BPM, tonalidad, energía) enviada a Anthropic |
| **Base legal** | Ejecución de un contrato: el usuario pide el reordenamiento |
| **Encargado** | Anthropic, EE.UU. |
| **Nota** | No se manda audio, ni mail, ni identificador de usuario. Solo metadata musical |

### T10 · Mails transaccionales

| | |
|---|---|
| **Datos** | Dirección de mail, idioma preferido (`profiles.preferred_locale`) |
| **Encargado** | Resend, EE.UU. |
| **Finalidad** | Reset de contraseña, verificación, confirmación de compra, aviso de pago fallido |

### T11 · Análisis de audio local

| | |
|---|---|
| **Datos** | **Ninguno sale del dispositivo** |
| **Nota** | El audio se analiza en el navegador con Web Audio y solo viaja el JSON resultante. Es la decisión de arquitectura con mejor consecuencia de privacidad del producto, y hay que defenderla en cada feature nueva. Ya se declinó explícitamente el análisis batch en servidor |

---

## Encargados

| Encargado | Qué trata | País | DPA |
|---|---|---|---|
| Vercel | Hosting, logs | EE.UU. | Por confirmar |
| Supabase | Base de datos | Por confirmar la región | Por confirmar |
| WorkOS | Identidad | EE.UU. | Por confirmar |
| Stripe | Pagos | EE.UU. | Por confirmar |
| PostHog | Analítica | **EE.UU.** | Por confirmar |
| Resend | Mails | EE.UU. | Por confirmar |
| Anthropic | Ordenamiento con IA | EE.UU. | Por confirmar |
| GetSongBPM | Lookup por título | EE.UU. | **Sin DPA disponible** |
| Crisp | Chat de soporte | UE | **Tiene variable en Vercel pero no se carga en el código.** Si se activa, hay que declararlo |

**Todas las transferencias son fuera de la UE.** Si hay usuarios en la UE hace
falta un mecanismo válido, y hoy no hay cláusulas contractuales tipo declaradas
en ningún lado.

---

## Brechas, ordenadas por lo que costaría

1. **Sin borrado de cuenta self-serve.** Solo existe como acción de admin. Un
   usuario no puede ejercer el derecho de supresión sin mandar un mail.
2. **Sin export de datos.** No hay ninguna forma de "descargar mis datos". El
   export de playlist es formato de DJ, no un DSAR.
3. **`billing_events` guarda payloads completos de Stripe para siempre**, y
   sobrevive al borrado de la cuenta.
4. **Sin banner de consentimiento**, con cookies de PostHog en la primera carga.
5. **Sin política de retención ni job de limpieza** en ningún tratamiento.
6. **Tokens de reset y verificación viajan en la URL** y quedan en los pageviews.
7. **Las invitaciones a sets no requieren aceptación.**
8. **Sin DPAs confirmados** con ningún encargado, y sin mecanismo de transferencia.
9. **El copy legal se autodeclara "placeholder"** en el encabezado de su archivo.

---

## Cómo verificar este documento

No hay que creerle. Cada fila de tratamiento nombra su tabla y sus columnas, así
que se puede correr contra la base y confirmar que no hay ninguna columna con
datos personales que no aparezca acá. La forma de mantenerlo honesto es esa, y no
volver a entrevistar a nadie.
