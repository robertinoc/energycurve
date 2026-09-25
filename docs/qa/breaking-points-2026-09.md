# Puntos de quiebre — 25/09/2026

Dónde se rompe el producto **por forma y no por volumen**: una consulta sin
paginar, un `select` que trae todo para contar, un bucle que le habla a la base
una vez por ítem.

**Esto no es una prueba de carga.** La prueba de carga está bloqueada porque
falta definir el pico objetivo, y sin ese número produce un gráfico en vez de una
respuesta. Lo de acá se encuentra leyendo el código, y vale igual: un defecto de
forma no espera al pico — aparece con un usuario grande.

**Los silenciosos van primero.** Un error se ve; un truncamiento no. La lista
está ordenada por eso y no por severidad técnica.

## Lo que no está medido, y por qué

Nada de este documento tiene un número de usuarios ni de milisegundos. La base
de dev tiene **1 playlist y 12 temas** (contado el 25/09 con el service-role
client), así que no hay contra qué medir: cualquier tiempo que reportara sería
el de una base vacía, que es peor que no reportar nada.

El único número que sí está confirmado es el techo de filas: `max_rows = 1000`
en `supabase/config.toml`, que es también el valor por omisión de Supabase
hospedado. **No verificado contra el proyecto de dev** — no tengo acceso a su
configuración de API, sólo a los datos.

El ancla real que hay es una pregunta de un DJ alpha: si el producto aguantaría
**30.000 temas**. Todo lo de abajo se lee contra ese número.

---

## 1 · El dashboard trae todos los temas para contarlos — **silencioso**

`services/dashboard-service.ts:51`

```ts
const { data: trackRows } = await supabase
  .from("tracks")
  .select("playlist_id")
  .in("playlist_id", playlistIds)
```

**Qué lo dispara:** abrir el dashboard. Siempre.

**Qué pasa:** trae una fila por cada tema de cada playlist del usuario, para
después contarlas en memoria (`trackCounts`). Con 30.000 temas son 30.000 filas
en cada carga del dashboard — y como no hay `range()`, PostgREST devuelve las
primeras 1.000 **sin decir que hay más**.

**Cómo falla:** en silencio, y de la peor manera posible: los números que muestra
son plausibles. Un DJ con 30.000 temas ve un total que es su librería recortada
a 1.000 y no tiene forma de saberlo. El conteo por playlist también queda mal,
repartido entre las que hayan entrado en esas primeras mil filas.

**La forma correcta ya existe en el repo:** `count: "exact", head: true` por
playlist, o un `group by` — la misma pregunta sin traer el cuerpo. Y si hace
falta traer filas, `fetchAllRows` de `lib/supabase/paginate.ts`.

## 2 · El export de datos personales se trunca — **silencioso, y es de cumplimiento**

`services/data-export-service.ts:120`, y siete consultas más en el mismo archivo
(`playlist_versions` :130, `set_collaborators` :135, `analyses` :140,
`curve_templates` :141, `user_genres` :142, `user_contexts` :143,
`feature_usage` :144, `set_suggestions` :145).

```ts
await supabase.from("tracks").select("*").in("playlist_id", playlistIds)
```

**Qué lo dispara:** que alguien ejerza su derecho de acceso.

**Qué pasa:** ninguna de las nueve consultas pagina. El archivo que se le entrega
al usuario contiene las primeras 1.000 filas de cada tabla.

**Cómo falla:** en silencio **y con una afirmación encima**. Un export de datos
no es una lista cualquiera: se entrega diciendo «estos son todos tus datos». Un
recorte no anunciado ahí no es un bug de rendimiento, es una respuesta incompleta
a un derecho, y el usuario no tiene cómo detectarlo.

**Severidad:** es el primero de la lista que arreglaría. `library-service.ts` ya
muestra exactamente cómo — usa `fetchAllRows` en sus tres consultas.

## 3 · La lista de playlists del dashboard, sin paginar — **silencioso**

