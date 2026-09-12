# Revisión adversarial del dossier

**Proyecto 4 · Auditoría360 · F6.** Fecha: 2026-09-12.

El ejercicio: leer los 25 documentos de esta auditoría **como un comprador que
quiere bajar el precio**, y atacarlos. No buscar errores de redacción — buscar
los lugares donde el dossier afirma más de lo que sostiene.

Cada ataque abajo es el que yo usaría. La respuesta está al lado, y cuando la
respuesta es "tiene razón", dice eso.

---

## A-1 · "La auditoría la hizo quien escribió el código"

**El ataque.** Buena parte de este código y prácticamente todo este dossier los
produjo el mismo agente, en las mismas sesiones. Una auditoría interna hecha por
el autor tiene un sesgo estructural: uno no busca con ganas los errores en la
parte de la que está orgulloso.

**La respuesta, que no lo niega.** Es cierto y no tiene defensa retórica. Lo
único que lo compensa es el método: **más de 40 defectos inyectados**
deliberadamente para comprobar que los controles fallan cuando deben.

Y el argumento más fuerte es justamente el que peor queda: **dos de esos 40 no
se detectaron**, y las dos veces el defecto estaba en el instrumento, no en el
código — un regex que leía una palabra dentro de un comentario, y un canario que
medía el archivo en vez del documento que el archivo produce. Un auditor que
oculta su sesgo no publica sus dos fallos; están en `baseline.md` §2 porque son
la prueba de que el método detecta al auditor, no sólo al código.

**Lo que sigue siendo verdad:** nada reemplaza a un tercero. Si esto va a un
data room real, un pentest externo de una semana vale más que cualquier párrafo
de este documento.

---

## A-2 · "Cobertura 71 %, pero la capa que hace cumplir la propiedad de los datos está al 8 %"

**El ataque.** El titular dice 71,29 %. El piso declarado para `services/**` —
donde cada función recibe un `profileId` y filtra por él, y donde `AGENTS.md`
dice explícitamente que RLS no va a atrapar un olvido— es **8 %**. Ese es el
número que importa, y es el más bajo del proyecto.

**La respuesta: tiene razón, con un matiz que igual no lo salva del todo.** El
8 % es un **piso**, no la cobertura real, y está puesto bajo a propósito para que
el número se vea en lugar de no existir. Las dos funciones donde un fallo de
propiedad sería explotable —`playlist-service` y `collaboration-service`— tienen
suites dedicadas escritas desde el lado del atacante
(`services-tenancy.test.ts`, `access-control.test.ts`), verificadas por mutación:
sacar el filtro de propietario pone 9 tests en rojo.

**Lo que no está cubierto** son las otras funciones de servicio, y el argumento
honesto no es "están bien" sino "el riesgo está concentrado y la parte
concentrada está probada". Un comprador puede no aceptarlo, y no estaría
equivocado.

---

## A-3 · "256 tests E2E y ninguno inicia sesión"

**El ataque.** El suite E2E corre en cuatro navegadores y no autentica nunca. Lo
más cerca que llega es un test llamado "the login wall" que verifica que te
**redirigen** al login. O sea: todo el producto pago —importar, analizar,
reordenar, exportar, colaborar— no tiene una sola prueba de punta a punta.

**La respuesta: tiene razón, y es el agujero más grande del plan de pruebas.**
Está declarado en `qa/test-strategy.md` y es la razón por la que 13 tareas de
Asana siguen abiertas. El bloqueante es real —hacen falta tres cuentas de prueba
que sólo el dueño puede crear— pero un bloqueante explicado sigue siendo un
agujero.

Lo que sí existe: 1.909 tests unitarios, los parsers cubiertos al 93 %, el motor
al 94 %, y los handlers de API probados con la sesión simulada. Eso cubre la
lógica. **No cubre el stack completo**, y nadie debería leer "1.909 tests" como
si lo hiciera.

---

## A-4 · "RLS habilitada sin políticas es teatro"

**El ataque.** El dossier presenta "RLS en todas las tablas" como control. Pero
todas las consultas usan la service-role key, que **ignora RLS**. O sea que el
control no protege nada de lo que realmente pasa.

**La respuesta: el ataque describe bien el mecanismo y saca la conclusión
equivocada.** La decisión 22 dice exactamente esto: RLS habilitada con cero
políticas es *default-deny* para `anon` y `authenticated`, y la frontera real es
la capa de servicios. Hoy no existe ninguna anon key en el código, así que no hay
nada que RLS pueda atrapar — y ese es el punto: existe para que **el día que
alguien introduzca un cliente en el browser**, ninguna tabla sea la excepción.

