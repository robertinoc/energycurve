# Índice de evidencia

**Proyecto 4 · Auditoría360 · F0.** Fecha: 2026-09-12.

Todo lo que produjeron los tres proyectos anteriores, en un solo lugar, con qué
contesta cada pieza y **qué no contesta**. La segunda columna es la que importa:
un data room castiga más a un documento que promete de más que a uno que falta.

`tests/evidence-index.test.ts` verifica que cada archivo listado exista. Un
índice que apunta a un documento borrado es peor que no tener índice.

---

## 1. Calidad (Proyecto 1)

| Documento | Contesta | No contesta |
|---|---|---|
| `qa/test-strategy.md` | Qué se prueba, con qué umbrales, y por qué esos | Nada sobre carga: falta el pico objetivo |
| `qa/quality-report-2026-09.md` | Métricas reales con evidencia enlazada | — |
| `qa/findings-f5-precision.md` | Precisión del motor contra un oráculo independiente | Incluye un hallazgo **no corregido**: el mapeo universal de energía es no monótono (128 BPM → 7, 129 → 6.3) |
| `qa/performance-baseline-2026-09.md` | Tiempos medidos, incluido `/api/health` hasta 3,57 s en producción | Rendimiento bajo carga |
| `qa/ux-edge-cases.md` | Estados vacíos y de error, derivados del código | Cinco casos que necesitan cuentas de prueba |
| `qa/artifacts-handoff.md` | Qué puede reusar cada auditoría como ya verificado | — |

## 2. Seguridad (Proyecto 2)

| Documento | Contesta | No contesta |
|---|---|---|
| `security/threat-model.md` | STRIDE sobre las superficies reales | — |
| `security/findings-2026-09.md` | Hallazgos con severidad y estado | — |
| `security/rbac-matrix.md` | Privilegios por superficie × 3 niveles | Trae su propia sección de lo NO verificado: todo está probado a nivel handler con sesión simulada |
| `security/alerting.md` | Qué vigilar, con umbrales | Dice que **no hay alertas corriendo** |
| `security/incident-response.md` + `security/breach-notification-template.md` | Arts. 33 y 34 | **Nunca se ensayaron** |
| `security/sbom/energycurve-sbom.cdx.json` | CycloneDX reproducible | — |

## 3. Privacidad (Proyecto 3)

| Documento | Contesta | No contesta |
|---|---|---|
| `compliance/ropa.md` | Art. 30, verificado por test contra las migraciones | — |
| `compliance/privacy-by-design.md` | Minimización, defaults, retención | El link público sigue activo por defecto: decisión pendiente |
| `compliance/international-transfers.md` | Mapa de transferencias y TIA | **Todos los mecanismos sin verificar** |
| `compliance/dsar-procedure.md` | Plazos y verificación de identidad | — |
| `compliance/governance.md` | Arts. 35 y 37, razonados | — |
| `compliance/gap-assessment.md` | Matriz de cumplimiento y plan | No es una opinión legal |
| `compliance/security-measures.md` | Art. 32, con test de existencia de la evidencia | **La restauración de backups nunca se ejecutó** · *llega con el PR #212* |

## 4. Técnico

| Documento | Contesta | No contesta |
|---|---|---|
| `audit/technical-audit-2026-09.md` | Deuda técnica, observabilidad, mantenibilidad, bus factor | — |
| `audit/architecture-review-2026-09.md` | Capas, acoplamiento, puntos únicos de falla | Rendimiento bajo carga, arquitectura del front, consolas |
| `runbooks/deploy-and-rollback.md` | Cómo se despliega y cómo se vuelve atrás | Restauración de backup: **no existe** |

---

## 5. El índice de lo que NO se probó, en un solo lugar

Disperso en secciones de límites a lo largo de doce documentos, y por eso
repetido acá: es lo primero que un comprador escéptico va a buscar.

1. **Nada se probó contra el sistema corriendo con cuentas reales.** Todo el
   control de acceso está verificado a nivel de código y de handler.
2. **No hubo pentest.** Ni de aplicación ni de infraestructura.
3. **La restauración de backups nunca se ejecutó.** Ni se sabe si PITR está
   habilitado.
4. **No se probó bajo carga.** Falta definir el pico objetivo.
5. **Las consolas no se auditaron**: permisos de Vercel, región y plan de
   Supabase, MFA de WorkOS. No se ven desde el repo.
6. **El plan de respuesta a incidentes nunca se ensayó** con gente.
7. **Tres controles están escritos y no corren**: las cuatro ventanas de
   retención y el log de auditoría, por `CRON_SECRET` sin setear y las
   migraciones 0027 y 0028 sin aplicar — verificado contra la base de dev el
   12/09/2026, no asumido.
