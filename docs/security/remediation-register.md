# Registro de remediación — antes, después, y con qué se prueba

> **Qué es esto.** Un registro de cierre, hallazgo por hallazgo, de los
> dieciocho que produjo la auditoría interna de septiembre de 2026: severidad,
> explotabilidad real, qué había antes, qué hay ahora, y **con qué archivo o
> test se comprueba**. Es lo que un data room pide cuando pregunta "¿esto se
> arregló, o se anotó?".
>
> **Qué NO es.** No es un informe de pentest, y el registro no lo disimula:
> **no hubo pentest.** Tampoco hubo verificación contra cuentas reales, que es
> el bloqueante abierto desde la fase F3 del plan de pruebas. Las cuatro tareas
> de la fase F7 de Seguridad que dependen de un pentest —ejecutarlo, priorizar
> *sus* hallazgos, remediarlos y re-testearlos— **siguen abiertas**. Este
> documento cierra las dos que no dependían de él: la priorización de los
> hallazgos que sí existen, y el registro de evidencia de cierre.
>
> Escrito el 21/09/2026, a partir de
> [`findings-2026-09.md`](findings-2026-09.md) y
> [`rbac-matrix.md`](rbac-matrix.md), que son las fuentes y siguen siendo el
> detalle. Acá está la vista de una sola pantalla.

---

## 1 · El resumen en tres números

**18 hallazgos · 11 corregidos · 3 abiertos por decisión o infraestructura ·
4 abiertos y dependen de una acción en un panel.**

Y una cosa que conviene decir con precisión, porque es lo que más le importa a
quien lee esto y también lo más fácil de exagerar:

> **De los dieciocho, dos eran caminos que un desconocido podía recorrer desde
> internet** —S-01, el bypass de middleware de Next.js, y S-02, la expansión de
> entidades del parser de XML— **y los dos están corregidos con doble
> protección.** Los otros dieciséis son de otras tres clases: defensa en
> profundidad ausente, rastro de auditoría insuficiente, y datos personales
> donde no correspondía. Ninguna de esas tres necesita un atacante para ser un
> problema, y ninguna es un agujero por el que entrar.
>
> **Lo que esta afirmación no cubre:** que no exista un camino que la auditoría
> no miró. Eso no lo puede decir una auditoría hecha por quien escribió el
> código, y es exactamente para lo que existe un pentest.

---

## 2 · Cómo está priorizado, y por qué no es una lista de CVSS

La fase pedía priorizar "por severidad y explotabilidad, con CVSS más contexto
de negocio". Se hizo, con una corrección al método que vale escribir:

**Para nueve de los dieciocho, la explotabilidad no es la dimensión
relevante.** Un rastro de auditoría que dura un día (S-14) no se explota: falla
solo, seis semanas después, cuando alguien pregunta quién borró una cuenta que
estaba pagando. Un log con el texto de los mensajes de la gente (S-03) es una
brecha de datos personales **sin que nadie ataque nada**. Forzar esos a una
escala de explotabilidad los hunde al fondo de la lista, que es justo donde no
tienen que estar.

Así que el orden es por **consecuencia × probabilidad de que la consecuencia
ocurra**, y cada fila dice cuál de las dos la pone donde está:

| Prioridad | Hallazgos | Qué los junta |
|---|---|---|
| **P1 — camino abierto** | S-01, S-02 | Explotables desde afuera, con CVE público. Probabilidad alta por existir el exploit, consecuencia alta por lo que protegen |
| **P2 — la consecuencia llega sola** | S-03, S-14, S-06 | No hace falta atacante: un log que nadie borra, un rastro que expira, un límite que no limita |
| **P3 — control irreversible sin segunda barrera** | S-08, S-16, S-18 | El panel que borra cuentas, y los controles escritos que no corren |
| **P4 — defensa en profundidad ausente** | S-04, S-05, S-12 | Su ausencia no es explotable por sí misma; su presencia es lo que contiene el error de otro |
| **P5 — corrección y deuda** | S-13, S-15, S-07, S-17 | Reales, acotados, y ninguno con impacto sobre datos de terceros |
| **Informativo** | S-09, S-10 | Licencias y vulnerabilidades transitivas del toolchain, con veredicto escrito |

---

## 3 · El registro

> **Sobre dos identificadores.** `findings-2026-09.md` numera S-01 a S-10 y
> `rbac-matrix.md` numera S-12 a S-18: **S-11 nunca se asignó**, y la integridad
> del pipeline de build —que fue un hallazgo real, con nueve mutaciones
> verificadas— quedó sin número. Este registro se lo asigna. El otro hueco es al
> revés: la restauración de backups no es un hallazgo de esta auditoría sino la
> brecha del Art. 32(1)(c), y ya tiene identificador propio (**G-3**) en el
> informe de consolidación. Se usa ése en vez de inventarle un S-19, porque dos
> numeraciones para lo mismo es cómo una lista de pendientes empieza a tener
> filas duplicadas.

