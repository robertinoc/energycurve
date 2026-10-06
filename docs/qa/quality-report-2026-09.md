# Reporte de calidad — EnergyCurve

**Actualizado el 06/10/2026 (lote 18).** La sección de abajo es el estado de
hoy. El reporte de septiembre sigue entero más abajo, sin tocar, porque sus
números son los de esa fecha y compararlos es parte de lo que este reporte dice.

Base: `main` @ `b375896` más la rama `plans/lote-18`. Cada número de esta
sección salió de un comando el 06/10 y el comando está al lado.

---

## Octubre 2026: el riesgo cambió de lugar

**En septiembre el riesgo era la cobertura**: el producto detrás del login no
tenía E2E, quince de dieciséis servicios no tenían tests y nadie sabía cuánto
aguantaba. **Hoy el riesgo es el comportamiento con volumen y contra la
plataforma real.** La cobertura subió, el producto autenticado tiene E2E, y la
carga se midió — y medirla encontró defectos que ningún test con tres filas iba
a ver: un export de datos personales que entregaba **cero temas** a partir de
~400 playlists, conteos que daban 0 a partir de 1.000 temas, un reordenamiento
que trababa el set para siempre. El mismo par de defectos —leer una sola página
de 1.000 filas, o meter más de ~350 ids en una URL— apareció en ocho lugares en
el lote 17, encontrados de a uno, y en **catorce lecturas más** en el barrido
sistemático del lote 18 (contadas en el diff de `99ddef2`). Todas arregladas, todas con un test que falla sin el arreglo, **ninguna
verificada en producción**.

Y una cosa nueva, la más urgente de este reporte: **la versión de Next.js
instalada tiene una vulnerabilidad crítica publicada** (abajo).

### Números de hoy

| Métrica | Septiembre (11/09) | Hoy (06/10) | Comando |
|---|---|---|---|
| Tests unitarios | 1.496 en 101 archivos | **2.864 en 168** | `npx vitest run --coverage` |
| Cobertura de sentencias | 67,5% | **76,9%** | ídem, `coverage/coverage-summary.json` |
| Cobertura de ramas | 65,8% | **73,3%** | ídem |
| Cobertura de `services/` (sentencias) | 8,3% | **54,3%** | ídem, sumado por carpeta |
| Cobertura de `app/api/` (sentencias) | 43,6% | **61,0%** | ídem |
| Tests E2E | 192, cuatro navegadores, sin login | **ver «La suite E2E» abajo** | `npm run test:e2e` |
| Vulnerabilidades de dependencias | 18 (0 críticas) | **47 (2 críticas, 30 altas)**; sólo producción: **27 (2 críticas, 16 altas)** | `npm audit --json`, `npm audit --omit=dev --json` |
| Servicios (`services/*.ts`) | 17 | 27 | `ls services/*.ts` |
| Filas del banco de pruebas manuales | — | 116 desde el #279, que automatizó 30 (+ 6 del lote 18, sin integrar) | `docs/qa/banco-de-pruebas.html` |

La duplicación de código (0,69% en septiembre) **no se volvió a medir**.

### Lo más urgente: Next.js 16.3.4 tiene una ejecución remota de código crítica

`npm audit` la publica como **GHSA-vcvr-r3jv-pc5j**, «Remote Code Execution in
next/og ImageResponse», para `next` desde 16.2.0 hasta antes de 16.3.6. El
lockfile instala **16.3.4** (`require('next/package.json').version`) y el sitio
usa `ImageResponse` en `app/social-card.tsx`, las tarjetas sociales de los
artículos. Hay versiones corregidas publicadas (16.3.6, 16.3.7 y 16.3.8 en
`npm view next@16 version`). **No se arregló en este lote**: subir el framework
pide su propio PR y su propia verificación completa, y quedó anotado para
hacerse aparte y deployarse rápido.

La otra crítica, **GHSA-jqcg-44mw-7w3h** en `proxy-addr`, llega sólo a través de
`@lhci/cli` (Lighthouse CI), una herramienta de desarrollo que no corre en
producción.

### Implementado contra verificado

Dos columnas, porque este proyecto ya se equivocó tratándolas como una.
«Verificado» acá quiere decir **en producción o por una persona**, no «el test
pasa».

