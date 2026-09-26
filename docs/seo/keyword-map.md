# Mapa de consultas — SEO-E05

Qué busca la gente alrededor de lo que hace EnergyCurve, y qué página del sitio
contesta cada cosa. La segunda columna es el valor del documento: lo que queda
sin página es la lista de qué escribir después.

**Fecha:** 19/09/2026.

---

## Lo que este documento NO tiene, y por qué

**No hay volúmenes de búsqueda.** Sin herramienta paga no hay volumen, y un
número inventado acá se va a citar como real dentro de dos meses. No hay ni uno.

Lo que sí hay es un conteo honesto: **en cuántas de las cuatro fuentes de
autocompletado apareció cada consulta** (Google EN, Google ES, YouTube EN,
YouTube ES). Google sólo autocompleta lo que la gente escribe de verdad, así que
que una frase aparezca es señal de que existe; que aparezca en varias fuentes es
señal de que existe en varios lados. **No es volumen y no se puede convertir a
volumen.** Ordenar por esa columna ordena por "cuántas veces la vi", que es
exactamente lo que dice ser.

### Pases que faltan

| Fuente | Estado |
|---|---|
| Google autocomplete (EN + ES) | hecho — 257 sugerencias devueltas sobre 53 semillas |
| YouTube autocomplete (EN + ES) | hecho — 215 sugerencias devueltas sobre las mismas semillas |
| DJ TechTools | hecho — búsqueda del sitio, para validar temas |
| **r/DJs y r/Beatmatch** | **FALTA** — la API devuelve 403 y el dominio está bloqueado en el entorno donde se armó esto. Hay que hacerlo a mano desde un navegador. |
| **Google Search Console** | **FALTA** — el sitio se registró el 19/09, no hay datos todavía. Vale la pena repetir este documento en 60 días con GSC: es la única fuente que dice qué busca la gente que **ya llega**. |
| Digital DJ Tips | parcial — el sitio responde 200 pero su buscador no devuelve títulos parseables sin navegador |

El pase de Reddit es el que más falta. El autocompletado da frases cortas; los
foros dan la pregunta entera, con las palabras del que la hace.

### Cómo se cosechó

```bash
curl -s "https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=harmonic+mixing"
curl -s "https://suggestqueries.google.com/complete/search?client=firefox&hl=es&ds=yt&q=rueda+camelot"
```

30 semillas en inglés y 23 en español, por Google y por YouTube. El ruido obvio
se sacó a mano (`dj set plan b`, `how to get dj set in sims 4`,
`warm up djokovic`, nombres de DJs, listas de IPTV).

---

## Por qué las dos listas importan por razones distintas

El sitio está torcido y conviene tenerlo presente al leer las tablas:

- **En español hay 5 artículos de blog y 24 entradas de glosario.** El inglés
  tiene las 24 entradas de glosario y **cero artículos** — `/blog` está en
  `noindex` justamente porque está vacío.
- O sea: **en español el trabajo es capturar lo que ya está escrito; en inglés
  el trabajo es escribir.** Una consulta inglesa marcada "sólo glosario" no está
  cubierta de la misma forma que su equivalente española con artículo.

---

## Intención 1 — aprender

Alguien que no sabe algo y quiere entenderlo. Es donde el glosario y el blog
tienen que ganar.

### Inglés

