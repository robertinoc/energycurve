# Auditoría técnica — deuda, observabilidad y mantenibilidad

> Proyecto *4. Auditoría 360*, fases F2 y F3. Fecha: 11/09/2026, sobre `main`.
> Todo lo que sigue está medido: cada número se reproduce con el comando que lo
> acompaña. Donde no pude medir, lo digo en vez de estimar.

## Resumen en una línea

Un código **inusualmente disciplinado** con **dos riesgos que un comprador
miraría primero**: los tests cubren la lógica pura y casi no tocan el código que
decide quién puede hacer qué, y el conocimiento vive en una sola persona.

---

## F2 · Deuda técnica

### Lo que no hay, y conviene decirlo primero

| Señal | Medición | Lectura |
|---|---|---|
| Marcadores `TODO` / `FIXME` / `HACK` | **0** | Los 6 que aparecen en un grep ingenuo son `TXXX`, un frame de ID3. No hay deuda anotada y olvidada |
| Dependencias de producción | **23** (13 dev) | Muy magro para una app de este alcance. Poca superficie de supply chain, poco que actualizar |
| Migraciones | 27, numeradas y secuenciales | Sin ramas ni renumeraciones |

Un repo sin marcadores de deuda puede significar dos cosas opuestas: que no hay
deuda, o que nadie la anota. Acá es lo primero, y la evidencia es que la deuda
**sí** está escrita — pero en documentos, con contexto y fecha, en vez de en
comentarios sueltos que nadie vuelve a leer.

### La deuda real, priorizada por lo que costaría que salga mal

| # | Deuda | Dónde | Por qué importa |
|---|---|---|---|
| 1 | **RLS activo con cero políticas** | Supabase | La base concede todo; el control de acceso es enteramente el código de `services/`. No hay segunda línea. Auditado el 11/09 sin hallar IDOR, y fijado con `tests/object-access-callers.test.ts` |
| 2 | **Rate limiter en memoria del proceso** | `lib/rate-limit.ts` | En serverless el límite es por instancia y se reinicia en cada arranque en frío. El límite anunciado no es el límite real |
| 3 | **Sin borrado de cuenta self-serve** | — | Sólo existe como acción de admin. Es una obligación del Art. 17, no una feature |
| 4 | ~~Sin retención en `analyses` y `playlist_versions`~~ | — | **CORREGIDO 11/09/2026: esta fila estaba mal.** `analyses` se cerró en el PR #202 (migración 0028, los blobs se sueltan y la fila queda). Y `playlist_versions` **nunca creció sin techo**: `versionsToPrune` la capa en 20 por playlist en cada captura, protegiendo la versión `imported`, que es la única irrecuperable. Lo escribí sin leer `lib/playlists/versions.ts` |
| 5 | **Dos archivos de más de 1.100 líneas** | `actions.ts` (1633), `analysis-workbench.tsx` (1161) | Son los dos que más cuesta modificar con seguridad. Ver abajo |
| 6 | **`plan_cancellation_feedback` se escribe y nunca se lee** | `profiles` | Dato sin finalidad servida |

**Sobre los archivos grandes, una aclaración que evita una conclusión falsa.**
Los tres más grandes del repo son tablas de copy (`site-copy.ts` 1837,
`dashboard-copy.ts` 1487, `analysis-copy.ts` 888): son datos en dos idiomas, no
lógica, y partirlos no mejoraría nada. La deuda real son
`app/dashboard/playlists/actions.ts` con 24 server actions y
`components/analysis/analysis-workbench.tsx`, que concentra el estado de toda la
pantalla de análisis.

---

## F2 · Observabilidad

### Se puede reconstruir. No se puede enterar.

Esa frase es el veredicto entero, y la distinción importa más que cualquier
número: ante un incidente se puede averiguar qué pasó, pero **nada avisa que
pasó**. Alguien tiene que sospechar primero.

| Capa | Estado | Medición |
|---|---|---|
| Logging estructurado | **Sí, y bueno** | Un logger, JSON a stdout, con nivel y metadata tipada. 40 archivos lo usan |
| Eventos de negocio | **Sí** | 8 eventos nombrados a PostHog, más uno con nombre variable para las transiciones de plan: `signup`, `checkout_started`, `playlist_created`, `analysis_started`, `analysis_completed`, `plan_limit_reached`, `payment_failed`, `subscription_ended` |
| Seguimiento de errores | **No** | Sin Sentry ni equivalente |
| Trazas / métricas | **No** | Sin OpenTelemetry, sin `@vercel/otel` |
| Log drain | **No** | Los logs quedan en Vercel: un día en Hobby, un mes en Pro. Después no existen |
| Alertas | **No** | Ya documentado en `docs/security/alerting.md` |

**Lo que ya se hizo bien y no hay que rehacer:** la fase F8 de Seguridad se
ocupó de que los eventos que una alerta necesitaría **existan**. Una alerta sobre
un evento que nadie emite es un documento, no un control. Ese trabajo está hecho;
lo que falta es algo que los mire.

