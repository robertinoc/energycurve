---
title: "Crates de Serato y Rekordbox: qué es un crate, cómo lo mueve un DJ y por qué no hay export a texto"
description: "Un crate de Serato es una playlist guardada como archivo .crate. Qué implica cuando la querés en Rekordbox, como texto, o al revés, de Rekordbox a Serato."
slug: crates-de-serato-y-rekordbox
locale: es
translationOf: serato-crates-and-rekordbox
targetQuery: "exportar playlist de rekordbox a serato"
publishedAt: 2026-09-27
tags: serato, rekordbox, importar, crates
---

Cuatro búsquedas chocan contra la misma pared desde lados distintos: *exportar un
crate de Serato a Rekordbox*, *exportar una playlist de Rekordbox a Serato*,
*exportar un crate como texto*, y debajo de las tres, *qué es un crate en Serato*.
Comparten una respuesta, y es más corta y menos satisfactoria de lo que la búsqueda
sugiere: ninguno de los dos programas documenta un camino hacia el otro, y un crate
no es un archivo de texto. Acá está qué es cada pieza, según la documentación de
Serato y de Pioneer, y el recorrido que funciona sin inventar una función.

## Qué es un crate

Un **crate** es la palabra de Serato para playlist: una lista de temas con nombre,
en el orden que vos fijás, que armás arrastrando temas adentro. Serato DJ Pro y
Serato DJ Lite lo tienen, y un crate puede contener subcrates.

Lo que distingue a los crates de las playlists de otros programas es dónde viven.
Serato mantiene una carpeta llamada `_Serato_` en cada disco que usa, y adentro una
carpeta `Subcrates` con un archivo `.crate` por crate. Ese archivo es el crate: la
lista de rutas de archivo, en orden. Tu audio está donde lo hayas puesto; el crate
sólo lo señala.

Esto tiene una consecuencia que se descubre por las malas. Un crate en tu
computadora señala archivos de tu computadora. Copiá el `.crate` a otro lado y no
señala nada.

## Sacar un crate de Serato

La forma documentada de exportar un crate es **arrastrarlo sobre un disco en el
panel Files**. Serato copia los temas a ese disco y escribe el crate en la carpeta
`_Serato_` de ese disco, así que el disco queda autónomo: enchufalo en otro Serato
y el crate está ahí, con sus temas.

Eso es un export hacia *otro Serato*. No es un export a un formato que lea alguien
más.

### «Exportar un crate como texto»

No hay un export oficial de un crate a texto. El sitio de soporte de Serato no lo
documenta, y un `.crate` no es un archivo de texto que puedas abrir y pegar: es una
lista binaria de rutas. Hay soluciones de foro; este artículo no va a describir una
que no puede verificar.

Lo que sí podés hacer sin nada de eso es sacar los *archivos*, que es lo que hace el
export arrastrando al disco, y leer la lista desde los archivos. Si querías el texto
para planificar o revisar el set —la razón habitual—, ése es el paso que
[la herramienta gratuita de curva de energía](/es/herramientas/curva-de-energia)
se saltea: lee los tags de una carpeta de audio en el navegador, o una lista de
texto de líneas «Artista - Título» tipeadas, sin cuenta, y te devuelve el set como
lista y como curva. Hasta dónde llega una lista de texto pelada está en
[ordenar un set desde una lista de texto](/es/blog/ordenar-un-set-desde-una-lista-de-texto).

## De un crate de Serato a Rekordbox

El manual de Rekordbox —el actual, 266 páginas— no menciona a Serato ni una vez.
Rekordbox importa archivos y carpetas de música, una librería de iTunes o Apple
Music, y su propio rekordbox xml. Un `.crate` no es ninguna de esas cosas.

El recorrido que funciona usa lo único que los dos programas leen: una carpeta de
archivos.

1. En Serato, arrastrá el crate sobre un disco en el panel Files. Ahora tenés una
   carpeta con los temas del crate en ese disco.
2. En Rekordbox, arrastrá esa carpeta desde el nodo Explorer hasta Playlists. La
   línea del manual: se crea una playlist con el nombre de la carpeta soltada.
3. El orden no viene. Una carpeta no tiene orden, y el `.crate` que lo recuerda no
   se lee. Hay que rearmarlo a mano.

Lo que viaja con los archivos es lo que tengan en los tags: BPM, tonalidad y el
campo de comentario. Serato no tiene campo de energía propio, así que si un crate
estaba etiquetado por energía se hizo en el comentario —casi siempre con Mixed In
Key— y Rekordbox lo muestra en Comments. El mapa de quién guarda la energía dónde
está en [la referencia de tags de energía](/es/energy-tags).

## De una playlist de Rekordbox a Serato

La misma pared del otro lado. El sitio de soporte de Serato, buscando «rekordbox
import», devuelve artículos sobre importar música y sobre iTunes; ninguno sobre
Rekordbox. Rekordbox, por su parte, exporta la colección como **rekordbox xml**
(File, y después Export Collection in xml format), que es un formato para Rekordbox
y para las herramientas que eligieron leerlo. Serato no está documentado como una
de ellas.

Así que el recorrido es el espejo:

1. Poné los archivos de la playlist en una carpeta. El export a USB de Rekordbox
   hace eso; los detalles están en [la página de formatos](/es/import-formats) y en
   el artículo en inglés sobre el export a USB.
2. En Serato, arrastrá la carpeta sobre la zona de importación. El manual de
   Serato: arrastrás una carpeta y se importan los archivos compatibles en un
   crate.
3. El orden: a mano, otra vez.

Si querés el orden a la vista mientras lo rearmás, el rekordbox xml es el archivo
para conservar. Guarda el orden de la playlist, y
[la herramienta de curva de energía](/es/herramientas/curva-de-energia) lo lee
directo: eso te da la lista, en orden, con energía, para trabajar mientras
arrastrás temas en Serato.

## Lo que este artículo no va a afirmar

EnergyCurve lee XML de Rekordbox, NML de Traktor, M3U8 y CSV, y lee tags de audio
directo de los archivos. No lee archivos `.crate`, y no escribe el formato de ningún
software de DJ a partir del de otro. No es un conversor, y no va a decir que el
paso de conversión es fácil cuando es el paso que ninguno de los dos fabricantes
construyó. Qué trae cada formato está en [la página de formatos](/es/import-formats);
[la comparación con Lexicon](/es/comparar/lexicon) es el señalamiento honesto para
quien tiene como problema real la conversión en sí.

```faq
Q: ¿Qué es un crate en Serato?
A: Una playlist. Una lista de temas con nombre y orden, guardada como archivo
.crate en la carpeta _Serato_/Subcrates del disco al que pertenece. El archivo
lista rutas; el audio queda donde lo tengas.

Q: ¿Puedo exportar un crate de Serato a Rekordbox?
A: No directamente. Rekordbox no lee archivos .crate y su manual no menciona a
Serato. Arrastrá el crate sobre un disco en el panel Files de Serato para tener una
carpeta con sus temas, y soltá esa carpeta en Playlists en Rekordbox. El orden hay
que rearmarlo a mano.

Q: ¿Puedo pasar una playlist de Rekordbox a Serato?
A: Serato no documenta la importación de playlists de Rekordbox. Exportá los
temas desde Rekordbox a una carpeta, arrastrá la carpeta a Serato, y tenés un crate
con esos temas; conservá el rekordbox xml como referencia del orden.
```
