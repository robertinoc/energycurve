# EnergyCurve — informe ejecutivo de auditoría

> **Auditoría 360, fase F7.** 12 de septiembre de 2026.
>
> Consolida cuatro proyectos —Pruebas, Seguridad, Privacidad y Auditoría 360— en
> un estado, un plan y una recomendación. Escrito para leerse entero por alguien
> no técnico: si hace falta traducción para entender en qué estado está el
> producto, el informe falló.
>
> **Emitido con dos dimensiones incompletas, a pedido.** Están marcadas como
> incompletas donde corresponde en vez de disimuladas. Ver *Qué no se auditó*.

---

## La conclusión, en un párrafo

EnergyCurve es un producto **terminado, en producción y con usuarios reales**,
construido con una disciplina de ingeniería poco común para un proyecto de una
sola persona. La auditoría no encontró ninguna vulnerabilidad explotable, ninguna
dependencia con licencia problemática y ningún defecto que impida vender. Lo que
encontró son **seis tareas de configuración pendientes que no requieren
programar**, una decisión de producto sin tomar, y un riesgo estructural que no
se arregla con código: **todo el conocimiento vive en una persona**.

---

## Scorecard

| Dimensión | Estado | Base |
|---|---|---|
| **Seguridad de la aplicación** | 🟢 | Sin IDOR, sin inyección, sin exposición de datos. OWASP recorrido entero |
| **Privacidad y cumplimiento** | 🟡 | RoPA completo y verificable por test; falta el borrado self-serve (Art. 17) y los DPAs |
| **Calidad y tests** | 🟢 | 1.941 tests, 71% de cobertura, CI con cinco gates |
| **Arquitectura** | 🟢 | Cero ciclos, capas en una dirección, cada proveedor aislado |
| **Licencias y propiedad intelectual** | 🟡 | Ni una GPL/AGPL en el árbol; falta declarar el titular del copyright |
| **Observabilidad** | 🟡 | Reporte de errores instalado; **la alerta no está creada** |
| **Operabilidad por un tercero** | 🟡 | Documentación y runbooks completos; el traspaso nunca se simuló |
| **Producto y UX** | ⬜ | **No auditado** — requiere un DJ recorriendo el producto |
| **Escalabilidad bajo carga** | ⬜ | **No auditado** — requiere pruebas de carga |

**189 de 243 tareas cerradas (78%).**

| Proyecto | Cerradas | Qué queda |
|---|---|---|
| 0 · Desarrollo | 39/50 | Mediciones por oído, cuentas, partnership |
| 1 · Pruebas | 40/48 | E2E autenticados y pruebas de carga |
| 2 · Seguridad | 43/54 | Consolas cloud y un pentest externo |
| 3 · Privacidad | 42/47 | Borrado self-serve y DPAs |
| 4 · Auditoría 360 | 25/44 | Producto/UX, data room, este informe |

---

## Lo que la auditoría encontró de valor

Cuatro hallazgos que un comprador debería conocer, porque los cuatro estaban
rotos en producción y ninguno había sido reportado por nadie:

1. **El ordenamiento con IA nunca funcionó.** La función pedía 55 segundos y la
   plataforma la cortaba a los 10-15. Todas las peticiones caían al método de
   respaldo. Se supo porque un usuario lo mencionó de pasada, semanas después.
2. **El límite de uso no limitaba.** Contaba en la memoria de cada servidor, así
   que "tres por hora" era "tres por servidor, hasta que el servidor se apaga".
3. **La librería truncaba en silencio.** Con más de mil temas devolvía los
   primeros mil y los mostraba como si fueran todos.
4. **Una tarjeta rechazada bajaba de plan al instante** a un cliente que paga,
   mientras tres lugares del código decían lo contrario.

Los cuatro están corregidos. **Lo que importa no es la lista sino el patrón que
revela:** eran fallas silenciosas, de las que no rompen nada visiblemente. Por
eso la recomendación número uno de este informe es la alerta de errores, que
cuesta una tarde y convierte "nos enteramos cuando un usuario lo menciona" en
"nos enteramos en una hora".

---

## Plan único de remediación

Todo lo que queda, en un solo lugar, ordenado por lo que destraba.

### Ahora — configuración, sin programar (≈ 1 hora en total)

