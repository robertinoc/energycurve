# Lanzamiento — estado

> **EnergyCurve lanzó.** Está desplegado en `https://energycurve.app`, tiene
> usuarios alpha y cobra suscripciones. Este documento era una checklist de
> pre-lanzamiento con 16 casillas sin marcar, y en septiembre de 2026 seguía
> diciendo cosas como "aplicar la migración `0003`" cuando hay 29 migraciones.
>
> Lo detectó la fase F4 de la Auditoría360
> (`docs/audit360/f4-consolidation-2026-09.md`): para alguien que llega nuevo,
> el documento afirmaba que el producto no había lanzado. Se reescribió como
> registro de estado, no como plan.

Actualizado: 12/09/2026.

---

## Verificado desde afuera, contra producción

Comprobado con lecturas pasivas y sin sesión el 12/09/2026. Cualquiera puede
repetirlo.

| Qué | Cómo se comprobó |
|---|---|
| La aplicación está desplegada y sirve por TLS | `GET https://energycurve.app` → 200 |
| Headers de seguridad activos | `x-frame-options`, `x-content-type-options`, `referrer-policy`, `permissions-policy`, HSTS y CSP en Report-Only |
| `/api/health` responde | 200, consultando la base de verdad |
| Las páginas legales están publicadas | `/privacy`, `/terms`, `/cookie-policy`, `/subprocessors` — en EN y ES |
| El panel de admin está protegido | `/backstage` sin sesión → 307 a `/login`, con `noindex` |
| `robots.txt` y el sitemap | Publicados y coherentes |
| El consentimiento gatea la analítica | Cero referencias a PostHog en el HTML antes de aceptar |

## Verificado desde el repositorio

| Qué | Dónde |
|---|---|
| 29 migraciones versionadas | `supabase/migrations/` |
| Variables de entorno documentadas | `.env.example`, verificado por `tests/env-example.test.ts` |
| Pipeline de CI con gates por PR | `.github/workflows/ci.yml` |
| Despliegue y rollback | `docs/runbooks/deploy-and-rollback.md` |

---

## Lo que sigue abierto

No se puede verificar desde afuera del dashboard, así que se lista sin marcar en
ninguna dirección — que es distinto de listarlo como pendiente.

| # | Qué | Por qué importa |
|---|---|---|
| 1 | `CRON_SECRET` en Vercel | Sin eso, las cuatro ventanas de retención no corren nunca |
| 2 | Migraciones **0027** y **0028** | Verificado el 12/09 contra dev: **no están aplicadas**. Sin ellas no hay log de auditoría ni barrido de análisis |
| 3 | Región de Supabase | La política de privacidad tuvo que dejar de afirmarla |
| 4 | Backups: contenido, retención, PITR, y **una restauración probada** | Nunca se ejecutó |
| 5 | `BACKSTAGE_ADMIN_EMAILS` en Vercel | Hoy producción corre con el fallback del código |
| 6 | `AUTH_REQUIRE_EMAIL_VERIFICATION` | Confirmar su valor en producción |
| 7 | Monitor de uptime sobre `/api/health` | Con timeout **> 4 s**: el endpoint llegó a tardar 3,57 s |
| 8 | Dashboards de KPI en PostHog | Los eventos ya se emiten |
| 9 | Google Search Console | El código está listo (`GOOGLE_SITE_VERIFICATION`, sitemap, robots); falta reclamar el dominio |
| 10 | DPAs con los ocho encargados | `docs/compliance/international-transfers.md` §4 |

---

## Dónde seguir

- Desplegar y volver atrás: [`runbooks/deploy-and-rollback.md`](runbooks/deploy-and-rollback.md)
- Estado por área: [`roadmap-status.md`](roadmap-status.md)
- Operar el sistema: `runbooks/operations.md` — *llega con el PR #213*
- Todo lo que produjeron las auditorías: `audit360/evidence-index.md` — *llega
  con el PR #214*

Los dos últimos se citan sin enlace a propósito: todavía están en revisión, y un
enlace roto en la página de entrada es exactamente el problema que este
documento acaba de dejar de tener.
