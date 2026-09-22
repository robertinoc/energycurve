---
title: "Ordenar un set cuando sólo tenés una lista de texto"
description: "No hace falta Rekordbox ni Serato para analizar el orden de un set. Con la lista de temas pegada en un cuadro de texto ya alcanza para empezar."
slug: ordenar-un-set-desde-una-lista-de-texto
locale: es
translationOf: order-a-dj-set-from-a-text-list
targetQuery: "ordenar set de DJ sin Rekordbox"
publishedAt: 2026-08-20
updatedAt: 2026-09-22
tags: orden del set, importar, sin librería
---

Una lista de líneas "Artista - Título", una por tema, en el orden en que pensás
tocarlos, alcanza para analizar la forma de un set. Lo que sacás de los nombres solos
es detección de género, una estimación de energía y la curva; lo que no sacás es
mezcla armónica de verdad, porque la tonalidad no está en el nombre del archivo.

Casi todo lo que se escribe sobre preparar sets asume que tenés la librería cargada en
Rekordbox, Serato o Traktor, y que vas a exportar de ahí. Es una suposición razonable
para un DJ con años de librería ordenada, y bastante mala para todos los demás.

Hay mucha gente armando sets en un bloc de notas, en el chat con un amigo o en una
nota del teléfono. Eso también es una lista de temas en un orden, que es todo lo que
hace falta para empezar.

## Qué se puede hacer sólo con los nombres

Con "Artista - Título" por línea ya se puede:

- **Detectar el género** de la mayoría de los temas y anclar el análisis a la banda de
  BPM que le corresponde. Un tema de psy-trance metido en un set de techno se juzga
  con su propia vara, no con la del set.
- **Estimar la energía por posición** cuando no hay otro dato. Es la estimación más
  débil de todas y hay que saberlo, pero da una base.
- **Ver la forma del set** y contrastarla con la que querías: warm-up, peak time,
  after.

Lo que **no** se puede sin datos: mezcla armónica de verdad. La tonalidad no está en
el nombre del archivo.

## Los tres caminos, y qué te da cada uno

| Entrada | BPM | Tonalidad | Energía |
|---|---|---|---|
| Lista de texto pegada | estimado por género | no | estimada por posición |
| Export de Rekordbox / Traktor / M3U8 | del tag | del tag si está | del tag o del BPM |
| Tus archivos de audio | medido del audio | en validación | del BPM + del audio |

Nada de esto es todo o nada. Podés empezar pegando la lista, ver si el análisis te
dice algo útil, y recién después decidir si vale la pena exportar de tu software.

## Cómo se pega

Una línea por tema, en el orden en que pensás tocarlos:

```
Sopik - Call Me Daddy
T78, Van Giessen - Emergency
Sara Landry, LEGZDINA - Pressure
```

Acepta también "Título - Artista" si lo tenés al revés, y limpia los números de orden
si los pegaste desde una lista numerada.

### ¿Y si mi lista tiene tiempos o números de orden?

Pegala igual. Los números iniciales y los marcadores de índice se limpian, así que una
lista copiada de un sitio de tracklists o de la descripción de un set normalmente
entra bien. Lo que la confunde es texto extra en la misma línea — un sello, un número
de catálogo, un "[free download]" —, así que si una línea sale mal, eso es lo primero
que hay que sacar.

### ¿Importa el orden en que la pego?

Es la entrada entera. El análisis es un juicio sobre un orden, así que pegar los temas
alfabéticamente y esperar un veredicto sobre tu set te va a dar un veredicto sobre un
set que nadie va a tocar. Si todavía no tenés un orden, pegá tu mejor intento — un
intento es un set, una lista alfabética no.

### ¿Va a reconocer un tema muy oscuro?

La detección de género trabaja con artista y título contra lo que se sabe de ellos,
así que un white label sin artista, un bootleg con nombre inventado o un tema tuyo
inédito no se van a reconocer — y cuando no se reconoce nada, el análisis cae a
estimar por posición, que es la entrada más débil que hay. Un set hecho mayormente de
material inédito es el caso donde exportar de tu software, con el BPM que ya midió,
vale el paso extra.

## Y para exportar

Si armaste el set desde una lista de texto y después lo querés en tu software, el
formato que conviene es **M3U8**: si lo guardás junto a la música, relinkea por nombre
de archivo. Los formatos nativos de Rekordbox y Traktor te van a mostrar los temas
como "missing", porque desde una lista de texto no tenemos las rutas reales de tus
archivos.

Eso no es un bug que se pueda arreglar de este lado — una ruta es un hecho sobre tu
máquina, y una lista de nombres no la contiene. La
[página de formatos](/es/import-formats) dice qué formato sobrevive a qué ida y
vuelta.

Si al exportar te encontrás con que los tags están vacíos,
[tus temas no tienen BPM ni tonalidad](/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad)
cubre qué se recupera del audio y cuánto confiar. Y si querés los chequeos que está
corriendo el análisis,
[¿está bien el orden de mi set?](/es/blog/esta-bien-el-orden-de-mi-set) los lista.

[Pegá tu lista](https://energycurve.app/es)
