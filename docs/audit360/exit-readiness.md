# Checklist de exit readiness

**Proyecto 4 · Auditoría360 · F6.** Fecha: 2026-09-12.

Qué haría falta para que una due diligence técnica no se frene. Estado real, sin
verde de cortesía.

**Leyenda:** ✅ listo · ⚠️ existe con reservas · ❌ falta · ⬜ depende de una
acción del dueño

---

## 1. Código y propiedad intelectual

| | Ítem | Estado |
|---|---|---|
| 1.1 | Un solo repositorio, historial completo, 481 commits | ✅ |
| 1.2 | Sin GPL / AGPL / SSPL | ✅ verificado contra el árbol instalado |
| 1.3 | SBOM CycloneDX reproducible | ✅ |
| 1.4 | Un paquete LGPL transitivo, analizado y acotado | ⚠️ documentado, no es asesoramiento legal |
| 1.5 | Licencia propia declarada en `package.json` | ✅ corregido en el PR #215 |
| 1.6 | Sin secretos en el historial | ✅ verificado con grep sobre todo el historial |

## 2. Calidad demostrable

| | Ítem | Estado |
|---|---|---|
| 2.1 | Suite de tests que corre en CI y bloquea el merge | ✅ 1.909 unitarios |
| 2.2 | Cobertura medida con pisos que sólo suben | ✅ 71,29 % |
| 2.3 | Cobertura de la capa de propiedad de datos | ⚠️ piso 8 %; las dos rutas explotables sí tienen suites dedicadas |
| 2.4 | E2E autenticado | ❌ **ninguno**: 256 E2E, cero con sesión |
| 2.5 | Verificación por inyección de defectos | ✅ 40+, con los 2 fallos publicados |
| 2.6 | Prueba de carga | ❌ falta definir el pico objetivo |

## 3. Seguridad

| | Ítem | Estado |
|---|---|---|
| 3.1 | Modelo de amenazas | ✅ STRIDE sobre superficies reales |
| 3.2 | SAST propio, bloqueante en CI | ✅ 6 reglas, cada una verificada contra una violación |
| 3.3 | Headers de seguridad en producción | ✅ verificado en vivo |
| 3.4 | CSP | ⚠️ Report-Only **sin recolección de violaciones** |
| 3.5 | Pipeline de build con integridad | ✅ actions pinneadas a SHA, permisos mínimos |
| 3.6 | Pentest externo | ❌ **no se hizo** |
| 3.7 | Log de acciones administrativas | ⬜ implementado, **no corre** (migración 0027) |
| 3.8 | Alertas activas | ⚠️ Sentry desde el PR #209; el catálogo de umbrales sin conectar |

## 4. Privacidad y cumplimiento

| | Ítem | Estado |
|---|---|---|
| 4.1 | RoPA (Art. 30), verificado por test | ✅ |
| 4.2 | Política con base legal, plazos y derechos | ✅ EN/ES |
| 4.3 | Lista pública de sub-encargados | ✅ atada al código por test |
| 4.4 | Consentimiento opt-in, revocable, que llega al tercero | ✅ verificado en vivo |
| 4.5 | Portabilidad self-serve | ✅ |
| 4.6 | Supresión self-serve | ❌ sólo como acción de admin |
| 4.7 | DPAs firmados | ⬜ **ninguno de los ocho** |
| 4.8 | Retención automática | ⬜ cuatro ventanas escritas, **ninguna corre** |

## 5. Operación y continuidad

| | Ítem | Estado |
|---|---|---|
| 5.1 | Runbooks de despliegue, rollback, incidentes y operación | ✅ probados contra un tercero simulado |
| 5.2 | Topología de entornos documentada, con los refs reales | ✅ corregido en el PR #213 |
| 5.3 | Backups: contenido, retención y PITR confirmados | ❌ |
| 5.4 | **Restauración probada y cronometrada** | ❌ **nunca** |
| 5.5 | RTO / RPO definidos | ❌ |
| 5.6 | Monitor de uptime | ⬜ con timeout > 4 s |
| 5.7 | Acceso delegado de emergencia | ❌ **bus factor 1** |

## 6. Negocio

| | Ítem | Estado |
|---|---|---|
| 6.1 | Cobros funcionando, con webhooks verificados por firma e idempotencia | ✅ |
| 6.2 | Gating de planes en el límite real, con registro | ✅ `docs/plan-gating.md` |
| 6.3 | Métricas de producto instrumentadas | ⚠️ los eventos se emiten; los dashboards no están armados |
| 6.4 | Base de usuarios | ⚠️ alpha |

---

## Resumen

| | ✅ | ⚠️ | ❌ | ⬜ |
|---|---|---|---|---|
| **Ítems** | 17 | 7 | 8 | 4 |

### Los ocho ❌, y qué los cierra

| # | Qué falta | Cómo se cierra | Cuánto |
|---|---|---|---|
| 2.4 | E2E autenticado | tres cuentas de prueba | desbloquea 13 tareas |
| 2.6 | Prueba de carga | definir el pico objetivo | una decisión |
| 3.6 | Pentest externo | contratarlo | una semana |
| 4.6 | Supresión self-serve | decisión de producto + ~1 día | |
| 5.3 | Backups confirmados | mirar el dashboard | 10 min |
| 5.4 | Restauración probada | restaurar a un proyecto descartable | 1 tarde |
| 5.5 | RTO / RPO | sale del número de 5.4 | 10 min |
| 5.7 | Acceso delegado | gestor de contraseñas | 1 tarde |

**Cinco de los ocho se cierran sin escribir una línea de código, y tres de esos
cinco en menos de una hora.** Eso es lo que distingue esta lista de la de un
producto con problemas estructurales: lo que falta es trabajo de operación
pendiente, no arquitectura por rehacer.

Los tres que sí cuestan —pentest, E2E autenticado, supresión self-serve— están
declarados desde el primer documento de esta auditoría, no aparecieron acá.
