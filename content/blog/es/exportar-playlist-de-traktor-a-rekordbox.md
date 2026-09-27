---
title: "Exportar una playlist de Traktor a Rekordbox: qué sobrevive al pase entre programas de DJ"
description: "Traktor exporta una playlist como carpeta más un NML, y Rekordbox no abre NML. Qué se mueve de verdad, qué no, y cómo conservar el orden del set."
slug: exportar-playlist-de-traktor-a-rekordbox
locale: es
translationOf: export-traktor-playlist-to-rekordbox
targetQuery: "exportar playlist de traktor a rekordbox"
publishedAt: 2026-09-27
tags: traktor, rekordbox, importar, exportar
---

Traktor puede exportar una playlist. Rekordbox puede importar una playlist. Las dos
cosas no se juntan, porque el archivo que escribe Traktor no es un archivo que lea
Rekordbox, y casi toda la frustración de «exportar playlist de Traktor a Rekordbox»
viene de esperar que sí. Esto es lo que hace cada programa de verdad, sacado de sus
propios manuales, y el recorrido entre los dos que no depende de una función que
nadie construyó.

## Qué exporta Traktor

En Traktor, hacé clic derecho sobre la playlist en el Browser Tree y elegí **Export
Playlist**. Le das un nombre y un destino, y Traktor crea una carpeta con los temas y
el archivo de la playlist, un `*.nml`. Ésa es toda la función, y es buena: el audio
y la lista viajan juntos, así que la carpeta es autónoma.

El `.nml` es el formato propio de Traktor. Guarda el orden de la playlist y, por
cada tema, lo que Traktor sabe de él: BPM, tonalidad, sus campos de comentario y la
ruta del archivo. El orden es la parte que conviene mirar. Una carpeta no tiene
orden —tu explorador de archivos la ordena por nombre— y el `.nml` es lo único en
esa carpeta que se acuerda de qué tema iba tercero.

## Qué importa Rekordbox

El manual de Rekordbox, las 266 páginas del actual, no menciona a Traktor ni al NML
ni una vez. Rekordbox importa tres clases de cosas: archivos y carpetas de música,
una librería de iTunes o Apple Music, y su propio **rekordbox xml**. No hay un
«Importar desde Traktor» ni un conversor oficial de Native Instruments ni de
Pioneer.

Dos de esas tres importaciones sirven acá.

**Una carpeta se vuelve playlist.** El manual lo dice en una línea: arrastrá una
carpeta desde el nodo Explorer del árbol hasta Playlists, y se crea una playlist con
el nombre de la carpeta. La carpeta que exportó Traktor es exactamente esa clase de
carpeta. Soltala, y Rekordbox tiene una playlist con los mismos temas — en el orden
en que lista los archivos, no en el tuyo.

**Un XML se vuelve playlist, con orden incluido.** Rekordbox lee una librería de
playlists en su propio formato XML: en Preferences, bajo Advanced y después
Database, apuntás `rekordbox xml` a un archivo XML, y aparece como un nodo en el
árbol. Desde ahí hacés doble clic en Playlists debajo de él y arrastrás una playlist
bajo tus propias Playlists. Ése es el recorrido que conserva el orden, y necesita un
rekordbox XML — que Traktor no escribe.

## Entonces, qué se mueve de verdad

Conviene ser preciso acá, porque la respuesta honesta sirve más que la optimista.

| Qué | ¿Viaja? | Por qué |
|---|---|---|
| Los archivos de audio | Sí | Traktor los copia a la carpeta del export |
| El conjunto de temas | Sí | Soltá la carpeta en Playlists |
| El orden | No solo | Vive en el `.nml`, que Rekordbox no lee |
| BPM y tonalidad | Casi siempre | Los dos programas leen los tags del archivo; Rekordbox además reanaliza |
| Energía | Depende del campo | Ver abajo |
| Cue points, grids, el segundo comentario de Traktor | Sin camino documentado | Son datos de la colección de Traktor, no del archivo |

La energía merece su propia línea. Si tu valor de energía vive en el campo de
comentario, es ID3 común y Rekordbox lo muestra en Comments. Si vive en el
`COMMENT2` de Traktor, es un hecho de Traktor y se queda atrás. Dónde guarda cada
programa la energía, campo por campo, está en
[la referencia de tags de energía](/es/energy-tags).

## El recorrido, en orden

1. En Traktor, clic derecho sobre la playlist, **Export Playlist**, elegí un
   destino. Te queda una carpeta con los temas y un `.nml`.
2. En Rekordbox, arrastrá esa carpeta desde Explorer hasta Playlists. Los temas
   entran; el nombre queda bien; el orden es el del explorador de archivos.
3. Volvé a poner el orden a mano, usando el `.nml` como referencia. Es un archivo de
   texto y cualquier editor lo abre, pero leer una playlist de un XML a ojo es
   lento.

El paso tres es donde una herramienta que lee NML se gana el lugar. Tirá el `.nml`
en [la herramienta gratuita de curva de energía](/es/herramientas/curva-de-energia):
lee el orden y el campo de energía que escribió Traktor, sin cuenta, y te muestra
el set como lista y como curva. Esa lista es tu guía mientras reordenás en
Rekordbox — y la curva te dice si el orden valía la pena conservarlo.

Para que quede claro qué no es EnergyCurve: lee los dos formatos, NML de Traktor y
XML de Rekordbox, pero no escribe uno a partir del otro. No es un conversor. Los
gestores de librería hechos para ese trabajo existen —
[la comparación con Lexicon](/es/comparar/lexicon) dice dónde está la línea, y
[Rekordbox vs Serato vs Traktor](/es/comparar/rekordbox-vs-serato-vs-traktor) compara
los dos programas en sí — y este artículo no hace de cuenta que el paso de
conversión no existe. Te dice qué paso no tiene herramienta y cómo hacerlo con el
menor dolor. La lista completa de qué trae cada formato está en
[la página de formatos](/es/import-formats).

## Si te mudás para siempre

Dos cosas que conviene hacer antes del último export, porque deciden si años de
etiquetado vienen con vos.

**Fijate en qué campo está tu energía.** Un valor en el campo de comentario o en
Grouping viaja con el archivo. Un valor en `COMMENT2`, no. Si el tuyo está en el
campo equivocado, el momento de moverlo es mientras todavía tenés Traktor abierto.

**Dejá que Rekordbox reanalice, y después compará.** Su detección de BPM y de
tonalidad es propia, y no siempre va a coincidir con la de Traktor. Un set que era
armónicamente limpio en un programa puede verse corrido un paso en el otro sólo
porque los dos no se ponen de acuerdo en una tonalidad. Revisar unos pocos temas
que conocés bien te dice a cuál creerle.

```faq
Q: ¿Rekordbox puede abrir un archivo NML de Traktor?
A: No. El manual de Rekordbox no menciona ni NML ni Traktor. Rekordbox importa
archivos y carpetas de música, una librería de iTunes o Apple Music, y su propio
formato rekordbox xml.

Q: ¿El orden de la playlist sobrevive al pase?
A: No por sí solo. El orden está guardado en el .nml, que Rekordbox no lee. Soltar
la carpeta exportada en Playlists te da los temas correctos en el orden del
explorador de archivos; el orden hay que volver a ponerlo a mano, con el .nml como
referencia.

Q: ¿Mis tags de energía vienen con los temas?
A: Si están en el campo de comentario, sí: es ID3 común y Rekordbox lo muestra en
Comments. Si están en el segundo campo de comentario de Traktor, no; ese campo es
propio de Traktor.
```
