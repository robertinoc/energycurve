# Informe ejecutivo — Auditoría 360 de EnergyCurve

**Fecha:** 12 de septiembre de 2026 · **Alcance:** cuatro proyectos — Plan
Integral de Pruebas, Auditoría de Seguridad, Privacy & Compliance, Auditoría360.

---

## En una línea

**EnergyCurve está mejor construido de lo que su operación está preparada para
sostener.** Lo que falta no es arquitectura: son cinco tareas de dashboard, tres
cuentas de prueba y una tarde de backups.

---

## Scorecard

Puntuado con las reglas escritas **antes** de puntuar (`baseline.md` §1), de las
cuales la que más pesa es: *un control escrito y no corriendo no puntúa como
control.*

| Dimensión | Nota | Por qué esa y no una más alta |
|---|---|---|
| **Producto** | **8 / 10** | 28 capabilities `shipped`, dos idiomas, vivo y cobrando. Baja por un hallazgo de precisión conocido y sin corregir (el mapeo de energía es no monótono en 128 y 135 BPM) |
| **Calidad** | **7 / 10** | 1.941 tests, 71,3 % de cobertura, y 40+ defectos inyectados para probar que los tests fallan cuando deben. Baja fuerte porque **ningún test E2E inicia sesión**: todo el producto pago no tiene prueba de punta a punta |
| **Seguridad** | **7 / 10** | Modelo de amenazas, SAST propio bloqueante, headers verificados en vivo, pipeline con integridad. Baja por **no haber pentest** y porque el log de auditoría está escrito y no corre |
| **Privacidad** | **7 / 10** | 11 ✅ de 25 artículos evaluados, RoPA verificado por test, consentimiento que llega al tercero. Baja por **cero DPAs firmados** y por la supresión que no es self-serve |
| **Técnica** | **8 / 10** | Cero ciclos de imports, dependencias en una dirección, cada proveedor detrás de un módulo. Baja por Supabase como punto único de falla doble y por 1.161 líneas concentradas en un componente |
| **Operación** | **4 / 10** | La nota más baja, y la más fácil de subir. Los runbooks existen y fueron probados contra un tercero simulado. **La restauración de backups nunca se ejecutó y nadie más tiene acceso a nada** |

**Promedio: 6,8 / 10.**

La forma del scorecard importa más que el número: cinco dimensiones entre 7 y 8,
y una en 4. No es un producto con problemas repartidos — es un producto sólido
con **un flanco operativo**.

---

## Los cinco hallazgos que vale la pena recordar

De los 11 hallazgos de seguridad, los 5 de privacidad y los 9 riesgos técnicos,
estos cinco son los que cambiaron algo real.

1. **La suspensión era una compuerta de página, no una autorización.** Un usuario
   suspendido no podía *ver* la app, pero su sesión seguía pudiendo escribir.
2. **Un bypass de middleware en Next.js 16.2.3 (CVSS 8.1)**, en el mecanismo que
   protege cada ruta privada. Corregido subiendo a 16.3.4.
3. **`billing_events` guardaba el evento completo de Stripe para siempre** —
   nombre, mail, dirección, país— y **sobrevivía al borrado de la cuenta**.
4. **El retiro del consentimiento no llegaba al tercero.** Paraba nuestras
   llamadas, pero el SDK seguía vivo con sus cookies y el identificador atado a
   una persona que había dicho basta.
5. **El rastro de auditoría de acciones administrativas duraba un día.** Suspender
   y borrar son las dos cosas irreversibles que este producto puede hacerle a un
   cliente, y el único registro era una línea de log.

Los cinco tienen algo en común y conviene decirlo: **ninguno era un agujero
abierto explotable hoy.** Los cinco eran controles que parecían existir y no
existían — que es la clase de fallo que una auditoría encuentra y el uso diario
no.

---

## Lo que esta auditoría no puede afirmar

Repetido acá desde `evidence-index.md` §5 porque un informe ejecutivo que omite
esto es propaganda.

1. Nada se probó contra el sistema corriendo con **cuentas reales**.
2. **No hubo pentest.**
3. **La restauración de backups nunca se ejecutó.**
4. **No se probó bajo carga.**
5. Las **consolas** (Vercel, Supabase, WorkOS) no se auditaron.
6. El plan de respuesta a incidentes **nunca se ensayó**.
7. **Cinco controles están escritos y no corren.**

