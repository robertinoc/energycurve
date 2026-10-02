# Transferencias internacionales y encargados

**Proyecto 3 · Privacy & Compliance · F4.** Fecha: 2026-09-11. **Revisado el 2026-10-02 (lote 16):** dónde está cada encargado, verificado; ver §2.
Documento interno. La versión pública y abreviada es `/subprocessors`.

---

## 1. Qué cambió respecto del RoPA

El RoPA listaba **Crisp** entre los encargados, con la nota "tiene variable en
Vercel pero no se carga en el código". Verificado en esta pasada: **no hay una
sola referencia a Crisp en `app/`, `lib/`, `components/` ni `services/`**.

O sea que hoy Crisp **no es un encargado**. Que exista una variable en el
proyecto de Vercel no crea un tratamiento; lo crea el código que la usa, y no
existe. Declararlo en una página pública habría sido anunciar un flujo de datos
inexistente — un error más chico que omitir uno real, pero igual de falso.

Queda anotado: si algún día se activa, entra a la lista **en el mismo PR** que
lo activa, y `tests/subprocessors-accuracy.test.ts` está escrito para que esa
omisión se note.

---

## 2. Mapa de transferencias

Revisado el **02/10/2026**. Cada ubicación dice de dónde salió; donde no se pudo
leer de una fuente, dice «sin confirmar» y quién puede confirmarlo. Todos los
destinos son fuera del EEE.

| Encargado | Qué recibe | Dónde, y cómo se sabe | Mecanismo | Estado del mecanismo |
|---|---|---|---|---|
| **Supabase** | **Todo el dato de la aplicación:** cuenta, sets, tracks, análisis, versiones, colaboraciones | **EE.UU. — `us-east-2` (Ohio).** Leído en la consola por Robertino el 20/09 (A2.6), y «East US (Ohio) · us-east-2» en la página de regiones de Supabase, leída el 02/10. Dev: región **sin confirmar** | DPA propio | **Sin verificar** |
| **Vercel** | Todo lo que viaje en un request, y sus logs | **EE.UU. — funciones en `iad1` (Washington D.C.).** Cabecera `x-vercel-id: gru1::iad1::…` de producción, leída el 02/10 sin sesión; `iad1` = «us-east-1, Washington, D.C.» en la doc de Vercel. `gru1` (São Paulo) es el borde de CDN que atendió el request, no donde se procesa | DPA propio con SCC | **Sin verificar** |
| **PostHog** | `profileId`, eventos de producto, y **la IP de la conexión** (ver H-17) | **EE.UU. — `us.i.posthog.com`** («US Cloud»). Host leído en el código y en el request real del SDK (`e2e/posthog-payload.spec.ts`). Ubicación física del US Cloud según PostHog: **no releída hoy** (la página de la doc no cargó sin JS) | DPA propio | **Sin verificar** |
| **Sentry** — *no estaba en este mapa* | Reportes de error, sin PII (`tests/sentry-no-pii.test.ts`) | **Sin confirmar.** Sentry tiene región por organización: `us.sentry.io` o `de.sentry.io` (doc de Sentry, leída el 02/10). El host sale del `SENTRY_DSN` de producción, que está en Vercel y no se ve desde el repo. **Tampoco está confirmado que el DSN esté seteado en producción** | Pendiente | **Sin verificar** |
| **Resend** | Dirección de mail y contenido del mensaje | **Sin confirmar.** Resend tiene región **por dominio** — «North Virginia (us-east-1), Ireland (eu-west-1), São Paulo (sa-east-1), Tokyo (ap-northeast-1)», doc de Resend leída el 02/10 —, así que depende de cómo se dio de alta el dominio de producción. Se ve en Resend → Domains | DPA propio | **Sin verificar** |
| **WorkOS** | Mail, nombre, contraseña | EE.UU. según la empresa; **ubicación de los datos no releída hoy** (la página de subencargados de WorkOS no cargó sin JS) | DPA propio | **Sin verificar** |
| **Stripe** | Id de cliente, plan, datos de pago | EE.UU. según la empresa; no releído hoy | DPA propio con SCC | **Sin verificar** |
| **Anthropic** | Título, artista, BPM y tonalidad del set | EE.UU. según la empresa; no releído hoy | Términos comerciales | **Sin verificar** |
| **GetSongBPM** | Artista y título | EE.UU. según la empresa | **Ninguno disponible** | Confirmado: no hay |

"Sin verificar" en la columna del mecanismo significa exactamente eso: **es
plausible que cada uno tenga SCC en sus condiciones estándar, y ninguno fue
leído ni confirmado.** Un documento de compliance que escribe "SCC ✓" sobre un
supuesto es peor que uno que deja la celda vacía, porque el vacío se completa y
el tilde no se vuelve a mirar.

### 2.1 Lo que cambió el 02/10, y por qué importa

- **Supabase dejó de ser una incógnita y pasó a ser el encargado más material.**
  Hasta el 20/09 este documento decía que la región era lo único que separaba la
  frase «Supabase (región UE)» de ser verdadera o falsa. Era falsa: la base vive
  en Ohio. Eso cambia el TIA de §3 en un punto concreto — lo que se transfiere ya
  no es «metadata de sets» en el peor caso, es **todo** lo que la app guarda.
- **Vercel y Supabase están en regiones distintas** (`iad1` y `us-east-2`). No
  cambia el mecanismo, los dos son EE.UU.; está anotado porque explica parte de la
  latencia medida en `docs/qa/carga-2026-10.md`.
