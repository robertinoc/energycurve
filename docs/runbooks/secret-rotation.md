# Rotar un secreto

> **Para qué existe esta página.** La auditoría de seguridad cerró la tarea de
> gestión de claves con una conclusión incómoda: no hay KMS propio ni claves
> propias que rotar en el sentido del plan —el cifrado en reposo lo hace Supabase
> con claves que custodia Supabase— **pero sí hay trece credenciales**, y el
> hueco no era técnico sino de procedimiento. No había runbook ni cadencia.
>
> Escrita el 21/09/2026. La sección 5 de [`operations.md`](operations.md) ya daba
> los cuatro pasos generales y **esos cuatro pasos siguen siendo correctos**;
> esta página es lo que falta debajo: qué se rompe con cada credencial, cuál
> admite solapamiento y cuál no, y cuáles tres tienen un efecto que el usuario
> ve.

---

## 1 · Las dos rotaciones no son la misma operación

Rotar bajo presión y rotar por higiene se hacen **al revés una de la otra**, y
confundirlas es lo que hace que una de las dos salga mal.

| | **Compromiso** (la clave se filtró) | **Higiene** (calendario, o alguien se fue) |
|---|---|---|
| Objetivo | Que la clave vieja deje de servir **ya** | Que no haya caída |
| Orden | Revocar en el proveedor → poner la nueva en Vercel → redesplegar | Emitir la nueva → ponerla en Vercel → redesplegar → confirmar → **recién ahí** revocar la vieja |
| Costo aceptado | La caída del tiempo que tarde el redeploy | El período en que las dos claves son válidas |
| Cuándo se elige | Siempre que no sepas con certeza que la clave está a salvo | Sólo cuando lo sabés |

**La regla que no cambia entre los dos modos:** cambiar la variable en Vercel
**no revoca nada**. Deja de usar la clave vieja, que sigue funcionando para
cualquiera que la tenga. La revocación pasa en el panel del proveedor y en
ningún otro lado.

**La segunda regla:** Vercel lee las variables en build (las públicas) y en
arranque (las de servidor), así que **una variable nueva sin redeploy no
existe**. El paso 3 no es opcional.

**La tercera:** hay dos proyectos de Supabase y dos entornos de Vercel. Rotar
la credencial de desarrollo no toca producción, y viceversa. Antes de tocar
nada, confirmar el `ref` en la URL — la insignia verde `main PRODUCTION`
aparece en los dos proyectos y es la etiqueta de la *rama*
([`operations.md` §1](operations.md)).

---

## 2 · Qué se rompe con cada una

Las trece credenciales, ordenadas por lo que cuesta equivocarse. Las columnas
que importan son las dos del medio: **si no hay solapamiento, hay ventana de
caída**, y eso decide si la rotación se hace a las tres de la tarde o a las
cuatro de la mañana.

| Credencial | Dónde se rota | Solapamiento | Qué se cae mientras tanto |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API Keys | **No** | **Todo.** Es el único camino a la base |
| `WORKOS_API_KEY` | [dashboard.workos.com/api-keys](https://dashboard.workos.com/api-keys) | Sin verificar | Login, signup, sesión, borrado de usuario |
| `WORKOS_COOKIE_PASSWORD` | La generás vos | No aplica | **Todas las sesiones vivas.** Ver §3 |
| `STRIPE_SECRET_KEY` | Stripe → API keys → ⋯ → *Rotate key* | **Sí, hasta 7 días** | Nada, si se usa el solapamiento |
| `STRIPE_WEBHOOK_SECRET` | Stripe → **Webhooks** → el endpoint | No | El webhook rechaza con 400; Stripe reintenta |
| `CURVE_SHARE_SECRET` | La generás vos | No aplica | **Todos los links compartidos, para siempre.** Ver §3 |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) → API keys | Múltiples claves activas | El ordenamiento con IA |
| `RESEND_API_KEY` | Resend → API Keys | Múltiples claves activas | Reset de contraseña, verificación, mails de contacto y de pago |
| `POSTHOG_PERSONAL_API_KEY` | PostHog → Personal API keys | Múltiples claves activas | Las métricas del panel de backstage |
| `GETSONGBPM_API_KEY` | Cuenta de GetSongBPM | Sin verificar | El botón de lookup por título |
| `SENTRY_DSN` | Sentry → proyecto → Client Keys | Múltiples claves activas | El reporte de errores |
| `CRON_SECRET` | La generás vos | No aplica | El barrido de retención. **Hoy no está seteada** |
| `NEXT_PUBLIC_POSTHOG_KEY` | — | — | **No se rota.** Es pública por diseño: va en el bundle |

Sobre las tres celdas que dicen *sin verificar*: la documentación pública de
WorkOS dice dónde están las claves y que **una clave de producción se ve una
sola vez**, pero no describe el procedimiento de rotación ni si dos claves
conviven. GetSongBPM no documenta nada. Están así a propósito: escribir "sí"
sobre un supuesto es lo que convierte una rotación de higiene en una caída.
**Confirmalo en el panel antes de rotar en caliente, no durante.**