`services/dashboard-service.ts:29`

```ts
.from("playlists").select("*, custom_context:…, custom_genre:…", { count: "exact" })
```

Trae `*` de todas las playlists del usuario, con dos joins, sin `range()`. Pide
`count: "exact"`, así que **el total que muestra sí es correcto** — pero la lista
que dibuja se corta en 1.000. El total y la lista pueden contradecirse sin que
nada lo diga.

Menos grave que los dos anteriores porque nadie tiene mil playlists; entra en la
lista porque es la misma omisión y el mismo archivo.

## 4 · Reordenar escribe dos veces por tema, en serie — **ruidoso, pero lento**

`services/playlist-service.ts:842` y `:856`

```ts
for (let index = 0; index < orderedTrackIds.length; index++) {
  await supabase.from("tracks").update({ position: … }).eq("id", …)
}
```

**Qué lo dispara:** aplicar un reordenamiento.

**Qué pasa:** dos fases, cada una con un `update` por tema, esperando cada uno
antes del siguiente. Un set de 100 temas son **200 viajes de ida y vuelta
secuenciales**.

**Por qué son dos fases, y por qué no se toca a la ligera:** la primera estaciona
cada tema en una posición temporal fuera del rango real, y la segunda asigna las
definitivas. Eso existe para no violar la unicidad de `position` a mitad de
camino. Cualquier arreglo tiene que preservar esa propiedad — un `upsert` masivo
la rompe si el motor no ordena las filas como uno espera.

**Cómo falla:** ruidoso. Si algo sale mal, tira `Unable to save the new order.`
y lo registra. El problema no es corrupción sino tiempo, y el tope del producto
—80 temas para sugerir reordenamiento— lo mantiene acotado hoy.

## 5 · La librería global: **arreglado, y sigue arreglado**

`services/library-service.ts:23`, `:46`, `:55`

Las tres consultas pasan por `fetchAllRows` con `range()`. Verificado hoy leyendo
el archivo: playlists, tracks y `playlist_versions` paginan.

`lib/supabase/paginate.ts` trae además el techo que faltaba: `PAGE_SIZE = 1000`
y `MAX_ROWS = 50_000`. Ese segundo número es el que convierte «se truncó en
silencio» en «se truncó y la interfaz lo dice» — la librería tiene copy propio
para el caso (`truncated` en `dashboard-copy.ts`), que nombra el número en vez de
decir «parte de tu librería».

**Contra los 30.000 temas del DJ alpha:** entra, con 30 páginas de mil. Lo que no
está medido es cuánto tarda.

---

## Lo que busqué y no encontré

Vale decirlo, porque una lista que sólo enumera defectos da una impresión falsa.

- **No hay N+1 en ninguna lectura.** Los bucles con `await` adentro de
  `services/` son todos de escritura (`playlist-service.ts`), y los servicios que
  necesitan nombres para varias filas los resuelven con un `Map` armado de una
  sola consulta — `backstage-service.ts:95`, `residency-service.ts:56`.
- **Los servicios de borrado y retención no leen para escribir.** Hacen `update`
  y `delete` con predicados, no traen filas para recorrerlas.
- **El limitador de tasa ya no vive en memoria.** `rate-limit-service.ts` no
  tiene una sola consulta directa: pasa por la función `consume_rate_limit`, que
  es atómica. El riesgo que documentaba la estrategia de pruebas —límite por
  instancia de serverless, reiniciado en cada arranque en frío— **ya está
  cerrado**.

## Lo que este documento no puede contestar

- **Cuánto tarda cada cosa.** Hace falta una base con datos de verdad. El seed
  (`supabase/seed.sql`) crea 3 playlists y 19 temas: sirve para desarrollar, no
  para medir.
- **Dónde está el pico.** Sigue faltando el número objetivo. Con él, los puntos 1
  y 2 dejan de ser «se trunca» y pasan a ser «se trunca a partir de N usuarios
  con M temas», que es una respuesta.