- **Sentry es un encargado que nadie había listado.** El código lo usa desde el
  11/09 (`lib/observability/sentry.ts`) y no figura en `/subprocessors`, ni en el
  RoPA, ni en `tests/subprocessors-accuracy.test.ts` — que compara la página
  contra una lista escrita a mano, así que no podía notarlo. **No se agregó a la
  página pública** porque no está confirmado que esté activo en producción; si lo
  está, entra en el mismo cambio que lo confirme, con su región.
- **PostHog recibe la IP.** El evento ya no la lleva (H-17), pero la conexión sí,
  porque el navegador le habla directo. Ver la pregunta 2 de §2.2.

### 2.2 Preguntas que son legales, no técnicas

Escritas como preguntas a propósito. Este documento no las contesta y no es
asesoramiento legal.

1. Con **toda** la base en EE.UU., ¿alcanzan las SCC de los DPA estándar de
   Supabase y Vercel para el tratamiento principal del producto, o hace falta
   algo más que un TIA ligero?
2. Si PostHog **recibe** la IP en la conexión pero la descarta por un ajuste del
   proyecto, ¿la frase correcta para la política es «no la guarda»? ¿Y eso
   necesita mencionarse como transferencia de un dato personal aunque no se
   conserve?
3. Si Sentry está activo en la región `us`, ¿un reporte de error sin PII es una
   transferencia de datos personales que hay que declarar, o queda fuera?

## 3. TIA ligero (Transfer Impact Assessment)

No es un TIA formal de los que pide una autoridad para un tratamiento de alto
riesgo: es el análisis proporcionado a lo que este producto realmente transfiere.

**Qué se transfiere, en el peor caso para el titular:** su dirección de mail, el
nombre si lo cargó, la metadata de los sets que armó (títulos, artistas, BPM,
tonalidad) y su estado de suscripción. **No** se transfiere audio, ni ubicación,
ni datos de categoría especial del Art. 9, ni nada que permita inferirlos con
alguna fiabilidad.

**Riesgo del país de destino (EE.UU.):** el problema conocido es el acceso
gubernamental bajo FISA 702 y EO 12333, que fue lo que tumbó Privacy Shield en
*Schrems II*. Aplicado a este caso concreto:

- Los proveedores de arriba son *electronic communication service providers*
  alcanzables por 702 en principio.
- Lo que podría obtenerse de EnergyCurve mediante ese acceso es **la lista de
  temas que un DJ pensaba pasar en una fiesta**. No es información de interés
  para inteligencia de señales bajo ningún criterio razonable.
- El dato con verdadero potencial de daño en la pila es el de pago, y ese vive
  en Stripe, donde el régimen de cumplimiento (PCI, SAQ-A) es considerablemente
  más estricto que el nuestro.

**Conclusión:** el riesgo residual es bajo, y la medida que más lo reduce **no
es contractual sino arquitectónica** — el audio nunca sale del dispositivo, así
que la grabación, que es lo único verdaderamente sensible que un DJ nos confía,
nunca es transferible por nadie.

**Lo que sigue haciendo falta igual:** un riesgo bajo no reemplaza el mecanismo.
Hacen falta los DPAs firmados y las SCC verificadas, y eso es el punto 4.

---

## 4. Lo que hay que hacer, y cómo

Las cuatro son de Robertino porque requieren entrar a cuentas y aceptar
contratos. El orden es por lo que desbloquean.

1. ~~**Confirmar la región de Supabase.**~~ **Hecho el 20/09 (A2.6): `us-east-2`,
   Ohio.** La frase «región UE» ya se había sacado de la política y no vuelve.
   Quedan para confirmar en consola: la región del dominio de **Resend**, si el
   `SENTRY_DSN` está seteado en producción y en qué región, y la región de la
   base de **dev**.
2. **Aceptar o firmar el DPA de cada proveedor.** Los seis grandes lo tienen
   autoservicio: Vercel (Settings → Legal), Supabase (Settings → Legal),
   Stripe (Settings → Compliance), WorkOS y Resend (soporte), PostHog
   (Settings → Data management). Anotar fecha y versión de cada uno en la tabla
   del punto 2.
3. **Verificar el mecanismo, no asumirlo.** Para cada uno, chequear si el DPA
   incorpora SCC por referencia o si el proveedor está en la lista del EU-US
   Data Privacy Framework (dataprivacyframework.gov, buscable por nombre).
   Reemplazar "Sin verificar" por el mecanismo y la fecha.
4. **Decidir qué hacer con GetSongBPM.** Es el único sin DPA posible: API
   gratuita con backlink obligatorio y sin entidad contractual del otro lado.
   Tres salidas, y hay que elegir una: (a) dejarlo como está — opt-in por set,
   solo artista y título, declarado en `/subprocessors`; (b) sacarlo; (c)
   reemplazarlo por un proveedor con DPA. Hoy (a) es lo que está implementado y
   declarado, que es defendible mientras siga siendo una decisión y no un olvido.

---

## 5. Aviso de cambios en la lista

El Art. 28(2) pide dar al responsable la chance de oponerse a un sub-encargado
nuevo. Acá el responsable es StageLink LLC y los titulares son consumidores, así
que lo que corresponde es transparencia, no un derecho de veto contractual.

Mecanismo, que es el más barato que funciona: `/subprocessors` lleva la fecha de
`UPDATED` en `lib/content/legal-copy.ts`, y la convención del archivo ya dice que
esa fecha se mueve en el mismo cambio que edita cualquier documento. Sumar un
encargado sin mover la fecha deja la página mintiendo sobre su propia vigencia.

No hay notificación proactiva por mail y no se promete ninguna. Prometer un
aviso que nadie va a mandar es peor que no prometerlo.