| Consulta | Veces | Página que la contesta |
|---|---|---|
| `how does a dj set work` | 5 | [`/blog/how-does-a-dj-set-work`](https://energycurve.app/blog/how-does-a-dj-set-work) — cerrado el 26/09/2026 (lote 10) |
| `camelot wheel explained` | 4 | [`/glossary/camelot-wheel`](https://energycurve.app/glossary/camelot-wheel) |
| `camelot wheel` | 3 | [`/glossary/camelot-wheel`](https://energycurve.app/glossary/camelot-wheel) |
| `how to structure a dj set` | 3 | [`/blog/how-to-structure-a-dj-set`](https://energycurve.app/blog/how-to-structure-a-dj-set) — cerrado el 26/09/2026 (lote 10); era el tema central del producto sin página en inglés |
| `camelot wheel rules` | 2 | [`/glossary/camelot-wheel`](https://energycurve.app/glossary/camelot-wheel) |
| `harmonic mixing` | 2 | [`/glossary/harmonic-mixing`](https://energycurve.app/glossary/harmonic-mixing) |
| `harmonic mixing camelot wheel` | 2 | [`/glossary/harmonic-mixing`](https://energycurve.app/glossary/harmonic-mixing) |
| `how to read camelot wheel` | 2 | [`/glossary/camelot-wheel`](https://energycurve.app/glossary/camelot-wheel) |
| `mixing in key` | 2 | [`/glossary/harmonic-mixing`](https://energycurve.app/glossary/harmonic-mixing) |
| `dj phrasing` | 2 | [`/glossary/phrasing`](https://energycurve.app/glossary/phrasing) |
| `dj phrasing tips` | 3 | sólo glosario — [`/glossary/phrasing`](https://energycurve.app/glossary/phrasing) |
| `dj set energy` | 2 | [`/glossary/energy-curve`](https://energycurve.app/glossary/energy-curve) |
| `dj set warm up` | 2 | [`/glossary/warm-up`](https://energycurve.app/glossary/warm-up) |
| `peak time dj set` | 4 | [`/glossary/peak-time`](https://energycurve.app/glossary/peak-time) |
| `what is a dj set` | 2 | [`/blog/what-is-a-dj-set`](https://energycurve.app/blog/what-is-a-dj-set) — cerrado el 26/09/2026 (lote 10); contesta también `how long is a dj set` sin fijar una duración |
| `how do b2b dj sets work` | 2 | sólo glosario — [`/glossary/b2b`](https://energycurve.app/glossary/b2b) |
| `dj set energy curve` | 1 | [`/glossary/energy-curve`](https://energycurve.app/glossary/energy-curve) |
| `dj set energy levels` | 1 | [`/glossary/track-energy`](https://energycurve.app/glossary/track-energy) |
| `build up dj set` | 1 | [`/glossary/build-up`](https://energycurve.app/glossary/build-up) |
| `what makes a good dj set` | 1 | **hueco** — la pregunta que el producto contesta literalmente |
| `how do djs prepare their sets` | 1 | **hueco** |
| `how to plan a dj set` | 1 | **hueco** |
| `how to organize music for djing` | 1 | **hueco** |
| `how long is a dj set` | 1 | **hueco** — fácil, y nadie del sitio la contesta |
| `camelot wheel vs circle of fifths` | 1 | **hueco** — [`/glossary/camelot-wheel`](https://energycurve.app/glossary/camelot-wheel) no lo menciona |
| `how to structure a house dj set` | 1 | **hueco** |
| `how to get the bpm of a song` | 1 | [`/glossary/bpm`](https://energycurve.app/glossary/bpm) + [`/tools/key-bpm-compatibility`](https://energycurve.app/tools/key-bpm-compatibility) |
| `mixing in key explained` | 1 | [`/glossary/harmonic-mixing`](https://energycurve.app/glossary/harmonic-mixing) |
| `mixing in key rules` | 1 | [`/glossary/harmonic-mixing`](https://energycurve.app/glossary/harmonic-mixing) |
| `harmonic mixing cheat sheet` | 1 | **hueco** — pide una tabla, y la tabla existe en `lib/music/harmonic-transitions.ts` |

### Español

| Consulta | Veces | Página que la contesta |
|---|---|---|
| `rueda camelot` | 3 | [`/es/glosario/rueda-camelot`](https://energycurve.app/es/glosario/rueda-camelot) |
| `mezcla armonica` | 2 | [`/es/glosario/mezcla-armonica`](https://energycurve.app/es/glosario/mezcla-armonica) |
| `mezcla armonica rueda camelot` | 2 | [`/es/glosario/mezcla-armonica`](https://energycurve.app/es/glosario/mezcla-armonica) |
| `como armar un set de dj` | 2 | [`/es/blog/esta-bien-el-orden-de-mi-set`](https://energycurve.app/es/blog/esta-bien-el-orden-de-mi-set) |
| `rueda camelot dj` | 2 | [`/es/glosario/rueda-camelot`](https://energycurve.app/es/glosario/rueda-camelot) |
| `phrasing dj` | 2 | [`/es/glosario/phrasing`](https://energycurve.app/es/glosario/phrasing) |
| `phrasing djing` | 2 | [`/es/glosario/phrasing`](https://energycurve.app/es/glosario/phrasing) |
| `phrasing dj tutorial` | 2 | sólo glosario — [`/es/glosario/phrasing`](https://energycurve.app/es/glosario/phrasing) |
| `warm up dj set` | 2 | [`/es/glosario/warm-up`](https://energycurve.app/es/glosario/warm-up) |
| `warm up dj` | 2 | [`/es/glosario/warm-up`](https://energycurve.app/es/glosario/warm-up) |
| `peak time dj set` | 2 | [`/es/glosario/peak-time`](https://energycurve.app/es/glosario/peak-time) |
| `rueda camelot como funciona` | 1 | [`/es/glosario/rueda-camelot`](https://energycurve.app/es/glosario/rueda-camelot) |
| `rueda camelot combinaciones` | 1 | [`/es/herramientas/rueda-camelot`](https://energycurve.app/es/herramientas/rueda-camelot) |
| `rueda de camelot saltos` | 1 | [`/es/herramientas/rueda-camelot`](https://energycurve.app/es/herramientas/rueda-camelot) |
| `como usar la rueda de camelot` | 1 | [`/es/glosario/rueda-camelot`](https://energycurve.app/es/glosario/rueda-camelot) |
| `mezclar tonalidades` | 1 | [`/es/glosario/tonalidad`](https://energycurve.app/es/glosario/tonalidad) |
| `como cerrar un set dj` | 1 | sólo glosario — [`/es/glosario/closing-set`](https://energycurve.app/es/glosario/closing-set) |
| `warm up dj significado` | 1 | [`/es/glosario/warm-up`](https://energycurve.app/es/glosario/warm-up) |
| `phrasing dj meaning` | 1 | [`/es/glosario/phrasing`](https://energycurve.app/es/glosario/phrasing) |
| `como buscar la tonalidad de una cancion` | 1 | [`/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad`](https://energycurve.app/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad) |
| `como identificar la tonalidad de una cancion` | 1 | [`/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad`](https://energycurve.app/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad) |
| `como saber que tonalidad esta una cancion` | 1 | [`/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad`](https://energycurve.app/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad) |
| `circulo de mezcla armonica` | 1 | [`/es/herramientas/rueda-camelot`](https://energycurve.app/es/herramientas/rueda-camelot) |
| `guia camelot mezcla armonica` | 1 | [`/es/guia`](https://energycurve.app/es/guia) |
| `rueda camelot notas` | 1 | **hueco** — la correspondencia Camelot↔notas no está escrita en ningún lado |
| `rueda camelot musical` | 1 | **hueco** — misma razón |
| `como subir la energia en un set` | 0 (semilla sin sugerencias) | [`/es/blog/cuanto-es-mucho-salto-de-energia`](https://energycurve.app/es/blog/cuanto-es-mucho-salto-de-energia) |
| `curva de energia dj` | 0 (semilla sin sugerencias) | [`/es/glosario/curva-de-energia`](https://energycurve.app/es/glosario/curva-de-energia) |

> Las dos últimas están acá a propósito: **son semillas que Google no
> autocompletó**. Eso es un dato, no un error — "curva de energía" todavía no es
> una frase que la gente escriba en español. El sitio la está creando.

---

## Intención 2 — comparar

Alguien que ya sabe que quiere algo y está eligiendo. Es la intención más cerca
de la plata y la que el sitio tiene **completamente descubierta**.

| Consulta | Idioma | Veces | Página |
|---|---|---|---|
| `mixed in key alternative` | en | 2 | **hueco** |
| `mixed in key alternative free` | en | 2 | **hueco** |
| `mixed in key alternative reddit` | en | 1 | **hueco** |
| `mixed in key 11 alternative` | en | 1 | **hueco** |
| `mixed in key free alternative reddit` | en | 1 | **hueco** |
| `rekordbox vs serato` | en | 2 | **hueco** |
| `rekordbox vs serato dj pro` | en | 2 | **hueco** |
| `rekordbox vs traktor` | en | 2 | **hueco** |
| `rekordbox vs djay pro` | en | 2 | **hueco** |
| `rekordbox vs virtual dj` | en | 2 | **hueco** |
| `rekordbox vs serato vs virtual dj` | en | 2 | **hueco** |
| `best dj software for beginners` | en | 2 | **hueco** |
| `best dj software for mac` | en | 2 | **hueco** |
| `best dj software for windows` | en | 2 | **hueco** |
| `best dj software for spotify` | en | 2 | **hueco** |
| `dj set analysis` | en | 2 | [`/`](https://energycurve.app/) — la landing, no una página dedicada |
| `alternativa a mixed in key` | es | 1 | **hueco** |
| `mejor software para dj` | es | 2 | **hueco** |
| `cual es el mejor software para dj` | es | 1 | **hueco** |
| `mejor software para dj gratis` | es | 1 | **hueco** |
| `programa para armar sets dj` | es | 0 (sin sugerencias) | **hueco** |

**21 consultas de comparación, 20 sin página.** Esto es SEO-E23, que no está en
este lote porque necesita la decisión de Robertino sobre qué se puede afirmar de
cada competidor. El mapa lo deja dimensionado: es el bloque con más huecos por
consulta de todo el documento.

`mixed in key alternative` aparece con cinco variantes distintas, incluidas dos
que terminan en `reddit` — gente que busca explícitamente una opinión que no sea
publicidad. Eso condiciona cómo tendría que estar escrita esa página.

---

## Intención 3 — importar / exportar

Alguien con la librería en un programa y un problema concreto de archivos. Es la
intención donde el producto tiene la respuesta más directa.

| Consulta | Idioma | Veces | Página |
|---|---|---|---|
| `rekordbox export playlist` | en | 2 | [`/import-formats`](https://energycurve.app/import-formats) |
| `export rekordbox playlist to another computer` | en | 2 | [`/import-formats`](https://energycurve.app/import-formats) |
| `export traktor playlist to rekordbox` | en | 2 | **hueco** — el sitio importa los dos pero no explica el puente |
| `import music into rekordbox` | en | 2 | [`/import-formats`](https://energycurve.app/import-formats) |
| `rekordbox export playlist to xml` | en | 1 | [`/import-formats`](https://energycurve.app/import-formats) |
| `rekordbox export playlist to usb` | en | 1 | **hueco** |
| `rekordbox export playlist as text` | en | 1 | [`/import-formats`](https://energycurve.app/import-formats) |
| `rekordbox export playlist greyed out` | en | 1 | **hueco** — pregunta de problema, la mejor clase de artículo |
| `rekordbox xml file location` | en | 2 | [`/import-formats`](https://energycurve.app/import-formats) |
| `traktor export playlist` | en | 1 | [`/import-formats`](https://energycurve.app/import-formats) |
| `traktor export all playlists` | en | 1 | [`/import-formats`](https://energycurve.app/import-formats) |
| `export serato crate to rekordbox` | en | 1 | **hueco** |
| `export serato crate as text` | en | 1 | **hueco** |
| `convert rekordbox playlist to serato` | en | 1 | **hueco** |
| `transfer traktor playlist to rekordbox` | en | 1 | **hueco** |
| `m3u8 playlist` | en | 1 | [`/import-formats`](https://energycurve.app/import-formats) |
| `what are crates in serato` | en | 1 | **hueco** |
| `exportar playlist rekordbox` | es | 2 | [`/es/import-formats`](https://energycurve.app/es/import-formats) |
| `exportar playlist traktor` | es | 2 | [`/es/import-formats`](https://energycurve.app/es/import-formats) |
| `exportar playlist rekordbox a usb` | es | 1 | **hueco** |
| `exportar playlist de traktor a rekordbox` | es | 1 | **hueco** |
| `exportar playlist de rekordbox a serato` | es | 1 | **hueco** |
| `importar lista de reproduccion rekordbox` | es | 1 | [`/es/import-formats`](https://energycurve.app/es/import-formats) |
| `mis temas no tienen bpm` | es | 0 (sin sugerencias) | [`/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad`](https://energycurve.app/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad) |
| `ordenar un set desde una lista de texto` | es | 0 (sin sugerencias) | [`/es/blog/ordenar-un-set-desde-una-lista-de-texto`](https://energycurve.app/es/blog/ordenar-un-set-desde-una-lista-de-texto) |

Patrón claro: **`/import-formats` cubre el formato pero no el trayecto.** La
gente no busca "qué formatos soporta"; busca "cómo llevo esto de acá para allá".
Nueve huecos de esta tabla son variantes de A→B.

---

## Intención 4 — herramienta

Alguien que quiere hacer algo ahora, gratis, sin instalar. Las tres herramientas
del sitio viven acá.

| Consulta | Idioma | Veces | Página |
|---|---|---|---|
| `bpm key finder` | en | 1 | [`/tools/key-bpm-compatibility`](https://energycurve.app/tools/key-bpm-compatibility) |
| `bpm key finder free` | en | 1 | [`/tools/key-bpm-compatibility`](https://energycurve.app/tools/key-bpm-compatibility) |
| `bpm key finder online` | en | 1 | [`/tools/key-bpm-compatibility`](https://energycurve.app/tools/key-bpm-compatibility) |
| `bpm and key finder` | en | 1 | [`/tools/key-bpm-compatibility`](https://energycurve.app/tools/key-bpm-compatibility) |
| `song key & bpm finder` | en | 1 | [`/tools/key-bpm-compatibility`](https://energycurve.app/tools/key-bpm-compatibility) |
| `free camelot wheel` | en | 1 | [`/tools/camelot-wheel`](https://energycurve.app/tools/camelot-wheel) |
| `camelot wheel chart` | en | 1 | [`/tools/camelot-wheel`](https://energycurve.app/tools/camelot-wheel) |
| `camelot wheel with keys` | en | 1 | [`/tools/camelot-wheel`](https://energycurve.app/tools/camelot-wheel) |
| `camelot wheel free download` | en | 1 | **hueco** — busca un PNG, no una app |
| `dj set planner` | en | 1 | [`/tools/energy-curve`](https://energycurve.app/tools/energy-curve) |
| `free dj set planner` | en | 1 | [`/tools/energy-curve`](https://energycurve.app/tools/energy-curve) |
| `dj set planner app` | en | 1 | [`/tools/energy-curve`](https://energycurve.app/tools/energy-curve) |
| `ai dj set planner free` | en | 1 | **hueco** — y hay que decidir si el producto quiere la palabra "AI" |
| `harmonic dj set planner` | en | 1 | [`/tools/energy-curve`](https://energycurve.app/tools/energy-curve) |
| `analyze dj set` | en | 1 | [`/`](https://energycurve.app/) |
| `analyzing dj sets` | en | 1 | **hueco** |
| `tracklist analyze dj sets` | en | 1 | **hueco** |
| `rueda camelot online` | es | 1 | [`/es/herramientas/rueda-camelot`](https://energycurve.app/es/herramientas/rueda-camelot) |
| `analizar bpm y tonalidad` | es | 1 | [`/es/herramientas/compatibilidad-tonalidad-bpm`](https://energycurve.app/es/herramientas/compatibilidad-tonalidad-bpm) |
| `programa para analizar bpm canciones` | es | 1 | [`/es/herramientas/compatibilidad-tonalidad-bpm`](https://energycurve.app/es/herramientas/compatibilidad-tonalidad-bpm) |
| `programa gratis para dj` | es | 1 | **hueco** |
| `rueda camelot online gratis` | es | 0 (sin sugerencias) | [`/es/herramientas/rueda-camelot`](https://energycurve.app/es/herramientas/rueda-camelot) |

---

## Conteo

| | Consultas | Con página | Hueco |
|---|---|---|---|
| Aprender — inglés | 30 | 22 | 8 — eran 11 hasta el 26/09/2026; el lote 10 cerró las tres más vistas |
| Aprender — español | 28 | 26 | 2 |
| Comparar | 21 | 1 | 20 |
| Importar / exportar | 25 | 14 | 11 |
| Herramienta | 22 | 17 | 5 |
| **Total** | **126** | **77** | **49** |

Por idioma: **80 en inglés, 46 en español**.

Los números de esta tabla están contados sobre el archivo, no a ojo: cada fila
que empieza con `` | ` `` es una consulta, y las marcadas `**hueco**` son las
que no tienen página.

El contraste que más dice: en español **2 de 28** consultas de aprendizaje
quedan sin página; en inglés, **8 de 30** (eran 11 hasta el 26/09/2026, cuando el lote 10 cerró las tres consultas más vistas). Es el mismo sitio, con el mismo
glosario, y la diferencia son los cinco artículos que existen sólo en español.

---

## La lista de qué escribir después

Ordenada por cuántos huecos cierra cada cosa, no por volumen — que no lo sé.

1. **Páginas de comparación** (cierra ~20). `mixed in key alternative`,
   `rekordbox vs serato`, `best dj software for X`. Es SEO-E23 y está frenado
   esperando qué se puede afirmar de cada competidor. Es el bloque más grande y
   el de intención más comercial. Nota del dato: dos de las cinco variantes de
   `mixed in key alternative` terminan en `reddit`.

2. **Artículos de trayecto A→B para importar** (cierra ~9).
   `export traktor playlist to rekordbox`, `export serato crate to rekordbox`,
   `convert rekordbox playlist to serato`, y sus equivalentes en español.
   `/import-formats` lista formatos; la gente busca recorridos.

3. **El blog en inglés, que no existe** (cierra ~8).
   `how does a dj set work` (la consulta más repetida de todo el corpus, 5 de 4
   fuentes), `how to structure a dj set`, `what makes a good dj set`,
   `how to plan a dj set`, `how long is a dj set`. Los cinco artículos en
   español ya contestan varias de éstas; **no son traducciones automáticas**,
   pero el trabajo de pensar el tema ya está hecho. Es SEO-E13/E14, que escribe
   Robertino.

4. **Preguntas de problema** (cierra ~3).
   `rekordbox export playlist greyed out` es el arquetipo: alguien atascado,
   ahora, con una intención altísima de probar cualquier cosa que lo destrabe.

5. **La tabla armónica como página** (cierra ~3).
   `harmonic mixing cheat sheet`, `rueda camelot notas`, `rueda camelot musical`.
   Ojo: las reglas armónicas salen de `lib/music/harmonic-transitions.ts` y **no
   se duplican en contenido** — la página tendría que renderizarlas desde ahí.

---

## Cuándo rehacer esto

En 60 días, con Google Search Console adentro. GSC dice qué busca la gente que
**ya llega al sitio**, que es información que ninguna de las fuentes de acá
puede dar. Y con el pase de r/DJs y r/Beatmatch hecho a mano, que es el que
devuelve la pregunta entera en vez de la frase cortada.