### Corregidos

| # | Hallazgo | Severidad | Antes | Después | Evidencia | Cómo se verificó el arreglo |
|---|---|---|---|---|---|---|
| **S-01** | Bypass de middleware en Next.js | Alta | 16.2.3, con bypass de middleware en App Router (CVSS 8,1 / 7,5), SSRF en server actions (8,6) y una RCE crítica en optimización de imágenes. **La protección de rutas de este producto es `proxy.ts`**, así que un bypass ahí es un bypass de autenticación | 16.3.4 | `package.json`, `proxy.ts`, `tests/protected-routes.test.ts` | Suite completa contra el salto de versión: typecheck, 1.512 tests, build y E2E en cuatro navegadores |
| **S-02** | Expansión de entidades en el parser de XML | Alta | `fast-xml-parser` 5.9.3: DOCTYPE repetidos reinician el límite de expansión. Es el parser de los imports de Rekordbox y Traktor, **del lado del servidor**, sobre documentos de hasta 12 MB | 5.11.1 **más** una guarda propia que rechaza DOCTYPE, declaraciones de entidad, instrucciones de proceso y anidamiento >40 **antes** de que el parser construya nada | `lib/playlists/xml-guard.ts`, `tests/xml-guard.test.ts` | Los tests que más pesan son los de falsos positivos: `<` dentro de un valor de atributo, comentarios y CDATA llenos de símbolos, 500 tracks auto-cerrados. **Rechazar una librería real sería peor que el ataque** |
| **S-03** | El formulario de contacto copiaba los mensajes a los logs | Media | Nombre, dirección, **el texto completo del mensaje** e IP, en un log sin retención, sin redacción y sin control de acceso | Identificador, timestamp, longitudes, y el **dominio** del mail | `services/contact-service.ts`, `tests/contact-pii.test.ts` | Un test verifica que el cuerpo, la dirección, la IP y el nombre del local **no aparecen**. Existe porque "agreguemos el mensaje al log para debuggear" es un cambio que alguien va a volver a proponer |
| **S-06** | El limitador de tasa vivía en memoria del proceso | Media | Un `Map` a nivel de módulo: en Vercel el límite era **por instancia** y se reiniciaba en cada arranque en frío. "Tres exports por hora" significaba tres por instancia. Los tres que más importaban —reset de contraseña, contacto y ordenamiento con IA— eran orientativos | Estado compartido en Postgres, con **ventanas alineadas a la época** para que dos instancias floreen el reloj igual sin coordinarse | `lib/rate-limit.ts`, `services/rate-limit-service.ts`, `supabase/migrations/0029_rate_limit_buckets.sql`, `tests/rate-limit.test.ts` | El compromiso queda **escrito en vez de descubierto después**: una ráfaga a caballo de un borde puede alcanzar 2× el límite entre dos ventanas. Es el mismo compromiso que ya hacía la versión en memoria, y por eso las cuotas mensuales viven en `feature_usage` con período de calendario |
| **S-12** | El chequeo de origen estaba repartido al revés | Media | `isTrustedOrigin` existía en **un solo lugar**: el formulario de contacto, que es público. Los endpoints autenticados que **suspenden y borran cuentas** no lo tenían | Vive en un módulo y lo usan los tres | `lib/http/trusted-origin.ts`, `tests/api-contact.test.ts`, `tests/backstage-rbac.test.ts` | Y su **límite** quedó fijado con un test: una request sin `Origin` ni `Referer` pasa, a propósito (curl y cualquier llamador servidor-a-servidor no mandan ninguno). No es una segunda autenticación y el test impide que se lea como tal |
| **S-13** | Un id malformado devolvía 500 | Baja | `/api/backstage/users/not-a-uuid` llegaba a Postgres, que respondía `22P02`, que se convertía en throw fuera de todo `try` | Valida la forma antes de consultar: 404 sin tocar la base | `app/api/backstage/users/[id]`, `tests/backstage-users.test.ts` | Incluido en las 5 mutaciones del suite de RBAC (quitar la validación de uuid pone tests en rojo) |
| **S-14** | El rastro de auditoría duraba lo que el log | Media | Suspender y borrar son las dos cosas irreversibles que el producto puede hacerle a un cliente, y el único registro era un `logInfo` a stdout. Vercel retiene logs **un día** en Hobby, y ninguno es consultable por "quién borró esta cuenta" | Tabla `admin_audit_log`, mostrada en el panel al lado de la tabla desde la que se ejecuta la acción | `supabase/migrations/0027_admin_audit_log.sql`, `services/admin-audit-service.ts`, `tests/backstage-admin-actions.test.ts` | Tres decisiones explícitas en la migración: `target_profile_id` **no** es FK (la fila que registra un borrado tiene que sobrevivir al perfil que nombra), el email se limpia a los 365 días, y escribir en el log **no bloquea** la acción pero su fallo se reporta con evento propio. ⚠️ **Depende de que la migración 0027 esté aplicada — ver S-16** |
| **S-15** | `resolveTarget` parecía discriminar y no discriminaba | Baja | `{ error } \| { email }` con `if ("error" in target)`: TypeScript ensancha la unión, así que no estrechaba nada y los dos handlers quedaban tipados como posiblemente `undefined` | Unión discriminada real | `app/api/backstage/users/[id]`, `npx tsc --noEmit` | Funcionaba en runtime y estaba **a un refactor** de no funcionar. Apareció recién cuando el suite de RBAC importó los handlers y leyó `.status` |
| **S-11** | Integridad del pipeline de build | Baja | Las cuatro actions de CI referenciadas por **tag**. Un tag es un puntero que su dueño puede mover, y quien controla el tag controla qué corre dentro de un job que tiene este repo clonado y el token en scope | Pinneadas a SHA con la versión en un comentario, `permissions: contents: read` **declarado**, `persist-credentials: false` en checkout, y Semgrep pinneado | `.github/workflows/ci.yml`, `.github/dependabot.yml`, `tests/workflow-integrity.test.ts` | **Nueve mutaciones, todas detectadas — y una no, al principio:** quitar `persist-credentials: false` dejó los diez tests en verde, porque el regex matcheaba la palabra dentro del propio comentario que explica el setting. El arreglo es un `stripComments` con nombre y sus propios tests |
| **S-09** | Una dependencia LGPL transitiva | Informativa | `@img/sharp-libvips-darwin-arm64`, LGPL-3.0-or-later, vía la optimización de imágenes de Next | Declarada, con el razonamiento: binario nativo enlazado dinámicamente y sin modificar, no llega al navegador, y la LGPL obliga al **distribuir** — esto es un SaaS | `docs/security/sbom/energycurve-sbom.cdx.json`, `docs/audit/f6-ip-licences-risks-2026-09.md` | Verificado sobre el **árbol instalado**, no sobre `package.json`. Sin AGPL ni GPL, que es la restricción dura de `AGENTS.md` |
| **S-10** | 18 vulnerabilidades transitivas | Baja/Media | 22 con 1 crítica | 18 con **0 críticas**; las que quedan son del toolchain (browserslist, postcss, js-yaml, @babel/core), no de algo que atienda un request | `.github/workflows/ci.yml` | `npm audit --audit-level=high` quedó **advisory y no bloqueante, a propósito**: un aviso nuevo en una transitiva bloquearía todos los PRs sin relación hasta que alguien río arriba publique un fix, y un gate que hay que saltear para shipear deja de leerse |

