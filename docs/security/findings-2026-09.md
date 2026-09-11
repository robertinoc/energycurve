# Auditoría de seguridad — hallazgos, septiembre 2026

Primera pasada de ejecución del proyecto *2. Auditoría de Seguridad*. Base:
`main` @ `d45ec1d` más la rama `claude/qa-plan-2026-09`. Fecha: 11/09/2026.

**Reglas de ejecución respetadas:** contra producción solo lectura pasiva y sin
sesión (cabeceras, TLS, robots, `/api/health`). Todo lo que escribe corrió en
local contra Supabase de dev.

---

## El plan estaba escrito para otro producto

Las 43 tareas hablan de medidores, empresas de servicios públicos, buckets
públicos, KMS propio y alcance PCI completo. EnergyCurve no tiene nada de eso:
no hay object storage, el cifrado en reposo lo gestiona Supabase, y el pago es
Stripe Checkout hospedado, lo que deja el alcance PCI en SAQ-A.

Lo que el plan **no** ve, y es donde está el riesgo real de este producto:

1. El limitador de tasa vive en memoria del proceso, así que en serverless el
   límite es por instancia y se reinicia en cada arranque en frío.
2. La service-role key es el único camino a la base. RLS está activo con cero
   políticas, que es denegar-por-defecto para `anon`, pero la app entera pasa por
   una llave que saltea RLS por diseño. Un compromiso de esa llave es total.
3. Los tokens de `/c/` no se pueden revocar de a uno ni expiran.
4. El panel de administración no tiene MFA y su lista de admins tiene un mail
   hardcodeado como fallback.
5. Se mandan datos a Anthropic y a GetSongBPM.
6. Las invitaciones a sets compartidos no requieren aceptación.
7. Documentos XML de 12 MB se parsean del lado del servidor.

---

## Lo que se verificó y está bien

No todo hallazgo es un problema; decir qué resistió importa tanto como decir qué no.

| Qué | Resultado |
|---|---|
| TLS en producción | TLSv1.3, AEAD-CHACHA20-POLY1305, certificado válido |
| HSTS | Presente, `max-age=63072000` |
| `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` | Los cuatro servidos |
| `X-Powered-By` | Desactivado |
| Supabase REST sin key | 401. La postura de denegar-por-defecto aguanta desde afuera |
| Secretos en el historial de git | **Ninguno.** Escaneo de todo `git log --all -p` buscando claves live, ids de AWS, tokens de GitHub y Slack, y cabeceras de clave privada. El único `.env` que se commiteó alguna vez es `.env.example` |
| Firma de webhooks de Stripe | Verificada sobre el cuerpo crudo, con idempotencia por clave primaria. Probado con el SDK real |
| Licencias de producción | 409 MIT, 27 ISC, 13 Apache-2.0. **Sin AGPL ni GPL** |

---

## Hallazgos

### S-01 · Bypass de middleware en Next.js, en el mecanismo que protege todas las rutas privadas
**Severidad: alta. CORREGIDO.**

16.2.3 traía bypass de middleware en App Router (CVSS 8,1 por inyección en
parámetros de ruta dinámica; 7,5 por rutas de segment-prefetch), SSRF en server
actions (8,6) y una ejecución remota de código crítica en la API de optimización
de imágenes.

La protección de rutas de este producto **es** `proxy.ts`. Un bypass ahí es un
bypass de autenticación.

Subido a 16.3.4, que no es un salto mayor, y verificado contra la suite completa
en vez de darlo por bueno: typecheck limpio, 1.512 tests, build y E2E.

### S-02 · Expansión de entidades en el parser de XML, en el camino de import
**Severidad: alta. CORREGIDO, con doble protección.**

`fast-xml-parser` 5.9.3: declaraciones DOCTYPE repetidas reinician el límite de
expansión de entidades, que es justo el mecanismo que hacía de billion-laughs un
problema resuelto.

Subido a 5.11.1. Y además una guarda propia (`lib/playlists/xml-guard.ts`),
porque el límite interno de una librería está a un CVE de ser lo que falló. La
guarda rechaza DOCTYPE, declaraciones de entidad, instrucciones de procesamiento
que no sean la declaración XML, y anidamiento de más de 40 niveles, **antes** de
que el parser construya nada.

Los tests que más importan son los que prueban que **no** rechaza archivos
honestos: un `<` dentro del valor de un atributo (rutas tipo
`weird <name>.aiff`), comentarios y CDATA llenos de `<`, 500 tracks
auto-cerrados, y un árbol de carpetas más profundo que el de cualquier DJ.
Rechazar una librería real sería peor que el ataque.

### S-03 · El formulario de contacto copiaba los mensajes de la gente a los logs
**Severidad: media. CORREGIDO.**

Registraba nombre, dirección de mail, **el texto completo del mensaje** e IP en un
log de aplicación sin política de retención, sin capa de redacción y sin control
de acceso más allá del panel de hosting. Alguien escribiendo por un problema de
facturación, o citando un setlist privado, tenía eso duplicado en un lugar donde
nadie pensaría en buscar sus datos, y nada lo borraba nunca. La política de
privacidad tampoco lo menciona.

Ahora: identificador de referencia, timestamp, longitud del mensaje y del nombre,
y el **dominio** del mail. Alcanza para distinguir un mensaje real de una avalancha
de bots y para responder "¿llegó?" cuando falla el envío.

Hay un test que verifica que el nombre del local, la dirección, el cuerpo y la IP
no aparecen en el log, porque "agreguemos el mensaje al log para poder debuggear"
es un cambio razonable que alguien va a volver a proponer.