| Qué | Implementado | Verificado |
|---|---|---|
| Los cinco puntos de quiebre (export, dashboard, lista, `listPlaylists`, reordenar) | Sí, lote 17, con tests en rojo sin el arreglo | Contra **dev** al volumen en que fallaban; **en producción no** (banco L17) |
| Las nueve lecturas del barrido del lote 18 | Sí, con tests en rojo sin el arreglo | No |
| El export de datos en streaming (tope de 4,5 MB de Vercel) | Sí | **No se puede verificar fuera de producción** (L17.1) |
| La sugerencia de orden memorizada (H-23, la mitad sin decisión) | Sí | Contra dev, carga local |
| Hallazgos de la tanda 01 | 10 implementados en espera de «Validar fix», 2 cerrados | Los 10 esperan una corrida del banco contra el deploy |
| H-17, la IP en PostHog | La mitad de código | El ajuste de PostHog es de Robertino; sin él la promesa publicada no está respaldada |

### El pico objetivo (50 usuarios, 30 análisis/h, 2 s)

**No se cumple en un proceso local, y contra Vercel no se midió.** Lo que se sabe,
de `docs/qa/carga-2026-10.md`:

- Con 10 usuarios y la mezcla de cuatro páginas, el dashboard daba p95 de
  11–15 s según la corrida, con la CPU al 90–94 %.
- El 89 % de esa CPU era la sugerencia de orden de la página de análisis
  (H-23). Memorizarla (lote 18) bajó el p95 del dashboard a **1,4 s** con 10
  usuarios. **Es el mejor caso**: los diez pedían el mismo set, así que la
  sugerencia se calculó una sola vez. La primera vista de cada set sigue
  costando el cálculo entero.
- Sacar la sugerencia del render es lo que movería el caso general, y es una
  decisión de producto pendiente.

### La suite E2E

La autenticada existe desde el 25/09 y cubre importar en cuatro formatos,
exportar en cinco, la curva, el pago con `stripe listen` y el plan FREE. Corre
en cinco shards. Su número de hoy está en el traspaso, sección del lote 18.

### El backlog de septiembre, hoy

| # | Qué | Hoy |
|---|---|---|
| F5-01 | Mapeo universal no monótono | **Abierto**. Constantes congeladas; sigue siendo decisión de producto |
| F2-01 | El orden con IA cae al heurístico sin que nadie se entere | **A medias**: desde H-10 el usuario ve por qué cayó; no hay alerta si la proporción se da vuelta. La cuenta de Anthropic sigue sin crédito (H-9), así que hoy cae siempre |
| F4-01 | Limitador de tasa en memoria | **Cerrado**: `services/rate-limit-service.ts` usa la función `consume_rate_limit` de Postgres |
| F4-02 | `--ec-text-dim` mide 3,81:1 | **Abierto**: el token sigue en `#6e6788`; 3,81:1 sobre el fondo, calculado hoy |
| F0-01 | Migración 0021 sin aplicar en dev | **Cerrado**: el 02/10 dev tenía las 32 (`scripts/seed-scale.mjs status`) |
| F2-02 | `isTrustedOrigin` acepta pedidos sin cabeceras | **Abierto**: `lib/http/trusted-origin.ts` sigue devolviendo `true` sin `Origin` ni `Referer` |
| F1-01 | No hay formatter | **Abierto**: no hay configuración de Prettier en el repo |

### Lo que este reporte NO puede afirmar, hoy

- **Que algo de los lotes 16 a 18 funcione en producción.** Está mergeado y
  testeado; verificado contra el deploy, no.
- **Que el pico se cumpla en Vercel.** Se midió un proceso en una Mac.
- **Que el export de una librería grande pase el tope de 4,5 MB de Vercel.**
- **Que las migraciones de producción estén completas.** Nunca se preguntó con
  `db:status` contra producción.
- **Que un backup se pueda restaurar**, ni cuánto tarda.
- **La tonalidad desde el audio** sigue en `planned` y el Energy Model v3 sin
  ajustar: los dos esperan una sesión de etiquetado por oído.
- **Una corrida limpia de axe cubre cerca de un tercio de las barreras reales**;
  el teclado y el lector de pantalla siguen siendo manuales.

---

# Septiembre 2026 (11/09), tal como se escribió

Cierre del *Plan Integral de Pruebas*. Está escrito para que alguien de afuera
entienda en qué estado está el producto **sin explicación adicional**, que es la
prueba que el propio plan pone en F7.

Base: `main` @ `d45ec1d` más la rama `claude/qa-plan-2026-09`. Fecha: 11/09/2026.

---

## Veredicto en una línea

