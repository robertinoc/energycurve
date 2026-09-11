# Governance, DPIA y políticas internas

**Proyecto 3 · Privacy & Compliance · F6.** Fecha: 2026-09-11.

Este documento existe para contestar cuatro preguntas que un data room hace
siempre, y para dejar por escrito **por qué la respuesta a tres de ellas es
"no hace falta"** — que es una respuesta legítima solo si está razonada.

---

## 1. Screening de DPIA (Art. 35)

**Conclusión: no se requiere una DPIA.** El razonamiento, no la conclusión, es
lo que vale acá.

El Art. 35(1) la exige cuando un tratamiento "entrañe un alto riesgo para los
derechos y libertades". El WP248 da nueve criterios; la regla práctica de la
mayoría de las autoridades es que dos o más disparan la obligación.

| # | Criterio WP248 | ¿Aplica? |
|---|---|---|
| 1 | Evaluación o puntuación (scoring) | **Parcial — ver abajo** |
| 2 | Decisiones automatizadas con efecto jurídico o similar | No |
| 3 | Observación sistemática | No |
| 4 | Datos sensibles o de naturaleza altamente personal | No |
| 5 | Tratamiento a gran escala | No |
| 6 | Cruce o combinación de conjuntos de datos | No |
| 7 | Datos de personas vulnerables | No |
| 8 | Uso innovador o aplicación de soluciones tecnológicas nuevas | **Parcial — ver abajo** |
| 9 | Impide ejercer un derecho o usar un servicio | No |

**Los dos parciales, honestamente:**

- **Scoring (1).** EnergyCurve calcula un "energy score" y un "set score". Pero
  puntúa **un set de música**, no a una persona: nada en el resultado describe,
  evalúa ni predice al DJ. El criterio apunta a perfilado de individuos, y no hay.
- **Uso innovador (8).** Hay un LLM en el camino (la sugerencia de
  reordenamiento). Lo que recibe son títulos, artistas, BPM y tonalidad del set
  — nunca el mail, ni la cuenta, ni audio. Es tecnología nueva aplicada a
  metadata musical, no a datos de la persona.

Ninguno de los dos es un sí limpio y ninguno suma con otro. Cero criterios
claros, dos parciales que no son sobre personas.

**Lo que cambiaría esta conclusión**, escrito ahora para que la revisión futura
no tenga que redescubrirlo:

- Perfilar DJs entre sí ("sos un DJ de peak-time") — eso sí es scoring de
  personas.
- Aceptar subida de audio. Hoy el audio nunca sale del dispositivo; el día que
  eso cambie, el tratamiento cambia de categoría.
- Recomendaciones cruzando datos de varias cuentas.
- Cualquier uso de datos de geolocalización.

---

## 2. ¿Hace falta un DPO? (Art. 37)

**No.** Los tres supuestos del Art. 37(1):

- **(a) Autoridad u organismo público:** no.
- **(b) Observación habitual y sistemática a gran escala:** no. Ni habitual ni
  sistemática ni a gran escala — el analytics es opt-in y cuenta eventos de
  producto, no conductas.
- **(c) Tratamiento a gran escala de categorías especiales o de condenas:**
  no hay datos del Art. 9 ni del Art. 10 en ninguna tabla.

**Roles reales, que es lo que sí hay que declarar:**

| Rol | Quién | Qué implica |
|---|---|---|
| Responsable del tratamiento | StageLink LLC | Decide finalidades y medios |
| Contacto de privacidad | hello@energycurve.app | Recibe los DSAR y las consultas |
| Operación técnica | una persona | Ver punto 4 |

---

## 3. Políticas internas

Una empresa de una persona no necesita un manual de políticas; necesita que las
reglas que ya rigen estén escritas donde se trabaja. Las que existen y **son
ejecutables** (no aspiracionales):

