# Transferencias internacionales y encargados

**Proyecto 3 · Privacy & Compliance · F4.** Fecha: 2026-09-11.
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

Todos los destinos son fuera del EEE salvo donde se aclare. La columna que
importa es la última: qué mecanismo ampara la transferencia, y si está
verificado o asumido.

| Encargado | Qué recibe | País | Mecanismo | Estado |
|---|---|---|---|---|
| Vercel | Todo lo que viaje en un request + logs | EE.UU. | DPA propio con SCC | **Sin verificar** |
| Supabase | Cuenta, sets, tracks, análisis | **Sin confirmar** | DPA propio | **Sin verificar** |
| WorkOS | Mail, nombre, contraseña | EE.UU. | DPA propio | **Sin verificar** |
| Stripe | Id de cliente, plan, datos de pago | EE.UU. | DPA propio con SCC | **Sin verificar** |
| Resend | Dirección de mail y contenido del mensaje | EE.UU. | DPA propio | **Sin verificar** |
| PostHog | `profileId`, eventos de producto | **EE.UU.** (`us.i.posthog.com`, en el código) | DPA propio | **Sin verificar** |
| Anthropic | Título, artista, BPM y tonalidad del set | EE.UU. | Términos comerciales | **Sin verificar** |
| GetSongBPM | Artista y título | EE.UU. | **Ninguno disponible** | Confirmado: no hay |

"Sin verificar" significa exactamente eso: **es plausible que cada uno de esos
proveedores tenga SCC en sus condiciones estándar, y ninguno fue leído ni
confirmado.** Un documento de compliance que escribe "SCC ✓" sobre un supuesto
es peor que uno que deja la celda vacía, porque el vacío se completa y el tilde
no se vuelve a mirar.

### 2.1 Dos cosas que sí se verificaron contra el código

- **PostHog está en EE.UU.** El host por defecto en el código es
  `us.i.posthog.com`. La política de privacidad dice "Supabase (región UE)", que
  es una afirmación sobre Supabase y no sobre analytics — pero un lector puede
  leerla como si cubriera todo. Anotado como brecha de redacción.
- **La región de Supabase sigue sin confirmar.** Es lo único que separa la frase
  "región UE" de la política de ser verdadera o falsa, y solo se confirma en el
  dashboard.

---

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

1. **Confirmar la región de Supabase.** Dashboard → Project Settings → General.
   Si no es UE, la política de privacidad dice algo falso hoy y hay que
   corregirla; si lo es, hay que decir que eso es sobre la base de datos y no
   sobre analytics.
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