El motor que calcula la curva está bien probado y ahora además está verificado
contra un cálculo independiente. Lo que estaba sin probar era todo lo que lo
rodea: la capa que decide de quién es cada dato, las rutas HTTP, y el producto
entero detrás del login. Dos de esas tres se cerraron en esta ronda.

---

## Números

| Métrica | Al empezar | Ahora |
|---|---|---|
| Tests unitarios | 1.410 en 94 archivos | **1.496 en 101** |
| Tests E2E | 27, un navegador | **192, cuatro navegadores** |
| Cobertura de sentencias | 63,1% | **67,5%** |
| Cobertura de ramas | 62,1% | **65,8%** |
| Cobertura de `services/` | **0%** | 8,3% |
| Cobertura de `app/api/` | **0%** | 43,6% |
| Duplicación de código | sin medir | **0,69%** |
| Vulnerabilidades de dependencias | 22 (1 crítica) | **18 (0 críticas)** |
| Gates de CI | 5 | 7 |

La cobertura es baja en términos absolutos y eso es correcto que se vea. Los dos
números que importan no son el global sino los dos que estaban en cero: la capa
de servicios, donde se decide de quién es cada playlist, y las rutas HTTP, donde
se verifica la firma de los pagos.

Los umbrales quedaron fijados **un punto por debajo de lo medido**, por carpeta.
Un umbral aspiracional que falla el día que se instala se borra al día siguiente.

---

## Lo que se encontró

Ordenado por lo que costaría si nadie lo hubiera mirado.

### 1. El E2E local venía probando otra rama

`reuseExistingServer` reutilizaba cualquier servidor en el puerto 3010. Ese día
había un `next dev` de otro worktree, así que la suite corrió contra otra rama y
en modo desarrollo, cuando su propia configuración insiste en el build de
producción. Reportó cuatro fallos que no existían.

Un fallo así entrena a re-correr en vez de a mirar, que es exactamente lo que esa
misma configuración dice querer evitar cuando fija cero reintentos. Ahora siempre
levanta su propio servidor.

### 2. Next.js 16.2.3 tenía un bypass del middleware, en el mecanismo que protege todas las rutas privadas

CVSS 8,1 por inyección en parámetros de ruta dinámica, más otro de 7,5 por rutas
de segment-prefetch. La protección de rutas de este producto **es** `proxy.ts`, y
hay un test dedicado a probar que toda ruta privada está cubierta por él. Un
bypass ahí es un bypass de autenticación, no una hipótesis.

En la misma lista venían SSRF en server actions (CVSS 8,6), que es por donde pasa
casi toda escritura del producto, y una ejecución remota de código crítica en la
API de optimización de imágenes.

Se subió a 16.3.4, que no es un salto mayor, y se verificó contra toda la suite
en vez de darlo por bueno.

### 3. El parser de XML tenía una expansión de entidades, en el camino de import

`fast-xml-parser` 5.9.3: declaraciones DOCTYPE repetidas reinician el límite de
expansión de entidades. Es el parser detrás de los imports de Rekordbox y
Traktor, que corren **en el servidor, dentro de un server action**, sobre
documentos de hasta 12 MB y sin guarda propia de profundidad.

La revisión de F2 ya había marcado eso como riesgo de CPU y memoria suponiendo
que la librería no resuelve entidades externas. El aviso dice que el límite
interno se puede reiniciar con un documento preparado. Mismo camino, ahora con un
bypass publicado. Subido a 5.11.1.

### 4. El mapeo universal de energía no es monótono

Un track a 128 BPM puntúa 7 y uno a 129 puntúa 6,3. Para un DJ eso se lee como:
aceleraste el set y la app te dice que la energía bajó. Hay dos saltos así, en
128 y en 135, de un punto entero cada uno.

Solo se llega por ahí en playlists sin género declarado, que son las creadas antes
de que el género fuera obligatorio. **No corregido**: son constantes congeladas de
scoring, y cambiarlas cambia el puntaje de sets que ya se analizaron y se pagaron.
Las tres salidas posibles están en `docs/qa/findings-f5-precision.md`.

### 5. La tabla de precios no se podía recorrer con el teclado, solo en móvil

El plan completo es una tabla ancha en un contenedor con scroll horizontal. En un
teléfono, la única forma de llegar a la columna PRO+ era arrastrarla, lo que deja
afuera a cualquiera que no use un puntero.

Es el argumento entero a favor de correr más de un navegador, en un solo
hallazgo: en Chrome de escritorio la tabla entra y nunca scrollea, así que ahí es
invisible.

### 6. Tres páginas no tenían ningún encabezado principal