### Abiertos por decisión de producto o por infraestructura

| # | Hallazgo | Severidad | Estado | Qué falta, y de quién es |
|---|---|---|---|---|
| **S-04** | CSP en `Report-Only` sin recolección | Media | **Parcial** | La política se sirve, pero sin `report-uri` ni `report-to`: las violaciones se ven en la consola del navegador de quien las causa, o sea en ningún lado. El plan que justifica el modo —pasar a enforcement cuando veamos tráfico real— depende de datos que nadie recoge, y el resultado previsible es Report-Only para siempre. **Ahora es barato:** Sentry ingiere reportes de CSP. Es el gap **F4-01 / G-5**, estimado en 30 minutos |
| **S-05** | HSTS no cubre subdominios | Media | **Abierto — decisión** | Producción sirve `max-age=63072000` sin `includeSubDomains` ni `preload`, y el panel de admin vive en `backstage.energycurve.app`. **No se cambió a propósito:** los navegadores cachean HSTS dos años, así que agregarlo fuerza HTTPS en todo subdominio presente y futuro y no se revierte esperando. Se decide una vez y se vive dos años. La recomendación es agregarlo |
| **S-07** | Los links públicos de curva no se revocan ni expiran | Baja | **Abierto — decisión** | HMAC sin estado: rotar `CURVE_SHARE_SECRET` invalida **todos** a la vez y es la única revocación que hay. La página no muestra tracklist ni dueño, así que lo que se filtra es la forma de un set. Consecuencia operativa nueva, documentada en [`../runbooks/secret-rotation.md`](../runbooks/secret-rotation.md) §3: como `/c/[token]` devuelve el **mismo 404** para una firma inválida que para un set borrado, un DJ cuyo link se rompió por una rotación **no tiene forma de saber que fue eso** |
| **S-08** | El panel de admin no tiene MFA y tiene un admin hardcodeado | Media | **Abierto** | `BACKSTAGE_ADMIN_EMAILS` no está seteada en producción, así que corre con el fallback del código fuente: un email en un archivo es hoy todo el control de acceso al panel que suspende y borra cuentas. El orden importa: **setearla → confirmar que el panel abre → recién ahí** hacer que "sin variable" signifique "sin admins" |