### Lo que sí está verificado, y cambia el orden de las cosas

- **Stripe es la única con solapamiento real.** Al rotar desde el panel, las dos
  claves funcionan **hasta 7 días**. Hay que elegir una fecha de expiración:
  la opción **"Now" borra la clave vieja en el acto** y es, en la práctica, una
  rotación de compromiso. Y hay una forma de saber que terminaste sin adivinar:
  los *request logs* de la clave vieja: se expira cuando su volumen está en cero
  desde hace horas, no cuando uno cree haber cambiado todo.
- **Supabase no documenta solapamiento.** El procedimiento es crear la nueva,
  reemplazar en todos lados, verificar y **después** borrar la vieja. Rotar el
  secreto **no** afecta a la clave publicable: son credenciales separadas.
- **Supabase deprecia el formato legado a fin de 2026.** Una `service_role` con
  formato JWT (empieza con `eyJ`) es del sistema viejo. Al rotarla hay que
  **migrar a una clave secreta nueva** (`sb_secret_…`) en vez de emitir otro
  JWT, porque emitir otro JWT es agendar esta misma tarea para diciembre.
  Cuál de los dos formatos corre hoy en producción **no se puede leer desde el
  código** — se ve en el panel, y conviene mirarlo antes de necesitarlo.
- **El webhook de Stripe se recupera solo de un desfasaje corto**, porque Stripe
  reintenta los eventos fallidos. Cuánto tiempo reintenta está en la
  configuración del endpoint y **no conviene asumirlo**: si la rotación va a
  tardar más de unos minutos, leerlo primero.

---

## 3 · Las tres que el usuario ve

Éstas son las que no se rotan un viernes a la noche sin pensarlo, y ninguna de
las tres avisa que fue una rotación.

### `WORKOS_COOKIE_PASSWORD` — cierra la sesión de todo el mundo

Es la clave con la que se sella la cookie de sesión (`iron-session`, vía
`lib/auth/social-auth.ts`; `lib/env.ts` le exige 32 caracteres mínimo). Las
cookies emitidas con la clave vieja dejan de abrirse en el momento en que la
nueva entra en vigor.

No hay error, no hay aviso: la gente simplemente aparece deslogueada. Para
alguien en medio de armar un set eso es perder el contexto, no los datos —
todo está guardado— pero es fricción real y es masiva y simultánea.

**Rotarla fuera de hora pico**, y tener presente que es la rotación más segura
de hacer *en caliente* en un sentido distinto: no hay ventana donde la app esté
caída, sólo una donde todos tienen que volver a entrar.

### `CURVE_SHARE_SECRET` — mata todos los links compartidos, y el DJ no puede saber por qué

`lib/playlists/share-token.ts` firma los links públicos de curva con un HMAC sin
estado sobre el id de la playlist. El archivo ya lo dice en su propio
encabezado: **los links individuales no se pueden revocar, y rotar el secreto
los invalida todos a la vez. Es la única revocación que existe** (hallazgo
S-07).

Y hay un agravante que conviene tener escrito antes de rotarla. La página
`/c/[token]` devuelve **el mismo 404 para una firma inválida que para un set
borrado**, a propósito y fijado con un test: un mensaje más amable confirmaría
que el id existía. La consecuencia es que un DJ cuyo link se rompió por una
rotación ve **exactamente lo que vería si hubiera borrado el set**. No hay
ninguna señal que distinga las dos cosas.

Así que rotar esta clave sin avisar es romper en silencio links que la gente
repartió en Instagram y en WhatsApp, de una forma que va a parecer un bug del
producto o un error suyo. **Si se rota, se avisa antes.** Y si el motivo es un
compromiso, se rota igual y se avisa después, con la explicación.

### `CRON_SECRET` — hoy no es una rotación, es un alta

No está seteada en producción. `/api/cron/retention` responde 503 sin ella, que
es la dirección correcta de fallo, y el efecto es que **las cuatro ventanas de
retención son política escrita y no efecto observable**. Ver R1 en
[`../compliance/gap-assessment.md`](../compliance/gap-assessment.md) y S-18 en
[`../security/rbac-matrix.md`](../security/rbac-matrix.md).

Ponerla es lo primero de esta página que conviene hacer, y no es una rotación:
generar un string aleatorio largo, ponerlo en las variables de producción de
Vercel, redesplegar, y confirmar que el barrido corrió mirando que una fila
vieja de `billing_events` perdió su `payload`.

---

## 4 · El procedimiento

### Modo higiene

1. **Emitir** la credencial nueva en el panel del proveedor. No borrar la vieja.
2. **Guardarla** donde vaya a poder recuperarse. Varias de éstas se muestran una
   sola vez (las de producción de WorkOS, las secretas de Stripe, las de
   Supabase).
3. **Ponerla en Vercel**, en el entorno que corresponda. Si aplica a los dos,
   los dos — pero no de una sola vez: primero el que se pueda verificar.
