# Documentación y readiness operativo

> Proyecto *4. Auditoría 360*, fase F5. Fecha: 11/09/2026.
>
> La pregunta de esta fase es una sola: **¿podría un tercero operar esto sin la
> persona que lo construyó?** Importa más que de costumbre porque la auditoría
> técnica midió un **bus factor de 1** — 457 de 461 commits de una persona, el
> resto de dependabot.

## Veredicto

**Sí, con una condición que ya está corregida.** La documentación es
desproporcionadamente buena para un proyecto de una persona: 45 documentos, 7.915
líneas, y explican *por qué* y no sólo *qué*. Lo que fallaba no era la cantidad
ni la calidad — era **el orden**.

## El hallazgo: estaba ordenada por proyecto, no por tarea

Los documentos están agrupados por la fase que los produjo — `compliance/`,
`security/`, `qa/`, `audit/` — que es cómo se escribieron y no cómo se buscan.
Probé la documentación con las preguntas que un operador hace de verdad:

| Pregunta | ¿Se responde? | Dónde estaba |
|---|---|---|
| ¿Cómo levanto el proyecto? | ✅ | `setup-infra.md` |
| ¿Qué hace cada variable? | ✅ | `.env.example`, comentada una por una |
| ¿Cómo despliego y cómo vuelvo atrás? | ✅ | `runbooks/deploy-and-rollback.md` |
| ¿Qué hago ante un incidente? | ✅ | `security/incident-response.md` |
| **¿Cuál de los dos Supabase es producción?** | ❌ | **En ningún lado operativo** |
| ¿Cómo corro una migración? | ⚠️ | Disperso en `launch-checklist.md` y un handoff de QA |
| ¿Qué hago si se filtra un secreto? | ⚠️ | Mencionado, nunca como procedimiento |
| ¿Qué corre solo y cómo sé si corrió? | ⚠️ | En dos documentos de compliance |

Las marcadas ⚠️ estaban *en algún lado*. Ninguna estaba donde alguien que
necesita hacer eso la buscaría. La diferencia entre "está documentado" y "se
puede encontrar" es exactamente el bus factor.

### La ❌ es la que importa

`setup-infra.md` tenía una tabla de topología que decía **"Dev project"** y
**"Production project"** sin nombrar nunca cuál era cuál. Los dos refs aparecían
sólo de pasada, en un documento de facturación y en un handoff de QA.

Eso no es un detalle de prolijidad, porque **el panel de Supabase muestra una
insignia verde `main PRODUCTION` en los dos proyectos** — etiqueta la rama
`main`, no el entorno. Un operador sin el ref a mano no tiene forma confiable de
saber dónde está parado. Ya causó que la misma migración se corriera dos veces
en dev creyendo que la segunda era producción.

## Qué se hizo

1. **`runbooks/operations.md`** — la página de entrada que faltaba. Los dos refs
   con la advertencia de la insignia, cómo correr una migración y las dos rarezas
   del SQL Editor, qué hacer si se filtra un secreto y en qué orden, qué corre
   solo, y un índice de dónde está todo lo demás.
2. **`setup-infra.md`** — la tabla de topología ahora nombra los refs, con el
   motivo escrito para que nadie los vuelva a abstraer.
3. **Un test flaky, diagnosticado y arreglado.** Ver abajo.

## El test que fallaba sin razón

`calibration.test.ts` → *"orders the real PRIDE - BOUNCE set harmonically"* falló
dos veces y pasó en cada re-corrida. Medido: **698 ms con la máquina libre, 6.080
ms bajo carga**, contra el timeout por defecto de vitest de **5.000 ms**. Es
CPU-bound, así que la contención lo multiplica por casi nueve — y en CI compite
con un job de Playwright de cuatro navegadores.

Tiene ahora un timeout explícito de 20 s con el motivo escrito al lado. No es
relleno para un test lento: es margen para que la variabilidad no cruce el
límite. Un test que se pone rojo por algo que no está en el diff enseña a
apretar el botón otra vez en vez de leer, que es lo contrario de para qué existe.

## Lo que un traspaso real todavía necesita, y no sale del repo

Escrito en `runbooks/operations.md` §8 para que no se descubra en el peor momento:

- **La titularidad de las ocho cuentas** (Vercel, Supabase, WorkOS, Stripe,
  Resend, Anthropic, PostHog, Sentry). Están a nombre de una persona y
  transferirlas no se hace desde acá.
- **Los valores de los secretos**, que están donde tienen que estar.
- **La restauración de un backup nunca se probó.** Supabase los hace; que se
  puedan restaurar es una suposición. Tarea abierta en el proyecto de Seguridad.

## Lo que esta fase no cubrió

**"Probar operabilidad por un tercero (traspaso simulado)" sigue abierta, y no la
puedo cerrar yo.** Lo que hice fue leer la documentación contra una lista de
preguntas operativas, que encuentra huecos de contenido. Lo que esa tarea pide es
otra cosa: alguien que no construyó el sistema desplegando un cambio y
resolviendo un incidente simulado con la documentación sola. El único que puede
fallar de verdad en ese ejercicio es alguien que no sabe la respuesta de
antemano, y yo la sé.
