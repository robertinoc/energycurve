# Línea base de rendimiento — septiembre 2026

Fase F4 del *Plan Integral de Pruebas*, en lo que se puede medir hoy. Medido el
11/09/2026 contra el build de producción.

**Esto es una línea base, no un veredicto.** El plan pide "pruebas de carga al
pico objetivo" y **ese pico no está definido en ningún lado**. Sin ese número se
puede decir qué hace el sistema, no si alcanza. Definirlo es una decisión de
producto y queda pendiente.

---

## Cómo se midió

- **Local**: build de producción (`npm run start`), 100 peticiones por ruta para
  los percentiles, y tandas concurrentes para el comportamiento bajo presión.
- **Producción**: solo lectura, sin sesión, **10 peticiones por ruta**. A
  propósito tan poco: las reglas de engagement de esta auditoría prohíben
  generar carga contra producción, así que estos números son una muestra, no una
  medición. Incluyen la latencia de red desde Buenos Aires.

---

## Páginas públicas

Local, build de producción, sin red de por medio:

| Ruta | p50 | p95 | p99 | máx |
|---|---|---|---|---|
| `/` | 1,4 ms | 1,8 ms | 2,9 ms | 4,1 ms |
| `/pricing` | 1,1 ms | 1,3 ms | 1,3 ms | 1,4 ms |

Esos números son de páginas prerenderizadas servidas desde disco, que es
exactamente lo que tienen que ser. **Las doce rutas de marketing siguen siendo
estáticas**, que es la propiedad que el trabajo de SEO protegió cuando se
resolvió el idioma en el cliente en vez de leer el request en el layout raíz.

Bajo concurrencia:

| Ruta | Concurrencia | p50 | p95 | Errores |
|---|---|---|---|---|
| `/` | 20 | 16,2 ms | 21,6 ms | 0 de 200 |
| `/pricing` | 20 | 2,1 ms | 5,7 ms | 0 de 200 |

Veinte peticiones simultáneas multiplican la latencia por diez y la dejan en
dieciséis milisegundos. No hay nada que optimizar acá.

---

## Producción, muestra de 10

| Ruta | p50 | máx |
|---|---|---|
| `/` | 358 ms | 991 ms |
| `/pricing` | 220 ms | 569 ms |
| `/api/health` | 432 ms | **3.574 ms** |

La diferencia con local es red y arranque en frío de Vercel, no la app.

---

## El hallazgo: la sonda de uptime es lo más lento del producto

`/api/health` tarda **284 ms de mediana en local y llegó a 3,57 segundos en
producción**, contra 1-2 ms de cualquier página estática. Dos órdenes de
magnitud.

No es un bug. La sonda hace lo que tiene que hacer: una consulta real a Supabase,
porque una que respondiera 200 sin tocar la base sería decoración. La latencia
**es** el chequeo.

El problema es otro, y es de configuración:

**Un monitor de uptime con timeout por debajo de cuatro segundos va a reportar
caídas que no existen.** Y el costo de eso no es la alerta: es que después de
tres falsas alarmas nadie las mira, y la cuarta es real.

**Qué hacer, en orden:**

1. **Confirmar el timeout del monitor.** Tiene que estar cómodamente por encima
   de cuatro segundos. Si es tres, cambialo.
2. **Confirmar cada cuánto pega.** Cada consulta es un round-trip real a la base.
   Cada 60 segundos está bien; cada 10 es tráfico que no compra nada.
3. No cachear la respuesta. Sería tentador y arruinaría el único chequeo que
   distingue "el sitio responde" de "el producto funciona".

El pico de 3,57 s casi con seguridad es un arranque en frío de una función
serverless, que es inherente a la plataforma. Vale la pena volver a medirlo
después de que el keep-alive de Supabase lleve un tiempo corriendo.

---

## Memoria

43 MB de RSS tras unas 700 peticiones locales, sin crecimiento entre tandas.

No hay evidencia de fuga, **y tampoco hay evidencia de que no la haya**: setecientas
peticiones en unos minutos no es una sesión larga. Un perfilado real necesita
horas de tráfico sostenido, y eso pide el pico objetivo que todavía no existe.

---

## Payload

| Ruta | HTML |
|---|---|
| `/` | 143 KB |
| `/pricing` | 62 KB |
| `/login` | 30 KB |

Chunks de JavaScript: 2,8 MB en total, el más grande 320 KB.

Los 143 KB de la landing son altos para una página de marketing, y buena parte es
el payload RSC de React más el JSON-LD. No es urgente — la página se sirve en
milisegundos — pero es lo primero que miraría si alguna vez importa el tiempo de
carga en una conexión mala, que es exactamente la de un DJ en una cabina.

---

## Lo que esta fase todavía no puede afirmar

- **Si el sistema aguanta su pico**, porque el pico no está definido.
- **Cómo se comporta la ingesta a volumen**, que es el límite conocido: la
  librería global no pagina y trunca en silencio cuando la cantidad de tracks
  crece. Un usuario preguntó si podría manejar 30.000 temas.
- **Nada sobre el producto autenticado**, que es donde está el trabajo real: el
  análisis, el reordenamiento y el export. Necesita las cuentas de prueba.
- **Nada sobre el análisis de audio en el navegador**, que es la operación más
  cara que corre el producto y corre en la máquina del usuario. El arnés de
  `/backstage/audio-spike` mide eso y necesita archivos reales.
