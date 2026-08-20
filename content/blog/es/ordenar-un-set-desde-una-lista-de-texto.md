---
title: "Ordenar un set cuando sólo tenés una lista de texto"
description: "No hace falta Rekordbox ni Serato para analizar el orden de un set. Con la lista de temas pegada alcanza para empezar."
slug: ordenar-un-set-desde-una-lista-de-texto
locale: es
targetQuery: "ordenar set de DJ sin Rekordbox"
publishedAt: 2026-08-20
---

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

## Y para exportar

Si armaste el set desde una lista de texto y después lo querés en tu software, el
formato que conviene es **M3U8**: si lo guardás junto a la música, relinkea por nombre
de archivo. Los formatos nativos de Rekordbox y Traktor te van a mostrar los temas
como "missing", porque desde una lista de texto no tenemos las rutas reales de tus
archivos.

[Pegá tu lista](https://energycurve.app/es)
