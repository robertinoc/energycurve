# Privacy by design: minimización, defaults y retención

**Proyecto 3 · Privacy & Compliance · F3.** Fecha: 2026-09-11.
Complementa el RoPA (`docs/compliance/ropa.md`), que dice **qué** se trata. Esto
dice **cuánto**, **por cuánto tiempo** y **qué pasa si nadie toca nada**.

---

## 1. Minimización: lo que se escribe y nadie lee

El criterio no es "¿es sensible?" sino "¿hay alguna finalidad servida?". Un dato
sin finalidad servida sobra, aunque sea inocuo — Art. 5(1)(c).

Se auditó leyendo **todas** las consultas contra cada tabla, no la intención del
código.

### 1.1 `analyses`: cuatro columnas escritas siempre, leídas nunca

`analyses` guarda en cada análisis la `curve` completa, todos los `issues`, el
`breakdown` entero del puntaje y el `suggested_order` del reordenamiento. Las
cuatro consultas que existen contra esa tabla en todo el producto son:

| Dónde | Columnas | Para qué |
|---|---|---|
| `analysis-service` | `input_hash` | deduplicar |
| `dashboard-service` | `playlist_id, set_score, created_at` | el sparkline |
| `backstage-service` | `id, user_id, set_score, created_at` | KPIs |
| `data-export-service` | `*` | portabilidad |

Ninguna feature lee los blobs. La única que los toca es la exportación — y que
una exportación devuelva un dato es **consecuencia** de guardarlo, no razón para
guardarlo.

Es la misma forma exacta que tenía `billing_events.payload`: guardado para
siempre porque nadie decidió nunca por cuánto.

**Implementado:** `sweepAnalysisBlobs`, migración `0028`, ventana de **365
días**. La fila se queda — `input_hash` es lo que evita que reanalizar un set sin
cambios escriba un duplicado, y `set_score` + `created_at` son el sparkline. Se
van los blobs.

Los campos quedan *nullable* en vez de vaciados a `[]` o `{}`, y la diferencia
importa en una exportación: `curve: []` se lee como "este análisis no tuvo
curva", que es falso; `curve: null` se lee como "ya no lo tenemos", que es
verdad.

### 1.2 `plan_cancellation_feedback`: se escribe, nunca se lee

Detectado en la pasada del RoPA. Ninguna pantalla, consulta ni informe lo
consume. Es un enum de Stripe, no texto libre, así que el riesgo es bajo.

**No se tocó**, y a propósito: está en la ruta de billing, y lo acordado es que
lo que toca facturación se reporta y lo decidís vos. La decisión es binaria — o
alguien mira ese campo para entender las bajas, o se deja de escribir. Hoy no
pasa ninguna de las dos.

---

## 2. Defaults pro-privacidad: qué pasa si el usuario no hace nada

| Default | Estado |
|---|---|
| Analytics (PostHog) | **Opt-in.** `unset` significa sin analytics; el silencio se lee como no. Do Not Track responde por el visitante sin leer storage. ✅ |
| Lookup de título (GetSongBPM) | **Opt-in**, explícito por set. ✅ |
| Audio | Nunca sale del dispositivo. No hay default que cambiar. ✅ |
| Notación de tonalidad, idioma | Preferencias de interfaz, sin efecto en privacidad. ✅ |
| **Link público del set** | **Siempre activo.** Ver abajo. ⚠️ |
| **Invitación a colaborar** | **No requiere aceptación.** Ya en el RoPA. ⚠️ |

### 2.1 El link público no se activa: ya está activo

`buildShareToken` es el id del set más un HMAC del id. No hay columna, no hay
estado, no hay "compartir: sí/no": **todo set tiene una URL pública válida desde
el momento en que existe**, haya querido compartirlo el DJ o no.

El diseño es deliberado y su razonamiento está escrito en
`lib/playlists/share-token.ts`: sin fila que crear ni que limpiar, imposible de
adivinar por construcción, y el mismo link siempre. Y **no es una exposición**:
sin el secreto no se puede fabricar un token, y la página se niega a distinguir
una firma inválida de un set borrado.

Pero "público si sabés la URL" no es lo mismo que "privado hasta que lo
enciendas", y la diferencia es exactamente lo que significa *privacy by default*.
Dos consecuencias concretas:

1. Un DJ que nunca usó la función igual tiene una URL que funciona. Si se filtra
   por cualquier vía (historial, un screenshot, un backup del portapapeles), no
   hay nada que apagar.
2. El propio archivo ya lo dice: **los links individuales no se pueden
   revocar.** Rotar `CURVE_SHARE_SECRET` invalida los de todo el mundo a la vez.
   Un DJ que publicó un link y se arrepiente no tiene forma de matarlo.

**No se cambió**, porque hacerlo es una decisión de producto: agregar
`playlists.share_enabled` con default `false` significa que el botón de
compartir pasa a ser un toggle, y los links que ya existan hoy dejarían de
funcionar salvo que el backfill los active. Las dos opciones son defendibles y
ninguna es mía.

