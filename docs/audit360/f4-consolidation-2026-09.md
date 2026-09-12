# F4 · Consolidación: ¿lo remediado está vivo?

**Proyecto 4 · Auditoría360 · F4.** Fecha: 2026-09-12.

Las tres auditorías anteriores dicen qué se arregló. Esta fase pregunta otra
cosa: **¿está funcionando en el producto que la gente usa?** Un control que pasa
los tests y no llegó a producción no es un control.

Alcance según lo acordado: contra producción, **solo lecturas pasivas y sin
sesión** — headers, TLS, códigos de estado, contenido público. Nada que mute, y
ninguna cuenta.

---

## 1. Lo que se verificó vivo y está bien

| Control | Verificado | Resultado |
|---|---|---|
| Headers de seguridad | `curl -D -` sobre `/pricing` | `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy`, `permissions-policy` y CSP presentes |
| HSTS | idem | `max-age=63072000` (2 años) |
| La página 404 propia | `GET /this-was-never-a-page` | **404** con la página del producto, no la de Next |
| El link de compartir inválido | `GET /c/bogus-token` | **404**, sin distinguir firma inválida de set borrado |
| `/subprocessors` | EN y ES | **200** en los dos idiomas |
| `/backstage` | `GET` sin sesión | **307 → /login?returnTo=/backstage**, con `x-robots-tag: noindex, nofollow` |
| `robots.txt` | producción | Bloquea `/api/`, `/dashboard`, `/backstage`, y las cuatro rutas de auth con token en la URL |
| Sitemap | producción | Incluye `/subprocessors` en ambos idiomas |
| **La compuerta de consentimiento** | HTML de la home | **Cero referencias a PostHog** antes de aceptar. El control de privacidad más importante del producto, funcionando en vivo |

Ese último renglón es el que más valía verificar: el banner podría estar
perfecto y el SDK cargar igual. No carga.

### Una corrección sobre este mismo informe

La primera pasada de estos chequeos concluyó que **HSTS y CSP faltaban en
producción**. Era falso: el `grep` estaba mal escrito (`x-frame:` en lugar de
`x-frame-options:`), así que descartó justo las cabeceras que buscaba. Los
headers estaban.

Queda escrito porque es el mismo error que esta auditoría viene encontrando en
sus propios instrumentos, y esta vez el instrumento era un comando de una línea.
**Un chequeo que no se verifica a sí mismo produce hallazgos falsos con la misma
facilidad con la que deja pasar los verdaderos.**

---

## 2. Hallazgos

### F4-01 · La CSP en Report-Only no reporta a ningún lado — **Medio**

La política se sirve como `Content-Security-Policy-Report-Only` y **no contiene
`report-uri` ni `report-to`**.

El comentario en `next.config.ts` es honesto: dice que Report-Only "hace visible
cada violación **en la consola del navegador**". No miente. Pero el plan que
justifica el modo —"pasar a enforcement cuando veamos tráfico real"— depende de
datos que **nadie está recogiendo**: las violaciones aparecen sólo en la consola
de quien tenga las devtools abiertas en ese momento.

El resultado previsible es que la CSP se quede en Report-Only para siempre, que
es el destino habitual de las CSP en Report-Only.

**Y ahora es barato de arreglar**: el PR #209 sumó Sentry, que ingiere reportes
de CSP. Agregar `report-uri` al header convierte una política decorativa en la
fuente de evidencia que hace falta para endurecerla.

### F4-02 · `backstage.energycurve.app` devuelve 404 — **Bajo**

El DNS resuelve a IPs de Vercel, pero el host **no está atado a este proyecto**:
devuelve 404. El panel se usa por `energycurve.app/backstage`, que funciona.

Eso deja sin ejercitar en producción una maquinaria entera: `isBackstageHostname`,
los rewrites `beforeFiles` de `next.config.ts`, la entrada del matcher del proxy
con `has: host`, `backstageEffectivePathname` y la resolución de origen de
`resolveMainOrigin`.

No es un agujero. Es **complejidad mantenida para un camino que hoy no existe**,
y con un filo: el día que alguien apunte ese dominio al proyecto, se activa de
golpe un camino de rewrites que nunca sirvió un request real.

Dos salidas, y hay que elegir una en vez de dejarlo así: atar el dominio y
probarlo, o sacar la maquinaria y recuperarla del historial si algún día se usa.

