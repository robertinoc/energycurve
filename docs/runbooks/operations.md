# Operar EnergyCurve

> **Empezá acá si sos nuevo y algo hay que hacer.** Esta página no explica el
> producto ni la arquitectura: responde las preguntas que aparecen cuando hay que
> tocar algo, y dice dónde está el resto.
>
> Escrita el 11/09/2026 en la fase F5 de *Auditoría 360*, después de comprobar que
> la documentación era densa y buena pero estaba ordenada **por proyecto** —
> compliance, seguridad, QA — y no **por tarea**. Todo estaba en algún lado; nada
> estaba donde alguien que necesita hacer algo lo buscaría.

---

## 1 · Los dos proyectos de Supabase, y la trampa del panel

**Este es el dato más consecuente de esta página.** Hay dos proyectos separados,
en cuentas distintas:

| Entorno | Project ref | Dónde se usa |
|---|---|---|
| **Desarrollo** | `djoutoutkukpjrdgjqkb` | `.env.local`, y toda máquina local |
| **Producción** | `iwzkzybzadsmnwilcity` | Variables de entorno de Vercel |

> ⚠️ **El panel de Supabase muestra una insignia verde `main PRODUCTION` al lado
> del nombre del proyecto — y la muestra igual en el de desarrollo.** Es la
> etiqueta de la *rama* `main`, no del entorno. Leerla como "estoy en producción"
> es el error natural y ya llevó a correr la misma migración dos veces en dev
> creyendo que la segunda vez era prod.
>
> **El único indicador confiable es el ref en la URL**, no la insignia ni el
> color.

Para verificar cuál es prod sin depender de esta página:
`vercel env pull --environment=production` a un archivo temporal, leer sólo el
ref, borrarlo. **Nunca a `.env.local`**, que sobrescribiría las claves de dev.

## 2 · Correr una migración

Las migraciones **no se aplican solas**. No hay `supabase db push` en el
pipeline: alguien las pega en el SQL Editor, a mano, en los dos proyectos.

1. El archivo está en `supabase/migrations/NNNN_*.sql`, numerado y secuencial.
2. Abrir el SQL Editor del proyecto, confirmando el **ref** (§1).
3. Pegar y ejecutar.
4. **Repetir en el otro proyecto.** Una migración en uno solo es la causa más
   común de "anda en dev y no en prod".

Dos cosas que el editor hace y conviene saber:

- **Sólo muestra el resultado del último `select`.** Un script con varias
  verificaciones parece haber corrido una sola. Si hace falta ver varios pasos,
  hay que juntarlos en un `select` final — hay un ejemplo con bloque `DO` en el
  historial de la migración 0029.
- No hay tabla de migraciones aplicadas. Para saber si una corrió hay que
  preguntarle al esquema (`to_regclass`, `to_regproc`, `information_schema`).

## 3 · Desplegar y volver atrás

Está completo en [`deploy-and-rollback.md`](deploy-and-rollback.md), y su primer
párrafo importa más que el resto: **Vercel despliega en cada push a `main` sin
esperar al CI**. Los dos corren en paralelo, y el build de Vercel suele ganar. Un
merge con los tests en rojo llega igual a producción.

## 4 · Un incidente

[`../security/incident-response.md`](../security/incident-response.md) tiene el
procedimiento, y [`../security/breach-notification-template.md`](../security/breach-notification-template.md)
la plantilla regulatoria. El registro de incidentes vive en
`../security/incidents/`, un archivo por incidente, **y se anota incluso cuando
se decide no notificar** — con el motivo, que es lo que una autoridad va a pedir
ver (Art. 33.5).

Lo que hay que saber antes de que pase: **hoy nada avisa.** Desde el 11/09/2026
hay seguimiento de errores en Sentry, pero **la alerta hay que crearla en el
panel de Sentry** y la especificación está en
[`../security/alerting.md`](../security/alerting.md). Sin esa alerta, el camino
por el que nos enteramos de un problema sigue siendo que un usuario lo reporte.

## 5 · Si se filtra un secreto

No hay un documento dedicado, así que queda acá el orden correcto:

1. **Rotar primero en el proveedor**, no en Vercel. Mientras la clave vieja
   siga siendo válida, cambiarla en Vercel sólo deja de usarla — no la desactiva.
2. Poner la nueva en Vercel, **en los dos entornos** si aplica.
3. Redesplegar: las variables se leen en build para las públicas y en arranque
   para las de servidor.
4. Anotar el incidente en `../security/incidents/` aunque no haya habido acceso
   indebido. Una clave expuesta es un incidente de seguridad, se haya usado o no.

La clave más sensible es `SUPABASE_SERVICE_ROLE_KEY`: **RLS corre con cero
políticas**, así que esa clave no es "acceso privilegiado", es acceso total sin
segunda línea. `WORKOS_API_KEY` y `STRIPE_SECRET_KEY` van después.

## 6 · Qué corre solo, y cómo saber si corrió

| Qué | Cuándo | Cómo confirmar |
|---|---|---|
| Barrido de retención | Diario, vía cron de Vercel | Responde **503 sin `CRON_SECRET`**, y hoy esa variable no está puesta: **no está corriendo nada**. Ver `../compliance/gap-assessment.md` (R1) |

Es la única tarea programada del producto. Cuatro ventanas de retención escritas
y ninguna corriendo, por una variable de entorno de dos minutos.

## 7 · Dónde está el resto

| Si necesitás… | Está en |
|---|---|
| Levantar el proyecto de cero | `../setup-infra.md` → *Local Setup* |
| Qué hace cada variable de entorno | `.env.example`, comentada una por una |
| Cómo se gatea cada plan | `../plan-gating.md` |
| Qué datos personales se tratan y dónde | `../compliance/ropa.md` |
| Qué encargados hay y en qué país | `../compliance/ropa.md` → *Encargados* |
| Estado de seguridad y hallazgos | `../security/findings-2026-09.md` |
| Deuda técnica, observabilidad, mantenibilidad | `../audit/technical-audit-2026-09.md` |
| Capas, acoplamiento y puntos únicos de falla | `../audit/architecture-review-2026-09.md` |
| Por qué el producto es así | `../decisions.md` y `../product-strategy-v2.md` |

## 8 · Lo que esta página no puede darte

Dicho para que nadie lo descubra en el peor momento:

- **La titularidad de las cuentas.** Vercel, Supabase, WorkOS, Stripe, Resend,
  Anthropic, PostHog y Sentry están a nombre de una persona. Un traspaso real
  necesita transferir cada una, y eso no se hace desde el repo.
- **Los valores de los secretos.** Están en Vercel y en los paneles de cada
  proveedor, que es donde tienen que estar.
- **La restauración de un backup nunca se probó.** Supabase los hace; que se
  puedan restaurar es una suposición hasta que alguien lo intente. Es una tarea
  abierta en el proyecto de Seguridad (F5).
