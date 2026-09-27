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
| `what makes a good dj set` | 1 | [`/blog/what-is-a-dj-set`](https://energycurve.app/blog/what-is-a-dj-set) — sección «What makes a DJ set good»; cerrado el 26/09/2026 (lote 10), recontado el 27/09/2026 |
| `how do djs prepare their sets` | 1 | **hueco** |
| `how to plan a dj set` | 1 | **hueco** |
| `how to organize music for djing` | 1 | **hueco** |
| `how long is a dj set` | 1 | [`/blog/what-is-a-dj-set`](https://energycurve.app/blog/what-is-a-dj-set) — la contesta en la FAQ; cerrado el 26/09/2026 (lote 10), recontado el 27/09/2026 |
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
| `mixed in key alternative` | en | 2 | [`/compare/mixed-in-key`](https://energycurve.app/compare/mixed-in-key) — cerrado el 26/09/2026 (lote 9), recontado el 27/09/2026 |
| `mixed in key alternative free` | en | 2 | [`/compare/mixed-in-key`](https://energycurve.app/compare/mixed-in-key) — cerrado el 26/09/2026 (lote 9), recontado el 27/09/2026 |
| `mixed in key alternative reddit` | en | 1 | [`/compare/mixed-in-key`](https://energycurve.app/compare/mixed-in-key) — cerrado el 26/09/2026 (lote 9), recontado el 27/09/2026 |
| `mixed in key 11 alternative` | en | 1 | [`/compare/mixed-in-key`](https://energycurve.app/compare/mixed-in-key) — cerrado el 26/09/2026 (lote 9), recontado el 27/09/2026 |
| `mixed in key free alternative reddit` | en | 1 | [`/compare/mixed-in-key`](https://energycurve.app/compare/mixed-in-key) — cerrado el 26/09/2026 (lote 9), recontado el 27/09/2026 |
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
| `alternativa a mixed in key` | es | 1 | [`/es/comparar/mixed-in-key`](https://energycurve.app/es/comparar/mixed-in-key) — cerrado el 26/09/2026 (lote 9), recontado el 27/09/2026 |
| `mejor software para dj` | es | 2 | **hueco** |
| `cual es el mejor software para dj` | es | 1 | **hueco** |
| `mejor software para dj gratis` | es | 1 | **hueco** |
| `programa para armar sets dj` | es | 0 (sin sugerencias) | **hueco** |

**21 consultas de comparación, 14 sin página** — recontado el 27/09/2026. Eran
20 sin página hasta el 26/09/2026, cuando el lote 9 publicó las cuatro
comparaciones (`/compare/{mixed-in-key,dj-studio,setflow,lexicon}` y sus
gemelas en `/es/comparar/`) y cerró las seis variantes de `mixed in key
alternative`. Las 14 que quedan son los `rekordbox vs …` (6), los `best dj
software for …` (4) y los cuatro en español, que necesitan páginas de otra clase:
comparaciones entre programas de DJ que EnergyCurve no reemplaza, y la decisión
de Robertino sobre qué se puede afirmar de cada uno (SEO-E23, segunda tanda).

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
| `export traktor playlist to rekordbox` | en | 2 | [`/blog/export-traktor-playlist-to-rekordbox`](https://energycurve.app/blog/export-traktor-playlist-to-rekordbox) — cerrado el 27/09/2026 (lote 12) |
| `import music into rekordbox` | en | 2 | [`/import-formats`](https://energycurve.app/import-formats) |
| `rekordbox export playlist to xml` | en | 1 | [`/import-formats`](https://energycurve.app/import-formats) |
| `rekordbox export playlist to usb` | en | 1 | [`/blog/rekordbox-export-playlist-to-usb-greyed-out`](https://energycurve.app/blog/rekordbox-export-playlist-to-usb-greyed-out) — cerrado el 27/09/2026 (lote 12) |
| `rekordbox export playlist as text` | en | 1 | [`/import-formats`](https://energycurve.app/import-formats) |
| `rekordbox export playlist greyed out` | en | 1 | [`/blog/rekordbox-export-playlist-to-usb-greyed-out`](https://energycurve.app/blog/rekordbox-export-playlist-to-usb-greyed-out) — pregunta de problema; cerrado el 27/09/2026 (lote 12) |
| `rekordbox xml file location` | en | 2 | [`/import-formats`](https://energycurve.app/import-formats) |
| `traktor export playlist` | en | 1 | [`/import-formats`](https://energycurve.app/import-formats) |
| `traktor export all playlists` | en | 1 | [`/import-formats`](https://energycurve.app/import-formats) |
| `export serato crate to rekordbox` | en | 1 | [`/blog/serato-crates-and-rekordbox`](https://energycurve.app/blog/serato-crates-and-rekordbox) — cerrado el 27/09/2026 (lote 12) |
| `export serato crate as text` | en | 1 | [`/blog/serato-crates-and-rekordbox`](https://energycurve.app/blog/serato-crates-and-rekordbox) — cerrado el 27/09/2026 (lote 12) |
| `convert rekordbox playlist to serato` | en | 1 | [`/blog/serato-crates-and-rekordbox`](https://energycurve.app/blog/serato-crates-and-rekordbox) — cerrado el 27/09/2026 (lote 12) |
| `transfer traktor playlist to rekordbox` | en | 1 | [`/blog/export-traktor-playlist-to-rekordbox`](https://energycurve.app/blog/export-traktor-playlist-to-rekordbox) — cerrado el 27/09/2026 (lote 12) |
| `m3u8 playlist` | en | 1 | [`/import-formats`](https://energycurve.app/import-formats) |
| `what are crates in serato` | en | 1 | [`/blog/serato-crates-and-rekordbox`](https://energycurve.app/blog/serato-crates-and-rekordbox) — cerrado el 27/09/2026 (lote 12) |
| `exportar playlist rekordbox` | es | 2 | [`/es/import-formats`](https://energycurve.app/es/import-formats) |
| `exportar playlist traktor` | es | 2 | [`/es/import-formats`](https://energycurve.app/es/import-formats) |
| `exportar playlist rekordbox a usb` | es | 1 | **hueco** |
| `exportar playlist de traktor a rekordbox` | es | 1 | **hueco** |
| `exportar playlist de rekordbox a serato` | es | 1 | [`/es/blog/crates-de-serato-y-rekordbox`](https://energycurve.app/es/blog/crates-de-serato-y-rekordbox) — cerrado el 27/09/2026 (lote 12) |
| `importar lista de reproduccion rekordbox` | es | 1 | [`/es/import-formats`](https://energycurve.app/es/import-formats) |
| `mis temas no tienen bpm` | es | 0 (sin sugerencias) | [`/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad`](https://energycurve.app/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad) |
| `ordenar un set desde una lista de texto` | es | 0 (sin sugerencias) | [`/es/blog/ordenar-un-set-desde-una-lista-de-texto`](https://energycurve.app/es/blog/ordenar-un-set-desde-una-lista-de-texto) |

Patrón claro: **`/import-formats` cubre el formato pero no el trayecto.** La
gente no busca "qué formatos soporta"; busca "cómo llevo esto de acá para allá".
Nueve huecos de esta tabla eran variantes de A→B; el lote 12 (27/09/2026) los
cerró con tres artículos en inglés y una gemela en español, agrupados por
recorrido —Traktor→Rekordbox, Serato↔Rekordbox (con «qué es un crate»),
Rekordbox→USB (con «greyed out»)— y `/import-formats` ahora los enlaza. Quedan
dos en español sin gemela: `exportar playlist rekordbox a usb` y
`exportar playlist de traktor a rekordbox`.

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
| Aprender — inglés | 30 | 24 | 6 — eran 11 hasta el 26/09/2026; el lote 10 cerró cinco (tres al publicarse y dos más que el recuento del 27/09/2026 encontró contestadas en `/blog/what-is-a-dj-set`) |
| Aprender — español | 28 | 26 | 2 |
| Comparar | 21 | 7 | 14 — eran 20 hasta el 26/09/2026 (lote 9) |
| Importar / exportar | 25 | 23 | 2 — eran 11 hasta el 27/09/2026 (lote 12) |
| Herramienta | 22 | 17 | 5 |
| **Total** | **126** | **97** | **29** |

**Recuentos:** 19/09/2026 (original: 77 con página, 49 huecos) · 26/09/2026
(lotes 9 y 10, parcial: la tabla de comparación no se actualizó) · 27/09/2026
(lote 12: 97 con página, 29 huecos — el conteo de la tabla y el `grep` del
archivo coinciden).

Por idioma: **80 en inglés, 46 en español**.

Los números de esta tabla están contados sobre el archivo, no a ojo: cada fila
que empieza con `` | ` `` es una consulta, y las marcadas `**hueco**` son las
que no tienen página.

El contraste que más dice: en español **2 de 28** consultas de aprendizaje
quedan sin página; en inglés, **6 de 30** (eran 11 hasta el 26/09/2026). Es el
mismo sitio, con el mismo glosario; la diferencia eran los cinco artículos que
existían sólo en español, y desde el lote 10 el inglés tiene más artículos que
el español (14 contra 6 al 27/09/2026). El contraste se dio vuelta en la otra
intención: en importar/exportar los dos huecos que quedan son los dos españoles
sin gemela.

---

## La lista de qué escribir después

Ordenada por cuántos huecos cierra cada cosa, no por volumen — que no lo sé.

Recontada el 27/09/2026. Lo tachado se cerró; queda anotado con qué.

1. **Comparaciones entre programas de DJ** (cierra 14). `rekordbox vs serato`
   y sus cinco variantes, `best dj software for X` (4), `mejor software para dj`
   (3), `programa para armar sets dj`. Es la segunda tanda de SEO-E23 y está
   frenada por lo mismo que la primera: qué se puede afirmar de cada uno. Es
   ahora el bloque más grande. ~~`mixed in key alternative` y sus variantes~~ —
   cerradas por el lote 9 con `/compare/mixed-in-key`.

2. ~~**Artículos de trayecto A→B para importar** (cierra ~9).~~ Cerrado por el
   lote 12 (27/09/2026): tres artículos en inglés y una gemela en español.
   Quedan dos consultas españolas sin gemela (`exportar playlist rekordbox a
   usb`, `exportar playlist de traktor a rekordbox`): cierra 2, y son
   traducciones de artículos que ya existen.

3. **Lo que falta del blog en inglés** (cierra 4). `how do djs prepare their
   sets`, `how to plan a dj set`, `how to organize music for djing`,
   `how to structure a house dj set`. ~~`how does a dj set work`,
   `how to structure a dj set`, `what makes a good dj set`, `how long is a dj
   set`~~ — cerradas por el lote 10. Es SEO-E13/E14, que escribe Robertino.

4. ~~**Preguntas de problema** (cierra ~3).~~ `rekordbox export playlist greyed
   out`, el arquetipo, la cerró el lote 12. Las que quedan de esa clase son las
   de herramienta (`camelot wheel free download`, `analyzing dj sets`).

5. **La tabla armónica como página** (cierra 4: `harmonic mixing cheat sheet`,
   `camelot wheel vs circle of fifths`, `rueda camelot notas`, `rueda camelot
   musical`).
   `harmonic mixing cheat sheet`, `rueda camelot notas`, `rueda camelot musical`.
   Ojo: las reglas armónicas salen de `lib/music/harmonic-transitions.ts` y **no
   se duplican en contenido** — la página tendría que renderizarlas desde ahí.

---

## Cuándo rehacer esto

En 60 días, con Google Search Console adentro. GSC dice qué busca la gente que
**ya llega al sitio**, que es información que ninguna de las fuentes de acá
puede dar. Y con el pase de r/DJs y r/Beatmatch hecho a mano, que es el que
devuelve la pregunta entera en vez de la frase cortada.
