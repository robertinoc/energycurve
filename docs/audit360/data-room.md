# Data room

**Proyecto 4 · Auditoría360 · F6.** Fecha: 2026-09-12.

Organizado por **la pregunta que hace un comprador**, no por la fase que produjo
cada documento. El índice por fase está en
[`evidence-index.md`](evidence-index.md); éste es la puerta de entrada.

Regla de este documento: **cada pregunta se contesta, incluidas las que se
contestan mal.** Una carpeta de due diligence sin respuestas incómodas se lee
como incompleta, no como limpia.

---

## "¿Qué es y qué vende?"

| | |
|---|---|
| Producto | Analizador de la curva de energía de un set de DJ |
| Operador | StageLink LLC (EE.UU.) |
| Modelo | B2C por suscripción, precios en USD, checkout alojado por Stripe |
| Planes | FREE · PRO · PRO+ — exportación nativa gratis en todos los niveles, siempre |
| Idiomas | Inglés y español |
| Estado | **Vivo, desplegado y cobrando.** Usuarios alpha |
| Capabilities | 28 `shipped`, 7 `planned` — `lib/product/capabilities.ts` |

Dirección de producto: [`product-strategy-v2.md`](../product-strategy-v2.md) ·
Estado por área: [`roadmap-status.md`](../roadmap-status.md)

## "¿Cómo está construido?"

| | |
|---|---|
| Stack | Next.js 16 (App Router), React 19, TypeScript estricto |
| Datos | Supabase Postgres — 29 migraciones versionadas |
| Identidad | WorkOS AuthKit |
| Pagos | Stripe Checkout + webhooks |
| Hosting | Vercel |
| Tamaño | 325 archivos fuente · 58.548 líneas · 481 commits desde 13/04/2026 |

Arquitectura y acoplamiento: [`../audit/architecture-review-2026-09.md`](../audit/architecture-review-2026-09.md)
Deuda y mantenibilidad: [`../audit/technical-audit-2026-09.md`](../audit/technical-audit-2026-09.md)

## "¿Funciona, y cómo lo saben?"

| | |
|---|---|
| Tests unitarios | 1.909 en 134 archivos |
| E2E | 256 (64 × 4 navegadores) — **ninguno autenticado** |
| Cobertura | 71,29 % sentencias · pisos por carpeta que sólo suben |
| Verificación por inyección | 40+ defectos, 2 no detectados (los dos en el instrumento) |

Estrategia y umbrales: [`../qa/test-strategy.md`](../qa/test-strategy.md) ·
Reporte: [`../qa/quality-report-2026-09.md`](../qa/quality-report-2026-09.md) ·
Precisión del motor: [`../qa/findings-f5-precision.md`](../qa/findings-f5-precision.md)

## "¿Es seguro?"

Modelo de amenazas: [`../security/threat-model.md`](../security/threat-model.md) ·
Hallazgos: [`../security/findings-2026-09.md`](../security/findings-2026-09.md) ·
Privilegios: [`../security/rbac-matrix.md`](../security/rbac-matrix.md) ·
SBOM: [`../security/sbom/`](../security/sbom/)

**Sin pentest externo.** Todo el control de acceso está verificado a nivel de
código y de handler, no contra el sistema corriendo con cuentas reales.

## "¿Cumple con privacidad?"

Registro de tratamientos: [`../compliance/ropa.md`](../compliance/ropa.md) ·
Matriz de cumplimiento: [`../compliance/gap-assessment.md`](../compliance/gap-assessment.md) ·
Medidas del Art. 32: [`../compliance/security-measures.md`](../compliance/security-measures.md) ·
Transferencias: [`../compliance/international-transfers.md`](../compliance/international-transfers.md)

GDPR como marco base. **11 ✅ · 8 ⚠️ · 2 ❌ · 4 ⬜.** Sin DPAs firmados.

## "¿De quién es el código, y qué licencias arrastra?"

[`../audit/f6-ip-licences-risks-2026-09.md`](../audit/f6-ip-licences-risks-2026-09.md)

Sin GPL, AGPL ni SSPL. Un único paquete LGPL, transitivo, binario nativo de
macOS, enlazado dinámicamente — y las obligaciones de la LGPL se disparan con la
distribución, no con operar un SaaS.

## "¿Alguien más puede operarlo?"

Operación: [`../runbooks/operations.md`](../runbooks/operations.md) ·
Despliegue y rollback: [`../runbooks/deploy-and-rollback.md`](../runbooks/deploy-and-rollback.md) ·
Incidentes: [`../security/incident-response.md`](../security/incident-response.md) ·
Traspaso simulado: [`../audit/f5-operability-2026-09.md`](../audit/f5-operability-2026-09.md)

**La documentación de continuidad existe y fue probada. Los accesos no están
compartidos.** Bus factor 1.

## "¿Qué está roto o pendiente?"

Riesgos técnicos: [`technical-risks.md`](technical-risks.md) ·
Gaps residuales: `f4-consolidation-2026-09.md` §4 — *llega con el PR #216* ·
Lo que nunca se probó: [`evidence-index.md`](evidence-index.md) §5

## "¿Qué le criticarían ustedes a este dossier?"

[`adversarial-review.md`](adversarial-review.md) — nueve ataques escritos desde
el lado del comprador, con la respuesta al lado, incluidas las cinco donde la
respuesta empieza con "tiene razón".

---

## Las tres preguntas que este data room no puede contestar

Están acá arriba y no al final, a propósito.

1. **Una restauración de backup, cronometrada.** Nunca se ejecutó.
2. **Dos cuentas reales intentando leerse entre sí.** Nunca se hizo.
3. **Quién más puede desplegar esto mañana.** Hoy, nadie.

Las tres se cierran con trabajo, no con documentación. Ninguna requiere
reescribir código.
