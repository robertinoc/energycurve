# Riesgos técnicos declarados

**Proyecto 4 · Auditoría360 · F2.** Fecha: 2026-09-12.

Para due diligence. La regla de este documento es la que menos gusta escribir:
**un riesgo declarado con su mitigación vale más que un riesgo omitido**, porque
el comprador va a encontrarlo igual y entonces la pregunta deja de ser sobre el
riesgo y pasa a ser sobre por qué no estaba.

Severidad = impacto si ocurre × probabilidad, para un producto vivo que cobra.

---

## R-01 · Bus factor 1 — **Alto**

Una sola persona escribió el producto, y es la única con acceso a Vercel,
Supabase, WorkOS, Stripe y el dominio.

**Impacto:** si no está disponible, nadie puede contestar un DSAR (30 días
corren igual), ejecutar un borrado, notificar una brecha dentro de las 72 horas,
ni desplegar un fix.

**Mitigado en parte:** los procedimientos están escritos y son seguibles por
alguien que no sea el autor (`runbooks/`, `security/incident-response.md`,
`compliance/dsar-procedure.md`), y el RoPA dice dónde vive cada dato por tabla y
columna. La auditoría técnica calificó la mantenibilidad, no la continuidad.

**Sin mitigar:** los accesos. Una tarde de trabajo: acceso de emergencia
delegado en un gestor de contraseñas.

---

## R-02 · Restauración de backups nunca probada — **Alto**

Los backups de Supabase existen por plan. Nadie verificó cuáles, con qué
frecuencia, cuánto se retienen, ni si PITR está habilitado. **La restauración
nunca se ejecutó**, no hay runbook, y no hay RTO ni RPO.

**Impacto:** ante pérdida de datos, el tiempo de recuperación es desconocido y
el resultado también.

**Por qué es alto y no medio:** es la fila que un comprador prueba primero, y un
backup que nadie restauró es una hipótesis. Cuesta una tarde convertirlo en un
control: restaurar a un proyecto descartable, cronometrar, escribir el runbook
con ese número.

---

## R-03 · Supabase es punto único de falla, y ahora doble — **Medio**

Es la base de datos y, desde el limitador distribuido, también el almacén de
límites de tasa. 21 archivos lo tocan.

**Impacto:** si cae, cae todo — y ahora también el mecanismo que protege a lo
que queda en pie.

**Mitigado:** el acoplamiento es deliberado y está detrás de un módulo; cambiar
de proveedor toca `lib/supabase/` y `services/`, no el producto.
`keep-supabase-alive.yml` evita la pausa del plan gratuito, que **ya tumbó
producción una vez** (28/07/2026).

---

## R-04 · Tres controles escritos que no corren — **Medio**

Las cuatro ventanas de retención y el log de auditoría de acciones
administrativas están implementados y probados, y **no se ejecutan**:
`CRON_SECRET` sin setear, migraciones 0027 y 0028 sin aplicar. Verificado contra
la base de dev el 12/09/2026 por PostgREST, no asumido.

**Impacto:** obligaciones de conservación incumplidas, y ninguna trazabilidad de
suspensiones ni borrados.

**Mitigado:** los tres degradan como fueron diseñados —la ruta de cron responde
503 en vez de fallar abierta, y el log emite `admin_audit.write_failed` a nivel
error— así que el estado es detectable, no silencioso.

**Costo de cierre:** siete minutos.

---

## R-05 · Sin pentest ni verificación con cuentas reales — **Medio**

Todo el control de acceso está verificado a nivel de código y de handler, con
defectos inyectados. Nadie probó el sistema corriendo con dos cuentas reales.

**Impacto:** una clase entera de fallo —la que aparece entre capas, en el
navegador, con sesiones de verdad— no fue buscada.

**Mitigado:** `tests/services-tenancy.test.ts`, `tests/access-control.test.ts`,
`tests/backstage-rbac.test.ts` y `tests/object-access-callers.test.ts` cubren la
capa donde vive la autorización, y la regla de semgrep impide que el loader sin
scope crezca callers nuevos.

---

## R-06 · Sin prueba de carga y sin objetivo de carga — **Medio**

No hay número de pico objetivo, así que no hay prueba. Lo único medido es que
`/api/health` tardó hasta **3,57 s** en producción.

**Impacto:** el punto de quiebre se va a descubrir en producción. Y un monitor
de uptime con timeout por debajo de 4 s reporta caídas inexistentes.

---

## R-07 · Deuda concentrada en un componente — **Bajo**

`analysis-workbench.tsx` concentra el estado de una pantalla entera en 1.161
líneas. Registrado en `audit/technical-audit-2026-09.md`.

**Impacto:** es el archivo donde un cambio tiene más chance de romper algo no
relacionado. No afecta a usuarios hoy.

---

## R-08 · Un hallazgo de precisión sin corregir — **Bajo, pero es de producto**

El mapeo universal de energía es **no monótono**: 128 BPM → 7, pero 129 BPM →
6.3. Dos caídas, en 128 y en 135.

**No se corrigió a propósito.** Las constantes del motor están congeladas en
`lib/product/strategy.ts` y el producto está vivo y cobrando: cambiar el scoring
cambia lo que alguien ya pagó. Está documentado en
`qa/findings-f5-precision.md`, y el test que lo encontró ahora **congela las
constantes**, así que editarlas falla.

---

## R-09 · Sin DPAs firmados — **Bajo técnicamente, medio legalmente**

Ocho encargados, ninguno con acuerdo verificado. Ver
`compliance/international-transfers.md`.

---

## Resumen

| | Alto | Medio | Bajo |
|---|---|---|---|
| **Cuántos** | 2 | 4 | 3 |
| **Cuántos cierran con trabajo de Robertino solamente** | 2 | 3 | 1 |

Siete de los nueve se cierran sin escribir código: setear una variable, correr
dos migraciones, probar una restauración, firmar contratos, definir un número, y
crear tres cuentas de prueba. Eso es una propiedad inusualmente buena de esta
lista, y conviene decirla junto con los riesgos: **la mayor parte del riesgo
técnico declarado no requiere rehacer nada.**
