# Hallazgos de F5 — Integridad de datos y precisión

Fase F5 del Plan Integral de Pruebas, ejecutada el 11/09/2026. El método fue
comparar el motor contra un **oráculo independiente**: una reimplementación
escrita desde la especificación, con las constantes transcritas a mano como
literales y la aritmética expresada de otra forma, en `tests/precision-oracle.test.ts`.

Un test que importara las mismas constantes y llamara a los mismos helpers
estaría de acuerdo con la implementación por construcción, y no probaría nada.

Resultado: **el motor coincide con el oráculo en tolerancia cero** a lo largo de
un barrido de 60 a 220 BPM en centésimas, para el mapeo universal y para los doce
géneros. Aparecieron dos cosas que no se sabían.

---

## F5-01 · El mapeo universal no es monótono: un track más rápido puede puntuar más bajo

**Severidad: media. No corregido — requiere decisión de producto.**

Las bandas V1 se solapan en puntaje. La banda 3 (122,01–128) termina en 7 y la
banda 4 (128,01–135) empieza en 6; la banda 4 termina en 8 y la banda 5 empieza
en 7. Cruzar 128 o 135 hace caer la energía un punto entero.

| BPM | Energía |
|---|---|
| 127 | 6,7 |
| **128** | **7,0** |
| **129** | **6,3** |
| 133 | 7,4 |
| **135** | **8,0** |
| **136** | **7,2** |

Para un DJ eso se ve como: aceleraste el set y la app te dice que la energía
bajó. Y como la curva alimenta la detección de problemas y el score, el efecto no
se queda en un número: distorsiona la forma que el producto dice medir.

**Alcance real.** Solo se llega por acá cuando no resuelve ningún género, y eso
hoy pasa únicamente en playlists creadas antes de que el género fuera obligatorio
—filas que los caminos de lectura toleran con `NULL` a propósito (decisión 23)—.
Todo lo creado desde entonces usa el mapeo por género, que sí es monótono: se
verificó para los doce.

**Por qué no lo toqué.** Son constantes congeladas de scoring. `AGENTS.md` es
explícito: el producto está vivo y cobrando, y cambiar el scoring cambia lo que
alguien ya pagó. Un set analizado hace un mes daría otro número.

**Las tres salidas posibles, para que la decisión sea tuya:**

1. **Alinear las bandas** para que el techo de una sea el piso de la siguiente
   (7→7, 8→8). Elimina el salto. Cambia el puntaje de cualquier track entre 128 y
   142 BPM en playlists sin género.
2. **Dejarlo y documentarlo**, ya que el alcance es solo legado. Cuesta cero y el
   test de abajo evita que empeore.
3. **Sacar el camino universal**, exigiendo género también en lectura y
   migrando las filas viejas a un género por defecto. Es el arreglo más limpio y
   el que más toca.

**Lo que sí quedó hecho:** el test fija **exactamente** estas dos caídas, en esos
dos BPM, de ese tamaño. Una tercera discontinuidad, o un cambio en cualquiera de
estas dos, pone el test en rojo.

---

## F5-02 · "Redondeado a un decimal" admitía dos lecturas, y difieren en la mitad de los casos

**Severidad: baja. Resuelto fijando la regla.**

La primera versión del oráculo usaba `toFixed(1)` y discrepaba con el producto en
todos los valores que caen exactamente a mitad de camino: 1,15 · 1,45 · 1,65 ·
1,95. No es un caso raro: sobre la rampa de un género es uno de cada dos BPM.

Ninguno de los dos programas estaba mal. La especificación decía solo "redondeado
a un decimal" y no fijaba el desempate, así que las dos lecturas eran defendibles.
El desacuerdo estaba en la prosa.

Queda fijado: **medios hacia arriba** sobre el valor escalado, que es lo que el
producto ya hacía. El oráculo lo expresa como `floor(x * 10 + 0.5) / 10` para
seguir siendo independiente en vez de llamar a la misma función.

Vale como recordatorio de que un oráculo sirve tanto para encontrar errores de
cálculo como para encontrar huecos en la especificación, y acá encontró lo segundo.

---

## Lo que además quedó blindado

El oráculo no solo compara números: **congela las constantes**. `AGENTS.md` exige
implementar los motores estrictamente contra las constantes de
`lib/product/strategy.ts` y no inventar reglas nuevas. Ahora hay tests que fallan
si alguien edita:

- cualquiera de las cinco bandas universales de BPM,
- el rango de BPM de cualquiera de los doce géneros,
- el ancho de la rampa de borde, el rango 1–10, o los anclajes de banda abierta,
- los pesos del set score, que además tienen que seguir sumando exactamente 1,
- la lista de géneros soportados, para que uno nuevo no pueda shipear sin banda.

Cambiar un puntaje ahora exige dos ediciones deliberadas, no una.

Y tres propiedades que ninguna constante garantiza por sí sola:

- el piso de cada banda de género da exactamente 3, el techo exactamente 9 y el
  medio exactamente 6;
- a una rampa exacta de distancia fuera de la banda se llega a 1 y a 10 exactos;
- todo puntaje tiene un solo decimal, así que un `4.300000000000001` no puede
  llegar a un tooltip.
