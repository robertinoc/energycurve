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
| `how do djs prepare their sets` | 1 | [`/blog/how-djs-prepare-their-sets`](https://energycurve.app/blog/how-djs-prepare-their-sets) — cerrado el 27/09/2026 (lote 13) |
| `how to plan a dj set` | 1 | [`/blog/how-to-structure-a-dj-set`](https://energycurve.app/blog/how-to-structure-a-dj-set) — ya la contestaba: el artículo entero es el método de planificación (el slot, el arco, llenarlo); marcado en el recuento del 27/09/2026 (lote 13), sin escribir nada |
| `how to organize music for djing` | 1 | [`/blog/how-djs-prepare-their-sets`](https://energycurve.app/blog/how-djs-prepare-their-sets) — sección «Organizing your music so all three stages are fast»; cerrado el 27/09/2026 (lote 13) |
| `how long is a dj set` | 1 | [`/blog/what-is-a-dj-set`](https://energycurve.app/blog/what-is-a-dj-set) — la contesta en la FAQ; cerrado el 26/09/2026 (lote 10), recontado el 27/09/2026 |
| `camelot wheel vs circle of fifths` | 1 | [`/harmonic-mixing-cheat-sheet`](https://energycurve.app/harmonic-mixing-cheat-sheet) — sección «Camelot and the circle of fifths are the same wheel»; cerrado el 27/09/2026 (lote 13) |
| `how to structure a house dj set` | 1 | **hueco** — a propósito (lote 13, 27/09/2026): el sitio no puede decir nada del house que no valga para cualquier set; un artículo con «house» en el título sobre `/blog/how-to-structure-a-dj-set` sería contenido delgado |
| `how to get the bpm of a song` | 1 | [`/glossary/bpm`](https://energycurve.app/glossary/bpm) + [`/tools/key-bpm-compatibility`](https://energycurve.app/tools/key-bpm-compatibility) |
| `mixing in key explained` | 1 | [`/glossary/harmonic-mixing`](https://energycurve.app/glossary/harmonic-mixing) |
| `mixing in key rules` | 1 | [`/glossary/harmonic-mixing`](https://energycurve.app/glossary/harmonic-mixing) |
| `harmonic mixing cheat sheet` | 1 | [`/harmonic-mixing-cheat-sheet`](https://energycurve.app/harmonic-mixing-cheat-sheet) — generada desde `lib/music/harmonic-transitions.ts`, no escrita; cerrado el 27/09/2026 (lote 13) |

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
| `rueda camelot notas` | 1 | [`/es/tabla-de-mezcla-armonica`](https://energycurve.app/es/tabla-de-mezcla-armonica) — las 24 filas Camelot↔Open Key↔tonalidad, verificadas por test contra el círculo de quintas; cerrado el 27/09/2026 (lote 13) |
| `rueda camelot musical` | 1 | [`/es/tabla-de-mezcla-armonica`](https://energycurve.app/es/tabla-de-mezcla-armonica) — cerrado el 27/09/2026 (lote 13) |
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
| `rekordbox vs serato` | en | 2 | [`/compare/rekordbox-vs-serato-vs-traktor`](https://energycurve.app/compare/rekordbox-vs-serato-vs-traktor) — cerrado el 27/09/2026 (lote 13) |
| `rekordbox vs serato dj pro` | en | 2 | [`/compare/rekordbox-vs-serato-vs-traktor`](https://energycurve.app/compare/rekordbox-vs-serato-vs-traktor) — cerrado el 27/09/2026 (lote 13) |
| `rekordbox vs traktor` | en | 2 | [`/compare/rekordbox-vs-serato-vs-traktor`](https://energycurve.app/compare/rekordbox-vs-serato-vs-traktor) — cerrado el 27/09/2026 (lote 13) |
| `rekordbox vs djay pro` | en | 2 | [`/compare/rekordbox-vs-serato-vs-traktor`](https://energycurve.app/compare/rekordbox-vs-serato-vs-traktor) — cerrado el 27/09/2026 (lote 13) |
| `rekordbox vs virtual dj` | en | 2 | [`/compare/rekordbox-vs-serato-vs-traktor`](https://energycurve.app/compare/rekordbox-vs-serato-vs-traktor) — cerrado el 27/09/2026 (lote 13) |
| `rekordbox vs serato vs virtual dj` | en | 2 | [`/compare/rekordbox-vs-serato-vs-traktor`](https://energycurve.app/compare/rekordbox-vs-serato-vs-traktor) — cerrado el 27/09/2026 (lote 13) |
| `best dj software for beginners` | en | 2 | [`/compare/best-dj-software`](https://energycurve.app/compare/best-dj-software) — cerrado el 27/09/2026 (lote 13) |
| `best dj software for mac` | en | 2 | [`/compare/best-dj-software`](https://energycurve.app/compare/best-dj-software) — cerrado el 27/09/2026 (lote 13) |
| `best dj software for windows` | en | 2 | [`/compare/best-dj-software`](https://energycurve.app/compare/best-dj-software) — cerrado el 27/09/2026 (lote 13) |
| `best dj software for spotify` | en | 2 | [`/compare/best-dj-software`](https://energycurve.app/compare/best-dj-software) — cerrado el 27/09/2026 (lote 13) |
| `dj set analysis` | en | 2 | [`/`](https://energycurve.app/) — la landing, no una página dedicada |
| `alternativa a mixed in key` | es | 1 | [`/es/comparar/mixed-in-key`](https://energycurve.app/es/comparar/mixed-in-key) — cerrado el 26/09/2026 (lote 9), recontado el 27/09/2026 |
| `mejor software para dj` | es | 2 | [`/es/comparar/mejor-software-para-dj`](https://energycurve.app/es/comparar/mejor-software-para-dj) — cerrado el 27/09/2026 (lote 13) |
| `cual es el mejor software para dj` | es | 1 | [`/es/comparar/mejor-software-para-dj`](https://energycurve.app/es/comparar/mejor-software-para-dj) — cerrado el 27/09/2026 (lote 13) |
| `mejor software para dj gratis` | es | 1 | [`/es/comparar/mejor-software-para-dj`](https://energycurve.app/es/comparar/mejor-software-para-dj) — sección «Para empezar: qué es gratis»; cerrado el 27/09/2026 (lote 13) |
| `programa para armar sets dj` | es | 0 (sin sugerencias) | [`/es/comparar/mejor-software-para-dj`](https://energycurve.app/es/comparar/mejor-software-para-dj) — sección «Un programa para armar sets, que es otra pregunta»; cerrado el 27/09/2026 (lote 13) |

**21 consultas de comparación, 0 sin página** — recontado el 27/09/2026 (lote
13). Eran 20 sin página hasta el 26/09/2026, cuando el lote 9 publicó las cuatro
comparaciones contra competidores (`/compare/{mixed-in-key,dj-studio,setflow,lexicon}`
y sus gemelas en `/es/comparar/`); las 14 restantes las cerró el lote 13 con dos
páginas de otra clase — comparaciones entre programas de DJ que EnergyCurve no
reemplaza —: `/compare/rekordbox-vs-serato-vs-traktor` (los seis `rekordbox vs …`)
y `/compare/best-dj-software` con su gemela `/es/comparar/mejor-software-para-dj`
(los cuatro `best dj software for …` y los cuatro en español). Ninguna dice cuál
es «el mejor»: dicen lo que cada fabricante dice, con URL y fecha, y para qué caso
conviene cada uno.

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
| `exportar playlist rekordbox a usb` | es | 1 | [`/es/blog/exportar-playlist-de-rekordbox-a-usb`](https://energycurve.app/es/blog/exportar-playlist-de-rekordbox-a-usb) — gemela de `rekordbox-export-playlist-to-usb-greyed-out`; cerrado el 27/09/2026 (lote 14) |
| `exportar playlist de traktor a rekordbox` | es | 1 | [`/es/blog/exportar-playlist-de-traktor-a-rekordbox`](https://energycurve.app/es/blog/exportar-playlist-de-traktor-a-rekordbox) — gemela de `export-traktor-playlist-to-rekordbox`; cerrado el 27/09/2026 (lote 14) |
| `exportar playlist de rekordbox a serato` | es | 1 | [`/es/blog/crates-de-serato-y-rekordbox`](https://energycurve.app/es/blog/crates-de-serato-y-rekordbox) — cerrado el 27/09/2026 (lote 12) |
| `importar lista de reproduccion rekordbox` | es | 1 | [`/es/import-formats`](https://energycurve.app/es/import-formats) |
| `mis temas no tienen bpm` | es | 0 (sin sugerencias) | [`/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad`](https://energycurve.app/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad) |
| `ordenar un set desde una lista de texto` | es | 0 (sin sugerencias) | [`/es/blog/ordenar-un-set-desde-una-lista-de-texto`](https://energycurve.app/es/blog/ordenar-un-set-desde-una-lista-de-texto) |

Patrón claro: **`/import-formats` cubre el formato pero no el trayecto.** La
gente no busca "qué formatos soporta"; busca "cómo llevo esto de acá para allá".
Nueve huecos de esta tabla eran variantes de A→B; el lote 12 (27/09/2026) los
cerró con tres artículos en inglés y una gemela en español, agrupados por
recorrido —Traktor→Rekordbox, Serato↔Rekordbox (con «qué es un crate»),
Rekordbox→USB (con «greyed out»)— y `/import-formats` los enlaza. El lote 14
escribió las otras dos gemelas en español; la tabla queda sin huecos.

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
| `camelot wheel free download` | en | 1 | [`/harmonic-mixing-cheat-sheet`](https://energycurve.app/harmonic-mixing-cheat-sheet) — descarga `/camelot-wheel.svg`, generada en build; cerrado el 27/09/2026 (lote 13) |
| `dj set planner` | en | 1 | [`/tools/energy-curve`](https://energycurve.app/tools/energy-curve) |
| `free dj set planner` | en | 1 | [`/tools/energy-curve`](https://energycurve.app/tools/energy-curve) |
| `dj set planner app` | en | 1 | [`/tools/energy-curve`](https://energycurve.app/tools/energy-curve) |
| `ai dj set planner free` | en | 1 | **hueco** — decisión de Robertino, no de un lote (lote 14, 27/09/2026): si el producto quiere la palabra «AI» en su posicionamiento. `/tools/energy-curve` la contestaría en todo menos en la palabra |
| `harmonic dj set planner` | en | 1 | [`/tools/energy-curve`](https://energycurve.app/tools/energy-curve) |
| `analyze dj set` | en | 1 | [`/`](https://energycurve.app/) |
| `analyzing dj sets` | en | 1 | [`/tools/energy-curve`](https://energycurve.app/tools/energy-curve) — ya la contestaba: título «Energy curve analyzer», lede «Drop in a playlist export or paste a tracklist…»; marcada en el recuento del 27/09/2026 (lote 14), sin escribir |
| `tracklist analyze dj sets` | en | 1 | [`/tools/energy-curve`](https://energycurve.app/tools/energy-curve) — ya la contestaba: «paste a tracklist» y «Analyze this list» son el copy de la página; marcada el 27/09/2026 (lote 14), sin escribir |
| `rueda camelot online` | es | 1 | [`/es/herramientas/rueda-camelot`](https://energycurve.app/es/herramientas/rueda-camelot) |
| `analizar bpm y tonalidad` | es | 1 | [`/es/herramientas/compatibilidad-tonalidad-bpm`](https://energycurve.app/es/herramientas/compatibilidad-tonalidad-bpm) |
| `programa para analizar bpm canciones` | es | 1 | [`/es/herramientas/compatibilidad-tonalidad-bpm`](https://energycurve.app/es/herramientas/compatibilidad-tonalidad-bpm) |
| `programa gratis para dj` | es | 1 | [`/es/comparar/mejor-software-para-dj`](https://energycurve.app/es/comparar/mejor-software-para-dj) — la consulta pide un programa para tocar, no nuestra herramienta: la sección «Para empezar: qué es gratis» lista los que lo son según su fabricante; marcada el 27/09/2026 (lote 14), sin escribir |
| `rueda camelot online gratis` | es | 0 (sin sugerencias) | [`/es/herramientas/rueda-camelot`](https://energycurve.app/es/herramientas/rueda-camelot) |

---

## Conteo

| | Consultas | Con página | Hueco |
|---|---|---|---|
| Aprender — inglés | 30 | 29 | 1 — `how to structure a house dj set`, dejado a propósito (lote 13) |
| Aprender — español | 28 | 28 | 0 — eran 2 hasta el lote 13 (la tabla armónica) |
| Comparar | 21 | 21 | 0 — eran 20 hasta el 26/09/2026 (lote 9), 14 hasta el lote 13 |
| Importar / exportar | 25 | 25 | 0 — eran 11 hasta el lote 12, 2 hasta el lote 14 |
| Herramienta | 22 | 21 | 1 — `ai dj set planner free`, que es una decisión; eran 5 hasta el lote 13, 4 hasta el lote 14 |
| **Total** | **126** | **124** | **2** |

**Recuentos:** 19/09/2026 (original: 77 con página, 49 huecos) · 26/09/2026
(lotes 9 y 10, parcial: la tabla de comparación no se actualizó) · 27/09/2026
(lote 12: 97 con página, 29 huecos) · 27/09/2026, lote 13: 119 con página, 7
huecos — de las 22 que cerró, una (`how to plan a dj set`) ya estaba
contestada y se marcó sin escribir · 27/09/2026, lote 14: **124 con página, 2
huecos** — el conteo de la tabla y el `grep` del archivo coinciden. De las 5
que cerró el lote 14, tres ya estaban contestadas (`analyzing dj sets`,
`tracklist analyze dj sets` por `/tools/energy-curve`; `programa gratis para
dj` por la comparación de software) y dos son las gemelas españolas escritas.
Los dos que quedan no son de contenido: uno es una decisión (`ai dj set
planner free`) y el otro se dejó a propósito (`house`).

Por idioma: **80 en inglés, 46 en español**.

Los números de esta tabla están contados sobre el archivo, no a ojo: cada fila
que empieza con `` | ` `` es una consulta, y las marcadas `**hueco**` son las
que no tienen página.

El contraste que más dice, al 27/09/2026 (lote 13): en español **0 de 28**
consultas de aprendizaje quedan sin página; en inglés, **1 de 30**, dejada a
propósito. Es el mismo sitio, con el mismo glosario; la diferencia eran los cinco
artículos que existían sólo en español, y desde el lote 10 el inglés tiene más
artículos que el español (15 contra 6). Lo que queda del contraste está en
importar/exportar: los dos huecos que quedan son los dos españoles sin gemela.

---

## La lista de qué escribir después

Ordenada por cuántos huecos cierra cada cosa, no por volumen — que no lo sé.

Recontada el 27/09/2026, dos veces (lotes 12 y 13). Lo tachado se cerró; queda
anotado con qué.

1. ~~**Comparaciones entre programas de DJ** (cierra 14).~~ Cerrado por el lote
   13 con dos páginas (`/compare/rekordbox-vs-serato-vs-traktor`,
   `/compare/best-dj-software` y gemela en español), sobre la regla de evidencia
   de `competitor-facts-2026-09-26.md` extendida a Rekordbox, Serato, Traktor,
   VirtualDJ y djay Pro. ~~`mixed in key alternative` y sus variantes~~ —
   cerradas por el lote 9 con `/compare/mixed-in-key`.

2. ~~**Artículos de trayecto A→B para importar** (cierra ~9).~~ Cerrado por el
   lote 12 (27/09/2026): tres artículos en inglés y una gemela en español.
   Quedan dos consultas españolas sin gemela (`exportar playlist rekordbox a
   usb`, `exportar playlist de traktor a rekordbox`): cierra 2, y son
   traducciones de artículos que ya existen.

3. ~~**Lo que falta del blog en inglés** (cierra 4).~~ El lote 13 cerró tres:
   `how do djs prepare their sets` y `how to organize music for djing` con un
   artículo (`/blog/how-djs-prepare-their-sets`), y `how to plan a dj set` sin
   escribir, porque `/blog/how-to-structure-a-dj-set` ya la contestaba. Queda
   `how to structure a house dj set`, a propósito: el sitio no tiene nada
   particular del house que decir. ~~`how does a dj set work`,
   `how to structure a dj set`, `what makes a good dj set`, `how long is a dj
   set`~~ — cerradas por el lote 10.

4. ~~**Preguntas de problema** (cierra ~3).~~ `rekordbox export playlist greyed
   out`, el arquetipo, la cerró el lote 12. Las que quedan de esa clase son las
   de herramienta (`camelot wheel free download`, `analyzing dj sets`).

5. ~~**La tabla armónica como página** (cierra 4: `harmonic mixing cheat sheet`,
   `camelot wheel vs circle of fifths`, `rueda camelot notas`, `rueda camelot
   musical`).~~ Cerrado por el lote 13 con `/harmonic-mixing-cheat-sheet` y
   `/es/tabla-de-mezcla-armonica`, **generadas** desde
   `lib/music/harmonic-transitions.ts` y no escritas, más `/camelot-wheel.svg`
   para `camelot wheel free download` (cierra 5 en total).

6. **Lo que queda** (2 huecos, al 27/09/2026, lote 14): `ai dj set planner
   free`, que es una decisión de Robertino sobre la palabra «AI» y no una
   tarea; y `how to structure a house dj set`, dejada a propósito por el lote
   13. ~~Las dos gemelas españolas A→B~~ las escribió el lote 14; ~~`analyzing
   dj sets`, `tracklist analyze dj sets` y `programa gratis para dj`~~ ya
   estaban contestadas por `/tools/energy-curve` y por la comparación de
   software, y se marcaron sin escribir. (Una versión anterior de este punto
   repetía las tres consultas de la tabla armónica que el punto 5 ya daba por
   cerradas, con una nota sobre no duplicar las reglas armónicas que dejó de
   aplicar cuando la página pasó a generarlas; se sacó el 27/09/2026.)

**El mapa está cerrado por el lado del contenido.** Lo que sigue es GSC: en 60
días, con datos de qué busca la gente que ya llega, y no del autocompletado.

---

## Cuándo rehacer esto

En 60 días, con Google Search Console adentro. GSC dice qué busca la gente que
**ya llega al sitio**, que es información que ninguna de las fuentes de acá
puede dar. Y con el pase de r/DJs y r/Beatmatch hecho a mano, que es el que
devuelve la pregunta entera en vez de la frase cortada.
