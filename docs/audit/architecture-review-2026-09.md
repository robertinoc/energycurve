# Revisión de arquitectura y decisiones de ingeniería

> Proyecto *4. Auditoría 360*, fase F2. Fecha: 11/09/2026, sobre `main`.
> La tarea pedía tres cosas — **coherencia, acoplamiento y puntos únicos de
> falla** — y las tres se miden. Nada de lo que sigue es una impresión.

## Resumen

La arquitectura es **más coherente de lo que suele ser un proyecto de una sola
persona**: cero ciclos de imports, dependencias en una sola dirección, cada
proveedor externo detrás de un módulo. El acoplamiento fuerte que existe es
**deliberado y está en un solo lugar**. La única violación de capa que encontré
la había introducido yo esa misma mañana, y está corregida en este PR.

---

## 1 · Coherencia: ¿las capas van en una dirección?

```
componentes → lib   275        app → servicios   76
app         → lib   274        servicios → types 13
app → componentes   109        lib → types       10
servicios   → lib    93        lib → servicios    2  ← la única rara
```

**Cero ciclos de imports de valor.** Verificado con un recorrido en profundidad
sobre el grafo completo, contando sólo imports que sobreviven a la compilación
(un `import type` desaparece y no acopla nada en tiempo de ejecución).

Ese detalle no es pedante: a primera vista parecía haber **cuatro** violaciones
de `componentes → servicios` y **seis** de `types → lib`. Todas resultaron ser
`import type`. Reportarlas habría sido una falsa alarma, y la diferencia entre
una auditoría y una lista de sospechas es exactamente esa comprobación.

Quedan **dos imports de valor de `lib` hacia `servicios`**, los dos en el módulo
de autenticación por contraseña, que sube a buscar el idioma del usuario. No
forman ciclo y no rompen nada. Es deuda de estilo, no estructural, y no la toqué:
mover código de auth para ganar limpieza de diagrama es exactamente el tipo de
cambio que introduce un fallo en un lugar donde no se puede permitir.

## 2 · Acoplamiento: ¿qué está pegado a qué?

### El dato: los servicios son dueños del acceso a la base

| Capa | Archivos que abren el cliente |
|---|---|
| `services/` | **18** |
| `lib/` | 1 (`lib/supabase/server.ts`, que es la definición) |
| `app/` | 1 (`api/health`, que hace ping a la base a propósito) |
| `components/` | **0** |

Eso no es prolijidad: es lo que sostiene la auditoría de IDOR. RLS corre con cero
políticas y todo llega a Postgres por la service-role key, así que **la capa de
servicios *es* el control de acceso**. La frase "revisamos todos los servicios"
vale mientras no necesite un "y además".

**La violación que encontré era mía.** El limitador de tasa compartido que
escribí esa misma mañana (#206) puso una consulta en `lib/rate-limit.ts`, fuera
del conjunto auditado. Corregido en este PR: la consulta vive en
`services/rate-limit-service.ts` y `lib/` conserva la parte pura —alineación de
ventana y la forma del resultado— que además se testea sin base.

### Los módulos más importados, y por qué no preocupan

`site-copy` (89), `dashboard-copy` (51) y `analysis-copy` (37) encabezan el
ranking de fan-in. Son **tablas de texto en dos idiomas**: datos, no
comportamiento. Un fan-in alto sobre datos no es acoplamiento, es un diccionario.

El primero que sí es comportamiento es `lib/observability/logger` con 41, y que
41 archivos pasen por un solo logger es la razón por la que agregar Sentry se
hizo en un punto y no en cuarenta.

### El acoplamiento real, deliberado y aceptado

**21 archivos llaman a `getSupabaseAdminClient` directamente.** No hay patrón
repositorio ni abstracción sobre Postgres. Cambiar de base tocaría esos 21.

Está bien así y conviene decir por qué, para que nadie lo "arregle": una capa de
repositorio se paga por adelantado y se cobra sólo si alguna vez se cambia de
base, que es el evento menos probable de este producto. Lo que sí se pagó —
concentrar las consultas en `services/` — da el 80% del beneficio real, que es
tener un lugar donde auditar.

## 3 · Puntos únicos de falla

Cada proveedor externo se lee en **1 a 3 archivos**. Cambiar de proveedor toca un
módulo, no el producto.

| Si se cae… | Qué pasa | Cómo lo sé |
|---|---|---|
| **Supabase** | **Se cae todo.** Es la base y además el limitador de tasa | 21 archivos |
| **WorkOS** | **Se cae todo lo autenticado.** No hay sesión local de reserva | 3 archivos |
| Vercel | Se cae todo | — |
| Stripe | Sólo el cobro. Lo ya pagado sigue valiendo: el plan vive en `profiles` | `lib/billing/config.ts` devuelve null sin key |
| Anthropic | El orden inteligente cae al heurístico y **lo dice en pantalla** | Verificado hoy: era el camino normal, no el excepcional |
| Resend | Los mails no salen; los emisores devuelven `false` y quien llama decide | `isEmailDeliveryConfigured()` |
| PostHog | Nada. Ya está detrás del consentimiento | Cliente null sin key |
| GetSongBPM | El panel no se ofrece | Gateado por `isTitleLookupConfigured()` |
| Sentry | No-op silencioso | Es el estado de toda máquina local |

**El patrón vale nombrarlo:** cada dependencia opcional expone un
`isXConfigured()` y quien llama decide cómo degradar. Es el mismo contrato en
analítica, mails, lookup y ahora errores. Esa consistencia es la razón de que
correr el producto sin cinco de sus nueve proveedores sea el estado normal de
desarrollo y no un modo especial.

### Los dos que sí son puntos únicos

**Supabase y WorkOS no tienen degradación posible**, y no la van a tener: una
copia local de la sesión o de los datos sería un problema de seguridad peor que
la caída que evita. Lo correcto no es mitigarlos sino **declararlos** — un
comprador en due diligence va a preguntar, y la respuesta honesta es que el
producto depende de dos SaaS y que eso es una elección, no un descuido.

Vale una nota: desde #206 **Supabase también sostiene el rate limiting**. La
superficie de esa dependencia creció. El limitador falla abierto justamente por
eso, y el argumento está escrito donde se toma la decisión: todo endpoint detrás
del limitador necesita la misma base, así que un limitador abierto no concede
nada que se pueda servir.

---

## Lo que no revisé

- **Rendimiento bajo carga.** Es la fase F4 del proyecto de Pruebas y no la toqué.
- **La arquitectura del front.** Miré el grafo de imports, no la composición de
  estado. `analysis-workbench.tsx` concentra el estado de toda una pantalla en
  1.161 líneas y ya figura como deuda en la auditoría técnica.
- **Decisiones de infraestructura en las consolas** de Vercel y Supabase, que no
  se ven desde el repo.
