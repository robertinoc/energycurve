# Artefactos de calidad — índice para las auditorías

Fase F7 del *Plan Integral de Pruebas*: el traspaso a los proyectos de Seguridad,
Privacy & Compliance y Auditoría 360.

Existe para que esos proyectos **no vuelvan a medir lo ya medido**, y para que
cuando afirmen algo puedan enlazar la evidencia en vez de repetir el trabajo.

Un índice sirve si dice también qué NO hay, así que cada sección lo dice.

---

## Qué usar para qué

| Si tenés que afirmar… | Usá | Qué prueba de verdad |
|---|---|---|
| "los datos de un DJ no son visibles para otro" | `tests/services-tenancy.test.ts` | Que sacarle el filtro de dueño a `getOwnedPlaylist` pone 7 de 16 tests en rojo |
| "el motor calcula bien" | `tests/precision-oracle.test.ts` | Coincidencia en tolerancia cero contra un oráculo escrito desde la especificación, 60-220 BPM en centésimas, doce géneros |
| "los permisos pagos no se pueden falsificar" | `tests/api-billing-webhook.test.ts` | Firma real de Stripe, cuerpo alterado después de firmar, idempotencia ante reentrega |
| "el checkout no se puede manipular" | `tests/api-billing-guards.test.ts` | Un test manda `priceId`, `price` y `amount: 0` y verifica que ninguno llega a Stripe |
| "el export no destruye la librería del usuario" | `tests/export.test.ts`, `tests/source-entry.test.ts` | Forzar `preservedEntry` a null pone 7 de 63 en rojo, incluido cada hotcue con su posición |
| "las rutas privadas están protegidas" | `tests/protected-routes.test.ts` | Recorre `app/` y compara con el matcher de `proxy.ts` |
| "una feature paga no se regala" | `tests/capabilities.test.ts` | Toda capability shipeada y de pago tiene que estar citada con `can(...)` en `app/` o `services/` |
| "el producto es accesible" | `e2e/accessibility.spec.ts` | axe WCAG 2.1 AA sobre 17 páginas públicas, dos idiomas, cuatro navegadores |
| "no rastreamos sin consentimiento" | `tests/consent.test.ts`, `e2e/consent.spec.ts` | Con la key de PostHog presente: cero cookies sin responder y rechazado; cookie al aceptar |
| "solo mandamos artista y título a terceros" | `tests/title-lookup-service.test.ts` | Verifica que la key no salga de la query string y que no viaje nada del usuario |
| "el esquema sigue su propia convención" | `tests/migrations.test.ts` | RLS en toda tabla nueva, numeración única, idempotencia, nada destructivo |

---

## Documentos

| Documento | Para qué sirve fuera de QA |
|---|---|
| `docs/qa/test-strategy.md` | Matriz de riesgo por módulo y umbrales. La entrada para priorizar cualquier auditoría |
| `docs/qa/quality-report-2026-09.md` | Estado, hallazgos ordenados por costo, y **qué no puede afirmar** |
| `docs/qa/findings-f5-precision.md` | El score no monótono, con las tres salidas posibles. Va al plan único de remediación |
| `docs/qa/performance-baseline-2026-09.md` | Latencias medidas. La sonda de uptime tarda hasta 3,57 s |
| `docs/runbooks/deploy-and-rollback.md` | El gate de despliegue que no gatea, y qué NO deshace un rollback |
| `docs/security/threat-model.md` | STRIDE con estado medido por amenaza |
| `docs/security/findings-2026-09.md` | Diez hallazgos, con el motivo de los tres que quedaron abiertos |
| `docs/security/incident-response.md` | Plan y el tabletop que encontró tres huecos |
| `docs/compliance/ropa.md` | Registro de tratamientos derivado del esquema |

---

## Números, con su fecha

Medidos el 11/09/2026. Sirven como línea base; hay que re-medirlos, no citarlos
de memoria dentro de seis meses.

| | |
|---|---|
| Tests unitarios | 1.651 en 110 archivos |
| Tests E2E | 228, cuatro navegadores |
| Cobertura de sentencias | 69,0% |
| Cobertura de `services/` | 8,3% |
| Cobertura de `app/api/` | 46,1% |
| Duplicación de código | 0,69% sobre 272 archivos |
| Vulnerabilidades de dependencias | 18, ninguna crítica |
| Licencias copyleft en producción | 1, LGPL transitiva, no llega al navegador |

Reproducir todo: `npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run test:e2e`.

---

## Las mutaciones, que es lo que hace creíble al resto

Un test que pasa contra código roto es peor que no tener test. A cada suite se le
inyectó el bug que dice prevenir.

| Bug inyectado | Tests en rojo |
|---|---|
| Sacar el filtro de dueño en `getOwnedPlaylist` | 7 de 16 |
| Anular la idempotencia del webhook | 1 de 6 |
| Reconstruir el export en vez de devolver la entrada del usuario | 7 de 63 |
| Aceptar un precio mandado por el cliente | 1 de 10 |
| Devolver 422 en vez de 404 ante un set ajeno | 2 de 8 |
| `/api/health` 200 con la base caída | 3 de 6 |
| Desactivar el honeypot del contacto | 1 de 10 |
| Mediana → promedio en la duración del set | 2 de 31 |
| Sacar el tope de outlier de duración | 2 de 31 |
| Tabla sin RLS, número duplicado, `drop column` | 1 de 9 cada uno |

**Ninguna sobrevivió. Y en dos casos el primer intento pasó por la razón
equivocada, con el defecto en la herramienta de medición y no en el producto.**
Eso es lo que este paso existe para encontrar, y por qué la tabla vale más que
el número de cobertura.

---

