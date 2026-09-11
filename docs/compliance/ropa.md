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
| **Datos** | Dirección de mail, nombre, credenciales. Y preferencias de interfaz: `preferred_locale` (idioma) y `key_notation` (en qué notación leer las tonalidades) |
| **Dónde** | WorkOS (identidad y contraseña). Nosotros guardamos `profiles.email`, `profiles.workos_user_id`, `profiles.preferred_locale`, `profiles.key_notation` y `profiles.suspended_at` |
| **Finalidad** | Dar acceso a la cuenta |
| **Base legal** | Ejecución de un contrato (Art. 6.1.b) |
| **Encargado** | WorkOS, EE.UU. |
| **Retención** | Mientras la cuenta exista |
| **Borrado** | `deleteUserEverywhere` borra el usuario de WorkOS y la fila de `profiles`, que cascadea al resto |

### T2 · Playlists y tracks

| | |
|---|---|
| **Datos** | Nombre del set, `description`, `genre`, contexto, `target_shape`, `import_source`, franja horaria (`slot_start_minutes`, `slot_end_minutes`), **local** (`playlists.venue`), y por track: título, artista, BPM, tonalidad, `genre`, `comment`, duración, energía. Más el origen de importación: `tracks.source_uri`, `tracks.source_payload` y `playlists.source_header` |
| **Dónde** | `playlists`, `tracks` |
| **Finalidad** | Es el producto |
| **Base legal** | Ejecución de un contrato |
| **Encargado** | Supabase |
| **Retención** | Hasta que el usuario borre el set o la cuenta |
| **Nota de sensibilidad** | Dos cosas, no una. (1) `venue` más `slot_*` más la fecha equivale a **dónde y cuándo trabaja una persona**. (2) `source_uri` y `source_payload` guardan el `<ENTRY>` verbatim de la librería de Traktor o Rekordbox, y eso incluye `<LOCATION DIR=…>`: **la ruta absoluta en la máquina del DJ**, del estilo `Macintosh HD/:Users/:dj/:Music/:track.mp3`. Un directorio personal suele llevar el nombre real de la persona. Se guarda porque sin `LOCATION` el archivo reexportado no encuentra sus temas — es necesario para la finalidad, no accesorio — pero hay que declararlo, y ninguna de las dos columnas estaba nombrada acá hasta el 11/09/2026 |

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
| **Datos** | Id de cliente y de suscripción de Stripe, `plan`, `plan_status`, `plan_cancel_at`, `plan_cancellation_feedback`. Nombre, dirección y últimos cuatro dígitos viven en Stripe |
| **Minimización** | `plan_cancellation_feedback` **se escribe y nunca se lee**: ninguna pantalla, consulta ni informe lo consume. Es un enum de Stripe (`too_complex`, `too_expensive`…), no texto libre, así que el riesgo es bajo — pero un dato sin finalidad servida es un dato que sobra. O se usa para entender la baja, o se deja de guardar |
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
| **Brechas** | (a) ~~Sin banner de consentimiento.~~ **CERRADA 11/09/2026** (PR #182): nada se inicializa antes de la respuesta, y el silencio se lee como no. (b) ~~Las vistas de página incluyen la query string.~~ **CERRADA 11/09/2026**: se redacta por clave, y se redacta en vez de borrar la clave, así un valor tapado queda visible en los datos en vez de parecer que nunca estuvo. (c) **ABIERTA**: la política dice "Supabase (región UE)" y eso es sobre Supabase, no sobre analytics — PostHog está en región EE.UU. (d) **ABIERTA**: PostHog conserva lo recolectado antes de que existiera el banner |

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
| **Dónde** | `set_collaborators`, `set_suggestions`, y en `playlists` el turno de edición: `edit_lock_holder` (qué persona tiene la pluma) y `edit_lock_taken_at` |
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
| ~~Crisp~~ | ~~Chat de soporte~~ | — | **NO ES ENCARGADO (verificado 11/09/2026).** No hay una sola referencia a Crisp en `app/`, `lib/`, `components/` ni `services/`. Que exista una variable en Vercel no crea un tratamiento: lo crea el código que la usa. Si se activa, entra en el mismo PR que lo activa — `tests/subprocessors-accuracy.test.ts` está escrito para que esa omisión se note |

**Todas las transferencias son fuera de la UE.** Si hay usuarios en la UE hace
falta un mecanismo válido, y hoy no hay cláusulas contractuales tipo declaradas
en ningún lado.

Mapa completo, TIA y los pasos para verificar cada mecanismo:
[`international-transfers.md`](international-transfers.md). La versión pública
y abreviada es `/subprocessors`, y está atada al código por un test: una
integración nueva que no se declare pone el test en rojo.

---

## Brechas, ordenadas por lo que costaría

1. **Sin borrado de cuenta self-serve.** Solo existe como acción de admin. Un
   usuario no puede ejercer el derecho de supresión sin mandar un mail.
2. ~~**Sin export de datos.**~~ **CERRADA 11/09/2026** — `GET /api/account/export`,
   enlazado desde `/dashboard/account`. Devuelve la cuenta entera en JSON, nombra
   lo que NO contiene (WorkOS, Stripe, PostHog) y repite que el audio nunca sale
   del dispositivo. Tres pedidos por hora.
3. **`billing_events` guarda payloads completos de Stripe para siempre**, y
   sobrevive al borrado de la cuenta.
4. ~~**Sin banner de consentimiento.**~~ **CERRADA 11/09/2026** (PR #182) — el
   silencio se lee como no, rechazar cuesta un clic igual que aceptar (con un test
   E2E que compara el color y la altura computados de los dos botones), y Do Not
   Track responde por el visitante. Queda un resto: PostHog conserva lo
   recolectado ANTES del banner, y qué hacer con eso es una decisión pendiente.
5. **Sin política de retención ni job de limpieza** en ningún tratamiento.
   Parcialmente en curso: el PR #183 cubre `billing_events`. Siguen sin política
   `analyses` y `playlist_versions`.
6. **Tokens de reset y verificación viajan en la URL** y quedan en los pageviews.
7. **Las invitaciones a sets no requieren aceptación.**
8. **Sin DPAs confirmados** con ningún encargado, y sin mecanismo de transferencia.
9. **El copy legal se autodeclara "placeholder"** en el encabezado de su archivo.

---

## Cómo verificar este documento

No hay que creerle, y desde el 11/09/2026 tampoco hay que acordarse:
`tests/ropa-accuracy.test.ts` lee las migraciones y falla si una columna de
`profiles`, `playlists` o `tracks` no está nombrada en este documento ni
declarada en el test como dato no personal. Agregar una columna obliga a decidir
cuál de las dos cosas es.

Ese test encontró **16 columnas sin declarar** el día que se escribió, incluidas
las dos que guardan la ruta de archivos del DJ. Un documento de compliance que
nadie verifica se convierte en la peor clase de error: el que se lee como
autoritativo en un data room.
