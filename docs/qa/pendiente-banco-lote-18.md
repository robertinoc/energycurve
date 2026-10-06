# Filas de banco del lote 18, pendientes de integrar

**06/10/2026.** El banco (`docs/qa/banco-de-pruebas.html`) era de otra sesión
durante este lote, así que las filas que generó el lote 18 viven acá, en el
formato del array `SESSIONS` del banco, listas para pegar. **Quien las integre:**
copiar el bloque de la sesión `L18` arriba de `L16`, que desde el #279 es la primera (L17 se automatizó), sumar las filas al número
declarado (`tally-total`) y recontar con

```bash
grep -c 'code: "[A-Z0-9]*\.[0-9a-z]*"' docs/qa/banco-de-pruebas.html
```

Son **seis filas nuevas**. Más abajo hay tres correcciones a filas existentes,
que también son del banco y tampoco se aplicaron.

## La sesión L18

```js
{
  code: "L18",
  title: "Validar el lote 18: el pie de las páginas de contenido, la sugerencia recordada y el barrido",
  meta: "~40 min · necesita el deploy del lote 18 · L18.3 necesita el backstage",
  why: "El lote 18 agregó el pie del sitio a las páginas de contenido, memorizó el orden sugerido de la página de análisis (la mitad de H-23 que no necesitaba una decisión) y arregló catorce lecturas más que se cortaban en 1.000 filas o en ~350 ids. Todo tiene tests que fallan sin el arreglo; lo que un test no puede afirmar es que producción lo lleve, ni que una sugerencia vieja no aparezca sobre un set que una persona editó.",
  tests: [
    {
      code: "L18.1", initial: "validar", title: "Desde un artículo se llega a precios y a las herramientas", sub: "El pie en las páginas de contenido · por navegación, no por SEO",
      steps: ["Abrí <code>/es/blog/esta-bien-el-orden-de-mi-set</code> y bajá hasta el final", "Tocá «Precios» en el pie, volvé, y tocá la herramienta gratis", "Repetí en <code>/glossary/bpm</code>, <code>/compare/lexicon</code> y <code>/tools</code>", "En el pie, tocá «Features» y «FAQ»", "Recorrelo con Tab desde el final del artículo"],
      expect: "El mismo pie de la portada, en el idioma de la página. «Features» y «FAQ» te llevan a la portada, a su sección — no se quedan en la misma página. Con Tab se llega a todos los enlaces del pie, con foco visible.",
      ifNot: "Si «Features» no hace nada, el ancla quedó sin la ruta de la portada (el test <code>tests/content-footer.test.ts</code> lo vigila). No se espera ningún efecto en la indexación: el pie se agregó para que alguien que terminó de leer tenga a dónde ir, y así se dijo en el PR."
    },
    {
      code: "L18.2", initial: "validar", title: "La sugerencia de orden cambia cuando cambia el set", sub: "H-23 · memorizada: lo único que no puede pasar es servir una vieja",
      steps: ["Con la cuenta PRO, abrí el análisis de un set de 20 a 80 temas y anotá el orden sugerido", "Recargá: tiene que aparecer igual y más rápido", "Volvé al set, mové un tema de lugar y guardá", "Abrí el análisis de nuevo"],
      expect: "Después de mover el tema, la sugerencia se recalcula: corresponde al set editado, no al de antes. La sugerencia se recuerda por todo lo que la determina — la energía de cada tema en su orden, el género, el contexto, la forma y el idioma — así que cualquier edición cambia la clave.",
      ifNot: "Si después de editar aparece la sugerencia de antes, es el defecto más grave posible de este arreglo: frená y avisá. Una sugerencia vieja sobre un set editado es peor que una lenta. Anotá qué cambiaste y en qué set."
    },
    {
      code: "L18.3", initial: "validar", title: "El backstage cuenta todos los usuarios, playlists y análisis", sub: "Barrido del lote 18 · eran tres lecturas de tabla entera sin paginar",
      steps: ["Abrí el backstage, pestaña de usuarios", "Compará el total de usuarios con el de Supabase (Table editor → profiles)", "Elegí un usuario con muchas playlists y compará su conteo con lo que ve él en su dashboard"],
      expect: "Los dos totales coinciden, y el conteo de playlists del usuario también. Antes, pasadas las 1.000 filas de cualquiera de las tres tablas, la tabla dejaba de listar gente y los conteos salían de la primera página.",
      ifNot: "Si producción todavía no tiene más de 1.000 filas en ninguna de las tres tablas, esta fila confirma que nada se rompió, no el arreglo: anotalo así."
    },
    {
      code: "L18.4", initial: "validar", title: "La línea de puntajes del dashboard termina en el último análisis", sub: "Barrido del lote 18 · leía los análisis más viejos",
      steps: ["Con un set que analizaste varias veces, mirá la mini curva de puntajes en el dashboard", "Analizalo de nuevo con un cambio que mueva el puntaje", "Volvé al dashboard"],
      expect: "El último punto de la línea es el análisis que acabás de hacer.",
      ifNot: "El defecto sólo aparecía con más de 1.000 análisis entre los cinco sets recientes, así que en una cuenta normal esta fila confirma que nada se rompió."
    },
    {
      code: "L18.5", initial: "pending", title: "El artículo de cómo cerrar un set, leído como DJ", sub: "El único de los seis planificados con demanda medida",
      steps: ["Leé <code>/es/blog/como-cerrar-un-set-de-dj</code> entero", "Marcá cualquier frase que un DJ con años de cabina no firmaría", "Seguí los enlaces: el glosario, la guía, la herramienta y los dos artículos", "Pegá la URL en el Rich Results Test de Google"],
      expect: "Nada te hace fruncir el ceño. No hay números inventados ni reglas presentadas como universales. El Rich Results Test detecta <code>BlogPosting</code>, <code>BreadcrumbList</code> y <code>FAQPage</code> con tres preguntas.",
      ifNot: "La frase exacta y por qué. Es más barato reescribir una oración hoy que dejarla indexada."
    },
    {
      code: "L18.6", initial: "pending", title: "Los seis perfiles de entidad, con el texto ya escrito", sub: "SEO-E22 · <code>docs/seo/entidad-perfiles.md</code>",
      steps: ["Abrí <code>docs/seo/entidad-perfiles.md</code>", "Para cada destino que des de alta, pegá exactamente el nombre, la descripción y el logo de la tabla", "Pasame la URL real de cada perfil que quede vivo"],
      expect: "Los perfiles dicen lo mismo con las mismas palabras. Cada URL viva se descomenta en <code>ENTITY_PROFILES</code> (<code>lib/seo.ts</code>), donde ya está escrita como comentario.",
      ifNot: "Si un límite de caracteres resulta distinto del documentado —X, TikTok, Crunchbase y AlternativeTo están marcados como fuente secundaria o sin confirmar—, recortá desde la misma frase y anotá el límite real para corregir el documento."
    }
  ]
},
```

## Tres correcciones a filas que ya están en el banco

No se aplicaron, por la misma razón. Son de quien tenga el banco.

1. **F45.3** («E22: los cinco perfiles que faltan»): el paso 2 dice que el nombre
   es «EnergyCurve — DJ set copilot». El nombre de la entidad en `lib/seo.ts` es
   **EnergyCurve**, con `EnergyCurve DJ` como nombre alternativo, y es el que usa
   `docs/seo/entidad-perfiles.md`. Conviene que la fila apunte a ese documento,
   o la reemplace L18.6.
2. **SEO5.3** («Los 95 caracteres: la decisión que queda»): las tres salidas ya
   tienen número, medido el 06/10 y escrito en `docs/qa/lighthouse-budgets.md`.
   Recortar a ~95 caracteres o pintar el banner en el primer paint bajan `/` de
   5,72 s a 4,09 s en local, y ninguna llega a 2,5 s. La fila ofrece «probar la
   vía de pintar el banner en el primer paint»: ya está probada, y el documento
   corrigió la estimación de «~1,2 s» que tenía para esa vía.
3. **E2E.1** y la sección de arriba: el número de la suite de hoy está en el
   traspaso, sección del lote 18.