## Las pruebas manuales: dónde se anotan y cómo llegan al repo

Las ~36 pruebas que ningún test puede correr —las que necesitan una consola, un
oído o una tarjeta— se anotan en una página, no en este archivo:

**[Banco de Pruebas EnergyCurve](https://claude.ai/artifact/S4cBUXpSRXp3X9z1REwQgA)**
— copia de trabajo, cuenta personal. Es el único lugar donde se registra estado
y notas.

Su contenido —qué se prueba, con qué pasos— vive en
[`docs/qa/banco-de-pruebas.html`](banco-de-pruebas.html) y se revisa como
cualquier archivo del repo. El orden es: editar el archivo, commitear, republicar
desde él. El estado y las notas no están ahí: cambian mientras alguien prueba, no
cuando alguien commitea.

### Cómo está hecha, porque determina qué se puede automatizar

La página guarda cada prueba como un documento en su propio almacén:

| | |
|---|---|
| Colección | `tests` |
| Id del documento | el código de la prueba (`A1.4`, `J2.3`, `UX.5`) |
| Campos | `status` (`pending` \| `running` \| `pass` \| `fail` \| `blocked`), `notes`, `updatedAt` |

Quien abre la página escribe ahí al tocar un estado o tipear una nota. Claude lee
y escribe el mismo almacén con la herramienta `ArtifactData` contra esa URL. Los
dos lados ven lo mismo porque **es el mismo almacén**, no una copia sincronizada.

### Lo que NO se puede hacer, y conviene no volver a intentarlo

- **La página no puede escribir en el repo.** Corre en el visor de claude.ai, sin
  acceso a git. No hay forma de que tocar "Pasa" produzca un commit.
- **El repo no puede escribir en la página.** Nada en CI tiene credenciales del
  almacén del artifact.
- **Las dos páginas no se sincronizan entre sí.** La original vive en la cuenta
  de `migbirds` y ésta en la personal; cada artifact tiene su propio almacén y
  son organizaciones distintas, así que no hay enlace posible ni en un sentido ni
  en el otro. La de migbirds quedó **congelada**: anotar en las dos es la forma
  segura de perder resultados.

### El puente es Claude, a pedido

1. Vos anotás en la página mientras probás.
2. Le pedís a Claude que lo traiga al repo.
3. Claude lee la colección `tests` y actualiza la tabla de abajo en un commit.

No hay un proceso que corra solo, y decirlo es parte del traspaso: si nadie pide
el paso 2, esta tabla envejece y la página tiene la verdad.

### Último estado leído — 17/09/2026

Instantánea, no fuente de verdad. La fuente es la página.

| Sesión | Pruebas | Estado |
|---|---|---|
| A1 — las tres cuentas de prueba | 4 | `A1.4` bloqueada por `A1.1`–`A1.3`; el resto sin correr |
| J — feedback de Jordi | 8 | Sin correr |
| J2 — la tabla armónica (PR #225) | 4 | Sin correr |
| SEO — lo que el SEO técnico no puede probar solo (PR #227) | 9 | Sin correr — **esperan el deploy**, no las cuentas |
| A2 — migraciones, cron y región | 7 | Sin correr |
| A3 — el pico objetivo | 1 | Sin correr |
| A4 — backups y restauración | 2 | Sin correr |
| A5 — recorrido como DJ real | 6 | Sin correr |
| A6 — consolas y continuidad | 3 | Sin correr |
| A7 — terceros | 2 | Sin correr |
| A8 — etiquetado por oído | 3 | Sin correr |
| UX — casos de borde | 5 | Sin correr |

Son **54 pruebas**, no 36: el encabezado de la página original decía 32 mientras
su propio plan ya tenía 41 filas, y ese número se venía arrastrando. El contador
de la página se calcula solo, así que el que vale es el que muestra arriba.

**A1 sigue siendo el cuello de botella**, pero de menos de lo que parecía:
desbloquea nueve pruebas —las cinco de UX de la página más los cuatro E2E
automatizados, que no son filas— y nada más. Las seis claves que hay que escribir
en `.env.e2e.local` son las que lee `e2e/helpers/accounts.ts`, que hoy saltea los
tests anunciándolo en el reporte, nunca los pasa en falso.

**La sesión SEO no espera a A1.** El PR #227 se mergeó sin deployar y se verificó
contra un build local, así que sus nueve pruebas esperan a que producción sirva
`dac198b` o posterior. Todo lo que un test puede afirmar sobre ese HTML ya está en
`tests/locale-routing.test.ts` y `tests/blog.test.ts`; lo que queda es lo que sólo
se ve en el sitio servido, en un navegador de verdad o en un validador ajeno.

## Lo que estos artefactos NO cubren

Decirlo es parte del traspaso. Una auditoría que herede este índice creyendo que
cubre todo va a firmar cosas que nadie probó.

- **Todo el producto detrás del login.** Import, análisis, arreglos, export,
  pago, Gig Mode, colaboración y borrado de cuenta: todo manual. Necesita tres
  cuentas de prueba en dev.
- **Dieciséis de los diecisiete servicios.** Se cubrió `playlist-service`, que
  concentra el riesgo de aislamiento de datos.
- **Carga y escalabilidad**, porque el pico objetivo no está definido.
- **Las pruebas activas de IDOR y escalamiento de privilegios**, que son de la
  auditoría de seguridad y necesitan las mismas cuentas.
- **La verificación del lado de Traktor del fix P0.** Solo Traktor puede decir
  qué hace Traktor al importar.
- **Si una migración se aplicó.** No hay tabla de migraciones ni runner. La 0021
  está ausente de dev ahora mismo y nada falla en voz alta.
- **Backups y restauración.** No hay procedimiento ni evidencia de una prueba.