Recuperar contraseña, cambiarla y verificar el mail son una tarjeta sola en una
pantalla vacía, y nada respondía "qué página es esta" para alguien que navega por
encabezados.

### 7. Contraste por debajo de AA en las páginas legales y el blog

3,73:1 medido, contra el 4,5:1 que pide AA para ese tamaño de texto.

### 8. La especificación decía "redondeado a un decimal" sin fijar el desempate

Dos lecturas razonables discrepan en todos los valores que caen exactamente a
mitad de camino, que sobre una rampa de género es uno de cada dos BPM. Quedó
fijado. Un oráculo sirve para encontrar huecos en la especificación tanto como
errores de cálculo, y acá encontró lo segundo.

---

## Cómo sé que los tests sirven

Un test que pasa contra código roto es peor que no tener test. A cada suite nueva
se le inyectó el bug que dice prevenir.

| Bug inyectado | Tests en rojo |
|---|---|
| Sacar el filtro de dueño en `getOwnedPlaylist` | 7 de 16 |
| Anular la idempotencia del webhook de Stripe | 1 de 6 |
| Reconstruir el export en vez de devolver la entrada del usuario (el P0) | 7 de 63 |
| Aceptar un precio mandado por el cliente en el checkout | 1 de 10 |
| Devolver 422 en vez de 404 ante un set ajeno | 2 de 8 |
| Devolver 200 en `/api/health` con la base caída | 3 de 6 |
| Desactivar el honeypot del formulario de contacto | 1 de 10 |

Ninguna sobrevivió sin detección.

**Y en dos de los siete casos, el primer intento pasó por la razón equivocada.**
El defecto estaba en la herramienta de medición, no en el producto: al Supabase
falso le faltaba un método, así que una función moría con una excepción que el
manejo de errores del servicio se tragaba, y "no se escribió la fila" parecía un
rechazo cuando era un crash. Y no aplicaba unicidad de clave primaria, así que el
test de idempotencia no medía nada. Es exactamente lo que este paso existe para
encontrar.

---

## Backlog de defectos abiertos

| # | Severidad | Qué | Por qué sigue abierto |
|---|---|---|---|
| F5-01 | Media | Mapeo universal no monótono | Constantes congeladas; cambiarlo cambia puntajes ya pagados. Decisión de producto. |
| F2-01 | Media | El ordenamiento con IA puede caer al heurístico sin que nadie se entere | No lo arregla un test: necesita telemetría y una alerta si la proporción se da vuelta. |
| F4-01 | Media | El limitador de tasa vive en memoria del proceso | En serverless el límite es por instancia y se reinicia en frío. Necesita almacenamiento compartido. |
| F4-02 | Media | El token `--ec-text-dim` mide 3,81:1 | Falla AA y se usa en toda la app autenticada. Cambiarlo es decisión de diseño. |
| F0-01 | Media | La migración 0021 no está aplicada en dev | La corre Robertino a mano, por convención del proyecto. |
| F2-02 | Baja | `isTrustedOrigin` acepta pedidos sin cabeceras | Endurecerlo rechazaría clientes legítimos que no son navegadores. Decisión de producto. |
| F1-01 | Baja | No hay formatter | Formatear todo el repo sería un diff enorme y chocaría con los PRs en paralelo. |

---

## Lo que este reporte NO puede afirmar

Dicho explícitamente, porque un reporte de calidad que no declara sus huecos es
peor que ninguno.

- **Todo el producto detrás del login sigue sin E2E.** El import, el análisis, los
  arreglos, el export, el pago, Gig Mode, la colaboración y el borrado de cuenta
  se prueban a mano, contra dos planillas de 89 y 118 filas. Hace falta un juego
  de cuentas de prueba en dev.
- **Dieciséis de los diecisiete servicios siguen sin tests.** Se cubrió
  `playlist-service`, que es el que concentra el riesgo de aislamiento de datos.
- **No hay pruebas de carga ni un pico objetivo definido.** No se puede afirmar
  nada sobre cuánto aguanta.
- **La verificación del lado de Traktor del fix P0 no está hecha.** Solo Traktor
  puede decir qué hace Traktor al importar.
- **La detección de tonalidad desde el audio está en 21% de acierto** y el Energy
  Model v3 sigue sin ajustar. Las dos dependen de una sesión de etiquetado por
  oído que tiene que hacer una persona.
- **Una corrida limpia de axe cubre cerca de un tercio de las barreras reales.**
  El teclado y el lector de pantalla siguen siendo manuales.
