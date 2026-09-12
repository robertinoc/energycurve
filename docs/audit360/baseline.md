# Línea base y criterios de la auditoría 360

**Proyecto 4 · Auditoría360 · F0.** Fecha: 2026-09-12.

---

## 1. Dimensiones y criterios

Seis dimensiones, y cada una con un criterio que se puede **medir o verificar**,
no estimar. Un scorecard cuyas notas salen de una impresión no sobrevive a que
alguien pregunte "¿cómo llegaste a ese 7?".

| # | Dimensión | Criterio de evaluación | De dónde sale la nota |
|---|---|---|---|
| 1 | **Producto** | Cada capability marcada `shipped` funciona | `lib/product/capabilities.ts` vs recorrido funcional |
| 2 | **Calidad** | Cobertura con pisos, mutación, y tests que pueden fallar | Cobertura medida + defectos inyectados detectados |
| 3 | **Seguridad** | Hallazgos abiertos por severidad, y controles verificados por inyección | `security/findings-2026-09.md` |
| 4 | **Privacidad** | Artículos en ✅/⚠️/❌ sobre el total evaluado | `compliance/gap-assessment.md` |
| 5 | **Técnica** | Deuda registrada, acoplamiento, puntos únicos de falla | Los dos documentos de `audit/` |
| 6 | **Operación** | Runbooks que un tercero puede seguir, y backups probados | `runbooks/` + F5 de este proyecto |

**Regla de puntuación, escrita antes de puntuar** para que la nota no se acomode
al resultado que uno quiere:

- **Un control escrito y no corriendo no puntúa como control.** Cuenta como
  documentación, que vale, pero no como protección.
- **Una verificación que no se hizo no se promedia:** baja la nota de su
  dimensión, no se omite.
- **Un hallazgo conocido y declarado pesa menos que uno desconocido.** Declarar
  es parte del control.

---

## 2. Línea base numérica

Medido el 12/09/2026 sobre `main`. Son los números contra los que se compara
cualquier afirmación de mejora posterior.

### Código

| Métrica | Valor |
|---|---|
| Archivos fuente (`app`, `lib`, `services`, `components`, `types`) | 325 |
| Líneas de código fuente | 58.548 |
| Líneas de test | 24.742 |
| Relación test / fuente | **0,42** |
| Migraciones | 29 |
| Dependencias | 23 producción · 13 desarrollo |
| Commits | 481 (13/04/2026 → 12/09/2026) |

Una relación test/fuente de 0,42 es alta para un producto de una persona. No
dice que los tests sean buenos —eso lo dice la mutación, abajo— pero descarta
que la suite sea decorativa.

### Pruebas

| Métrica | Valor |
|---|---|
| Tests unitarios | **1.858** en 133 archivos |
| Tests E2E | 256 (64 × 4 navegadores) |
| Cobertura · sentencias | **71,29 %** |
| Cobertura · ramas | 68,47 % |
| Cobertura · funciones | 78,05 % |
| Defectos inyectados durante la auditoría | **40+**, todos detectados salvo 2 |

Los dos que no se detectaron son el dato más útil de esta tabla, y los dos
tenían el defecto **en el instrumento**: un regex que leía una palabra dentro de
un comentario en vez de la configuración, y un canario que medía el archivo en
lugar del documento que el archivo produce. Sin inyectar, los dos controles se
habrían reportado como funcionando.

### Producto

| Métrica | Valor |
|---|---|
| Capabilities `shipped` | 28 |
| Capabilities `planned` | 7 |
| Idiomas soportados | 2 (EN / ES) |

### Auditoría

| Métrica | Valor |
|---|---|
| Documentos producidos | 52 archivos markdown · 9.106 líneas |
| Reglas SAST propias | 6, cada una verificada contra una violación |
| Hallazgos de seguridad registrados | 11 |

---

## 3. Cómo se reproduce esta línea base

Sin esto, la tabla de arriba es una captura que nadie puede volver a tomar.

```bash
npm ci
npx vitest run --coverage          # tests y cobertura
npx playwright test --list         # conteo de E2E
find app lib services components types \( -name "*.ts" -o -name "*.tsx" \) | wc -l
```

---

## 4. Lo que esta línea base no mide

- **Nada de rendimiento bajo carga.** No hay número porque no hay pico objetivo
  definido.
- **Nada del comportamiento en producción** más allá de las mediciones pasivas
  de `qa/performance-baseline-2026-09.md`.
- **La cobertura no distingue un test que verifica de uno que ejecuta.** El 71 %
  es una cota superior de lo verificado, no una medida de ello; los defectos
  inyectados son lo que convierte ese número en evidencia.