Y una más, estructural: **buena parte de este código y de este dossier los
produjo el mismo agente.** Lo que lo compensa es la verificación por inyección —
incluidos los **dos casos de 40 en que el test pasó igual** porque el defecto
estaba en el instrumento. Están publicados en vez de omitidos. La revisión
adversarial (`adversarial-review.md`) ataca esto y otras ocho cosas desde el lado
del comprador.

---

## Plan único de remediación

Unificado de los cuatro proyectos, ordenado por **relación esfuerzo / resultado**
y no por severidad.

### Ahora — 15 minutos en total

| # | Qué | Cierra | Dueño |
|---|---|---|---|
| 1 | `CRON_SECRET` en Vercel | Cuatro ventanas de retención pasan de escritas a corriendo | Robertino |
| 2 | Migraciones **0027** y **0028** | Log de auditoría + barrido de análisis | Robertino |
| 3 | `BACKSTAGE_ADMIN_EMAILS` en Vercel | Saca el fallback hardcodeado como único control de acceso al panel | Robertino |
| 4 | Confirmar la región de Supabase | La política puede volver a afirmarla | Robertino |

**Estos cuatro convierten seis controles escritos en seis funcionando.** Es el
mejor cuarto de hora disponible en todo el plan.

### Esta semana

| # | Qué | Cierra | Dueño |
|---|---|---|---|
| 5 | **Tres cuentas de prueba** (FREE, PRO, PRO+) | Desbloquea **13 tareas**: todo el E2E autenticado y todo el pentest interno | Robertino crea · yo ejecuto |
| 6 | Probar una restauración de backup, cronometrada | La brecha más seria del Art. 32, y RTO/RPO salen del mismo número | Robertino |
| 7 | Acceso de emergencia delegado | Bus factor 1 | Robertino |
| 8 | Definir el pico objetivo de carga | Desbloquea las 2 tareas de carga | Robertino define · yo ejecuto |

### Este mes

| # | Qué | Cierra | Dueño |
|---|---|---|---|
| 9 | Firmar/verificar los ocho DPAs | Art. 28 | Robertino |
| 10 | `report-uri` en la CSP, hacia Sentry | Convierte una política decorativa en evidencia para endurecerla | yo |
| 11 | Monitor de uptime con timeout > 4 s | `/api/health` llegó a 3,57 s | Robertino |
| 12 | Decidir: supresión self-serve | Art. 17 | Robertino decide · yo implemento |
| 13 | Decidir: link público opt-in con revocación | Art. 25 | Robertino |
| 14 | Resolver el subdominio de backstage: atarlo o sacarlo | Complejidad sin ejercitar | Robertino |

### Cuando haya presupuesto

| # | Qué | Por qué |
|---|---|---|
| 15 | **Pentest externo**, una semana | Es lo único que responde al sesgo de auto-auditoría |
| 16 | Revisión semestral de lo que no vive en el repo | Sin fecha, "regularmente" es "una vez" |

---

## Recomendación final

**El producto es apto para seguir operando y para mostrar en una conversación de
due diligence**, con una condición: que los cuatro ítems de "Ahora" estén hechos
antes de mostrarlo. No por cosmética — porque *"tenemos retención de datos"*
frente a una tabla que dice ⬜ es la clase de detalle que le cuesta a un
comprador la confianza en todo lo demás.

Tres observaciones para cerrar, en orden de importancia:

**El riesgo dominante no es técnico.** Es que una sola persona tiene todos los
accesos y nadie probó nunca que los backups se puedan restaurar. Si mañana pasa
algo, lo que falla no es el código.

**Lo que está bien, está inusualmente bien.** Cero ciclos de dependencias, cada
proveedor tras un módulo, invariantes del propio codebase hechas cumplir por
reglas de SAST, documentos de compliance con tests que fallan cuando el documento
miente. Eso no es habitual en un producto de una persona, y es lo que hace
creíble al resto.

**Y lo más útil que produjo esta auditoría no es una lista de hallazgos sino un
método.** Cinco veces un documento afirmó algo que no era cierto — migraciones
aplicadas, un encargado inexistente, una región no confirmada, un lanzamiento
pendiente, una CSP que reportaba. Las tres primeras se encontraron **midiendo**,
no releyendo. Los tests que ahora custodian esos documentos no los vuelven
verdaderos, pero convierten una clase entera de mentira —afirmar que existe algo
que no existe— en un build rojo.

Y dos veces esos tests pasaron igual, con el defecto en el instrumento. Eso
también está publicado. **Un dossier que muestra dónde falló su propio método es
más creíble que uno que no tiene fallos que mostrar.**
