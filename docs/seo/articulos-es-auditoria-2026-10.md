# Los artículos en español planificados en agosto, auditados — 06/10/2026

Lote 18, tarea 7. En `EnergyCurve: 0. Desarrollo` (Asana) quedaban **seis**
tareas de artículos en español abiertas, no cinco: las cinco que nombraba el
pedido más «Cómo ordenar un set de DJ, paso a paso». Cada una se auditó contra
`docs/seo/keyword-map.md` y contra lo que ya está publicado, y lleva uno de tres
veredictos:

- **contestado**, con la página que lo contesta;
- **demanda sin página**, con la consulta que lo pide;
- **criterio editorial**: no hay consulta medida que lo pida. Es una razón
  válida para escribirlo, pero distinta, y se elige sabiendo que es ésa.

Fuente de demanda: la del mapa, que salió del autocompletado de Google en los
pases del 19/09 al 27/09. Si una consulta no aparece ahí, **no se midió**, que
no es lo mismo que «nadie la busca»: el mapa no tiene volumen, sólo presencia.

| Tarea de Asana | Veredicto | Con qué |
|---|---|---|
| **Cómo armar un warm-up** | **Contestado** | `warm up dj set` (2), `warm up dj` (2) y `warm up dj significado` (1) llevan a [`/es/glosario/warm-up`](https://energycurve.app/es/glosario/warm-up); la guía tiene su sección con la curva dibujada ([`/es/guia/curva-de-energia-en-un-set-de-dj`](https://energycurve.app/es/guia/curva-de-energia-en-un-set-de-dj)). Un artículo repetiría las dos |
| **Cómo cerrar un set** | **Demanda sin página → escrito** | `como cerrar un set dj` (1), que el mapa marcaba «sólo glosario»: la entrada dice qué es un cierre y no cómo se arma. Es la única de las seis con demanda medida y sin respuesta. Escrito: [`/es/blog/como-cerrar-un-set-de-dj`](https://energycurve.app/es/blog/como-cerrar-un-set-de-dj) |
| **Narrativa o dramaturgia de un set** | **Criterio editorial** | La tarea nombra `narrativa set dj` y `dramaturgia set dj`; ninguna de las dos apareció en el mapa. No hay consulta medida |
| **Energía no es BPM** | **Criterio editorial, y en parte ya contestado** | La tarea nombra `energía vs bpm dj`; no apareció en el mapa. La idea ya está publicada en la guía (la sección de la escala: una estimación por BPM es la peor de las tres fuentes) y en [`/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad`](https://energycurve.app/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad) |
| **Cómo ordenar un set de DJ, paso a paso** | **Contestado** | `como armar un set de dj` (2) lleva a [`/es/blog/esta-bien-el-orden-de-mi-set`](https://energycurve.app/es/blog/esta-bien-el-orden-de-mi-set). `orden de un set de dj`, la consulta que nombra la tarea, no apareció en el mapa |
| **Ampliar los 5 artículos actuales** | **Hecho a medias, y lo que falta es criterio editorial** | La tarea pedía llevarlos a más de 1.000 palabras («hoy ~500»), con un gráfico y enlaces a la guía. Contadas hoy (cuerpo, sin frontmatter): 866, 990, 1.066, 867 y 964. El largo casi está; **ninguno enlaza a la guía y ninguno tiene un gráfico**. Eso no lo pide ninguna consulta: es enlazado interno y forma |

## Lo que queda para decidir

Las dos de criterio editorial —narrativa y energía vs BPM— y la mitad que falta
de «ampliar» son de Robertino: se escriben si el producto quiere decir eso, no
porque alguien lo esté buscando. Si se escriben, conviene que el mapa lo diga, y
que el próximo pase de consultas (SEO-E03 o un pase de Reddit, que nunca se pudo
hacer desde el contenedor) mire si aparecen.

Las tres tareas de Asana que este documento da por contestadas o escritas
—warm-up, cerrar, ordenar— se pueden cerrar con el enlace de la tabla.

## Cómo se contó

```bash
# palabras del cuerpo de cada artículo, sin el frontmatter
for f in content/blog/es/*.md; do awk 'BEGIN{n=0} /^---$/{n++; next} n>=2' "$f" | wc -w; done
# enlaces a la guía y gráficos en los cinco originales
grep -c '/es/guia' content/blog/es/<slug>.md
```
