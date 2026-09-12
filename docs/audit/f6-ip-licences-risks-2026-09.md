# Propiedad intelectual, licencias y riesgos conocidos

> Proyecto *4. Auditoría 360*, fase F6 — las tareas **"Consolidar estado de IP,
> licencias y dependencias"** y **"Declarar riesgos conocidos con contexto y
> mitigación"**. Fecha: 11/09/2026.
>
> Escrito para que un comprador escéptico lo lea entero y no encuentre después
> nada que no esté acá. Un riesgo declarado con su mitigación negocia; el mismo
> riesgo encontrado por el otro lado en diligencia, no.

---

## 1 · Licencias de terceros

**No hay una sola dependencia GPL, AGPL ni SSPL en todo el árbol**, ni en
producción ni en desarrollo. Verificado con `license-checker` sobre el árbol
completo, no sobre el `package.json`.

| Licencia | Paquetes (producción) |
|---|---|
| MIT | 409 |
| ISC | 27 |
| Apache-2.0 | 13 |
| BSD-3-Clause / BSD-2-Clause | 12 |
| Otras permisivas (BlueOak, 0BSD, Unlicense, Python-2.0) | 5 |
| **LGPL-3.0-or-later** | **1** — ver abajo |

### El único copyleft, y por qué casi seguro no importa

`@img/sharp-libvips-darwin-arm64` es **LGPL-3.0-or-later**. Tres hechos que
cambian cómo se lee:

1. **No lo elegimos.** Es dependencia transitiva de `next` —
   `next → sharp → libvips`. No aparece en nuestro `package.json` y ninguna línea
   del código lo importa.
2. **Es el binario nativo de macOS ARM**, o sea el artefacto de una máquina de
   desarrollo. En Vercel se instala la variante Linux.
3. **Sharp enlaza libvips dinámicamente y sin modificarlo**, que es el caso que
   la LGPL contempla explícitamente para software propietario.

Y el argumento que lo cierra: **la LGPL obliga al *distribuir* el software.**
EnergyCurve es un SaaS — nadie recibe una copia, se opera como servicio. Sin
distribución no se dispara la obligación.

> **Esto no es asesoramiento legal.** Si un comprador lo pregunta, la respuesta
> honesta es la de arriba más "está en el árbol de Next, no en el nuestro". Si
> quieren opinión formal, la pregunta para un abogado cabe en una línea: *¿el
> uso server-side de libvips vía sharp, sin modificar y sin distribuir el
> binario, genera alguna obligación LGPL?*

### Dos que piden atención y no riesgo

- **`caniuse-lite` — CC-BY-4.0.** Datos de compatibilidad de navegadores usados
  en build. Requiere atribución; la tiene en su propio paquete. Está en
  prácticamente todo proyecto web del mundo.
- **`dompurify` — MPL-2.0 OR Apache-2.0.** Doble licencia: se elige Apache-2.0 y
  no hay nada más que hacer.

### Una decisión de licencia que ya se tomó bien

Consta en `spike-browser-audio-analysis.md`: **Essentia.js fue descartada por ser
AGPL-3.0**, y reemplazada por meyda + web-audio-beat-detector. Es la evidencia de
que el criterio de licencias existía antes de esta auditoría, no a causa de ella.

## 2 · Propiedad intelectual propia

| | Estado |
|---|---|
| Licencia del código | `UNLICENSED` + `private: true` en `package.json` |
| Archivo `LICENSE` | **No existe** |
| Titular del copyright | **No declarado en ningún lado del repo** |
| Autoría | 457 de 461 commits de una persona; el resto, dependabot |

**Corregido en esta pasada:** `package.json` no tenía campo `license`. Las
herramientas reportaban `UNLICENSED` **infiriéndolo** de `private: true`. Ahora
está declarado. Una diligencia no debería depender de que una herramienta adivine
bien.

**Lo que sigue abierto y es tuyo**, porque nombra una entidad legal y no lo puedo
decidir yo: **quién es el titular del copyright**. Si el código lo escribió una
persona física, le pertenece a esa persona salvo cesión escrita; si la operación
va a nombre de una sociedad, hace falta una cesión de esa persona a la sociedad.
Es la primera pregunta de cualquier diligencia de IP y hoy el repo no la responde.

Un archivo `LICENSE` con la nota de propiedad y el titular cierra las dos cosas.

## 3 · Marca

Ya investigado en `brand-name-collision.md`, y la conclusión se sostiene: la otra
*Energy Curve* vende fertilizante biológico en Missouri, sus marcas registradas
son la familia **BENEFIT**, y nadie tiene derecho sobre la frase desnuda. La
decisión fue **conservar el nombre y dejar de pelear por la query genérica**.

El riesgo residual no es legal sino de descubrimiento: `energycurve.com` ocupa
todos los resultados de la búsqueda de marca. Eso es SEO, no propiedad
intelectual, y está medido en `seo-aeo-baseline-2026-08.md`.

## 4 · Riesgos conocidos, con mitigación

Ordenados por lo que costaría que salgan mal. Todos salen de auditorías con
evidencia; ninguno es una intuición.

| # | Riesgo | Mitigación | Dueño |
|---|---|---|---|
| 1 | **RLS activo con cero políticas.** La base concede todo; el control de acceso es enteramente `services/` | Auditado el 11/09 sin hallar IDOR. Fijado con `tests/object-access-callers.test.ts` y 18 tests de control de acceso. La capa está concentrada a propósito: 18 de 21 accesos | Mitigado |
| 2 | **Bus factor de 1** | Documentación densa que explica el *por qué*, más `runbooks/operations.md`. No se elimina con código | **Abierto** |
| 3 | **Sin borrado de cuenta self-serve** — obligación del Art. 17 | Existe como acción de admin. Falta la decisión de producto sobre fricción, período de gracia y facturas | **Tuyo** |
| 4 | **`CRON_SECRET` sin configurar**: cuatro ventanas de retención escritas y ninguna corriendo | Dos minutos en el panel de Vercel | **Tuyo** |
| 5 | **Vercel despliega sin esperar al CI** | Documentado en `runbooks/deploy-and-rollback.md` con el arreglo (Ignored Build Step) | **Tuyo** |
| 6 | **Sin DPAs firmados** con ningún encargado, y todas las transferencias son fuera de la UE | Encargados inventariados en el RoPA con su país | **Tuyo** |
| 7 | **La restauración de backups nunca se probó** | Supabase los hace. Que se puedan restaurar es una suposición | **Tuyo** |
| 8 | **Alerta de errores sin crear.** Sentry reporta desde el 11/09; nada avisa todavía | Especificación lista en `security/alerting.md` | **Tuyo** |
| 9 | **Cobertura invertida respecto al riesgo**: 70% global, auth al 0% | El control de acceso ya subió. Auth sigue sin tests | **Abierto** |
| 10 | **Dos puntos únicos de falla**: Supabase y WorkOS | No mitigables sin empeorar la seguridad. Se declaran | Aceptado |

**Lo que hace creíble esta lista es que tres de sus filas salieron de encontrar
errores propios**: el limitador que contaba por instancia, la fila del RoPA que
decía que `playlist_versions` crecía sin techo cuando no, y una violación de
capas introducida el mismo día que se escribió la regla.

## 5 · Lo que esta fase no cubre

- **El data room** (`Armar el data room de due-diligence`) sigue abierto: es
  reunir y dar acceso a documentos que en parte viven fuera del repo — contratos,
  cuentas, facturación.
- **`Completar checklist de exit readiness`** y **`Revisión adversarial`** siguen
  abiertos. La revisión adversarial en particular no debería hacerla quien
  escribió el dossier.