Es un control para un futuro, declarado como tal. Lo que lo hace defendible y no
teatro es que `tests/migrations.test.ts` falla si una tabla nueva nace sin él —
que es precisamente lo que pasó tres veces antes de que existiera el test.

---

## A-5 · "Hay un bug conocido en el motor y decidieron no arreglarlo"

**El ataque.** El mapeo de energía es no monótono: 128 BPM da 7, 129 BPM da 6.3.
Está documentado y sin corregir. El producto vende análisis de energía.

**La respuesta, que es la más incómoda del dossier.** Es cierto. No se corrigió
porque las constantes del motor están congeladas y el producto **está vivo y
cobrando**: cambiar el scoring cambia el resultado que alguien ya pagó, y en
sets ya armados.

Lo que sí se hizo: se encontró con un oráculo independiente escrito desde la
especificación, se documentó con los dos puntos exactos (128 y 135), y el test
que lo encontró ahora **congela las constantes**, así que ya no se puede editar
por accidente.

**Un comprador puede legítimamente decir que eso es deuda de producto, no de
ingeniería, y descontarla.** La defensa no es que no importe: es que se conoce,
se midió y se decidió, en vez de descubrirse después.

---

## A-6 · "Cinco de sus controles no están corriendo"

**El ataque.** Las cuatro ventanas de retención y el log de auditoría están
implementados, probados y **no se ejecutan**: falta una variable de entorno y
dos migraciones. El dossier igual los lista como medidas del Art. 32.

**La respuesta: tiene razón a medias, y la mitad que tiene es la que duele.** El
dossier no los presenta como corriendo: `baseline.md` establece como regla de
puntuación que **un control escrito y no corriendo no puntúa como control**, y
la matriz los marca ⬜, no ✅.

Pero el ataque acierta en algo peor: **llevan días señalados y cuestan siete
minutos.** Que no se hayan hecho no es un problema técnico, y un comprador lo va
a leer como una señal sobre la operación, no sobre el código.

---

## A-7 · "Bus factor 1, y ni siquiera hay acceso delegado"

**El ataque.** Una persona. Sin acceso compartido a Vercel, Supabase, WorkOS,
Stripe ni al dominio. Si le pasa algo, el producto no se puede operar, ni
desplegar, ni cumplir un plazo legal.

**La respuesta: tiene razón, sin matices.** Es el riesgo R-01 y está declarado
como alto. Lo único que lo atenúa es que la *documentación* de continuidad sí
existe y fue probada contra un tercero simulado (`audit/f5-operability-2026-09.md`),
así que el conocimiento no es el cuello de botella: **los accesos lo son**, y
eso cuesta una tarde.

---

## A-8 · "No hay pentest, ni prueba de carga, ni restauración de backup probada"

**El ataque.** Tres verificaciones estándar, ninguna hecha.

**La respuesta: correcto, y está en la portada.** La sección 5 del
`evidence-index.md` las lista primero, junto con otras cuatro. La decisión
consciente fue **no** dejar que un lector las descubriera por su cuenta.

De las tres, la que más pesa es la restauración: las otras dos miden qué tan
bien resiste el sistema, la restauración mide si el negocio sobrevive a perder
la base.

---

## A-9 · "Cuarenta mutaciones sobre 58.000 líneas no es verificación sistemática"

**El ataque.** La inyección de defectos es el argumento central de credibilidad
del dossier, y son ~40 casos elegidos a mano. No es mutation testing: es
anecdótico.

**La respuesta: tiene razón en la etiqueta y no en la conclusión.** No es
mutation testing sistemático y el dossier no debería llamarlo así. Es
**verificación dirigida**: cada mutación ataca la invariante que un test
específico dice proteger, en el código donde un fallo tiene consecuencia real —
propiedad de datos, firma de webhooks, consentimiento, retención.

Cuarenta mutaciones dirigidas a los controles que importan dicen más que diez mil
aleatorias sobre código de presentación. Pero la crítica a la etiqueta es justa,
y por eso `baseline.md` los llama "defectos inyectados" y no "mutation testing".

---

## Qué haría yo si estuviera comprando

Las tres preguntas que haría, en orden, y que este dossier **no** puede
responder solo:

1. **"Mostrame una restauración de backup, cronometrada."** Es la única que
   distingue un producto operable de uno que funciona.
2. **"Dame dos cuentas y déjame intentar leer el set de la otra."** Es la única
   verificación de aislamiento que no depende de creerle a un test.
3. **"¿Quién más puede desplegar esto mañana?"**

Las tres están declaradas como abiertas. Que un dossier anticipe las preguntas
que no puede contestar es lo máximo que puede hacer un dossier; contestarlas
requiere hacer el trabajo.