**El hueco más caro, con un ejemplo real.** El 11/09 se descubrió que el
ordenamiento con IA nunca había funcionado en producción: la ruta pedía 55 s a
Anthropic y la plataforma la mataba a los 10-15 s, así que **todas** las
peticiones caían al heurístico. Se descubrió porque un usuario lo reportó desde
el teléfono. Con seguimiento de errores se habría sabido el primer día. La
recomendación no es instrumentar todo: es **un Sentry y una alerta sobre tasa de
error**, que es la diferencia entre enterarse en una hora y enterarse por un
usuario.

---

## F3 · Calidad de código y mantenibilidad

### Cobertura: el número global miente, y miente hacia arriba

```
Statements 70.29%  ·  Branches 67.74%  ·  Functions 77.08%  ·  Lines 69.96%
npx vitest run --coverage
```

70% suena sano. La distribución dice otra cosa:

| Archivo | Líneas | Cobertura | Qué hace |
|---|---|---|---|
| `services/collaboration-service.ts` | 133 | **0%** | Decide quién puede ver y editar un set compartido |
| `services/playlist-service.ts` | 216 | **28%** | Contiene `getOwnedPlaylist`, el chequeo de dueño de 14 mutaciones |
| `lib/auth/password-auth.ts` | 84 | **0%** | Autenticación |
| `lib/auth/password-reset.ts` | 52 | **0%** | Recuperación de cuenta |
| `services/backstage-service.ts` | 61 | **0%** | `deleteUserEverywhere`, `setUserSuspension` |
| `app/api/billing/webhook/route.ts` | 77 | **39%** | Lo único que otorga permisos pagos |

**El patrón:** la cobertura está donde es fácil —motor de energía, parsers,
lógica pura— y ausente donde está el riesgo. Combinado con la deuda #1 (RLS sin
políticas), significa que **el control de acceso del producto es el código menos
probado del producto**.

No es un reproche al orden en que se hizo: probar lógica pura primero es correcto
y produjo 1.742 tests que valen. Es la siguiente prioridad, y es concreta.

### Lo que la cobertura no mide y acá sí está

22.488 líneas de tests contra 56.591 de fuente. Pero el número que importa es
otro: **estos tests atrapan errores de diseño, no sólo de ejecución.** Ejemplos
del propio repo, todos reales:

- El test de consistencia de capabilities falló al registrar `title_lookup`,
  exigiendo la fila de pricing que faltaba.
- El canario del RoPA encontró 16 columnas sin declarar el día que se escribió.
- Un test de barrido sobre el documento serializado atrapó que el export filtraba
  columnas internas de una tabla y las dejaba salir por otras cinco. Una
  aserción por tabla habría errado justo las tablas en las que nadie pensó.

### Documentación: mucha, y con una tendencia a envejecer

45 documentos, 7.915 líneas — desproporcionadamente alto, y de buena calidad: los
docs explican **por qué**, no qué. `docs/research-usb-export.md` y
`docs/research-server-side-batch.md` cierran features descartadas con el
razonamiento y con qué las reabriría, que es exactamente lo que evita volver a
discutirlas.

Pero el 11/09 se encontraron **dos documentos desactualizados en un solo día**:
`roadmap-status.md` listaba como pendientes dos features ya shipeadas (y se
contradecía a sí mismo 80 líneas más abajo), y el RoPA fallaba su propia regla de
verificación en 16 columnas. Los dos se corrigieron **y se les puso un test**.
Esa es la respuesta correcta al problema: un documento que nadie verifica se
convierte en la peor clase de error, el que se lee como autoritativo en un data
room.

### Bus factor: **1**

```
457 commits  Robertino Calcaterra
  4 commits  dependabot[bot]
git shortlog -sn --all
```

Es el hallazgo más serio del F3 y el único que no se arregla con código. Mitiga
mucho la densidad de documentación —un tercero puede leer *por qué* está hecho
así, no sólo qué hace— pero no elimina el riesgo: hay decisiones de producto,
credenciales y contexto de negocio que no están en el repo.

### Veredicto de mantenibilidad

**Alta, con una condición.** Un desarrollador nuevo puede entender un módulo
crítico y modificarlo con seguridad usando sólo el código y sus comentarios: los
comentarios explican decisiones y sus alternativas descartadas, los tests
describen comportamiento en prosa, y el tipado es estricto. La condición es la
cobertura invertida: puede modificar el motor con red, y el control de acceso sin
ella.

---

## Qué haría primero, en orden

1. **Tests del control de acceso.** `collaboration-service` y las funciones de
   propiedad de `playlist-service`. Es la intersección de "menos probado" y "más
   grave si falla".
2. **Un Sentry y una alerta de tasa de error.** Barato, y es la diferencia entre
   enterarse en una hora y enterarse por un usuario en el teléfono.
3. ~~**Rate limiter compartido.**~~ **HECHO** — migración 0029: el contador vive
   en `rate_limit_buckets` con ventanas alineadas a la época, así que el límite
   anunciado es el límite real.
4. **Borrado de cuenta self-serve.** Obligación legal, no feature.

Lo demás puede esperar sin que el riesgo crezca.