### F4-03 · El checklist de lanzamiento describe un lanzamiento que ya pasó — **Bajo, pero engañoso**

`docs/launch-checklist.md` tenía **16 casillas sin marcar**, entre ellas "aplicar
la migración 0003" y "aplicar todas las migraciones (0001 → 0003)" — cuando hay
**29 migraciones** y el producto está vivo, desplegado y cobrando.

Para alguien que llega nuevo —que es exactamente el escenario que F5 acaba de
estudiar— ese documento decía que el producto no lanzó. Corregido en este PR.

### F4-04 · HSTS sin `includeSubDomains` — **Bajo, decisión pendiente**

`max-age=63072000` sin `includeSubDomains` ni `preload`. Está bien que así sea
por ahora: `includeSubDomains` alcanzaría a todo subdominio presente y futuro, y
los navegadores lo cachean dos años, así que es prácticamente irreversible.

Sigue siendo una decisión de Robertino, y se relaciona con F4-02: mientras el
subdominio de backstage no esté resuelto, agregarlo sería comprometerse por dos
años sobre un host que hoy no sirve nada.

---

## 3. Brechas entre documentación e implementación

Buscadas comparando lo que los documentos afirman contra el código y contra
producción. Las tres primeras ya se corrigieron durante la auditoría y están acá
porque el patrón importa más que los casos.

| # | La documentación decía | La realidad era | Cómo se detectó |
|---|---|---|---|
| 1 | Las migraciones 0027 y 0028 estaban aplicadas (tachadas en la matriz) | No lo estaban | Consulta a PostgREST contra dev |
| 2 | Crisp era un encargado de tratamiento | No hay una sola referencia a Crisp en el código | Búsqueda en `app/`, `lib/`, `components/`, `services/` |
| 3 | "Supabase (región UE)" en la política pública | Nadie confirmó la región | Se rastreó la afirmación hasta su origen: no tenía |
| 4 | El checklist de lanzamiento: producto sin lanzar | Vivo y cobrando | F4-03 |
| 5 | La CSP en Report-Only permite pasar a enforcement viendo tráfico | Nadie recoge las violaciones | F4-01 |

**El patrón, que es el hallazgo real de esta fase:** las cinco son afirmaciones
en prosa que ningún test podía leer. Las tres primeras se encontraron **midiendo**
—una consulta, un grep, un rastreo— y ninguna se habría encontrado releyendo.

Por eso los documentos de esta auditoría llevan tests: `ropa-accuracy`,
`subprocessors-accuracy`, `compliance-claims`, `security-measures-evidence`,
`evidence-index`. No convierten la prosa en verdad, pero convierten **una clase
de mentira** —la que afirma que existe algo que no existe— en un build rojo.

---

## 4. Gaps residuales y plan de cierre

| # | Gap | Severidad | Quién | Costo |
|---|---|---|---|---|
| G-1 | `CRON_SECRET` sin setear: cuatro ventanas de retención escritas, cero corriendo | Alto | Robertino | 2 min |
| G-2 | Migraciones 0027 y 0028 sin aplicar: sin log de auditoría, sin barrido de análisis | Alto | Robertino | 5 min |
| G-3 | Restauración de backups nunca probada | Alto | Robertino | 1 tarde |
| G-4 | Sin pentest ni verificación con cuentas reales | Medio | Robertino (3 cuentas) | desbloquea 13 tareas |
| G-5 | La CSP no recoge violaciones (F4-01) | Medio | se puede hacer ya, vía Sentry | 30 min |
| G-6 | DPAs sin firmar | Medio | Robertino | 1 hora |
| G-7 | Sin prueba de carga: falta el pico objetivo | Medio | Robertino define el número | — |
| G-8 | Subdominio de backstage sin resolver (F4-02) | Bajo | decisión | — |
| G-9 | Acceso de emergencia delegado: bus factor 1 | Alto | Robertino | 1 tarde |
| G-10 | HSTS `includeSubDomains` (F4-04) | Bajo | decisión | — |

**Tres de los cuatro altos cuestan menos de diez minutos entre los tres.** G-1 y
G-2 son siete minutos que convierten cinco controles escritos en cinco
funcionando; es la mejor relación esfuerzo/resultado de los cuatro proyectos, y
lleva señalada desde el informe de seguridad sin moverse.
