# De dónde viene cada usuario — el primer contacto

**20/10/2026, lote 20.** Hasta este lote, la única respuesta a «de dónde vienen
los usuarios» era preguntarle a PostHog por `$initial_utm_source`. Ese dato
existe sólo para quien aceptó la analítica **y** cuya persona de PostHog quedó
unida a su perfil; para los usuarios registrados antes de hoy está vacío. Desde
este lote el producto guarda su propio registro, en el perfil.

**La medición es parcial por diseño.** `respect_dnt: true` y el banner de
consentimiento no se tocan: quien no acepta no se mide, y aparece como
**desconocido**. Desconocido es una categoría del tablero, nunca un cero y
nunca «directo».

## Qué se guarda

Una sola vez por perfil, en `profiles.first_touch_*` (migración 0034):

| Columna | Qué es | Qué se descarta |
|---|---|---|
| `first_touch_source` | Una palabra de la lista cerrada de `lib/attribution/first-touch.ts` (`KNOWN_SOURCES`), u `other`, o `direct` | El texto de un `utm_source` que no está en la lista: queda `other` y el texto se tira |
| `first_touch_medium` | Una de `none`, `organic`, `ai`, `social`, `directory`, `crosspromo`, `referral`, `other` | Lo mismo |
| `first_touch_campaign` | Palabras en minúscula unidas por guiones, hasta 64 caracteres | Todo lo que no entra en el formato, sin intentar arreglarlo: un `@`, siete dígitos seguidos, acentos |
| `first_touch_referrer` | El **host** del sitio que mandó a la persona, sin `www.` | La ruta y la query string del referrer |
| `first_touch_landing` | La ruta de la página **pública** de entrada | La query string y el hash. Una invitación `/c/<token>` queda como `/c/[invite]`: el token es una credencial y nunca sale del navegador. Una página privada no cuenta como entrada |
| `first_touch_at` | Cuándo fue esa visita | — |
| `first_touch_recorded_at` | Cuándo llegó al servidor. **NULL = desconocido** | — |

`utm_term`, `utm_content` y los click ids (`gclid`, `fbclid`, …) no se leen
nunca. Las restricciones de la migración repiten los formatos, así que un error
en el código no puede guardar una URL, un token ni una dirección.

## Cómo viaja

1. **Al cargar una página pública**, el navegador arma el contacto con la URL y
   el referrer de esa carga, en memoria. No cuenta como llegada una carga cuyo
   referrer es este mismo sitio (alguien que ya estaba), una que vuelve de
   iniciar sesión (Google, WorkOS) ni una página privada.
2. **Si la respuesta de analítica es «sí»**, lo guarda en `localStorage`
   (`ec.first-touch.v1`) si no había uno. Primer contacto, no último: una visita
   posterior no lo pisa. Si la persona acepta en la misma página a la que llegó,
   cuenta esa llegada.
3. **Ya con cuenta**, la primera carga del dashboard lo manda una vez a
   `POST /api/attribution/first-touch`. El servidor vuelve a validar todo y lo
   escribe **sólo si el perfil se creó en las últimas 24 horas y no tiene uno**,
   en un único `UPDATE` (dos pestañas a la vez no pueden escribir dos veces).
   Contestado eso, el navegador deja una marca de «enviado» y no vuelve a armar
   contactos.

Veinticuatro horas porque el envío ocurre en la primera carga del dashboard: un
registro que verifica el mail a la mañana siguiente todavía entra. Pasado eso,
el contacto ya no dice cómo empezó **esta** cuenta, y una cuenta vieja no puede
recibir un origen a posteriori por volver a visitar el sitio.

## Consentimiento

| Respuesta | En el navegador | En el perfil |
|---|---|---|
| Nunca contestó | Nada | Desconocido |
| «No», o Do Not Track | Nada (y se borra si había algo) | Desconocido |
| «Sí» | El contacto, hasta registrarse | El contacto |
| «Sí» y después «no» | Se borra lo que esperaba | **Lo ya escrito queda** — ver abajo |

No hay vuelta alternativa, a propósito: ni cookie, ni deducirlo del request de
registro, ni del referrer del servidor.

## Cuándo el camino largo se corta

El contacto sobrevive días entre visitas en el mismo navegador: quien llega
desde Instagram el lunes y se registra el viernes desde un marcador cuenta como
Instagram. **No sobrevive**, y la persona queda contada por la visita que el
navegador sí recuerda, o como desconocida, en estos casos:

- **Otro navegador u otro dispositivo.** El contacto quedó en el primero.
- **Datos del sitio borrados, o una ventana privada que se cerró.**
- **Safari**, que borra lo que escribe un script después de siete días sin
  visitas (ITP): un hueco más largo registra la visita posterior.
- **Aceptar la analítica en una visita posterior a la primera.** La primera no
  se guardó; el contacto es el de la visita en la que se aceptó.
- **Más de 180 días** entre la llegada y el registro: el contacto viejo se
  descarta y cuenta la visita actual.
- **Dos personas que se registran desde el mismo navegador:** el contacto es de
  la primera; la segunda queda desconocida.

## Lo que queda para Robertino

- **Una frase en la política de privacidad** que diga que, con la analítica
  aceptada, el perfil guarda de dónde llegó la persona la primera vez. El dato
  es nuevo, el consentimiento es el mismo de la analítica; la frase propuesta
  está en `docs/pendientes-robertino.md` y **no se aplicó**, como toda
  corrección de la política.
- **Qué pasa con lo ya escrito cuando alguien retira el consentimiento.** Hoy se
  borra lo que espera en el navegador y no lo que ya está en el perfil (que sí
  se va al borrar la cuenta, y sale en el export de datos).
- **Aplicar la migración 0034** en dev y en producción. Hasta entonces la ruta
  contesta 503 y el tablero dice que la medición no empezó.