### Abiertos y dependen de una acción en un panel

Ninguno de estos cuatro necesita código. Los cuatro convierten controles
escritos en controles que corren, y **tres cuestan menos de diez minutos entre
los tres.**

| # | Qué | Costo | Qué desbloquea |
|---|---|---|---|
| **S-18** | `CRON_SECRET` en las variables de producción de Vercel | 2 min | Las **cuatro ventanas de retención** pasan de política escrita a efecto observable. Hoy `/api/cron/retention` responde 503, que es la dirección correcta de fallo y también significa que nunca corrió |
| **S-16** | Aplicar las migraciones `0027`, `0028` y `0029` | 5 min | `0027` es lo que hace que S-14 sea real: hasta que corra, el panel funciona igual y **no registra nada** (el recuadro lo dice en pantalla). `0029` es el estado compartido del limitador de S-06 |
| **S-17** | MFA en WorkOS para las cuentas admin | 15 min | Cierra la mitad de S-08 que no es una variable de entorno |
| **G-3** | Probar una restauración de backup | 1 tarde | La brecha más seria del Art. 32. Tiene procedimiento desde hoy: [`../runbooks/backup-restore.md`](../runbooks/backup-restore.md), con la tabla de resultados para llenar |

---

## 4 · Una deriva que apareció escribiendo este documento

`findings-2026-09.md` describía **S-06 como "NO CORREGIDO — requiere
infraestructura"**. Ya no es cierto: el limitador tiene estado compartido en
Postgres desde la migración `0029`, y `lib/rate-limit.ts` documenta el cambio en
su propio encabezado.

O sea que el informe de hallazgos estuvo reportando como abierto un hallazgo
cerrado. Corregido en este mismo cambio.

**Vale anotarlo en vez de arreglarlo en silencio**, por dos razones. La primera
es que es la sexta vez que esta auditoría encuentra un documento afirmando algo
falso, y las seis veces la clase de error fue la misma: **prosa que no se rompe
sola.** La segunda es que esta deriva es la menos visible de todas — una brecha
reportada como abierta cuando ya está cerrada no hace daño obvio, y por eso nadie
la busca. Pero le cuesta al lector exactamente lo mismo: si una fila de la tabla
es vieja, ninguna de las otras se puede tomar al pie de la letra.

Por eso `tests/remediation-register.test.ts` hace dos cosas y no una: verifica
que los archivos citados existan, **y** que los cuatro hallazgos abiertos sigan
descritos como abiertos. Si alguno se cierra de verdad, el test se pone rojo y
obliga a actualizar el documento — que es el mismo truco del canario de
`compliance-claims.test.ts`, leído al revés hasta que se ve para qué es.

---

## 5 · Lo que este registro no prueba

- **No hubo pentest.** Ni interno con herramientas activas contra la app
  corriendo, ni externo independiente. Las cuatro tareas de F7 que lo requieren
  siguen abiertas y este documento no las toca.
- **No hubo verificación con cuentas reales.** Todo lo de RBAC e IDOR está
  probado a nivel de handler y de servicio con la sesión simulada. Lo que queda
  sin ejercitar: que la cookie de un DJ real no sea aceptada por el panel en un
  navegador, que el rewrite del subdominio de backstage no exponga rutas fuera
  de su layout, y el IDOR cruzado entre dos cuentas reales. **Se desbloquea con
  tres cuentas de prueba** y es el bloqueante más productivo que queda: libera
  trece tareas repartidas en dos planes.
- **La auditoría la hizo quien escribió el código.** No tiene defensa retórica,
  está declarado en
  [`../audit360/adversarial-review.md`](../audit360/adversarial-review.md) como
  el ataque A-1, y lo único que lo compensa es el método: 40+ defectos
  inyectados, **incluidos los dos que no se detectaron** porque el defecto
  estaba en el instrumento. Los dos están publicados.
- **"Corregido" significa "corregido en `main`"**, no "corriendo en producción".
  La diferencia no es teórica: S-14 depende de una migración que se aplica a
  mano, y S-06 también. La fase F4 de *Auditoría 360* existe justamente porque
  un control que pasa los tests y no llegó a producción no es un control.
