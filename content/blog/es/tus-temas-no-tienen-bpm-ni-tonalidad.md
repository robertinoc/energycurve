---
title: "Tus temas no tienen BPM ni tonalidad en los tags: qué hacer"
description: "Casi todas las guías para preparar un set asumen que tu librería está prolija. Si tenés wav y flac sin tags, esto es lo que se puede y lo que no."
slug: tus-temas-no-tienen-bpm-ni-tonalidad
locale: es
translationOf: dj-tracks-with-no-bpm-or-key
targetQuery: "temas sin BPM ni tonalidad"
publishedAt: 2026-08-20
updatedAt: 2026-09-22
tags: BPM, tonalidad, importar, sin librería
---

El BPM se puede leer del audio con confianza. La tonalidad no — detectarla del audio
es un problema genuinamente difícil y nuestro acierto es del 21%, así que la tenemos
apagada. La energía se puede estimar del BPM y de otras propiedades del audio, pero
una estimación es lo que es. Ése es el resumen honesto, y el resto lo explica.

Todas las guías sobre mezcla armónica y curvas de energía empiezan igual: "tomá tu
librería, mirá el BPM y la tonalidad de cada tema". Y ahí se termina la guía para
mucha gente, porque los wav que bajaste del promo, los flac que te pasó un amigo y los
edits que hiciste vos no tienen nada escrito en los tags.

No es un caso raro. Es el caso normal.

## Por qué faltan

Los tags de BPM y tonalidad no vienen con el archivo: los escribe algún programa
después. Si compraste en Beatport suelen venir; si es un promo, un rip, un edit propio
o un wav exportado de tu DAW, no. Y un wav, por formato, tiene mucho menos lugar para
metadata que un mp3.

## Qué se puede recuperar, y con cuánta confianza

**El BPM se puede leer del audio, y bien.** La detección de tempo es un problema
resuelto en música electrónica: el pulso es fuerte y regular, y los algoritmos
aciertan casi siempre. En nuestras mediciones sobre techno y house coincidió con los
tags en todos los archivos que sí los tenían.

**La tonalidad es harina de otro costal.** Detectarla del audio es un problema
genuinamente difícil, sobre todo en géneros donde el bajo lleva la armonía y los
sintes de arriba están muy procesados. Nosotros estamos en un 21% de acierto y no lo
vendemos como más de lo que es: está apagado hasta que lo podamos medir bien.

Si alguien te promete detección de tonalidad perfecta desde el audio, desconfiá.

**La energía se puede estimar** a partir del BPM y de otras características del
audio — cuán fuerte suena, cuánto cambia el espectro, cuántos ataques por segundo
tiene. Es una estimación, no una medición.

## El orden de precedencia que conviene

Si vas a preparar un set con librería mixta, esta es la jerarquía razonable:

1. **Lo que pusiste vos a mano.** Siempre gana. Vos escuchaste el tema.
2. **Lo medido del audio.** Confiable para BPM.
3. **El tag del archivo.** Confiable si sabés quién lo escribió.
4. **Estimado por posición en el set.** Último recurso, y hay que saber que lo es.

Lo importante no es tener el número: es **saber de dónde viene cada número**. Un set
armado sobre estimaciones que creías mediciones es peor que uno armado a oído — y un
set donde la mitad de los BPM están medidos y la otra mitad adivinados no es un set
con buenos datos, es un set con dos clases de datos que en pantalla se ven idénticos.

### ¿Cómo sé quién escribió un tag?

Por tema, normalmente no podés, y de eso se trata que el tag esté tercero y no
primero. Lo que sí podés es saberlo por **fuente**: una carpeta comprada en una
tienda suele estar bien, una carpeta de promos suele estar vacía, y una carpeta que
analizó tu propio software vale lo que ese software. Si un BPM es un número
sospechosamente redondo en un tema que claramente no está a 128 exactos, algo lo
escribió con optimismo.

### ¿No conviene dejar que mi software de DJ analice todo?

Para BPM, sí — es el mismo problema resuelto, y además escribe el resultado en los
tags, donde todo lo demás lo puede leer. Para tonalidad, tratá lo que escriba como una
opinión más. [Tags de energía](/es/energy-tags) cubre qué guarda cada uno de
Rekordbox, Serato y Traktor, y dónde no se ponen de acuerdo.

### ¿Se puede preparar un set sin ningún tag?

Sí, con un resultado más chico. La detección de género y una estimación de energía por
posición alcanzan para ver la forma del set y agarrar las dos transiciones que lo
rompen — mirá
[ordenar un set desde una lista de texto](/es/blog/ordenar-un-set-desde-una-lista-de-texto)
para saber qué te da ese camino. Lo que perdés es el chequeo armónico, que necesita
una tonalidad de algún lado.

### ¿Vale la pena llenar los tags a mano?

Para los temas que tocás seguido, sí, y es la hora mejor invertida en mantenimiento de
librería porque la entrada 1 de la lista de arriba no se degrada nunca. Para un set de
una sola vez, no — medí el BPM, aceptá una estimación de energía, y usá el tiempo en
el orden.

### ¿Un tag de tonalidad que falta rompe todo el análisis?

No — saca uno de los cuatro chequeos. La energía, el tempo y la forma del set siguen
siendo legibles, y son los que agarran las dos transiciones que normalmente están mal.
Lo que perdés es el chequeo armónico entre vecinos, y la forma honesta de manejarlo es
pasar los pares de los que dudás por la
[rueda Camelot](/es/herramientas/rueda-camelot) a oído, en vez de fingir que existe un
número.

## Qué hacemos nosotros

Al importar desde archivos podés pedir que lea el BPM real de los que no lo traen, en
tu navegador — el audio no se sube a ningún servidor, sólo viajan los números. Y cada
valor te muestra de dónde salió, así sabés dónde estás parado.

Importá lo que tengas, dejá que el BPM se lea del audio donde los tags están vacíos, y
no esperes a tener la librería prolija — nadie la tiene.
[Analizá el set antes de tocarlo](/es/blog/antes-de-tocar-no-despues) en vez de
después, porque un tag que falta y descubrís preparando es una molestia, y uno que
descubrís en la cabina no.

[Importá tus archivos](https://energycurve.app/es)