### S-04 · No había Content-Security-Policy
**Severidad: media. PARCIALMENTE CORREGIDO — va en modo reporte.**

Ahora se sirve una CSP en `Report-Only`. No es tibieza: una política que le falta
una directiva tira el sitio abajo, y no hay forma de saber que le falta una sin
mirar tráfico real. En modo reporte toda violación se ve en la consola sin romper
nada, y pasar a enforcement es editar una palabra.

`script-src` y `style-src` permiten `'unsafe-inline'` por una razón estructural:
Next inlinea su propio bootstrap y el payload RSC, y `lib/seo.ts` renderiza
cuatro bloques JSON-LD. El arreglo limpio es un nonce por request, lo que obliga a
leer el request en el layout raíz, lo que saca a **todas** las páginas del
renderizado estático. Doce rutas de marketing prerenderizan hoy.

**Queda pendiente:** mirar los reportes durante un par de semanas y después pasar a
enforcement.

### S-05 · HSTS no cubre subdominios, y el panel de admin es un subdominio
**Severidad: media. NO CORREGIDO — necesita tu decisión.**

Producción sirve `max-age=63072000` sin `includeSubDomains` y sin `preload`. El
panel de administración vive en `backstage.energycurve.app`, que por lo tanto no
queda cubierto.

No lo cambié por mi cuenta y quiero ser explícito sobre por qué: **los navegadores
cachean HSTS, en este caso por dos años.** Agregar `includeSubDomains` fuerza HTTPS
en todo subdominio presente y futuro, y si alguno alguna vez necesita servir HTTP,
no se puede revertir esperando: hay que esperar a que expire en cada navegador que
lo vio. Es una decisión que se toma una vez y se vive dos años.

Mi recomendación es agregarlo: todo lo que tenés está en Vercel sobre HTTPS, y
Resend usa registros DNS, no HTTP. Pero es tuya.

### S-06 · El limitador de tasa vive en memoria del proceso
**Severidad: media. NO CORREGIDO — requiere infraestructura.**

`lib/rate-limit.ts` guarda los buckets en un `Map` a nivel de módulo. En Vercel
eso significa que el límite es **por instancia** y se reinicia en cada arranque en
frío. Los límites que importan: reset de contraseña 5/15min (anti-enumeración y
anti-bombardeo de mails), contacto 5/10min, y el ordenamiento con IA 6/5min, que
es el que cuesta plata por llamada.

En la práctica los límites son orientativos. Resolverlo necesita almacenamiento
compartido (Upstash o Vercel KV).

### S-07 · Los links públicos de curva no se pueden revocar ni expiran
**Severidad: baja. NO CORREGIDO — decisión de producto.**

`/c/[token]` usa un HMAC sin estado sobre el id de la playlist. No hay revocación
por link: rotar `CURVE_SHARE_SECRET` invalida **todos** a la vez. Tampoco expiran.

La página no muestra el tracklist ni el dueño, así que lo que se filtra es la forma
de un set. Bajo, pero vale saberlo antes de promocionar la función.

### S-08 · El panel de administración no tiene MFA y tiene un admin hardcodeado
**Severidad: media. NO CORREGIDO — requiere decisión.**

`lib/backstage/config.ts` usa una lista blanca de mails desde
`BACKSTAGE_ADMIN_EMAILS`, con un fallback hardcodeado en el código fuente para
cuando la variable no está. Si esa variable alguna vez queda vacía en producción,
esa cuenta pasa a ser admin en silencio.

No hay MFA en ningún lado, incluido el panel que puede suspender y borrar
usuarios. WorkOS lo soporta. Tampoco hay tabla de auditoría de acciones de admin:
queda solo en `logInfo` a stdout. Y `/api/backstage/*` no tiene rate limiting.

### S-09 · Una dependencia LGPL transitiva
**Severidad: informativa.**

`@img/sharp-libvips-darwin-arm64@1.3.3`, LGPL-3.0-or-later, entra transitivamente
por la optimización de imágenes de Next. Es un binario nativo enlazado
dinámicamente, que es el caso estándar y de bajo riesgo, y **no llega al
navegador** — que es donde `AGENTS.md` pone la restricción dura.

Vale declararlo en el data room de due-diligence en vez de que lo encuentre un
comprador. El resto son 409 MIT, 27 ISC y 13 Apache-2.0. Sin AGPL ni GPL.

### S-10 · Quedan 18 vulnerabilidades transitivas
**Severidad: baja a media. Sin acción por ahora, con criterio.**

Después de los dos bumps: 0 críticas, 7 altas, 8 moderadas, 3 bajas. Las que
quedan son transitivas y casi todas del toolchain (browserslist, postcss,
js-yaml, @babel/core), no de algo que atienda un request.

`npm audit --audit-level=high` quedó en el CI como **advisory y no bloqueante**, a
propósito: un aviso nuevo en una dependencia transitiva bloquearía todos los PRs
sin relación hasta que alguien río arriba publique un fix, y un gate que hay que
saltear para shipear deja de leerse.

---

## Lo que falta para cerrar el proyecto

- **Las pruebas activas de IDOR, XSS y escalamiento de privilegios necesitan las
  tres cuentas de prueba.** La capa de servicios ya tiene tests de aislamiento de
  datos, pero eso es el límite lógico, no el ejercicio contra la app corriendo.
- **El tabletop de respuesta a incidentes** y el procedimiento de notificación de
  brechas a 72 horas, compartido con el proyecto de Privacy.
- **Lo que exige dashboards y es tuyo:** región de Supabase, backups y PITR,
  alcance de los secretos por entorno en Vercel, protección de deploys de preview,
  y MFA en WorkOS de producción.