4. **Redesplegar.** Sin esto la variable no existe.
5. **Verificar** con la prueba de la credencial (§5). No con "parece que anda".
6. **Revocar la vieja** en el proveedor. Éste es el paso que la gente posterga y
   que convierte una rotación en una credencial más dando vueltas.
7. **Anotarlo**: fecha, cuál, por qué, y cuánto tardó. El cuánto es lo que
   convierte la próxima en una operación con número en vez de una estimación.

### Modo compromiso

Igual, pero **1 y 6 se invierten**: se revoca primero y se acepta la caída. Y
antes de tocar nada, la regla de [`../security/incident-response.md`](../security/incident-response.md):
**contener no es limpiar.** No borrar logs de acceso — son lo único que puede
responder qué se leyó, y esa respuesta es lo que decide si hay que notificar.

Si se filtró más de una, el orden de prioridad es por radio de explosión:

1. `SUPABASE_SERVICE_ROLE_KEY` — es acceso total a la base, sin segunda línea:
   RLS corre con cero políticas, así que esta clave no es "acceso privilegiado",
   es la base entera.
2. `WORKOS_API_KEY` — identidad.
3. `STRIPE_SECRET_KEY` — dinero.
4. El resto, en cualquier orden.

Y se anota el incidente en `../security/incidents/` **aunque no haya habido
acceso indebido**. Una clave expuesta es un incidente de seguridad, se haya
usado o no (Art. 33.5: el registro es obligatorio incluso cuando se decide no
notificar).

---

## 5 · Cómo confirmar que quedó rotada

Una rotación que no se verifica se descubre cuando alguien no puede entrar.
Cada credencial tiene una prueba que la ejercita de punta a punta:

| Credencial | Prueba |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/health` — el chequeo de base es el único que la usa |
| `WORKOS_API_KEY` | Entrar y salir de una cuenta real |
| `WORKOS_COOKIE_PASSWORD` | Entrar, recargar una página del dashboard: si la sesión sobrevive a la recarga, la cookie se está abriendo |
| `STRIPE_SECRET_KEY` | Abrir el portal de facturación desde `/dashboard/account` |
| `STRIPE_WEBHOOK_SECRET` | `stripe trigger` un evento que ignoramos y ver 2xx en el endpoint |
| `CURVE_SHARE_SECRET` | Abrir un link de curva **generado después** de la rotación |
| `ANTHROPIC_API_KEY` | Un ordenamiento con IA sobre un set de prueba |
| `RESEND_API_KEY` | Pedir un reset de contraseña a una dirección propia |
| `POSTHOG_PERSONAL_API_KEY` | La pestaña de analytics del panel de backstage |
| `GETSONGBPM_API_KEY` | El botón de lookup en un track sin BPM |
| `SENTRY_DSN` | Forzar un `logError` y verlo llegar |
| `CRON_SECRET` | `curl` a `/api/cron/retention` con el bearer: 200 en vez de 503 |

La columna de la derecha es a propósito una acción de producto y no una llamada
cruda: lo que hay que confirmar no es que la clave sea válida, es que el camino
que la usa funciona.

---

## 6 · Cadencia

**Anual por higiene**, y **por evento** siempre:

- alguien con acceso a los paneles deja de tenerlo;
- una clave apareció en un log, en una captura de pantalla, en un ticket o en
  una sesión compartida;
- un proveedor anuncia una brecha;
- una clave cumple un año.

Sin una fecha, "regularmente" se convierte en "una vez" — que es exactamente lo
que le pasó a la revisión periódica del Art. 32(1)(d) y está anotado como hueco
en [`../compliance/security-measures.md`](../compliance/security-measures.md).

La **próxima revisión de higiene queda para marzo de 2027**, junto con la
revisión semestral de lo que no vive en el repo.

---

## 7 · Lo que esta página no puede darte

- **Nunca se rotó ninguna de estas credenciales.** Los pasos salen de la
  documentación de cada proveedor y del código que las usa, no de haberlo hecho.
  Los tiempos no están porque no hay ninguno medido: poner un número inventado
  en una columna que alguien va a leer bajo presión es peor que dejarla vacía.
- **No hay vault.** Los secretos viven en variables de entorno de Vercel, que
  para este tamaño es razonable; lo que no hay es un segundo lugar desde donde
  recuperarlos si se pierde el acceso a la cuenta. Eso es el mismo problema que
  el bus factor 1, y se cierra con la misma medida: acceso de emergencia
  delegado.
- **Ninguna de estas rotaciones está automatizada**, y no debería estarlo hasta
  que una se haya hecho a mano al menos una vez.

### El ensayo que vale una tarde

La forma más barata de convertir esta página en un procedimiento medido en vez
de una lectura: **rotar `GETSONGBPM_API_KEY` sin que haya pasado nada.** Es la
de menor radio de explosión de la lista —si sale mal, desaparece un botón—,
recorre los siete pasos completos incluida la revocación, y deja el primer
número real en la columna que hoy está vacía.

Si ese ensayo descubre que algún paso está mal escrito, lo descubre en la
credencial donde no importa.
