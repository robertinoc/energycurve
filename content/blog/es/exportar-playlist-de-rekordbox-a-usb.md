---
title: "Exportar una playlist de Rekordbox a USB para los reproductores de DJ, y qué hacer cuando Export está en gris"
description: "Qué escribe Rekordbox en un pendrive, qué formato de librería elige, y la razón del sistema de archivos por la que la opción de exportar se pone gris."
slug: exportar-playlist-de-rekordbox-a-usb
locale: es
translationOf: rekordbox-export-playlist-to-usb-greyed-out
targetQuery: "exportar playlist rekordbox a usb"
publishedAt: 2026-09-27
tags: rekordbox, usb, exportar
---

Exportar una playlist a un pendrive es lo único que todo usuario de Rekordbox hace
antes de cada toque, y por eso un «Export» en gris a las once de la noche es una
clase tan particular de problema. Esto es lo que hace el export, sacado de la guía
de export a USB de Pioneer y del manual de Rekordbox, y la lista corta de cosas que
dejan la opción inhabilitada — con la que causa la mayoría de los casos primero.

## Qué escribe de verdad «exportar a USB»

Rekordbox no copia archivos y nada más. Cuando exportás a un dispositivo, copia los
temas **y crea una base de datos en el pendrive**: la misma información que
Rekordbox tiene de esos temas —grids, cues, tonalidad, BPM, orden de la playlist—
escrita en la forma que el CDJ o el XDJ lee directo. Esa base de datos es la razón
por la que un pendrive preparado en Rekordbox se comporta distinto en un reproductor
que uno al que le arrastraste archivos.

Hay dos versiones de esa base de datos, y la guía de export a USB es la fuente de las
dos:

- **Device Library**, el formato desde 2009, que lee cualquier reproductor que lea
  un pendrive de Rekordbox.
- **OneLibrary**, desde 2023 (se llamó brevemente Device Library Plus), que leen los
  equipos más nuevos.

Cuál escribe Rekordbox depende del modelo de reproductor para el que le decís que
estás exportando. Podés convertir un pendrive de un formato al otro desde el menú
contextual del dispositivo en el árbol — con una excepción que la guía dice sin
vueltas: un pendrive en OneLibrary no se puede volver a convertir a Device Library.

El export de playlists en sí vive en el **modo Export**. Sync Manager, en palabras
del manual, exporta playlists de iTunes o de Rekordbox a dispositivos USB en su
estado actualizado — que es lo que hay que recordar cuando un tema se reeditó
después del último export y el pendrive todavía tiene la versión vieja.

## Por qué «Export» está en gris

Rekordbox sólo escribe en un pendrive con un sistema de archivos que soporte. La
tabla de medios soportados del manual lista **FAT32** como la respuesta segura para
unidades USB, y la propia FAQ de Pioneer es la que explica la opción en gris:

"Your device may be formatted in a file system that is not supported by the DJ
equipment. If the file system is exFAT, only these DJ equipment are available…
format to a file system other than exFAT."

Así que la lista de chequeo, en el orden que encuentra la causa más rápido:

1. **¿El pendrive aparece en el árbol?** Si Rekordbox no lista el dispositivo, nada
   del export aplica todavía: es un problema de montaje, no de export.
2. **¿Qué sistema de archivos tiene?** Miralo en tu sistema operativo. **exFAT** es
   el culpable habitual: es con lo que vienen casi todos los pendrives de más de
   32 GB, Rekordbox puede escribirlo, y sólo algunos reproductores lo leen. Pioneer
   mantiene la lista de equipos compatibles con exFAT en la FAQ; si tu reproductor
   no está, el pendrive tiene que estar en FAT32. NTFS y HFS+ de Apple son para
   computadoras, no para reproductores.
3. **Reformateá, y exportá de nuevo.** Reformatear borra el pendrive. Copiá antes
   lo que necesites; después formatealo en FAT32 y probá el export.
4. **¿Qué formato de librería escribió?** Si el pendrive exporta bien pero el
   reproductor no ve las playlists, fijate si se escribió como OneLibrary para un
   reproductor que lee Device Library. El menú contextual del dispositivo en el
   árbol muestra cuál es.

Lo que esta lista no incluye es nada sobre tu licencia o tu plan de Rekordbox,
porque exportar a USB no es una función paga y nunca lo fue. Si la opción está en
gris, es el pendrive.

## Antes del export: ¿el orden está bien?

Un export es un compromiso: una vez que el pendrive está en el reproductor, el orden
es el orden. El chequeo que vale la pena hacer antes no es una función de Rekordbox,
y lleva un minuto.

Exportá primero la colección como XML —File, y después Export Collection in xml
format; escribe todas las playlists en un solo archivo— y tirá ese archivo en
[la herramienta gratuita de curva de energía](/es/herramientas/curva-de-energia). Lee
el orden de la playlist y los valores de energía que Rekordbox tiene para cada tema,
sin cuenta, y dibuja la forma del set. Un set que sube cuando querías que se
mantuviera, o que cae en el tercio equivocado, es más fácil de arreglar en Rekordbox
esta noche que en el reproductor mañana. Qué trae el XML, al lado de los otros
formatos, está en [la página de formatos](/es/import-formats); si la curva sale
plana porque el campo de energía está vacío,
[la referencia de tags de energía](/es/energy-tags) dice de qué columna la leemos.

Para ser claro con el alcance: EnergyCurve lee el XML de Rekordbox. No escribe en
un pendrive, no produce una Device Library, y no tiene nada que ver con el paso de
exportar en sí. Es el chequeo antes del export, no un reemplazo.

## Si la playlist va a otro lado

Un pendrive preparado para un reproductor es también, de paso, una carpeta de
archivos — y por eso es el primer paso cuando el destino no es un CDJ sino otro
programa. [Mover una playlist entre Serato y Rekordbox](/es/blog/crates-de-serato-y-rekordbox)
arranca exactamente ahí.

```faq
Q: ¿Por qué «Export» está en gris en Rekordbox?
A: Casi siempre por el sistema de archivos del pendrive. Rekordbox escribe sólo en
sistemas de archivos que soporta, y la FAQ de Pioneer nombra a exFAT como el que
funciona sólo con algunos reproductores. Mirá el sistema de archivos, hacé una
copia del pendrive, reformatealo en FAT32 y exportá de nuevo.

Q: ¿Exportar a USB sólo copia los archivos?
A: No. Copia los temas y escribe una base de datos en el pendrive —Device Library u
OneLibrary según el modelo de reproductor— con grids, cues, tonalidad, BPM y el
orden de la playlist en la forma que el reproductor lee.

Q: ¿Puedo volver a convertir un pendrive de OneLibrary a Device Library?
A: No. La guía de export a USB dice que un pendrive en OneLibrary no se puede
volver a convertir; Device Library sí se puede convertir a OneLibrary desde el menú
contextual del dispositivo en el árbol.
```
