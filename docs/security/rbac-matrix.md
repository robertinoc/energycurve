# Matriz de privilegios — EnergyCurve

**Proyecto 2 · Auditoría de Seguridad · F2** — "Verificar RBAC y separación de
privilegios" y "Endurecer y auditar la cuenta/panel de administración".
Fecha: 2026-09-11. Verificado contra el código en `main` @ `1c7048d` más los
cambios de esta rama.

---

## 1. Los roles que existen realmente

El plan de auditoría, escrito como plantilla, asume tres roles: **usuario,
soporte, admin**. EnergyCurve tiene **dos**, y conviene decirlo antes de
auditar algo que no existe:

| Rol | Cómo se obtiene | Dónde vive |
|---|---|---|
| **Usuario autenticado** (DJ) | sesión WorkOS válida | cookie de sesión |
| **Admin de backstage** | su email está en `BACKSTAGE_ADMIN_EMAILS` | variable de entorno |

No hay rol de soporte, ni tabla de roles, ni permisos por operación. Un admin
puede hacer todo lo que el panel expone; un usuario no puede hacer nada de eso.
La separación es binaria y la frontera es una lista de emails.

**Eso es defendible para un producto operado por una persona**, y es
deliberado (`lib/backstage/config.ts` lo documenta: "a single-admin panel
doesn't need dynamic roles yet"). Lo que no era defendible, y es lo que esta
fase corrige, es que esa frontera no tenía ni pruebas que la fijaran ni un
registro de lo que pasa del otro lado.

El plan mencionaba además que el panel no tiene MFA. Sigue sin tenerla: WorkOS
la ofrece a nivel de organización y activarla es una decisión de dashboard, no
de código. Queda en la lista de Robertino.

---

## 2. La matriz

Las tres columnas son los tres niveles que el producto distingue. "—" significa
que la operación ni siquiera es alcanzable.

| Superficie | Anónimo | DJ autenticado | Admin |
|---|---|---|---|
| `/` , `/pricing`, `/es`, legales | ✅ | ✅ | ✅ |
| `/c/<token>` (curva pública) | ✅ con token | ✅ | ✅ |
| `/dashboard/**` | ↪ `/login` | ✅ solo lo suyo | ✅ solo lo suyo |
| `/api/playlists/**` | 401 | ✅ scope por `user_id` | ✅ scope por `user_id` |
| `/api/account/export` | 401 | ✅ solo su cuenta | ✅ solo su cuenta |
| `/api/billing/checkout`, `/portal` | 401 | ✅ | ✅ |
| `/api/billing/webhook` | firma Stripe | firma Stripe | firma Stripe |
| `/api/cron/retention` | `CRON_SECRET` | `CRON_SECRET` | `CRON_SECRET` |
| `/backstage/**` (páginas) | ↪ `/login` | ↪ `/dashboard` | ✅ |
| `GET /api/backstage/analytics/summary` | 401 | 401 | ✅ |
| `PATCH /api/backstage/users/:id` (suspender) | 401 | 401 | ✅ salvo otro admin |
| `DELETE /api/backstage/users/:id` (borrar) | 401 | 401 | ✅ salvo otro admin |

Tres propiedades de esa tabla que ahora están fijadas por tests
(`tests/backstage-rbac.test.ts`, 16 casos):

1. **Un DJ autenticado recibe exactamente la misma respuesta que un anónimo**
   en los endpoints de backstage: 401 con el mismo cuerpo. Si difirieran, un
   usuario cualquiera podría descubrir que el panel existe y que él no está en
   la lista.
2. **Un admin no puede suspender ni borrar a otro admin, ni a sí mismo.** La
   protección ya existía; ahora no se puede quitar sin que tres tests se
   pongan en rojo.
3. **Sacar un email de `BACKSTAGE_ADMIN_EMAILS` lo deja afuera en la
   siguiente request.** No hay caché ni sesión elevada que sobreviva al cambio.

Cada una se verificó inyectando el defecto que dice prevenir. Cinco mutaciones
—guard sin allowlist, sin validación de uuid, sin chequeo de origen, admins
como blanco válido, y origen chequeado antes que la sesión— produjeron entre 1 y
3 fallos cada una. Ninguna pasó inadvertida.

---

## 3. Lo que la fase encontró

### S-12 · El chequeo de origen estaba repartido al revés

`isTrustedOrigin` existía en **un solo lugar**: el formulario de contacto, que
es público y no autenticado. Los endpoints autenticados por cookie que
**suspenden y borran cuentas** no lo tenían.

No era explotable hoy: un `PATCH` con `content-type: application/json` dispara
preflight, y CORS lo frena. Pero eso significa que la defensa de esos dos
endpoints era una política CORS por defecto, en otra capa, que nadie escribió a
propósito. Ahora el chequeo está en `lib/http/trusted-origin.ts` y lo usan los
tres.

Su límite queda documentado y con un test que lo fija: una request **sin**
`Origin` ni `Referer` pasa. Es a propósito —curl y cualquier llamador
servidor-a-servidor no mandan ninguno—, y por eso no es una segunda
autenticación, sino un cerrojo sobre desde dónde puede actuar un navegador.

### S-13 · Un id malformado devolvía 500

`/api/backstage/users/not-a-uuid` llegaba hasta Postgres, que respondía error
`22P02`, que `getProfileById` convertía en un throw fuera de todo `try`. El
panel contestaba 500 a algo que es, simplemente, "no existe ese usuario".
Ahora valida la forma antes de consultar y devuelve 404 sin tocar la base.

### S-14 · El rastro de auditoría duraba lo que el log

Suspender y borrar son las dos cosas irreversibles que este producto puede
hacerle a un cliente, y el único registro de cualquiera de las dos era una
línea `logInfo` en stdout. Vercel guarda logs de runtime **un día** en Hobby y
un mes en Pro, y ninguno de los dos es consultable por "quién borró esta
cuenta". Seis semanas después de una acción irreversible contra alguien que
estaba pagando, la respuesta honesta era "no se puede saber".

Migración `0027` agrega `admin_audit_log`. Tres detalles del diseño:

- **`target_profile_id` no es foreign key**, a propósito: la fila que registra
  un borrado tiene que sobrevivir al perfil que nombra. Una FK lo rechazaría o
  borraría la evidencia del borrado.
- **El email del afectado no se guarda para siempre.** `sweepAuditLogEmails` lo
  limpia a los 365 días, dejando acción, actor y un uuid que ya no resuelve a
  nadie. Sin eso, el log de auditoría se convertía en el lugar donde vive
  indefinidamente la dirección de una persona borrada — justo el problema que
  el trabajo de retención acaba de sacar de `billing_events`.
- **Escribir en el log no bloquea la acción.** Es la concesión, y la alternativa
  es defendible: lo estricto sería abortar si no se puede auditar. Acá eso
  significaría que desplegar este código antes de aplicar la migración —que en
  este proyecto se aplican a mano— convierte el botón de borrar en un 500. Un
  cambio de seguridad cuyo primer efecto es una caída se revierte en lugar de
  arreglarse. Lo que lo hace defendible es que el fallo se reporta con
  `logError` y evento propio: "hicimos algo privilegiado y no lo registramos"
  es alertable, no una línea más de warning.

El panel muestra las últimas acciones en la pestaña Users, al lado de la tabla
desde la que se ejecutan. Un log de auditoría que hay que ir a buscar se lee
después de un incidente y nunca antes.

### S-15 · `resolveTarget` parecía discriminar y no discriminaba

Devolvía `{ error: NextResponse } | { email: string }` y los handlers hacían
`if ("error" in target) return target.error`. TypeScript ensancha una unión
inferida de objetos literales para que todos los miembros tengan todas las
claves, así que `"error" in target` no estrechaba nada y `target.error` era
`NextResponse | undefined` — los dos handlers quedaban tipados como
posiblemente devolviendo `undefined`. Funciona en runtime, porque la clave
opcional realmente no está; está a un refactor de no funcionar. Apareció recién
cuando algo importó los handlers y leyó `.status`, que es exactamente lo que
hace el suite de RBAC nuevo.

---

## 4. Lo que sigue abierto y depende de Robertino

| # | Qué | Por qué no lo puedo cerrar yo |
|---|---|---|
| S-08 | `BACKSTAGE_ADMIN_EMAILS` no está seteada en Vercel: producción corre con el fallback **hardcodeado** de `lib/backstage/config.ts`. Un email en un archivo fuente es hoy todo el control de acceso al panel que suspende y borra cuentas. | Ponerla a fail-closed ahora lo deja afuera del panel. El orden es: setearla → confirmar que el panel abre → recién ahí hacer que "sin variable" signifique "sin admins". |
| S-16 | **Migración `0027` sin aplicar.** Hasta que corra, el panel funciona igual y no registra nada; el recuadro "Admin actions" lo dice explícitamente en pantalla. | Las migraciones las corre él a mano, por convención del repo. |
| S-17 | MFA en WorkOS para las cuentas admin. | Configuración de dashboard. |
| S-18 | `CRON_SECRET` sin setear ⇒ el barrido de retención (billing + emails de auditoría) nunca corre. Responde 503, que es lo correcto, pero nunca se ejecuta. | Variable de entorno en Vercel. |

---

## 5. Lo que esta matriz **no** verificó

Honestidad sobre el alcance: todo lo de arriba se probó a nivel de handler, con
la sesión simulada. **No hay todavía una prueba contra el sistema corriendo con
tres cuentas reales** (FREE, PRO, PRO+), porque esas cuentas son el bloqueante
que sigue abierto desde F3 del plan de pruebas.

Lo que eso deja sin cubrir, concretamente:

- que la cookie de sesión de un DJ real no sea aceptada por el panel en un
  navegador de verdad (acá está probado el handler, no el stack completo);
- que el rewrite del subdominio `backstage.energycurve.app` no exponga ninguna
  ruta por fuera del layout que monta el guard;
- IDOR cruzado entre dos cuentas reales sobre `/dashboard/playlists/:id` y
  `/dashboard/shared/:id`.

Los tres están anotados en Asana como dependientes de las cuentas de prueba, y
ninguno se declara verificado hasta que se corran.
