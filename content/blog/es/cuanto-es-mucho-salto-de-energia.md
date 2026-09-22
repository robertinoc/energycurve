---
title: "¿Cuánto es mucho salto de energía entre dos temas?"
description: "Las reglas del tipo 'no pases del 8% de BPM' sirven poco cuando el problema no es el tempo. Cómo mirar los saltos de energía de tu propia lista."
slug: cuanto-es-mucho-salto-de-energia
locale: es
translationOf: how-much-energy-jump-is-too-much-dj
targetQuery: "salto de energía entre tracks DJ"
publishedAt: 2026-08-20
updatedAt: 2026-09-22
tags: curva de energía, transiciones, BPM
---

En una escala de energía del 1 al 10, un salto de más de **dos puntos hacia arriba**
se escucha y de más de tres se siente como un corte. Hacia abajo el margen es más
chico todavía, porque bajar la pista es fácil y volver a subirla no. El tempo tiene su
propio límite —pasado el 6-8% se empieza a oír el pitch— pero el tempo casi nunca es
el salto que arruinó la transición.

La regla que más se repite es "no cambies más de 6 u 8% de BPM entre dos temas". Es
una regla útil y también es incompleta, porque el salto que arruina una transición
muchas veces no es de tempo.

Dos temas a 150 BPM exactos pueden sonar como un choque si uno es un roller
minimalista y el otro entra con el kick al frente y todo el espectro lleno. El pulso
calza; la sensación no.

## Los tres saltos que importan

**El de tempo.** El más conocido y el más fácil de medir. Con pitch se arregla hasta
cierto punto; pasado el 6-8% se empieza a escuchar.

**El de energía.** Cuánto más intenso se siente un tema que el anterior. Acá no hay
una unidad estándar, y por eso conviene ponerle una: del 1 al 10, un salto de más de
**dos puntos** hacia arriba se nota, y de más de tres se siente como un corte. Hacia
abajo el margen es más chico todavía, porque bajar la pista es fácil y volver a
subirla no.

**El armónico.** Tonalidades incompatibles suenan mal aunque el resto encaje. Acá
conviene desconfiar de la regla corta que se repite en todos lados — quedate en la
misma, en la relativa, o movete una posición —, porque deja afuera un montón de
mezclas que funcionan. Qué se lleva bien con una tonalidad concreta te lo dice la
rueda Camelot, que trabaja con una tabla de transiciones bastante más ancha que
esa regla: [abrila con tu tonalidad](/es/herramientas/rueda-camelot) y fijate qué
ofrece de verdad.

## Qué se siente con cada tamaño de salto

| Salto de energía | En la pista | Cuándo está bien |
|---|---|---|
| 0 a ±1 | No pasa nada, y está bien para una o dos transiciones | Dentro de una meseta que estás sosteniendo a propósito |
| +2 | Una subida que la gente siente sin levantar la vista | El caballito de batalla. La mayoría de una subida son éstos |
| +3 o más | Un cambio de marcha; se dan vuelta las cabezas | Una o dos veces por set, y sólo con un tema que lo pueda sostener |
| −2 | Aire para respirar | Después de un pico, cuando el tema que sigue usa el espacio |
| −3 o más | La pista se ralea | Casi nunca a mitad de set; así se entrega mal un warm-up |

La fila que se ignora es la primera. **Demasiadas transiciones planas seguidas también
es un defecto** — un set que nunca se mueve más de un punto no es contenido, es un set
que no va a ningún lado, y cuesta mucho más notarlo que un sacudón porque nunca suena
nada mal.

## Por qué las reglas generales no alcanzan

El problema de "no pases del 8%" es que es una regla sobre transiciones en abstracto,
y vos no tenés transiciones en abstracto: tenés veinticinco temas en un orden
concreto, y probablemente dos o tres transiciones puntuales que son las que están
mal. Las otras veintidós están bien y no necesitan que las revises.

Lo que falta no es la regla. Es que alguien te señale **cuáles** de tus transiciones
la rompen.

## Cómo revisarlo a mano

Si querés hacerlo sin herramientas: armá una tabla con tres columnas — tema, BPM,
energía del 1 al 10. Calculá la diferencia entre cada fila y la siguiente. Marcá todo
lo que salte más de dos puntos de energía o más del 8% de BPM.

Vas a terminar con dos o tres filas marcadas. Esas son las que hay que mirar. Casi
siempre se arreglan moviendo un solo tema.

### ¿La regla del 8% de BPM se sostiene?

Como techo, más o menos. Lo que esconde es que el mismo 8% se nota mucho más en una
voz que en un tema de batería, porque el corrimiento de pitch cae sobre algo cuya
afinación tu oído conoce. Si el tema que sale tiene una voz reconocible, tratá el 4%
como el límite práctico y usá el rango completo en los instrumentales.

### ¿Una bajada grande puede estar bien?

Sí, y es uno de los movimientos más fuertes que hay — pero sólo cuando lo que sigue se
la gana. Un −3 hacia un tema que reconstruye en los dos minutos siguientes se lee como
deliberado. El mismo −3 hacia algo que también se queda en 5 se lee como un error, y
la pista lo trata como tal.

### ¿Y si mis temas no tienen ningún valor de energía?

Entonces se los ponés vos, y tus propios números son el mejor dato disponible. Si no,
la energía se puede estimar del BPM y de propiedades del audio, pero es una estimación
— mirá [qué hacer si tus tags están vacíos](/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad)
para saber qué se recupera y cuánto confiar en cada fuente.

## Lo que automatizamos

EnergyCurve hace ese cálculo por vos y marca los saltos en la curva, con el
movimiento concreto para cada uno: "mandá el tema 7 a la posición 3" y cuánto sube el
score si lo hacés. También te avisa lo contrario, que se ve menos: demasiadas
transiciones planas seguidas, que es un set que no va a ningún lado.

Si no estás seguro de que tu software escriba un valor de energía,
[tags de energía](/es/energy-tags) explica cómo lo guarda cada uno de Rekordbox,
Serato y Traktor.

[Ver los saltos de tu set](https://energycurve.app/es)