| Regla | Dónde vive | Qué la hace cumplir |
|---|---|---|
| Toda columna con datos personales se declara en el RoPA | `docs/compliance/ropa.md` | `tests/ropa-accuracy.test.ts` falla si no |
| Todo tercero que recibe datos se publica | `/subprocessors` | `tests/subprocessors-accuracy.test.ts` |
| Sin PII en claro en los logs | `lib/observability/logger` | revisión + `docs/security/alerting.md` |
| Toda tabla nace con RLS y sin políticas (decisión 22) | migraciones | `tests/migrations.test.ts` |
| El acceso a datos de otro usuario se verifica en la capa de servicios | `services/*` | `tests/services-tenancy.test.ts` + regla semgrep |
| Las cuatro preguntas de privacy by design antes de una migración | `privacy-by-design.md` §5 | revisión |

Lo que **no** hay, dicho para que no se lea como omisión: no hay política de
escritorio limpio, ni de dispositivos, ni de onboarding/offboarding de personal.
No hay personal. Escribirlas sería producir papeles que describen una
organización que no existe, y un data room detecta eso rápido.

---

## 4. Capacitación — y el riesgo real detrás de esta tarea

La tarea original dice "capacitar al equipo en privacidad y manejo de datos". El
equipo es una persona, y esa persona escribió el producto. Una capacitación no
es el control que falta acá.

**El riesgo real es el bus factor 1**, y es mayor que cualquier brecha de las
listadas en el RoPA: si Robertino no está disponible, nadie puede contestar un
DSAR, ejecutar un borrado, ni notificar una brecha dentro de las 72 horas —
porque nadie más tiene los accesos ni sabe dónde está nada.

La mitigación posible sin contratar a nadie, y lo que ya está hecho:

- ✅ Los procedimientos están escritos y son seguibles por alguien que no sea
  el autor: `docs/security/incident-response.md`,
  `docs/security/breach-notification-template.md`,
  `docs/runbooks/deploy-and-rollback.md`.
- ✅ El RoPA dice dónde vive cada dato, por tabla y columna.
- ❌ **Nadie más tiene acceso.** Vercel, Supabase, WorkOS, Stripe y el dominio
  dependen de una sola cuenta.
- ❌ No hay un segundo contacto en `hello@energycurve.app`.

**Recomendación concreta:** un sobre sellado o un gestor de contraseñas con
acceso de emergencia delegado a una persona de confianza. Es la medida
organizativa del Art. 32 con mejor relación costo-beneficio de todas las que
quedan pendientes, y cuesta una tarde.

---

## 5. Dossier documental

Lo producido en estos cuatro proyectos, y qué contesta cada pieza.

**Privacidad**
- `ropa.md` — Art. 30. Qué se trata, por qué, dónde vive. Verificado por test.
- `privacy-by-design.md` — Art. 5(1)(c) y (e). Minimización, defaults, retención.
- `international-transfers.md` — Cap. V. Mapa de transferencias y TIA.
- `governance.md` — este. Arts. 35 y 37.
- `gap-assessment.md` — marcos aplicables y matriz de cumplimiento.
- `/subprocessors` — la versión pública, en EN y ES.

**Seguridad** (evidencia del Art. 32)
- `threat-model.md` — STRIDE sobre las superficies reales.
- `findings-2026-09.md` — hallazgos y estado de remediación.
- `rbac-matrix.md` — separación de privilegios, con lo que NO se verificó.
- `alerting.md` — qué se vigila, y qué no puede vigilarse.
- `incident-response.md` + `breach-notification-template.md` — Arts. 33 y 34.
- `sbom/energycurve-sbom.cdx.json` — CycloneDX reproducible.

**Calidad**
- `qa/test-strategy.md`, `qa/quality-report-2026-09.md`,
  `qa/findings-f5-precision.md`, `qa/performance-baseline-2026-09.md`,
  `qa/ux-edge-cases.md`, `qa/artifacts-handoff.md`.

**Cómo leer este dossier sin que engañe:** cada documento tiene una sección de
límites, y esas secciones son la parte más importante de todos ellos. Nada acá
declara verificado algo que no se probó — en particular, **nada del pentest, el
IDOR entre cuentas reales, ni la restauración de backups está hecho**, y los tres
documentos que los mencionan lo dicen en vez de dejar la casilla ambigua.