| # | Qué | Por qué | Cuánto |
|---|---|---|---|
| 1 | `CRON_SECRET` en Vercel | Cuatro políticas de borrado de datos escritas y **ninguna corriendo** | 2 min |
| 2 | DSN de Sentry + la alerta | Hoy nada avisa cuando algo se rompe | 30 min |
| 3 | API key de GetSongBPM | Hay una feature entera mergeada y apagada | 10 min |
| 4 | Descripción de PRO+ en Stripe | Verificar que no prometa edición simultánea | 5 min |
| 5 | Esperar al CI antes de desplegar | Hoy un merge con tests en rojo llega igual a producción | 15 min |
| 6 | Google Search Console | Compuerta de la medición de posicionamiento | 15 min |

### Después — decisiones que bloquean código

| # | Qué | Qué hay que decidir |
|---|---|---|
| 7 | **Borrado de cuenta self-serve** | Fricción, período de gracia, y qué pasa con las facturas de Stripe (hay obligaciones contables que compiten con la supresión) |
| 8 | **Titular del copyright** | Si es persona física o sociedad. Primera pregunta de una diligencia de IP |
| 9 | **DPAs con los encargados** | Nueve proveedores, todas las transferencias fuera de la UE |

### Con esfuerzo — lo que cierra las dos dimensiones vacías

| # | Qué | Quién |
|---|---|---|
| 10 | Recorrido de producto con un DJ real | Un DJ, media tarde |
| 11 | Pruebas de carga al pico objetivo | Trabajo técnico |
| 12 | Traspaso simulado y revisión adversarial | **Alguien que no construyó esto** |
| 13 | Pentest externo | Proveedor pago |

### Cuando haya datos

Las mediciones por oído (tonalidad, energía), el ajuste del modelo v3, la matriz
de planes con uso real, y el partnership con Beatport.

---

## Recomendación final

**El producto está listo para vender y no está listo para venderse.**

Listo para **vender**: funciona, es seguro, tiene usuarios pagando, y la calidad
del código está por encima de lo que su tamaño haría esperar.

No listo para **venderse** —una adquisición— por tres cosas concretas, ninguna
cara:

1. **Nadie más puede operarlo.** No por falta de documentación, que es buena y
   abundante, sino porque nunca se probó que alcance. El traspaso simulado es la
   prueba, y cuesta una tarde de alguien externo.
2. **No está declarado quién es el dueño del código.** Es la primera pregunta de
   cualquier diligencia y hoy el repositorio no la contesta.
3. **Dos dimensiones sin auditar**, producto/UX y escalabilidad, que son
   exactamente las dos que un comprador va a querer ver medidas.

Los puntos 1 y 2 se cierran esta semana. El 3 necesita un DJ y unas pruebas de
carga.

### Lo que haría en las próximas dos semanas

**Semana 1:** las seis de configuración, y la pregunta del copyright a un
abogado. Ambas cosas son de calendario, no de esfuerzo.

**Semana 2:** el recorrido con un DJ y el traspaso simulado. Los dos necesitan a
alguien que no seas vos, y los dos cierran un casillero vacío del scorecard.

**Después:** el borrado self-serve, que es la única obligación legal pendiente
con trabajo de programación detrás.

---

## Qué no se auditó, y por qué importa decirlo

- **Producto y UX.** Requiere un DJ usando el producto para una tarea real. Un
  recorrido hecho por quien lo construyó no encuentra fricción: ya sabe dónde
  hay que hacer clic.
- **Escalabilidad bajo carga.** No se hicieron pruebas de carga ni de estrés.
  Sabemos dónde están los cuellos de botella por lectura del código, no por
  medición.
- **La restauración de un backup.** Supabase los hace. Que se puedan restaurar
  es una suposición hasta que alguien lo intente.
- **Un pentest externo.** Lo que hay es una auditoría de código y configuración
  hecha desde adentro, que encuentra otra clase de cosas que un atacante.

Ninguna de las cuatro es un hallazgo negativo. Son casilleros vacíos, y un
casillero vacío declarado vale más en una diligencia que uno lleno de optimismo.

---

## Una nota sobre la confiabilidad de este informe

Estas auditorías las ejecutó el mismo asistente que escribió gran parte del
código, lo cual es un conflicto de interés que conviene nombrar en vez de
esperar que no se note.

Dos cosas lo compensan parcialmente, y ninguna del todo. **Los hallazgos vienen
con su evidencia** — archivo y línea, o el comando que reproduce el número — así
que se pueden verificar sin confiar en quien los escribió. Y **varios de los
hallazgos son errores propios**: el limitador que no limitaba, una afirmación
falsa sobre retención en el registro de tratamientos, una violación de capas
introducida el mismo día que se escribió la regla, y un test marcado como
verificado que en realidad no se había corrido.

Aun así, **la revisión adversarial sigue pendiente y no debería hacerla quien
escribió esto.** Es la tarea 12 del plan.