Mi recomendación, si se toca: columna `shared_at timestamptz null`, default
apagado para sets nuevos, backfill que la prende en los existentes (nadie pierde
un link que ya repartió), y el token pasa a verificar que esté prendida. Eso da
revocación por set sin tabla nueva y sin romper nada en el camino.

---

## 3. Retención: qué se borra solo

| Dato | Ventana | Estado |
|---|---|---|
| `billing_events.payload` | 90 días, **y sin edad si la cuenta se borró** | ✅ PR #183 |
| `admin_audit_log.target_email` | 365 días | ✅ PR #190 |
| `analyses` — blobs | 365 días | ✅ acá |
| `playlist_versions` | **ninguna, a propósito** | ver abajo |
| `tracks`, `playlists` | ninguna: es el contenido del usuario | por diseño |

Todo corre en el mismo cron (`/api/cron/retention`), cada barrido en su propio
`try` para que uno que falla no reporte como caído al que sí corrió.

**`playlist_versions` no se barre, y eso es una decisión, no un olvido.** Es
contenido del DJ y hay features que lo leen: historial de versiones, biblioteca
y residencias. Borrar automáticamente el historial de alguien para cumplir una
política de retención sería usar privacidad como excusa para romper un producto.
La limitación de conservación aplica a lo que tratamos *nosotros* para *nuestras*
finalidades; el contenido que el usuario creó se va cuando él se va.

⚠️ **Nada de esto corre todavía.** `CRON_SECRET` no está seteado en Vercel, así
que la ruta responde 503 — que es lo correcto (un endpoint que borra datos y
falla abierto es peor que uno que no corre nunca), pero significa que las tres
ventanas de arriba son por ahora política escrita, no efecto observable.

---

## 4. Seudonimización: dónde ya aplica y dónde no puede

| Dónde | Qué se usa | Nota |
|---|---|---|
| PostHog | `profileId` | Nunca el email. No se envía IP. |
| Logs estructurados | `workosUserId`, `profileId` | `backstage.non_admin_attempt` loguea el id, no la dirección. |
| Audit log, pasada la ventana | uuid sin resolver | Queda la acción y el actor; el afectado deja de ser identificable. |
| Stripe | id de cliente | Nombre y dirección viven allá, no acá. |

**Dónde no puede aplicarse, y por qué:**

- `profiles.email` es la clave de identidad contra WorkOS y el destinatario de
  los mails transaccionales. Seudonimizarlo sería cifrarlo con una clave que
  tenemos al lado, que es teatro, no una medida.
- `set_collaborators.invited_email` está keyeado por email a propósito: una
  invitación a alguien que todavía no se registró tiene que ser expresable, y
  eso vale más que el hash. Documentado en la migración 0023.
- `tracks.source_payload` guarda la entrada de biblioteca tal cual vino, que en
  Traktor incluye `<LOCATION DIR=...>` — la ruta absoluta en la máquina del DJ,
  y un directorio home suele llevar un nombre real. **Es dato necesario**: sin
  `LOCATION` el archivo reexportado no encuentra sus tracks. Necesario no es lo
  mismo que sin declarar, y ya está declarado en el RoPA (PR #196).

---

## 5. Privacy by design para features nuevas

Cuatro preguntas, contestadas **antes** de escribir la migración. No son un
proceso: son lo que hubiera evitado cada una de las brechas listadas arriba.

1. **¿Qué columna nueva guarda algo sobre una persona?** Si la respuesta es
   alguna, va al RoPA en el mismo PR. `tests/ropa-accuracy.test.ts` lo obliga:
   agregar una columna a `profiles`, `playlists` o `tracks` sin nombrarla en el
   documento pone el test en rojo.
2. **¿Quién lee este dato, y desde dónde?** Si la respuesta es "nadie todavía",
   no se guarda. Las dos brechas de minimización de arriba son exactamente esto,
   descubiertas tarde.
3. **¿Qué pasa si el usuario no hace nada?** El default tiene que ser el estado
   menos expuesto. El link de compartir es el caso donde esta pregunta no se hizo.
4. **¿Cuándo deja de hacer falta?** Si no hay respuesta, la respuesta real es
   "nunca", y eso es una brecha que aparece en la siguiente auditoría. Toda
   columna nueva que guarde datos personales sale con una ventana o con una
   razón escrita de por qué no tiene.

---

## 6. Lo que queda abierto en F3

| # | Qué | De quién |
|---|---|---|
| 1 | `CRON_SECRET` en Vercel — sin eso ningún barrido corre | Robertino |
| 2 | Migraciones `0027` y `0028` sin aplicar | Robertino |
| 3 | Decisión sobre `plan_cancellation_feedback`: usarlo o dejar de escribirlo | Robertino (toca billing) |
| 4 | Decisión sobre el link público: opt-in con revocación por set, o dejarlo como está y documentarlo en la política | Robertino (decisión de producto) |
| 5 | Aceptación explícita de invitaciones a colaborar | Robertino (decisión de producto) |
