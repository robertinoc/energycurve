# Especificación de derechos (DSAR): qué hay, derecho por derecho

**Proyecto 3 · Privacy & Compliance · F2.** Fecha: 2026-09-27.
Complementa `dsar-procedure.md`, que dice **qué hacer** cuando llega un pedido.
Esto dice **qué existe** para cada derecho: el artículo, la ruta concreta, qué
código corre detrás, el plazo, quién lo verifica, y —fila por fila— la
diferencia entre *implementado* y *verificado*, que no es la misma columna.

**Implementado** = hay código en `main` que lo hace.
**Verificado** = alguien o algo comprobó que lo hace: un test que falla si deja
de hacerlo, o una corrida real con el resultado mirado. Un derecho implementado y
no verificado es una promesa en la política de privacidad.

Todas las líneas y conteos de este documento se confirmaron con un comando el
27/09/2026 sobre la rama `seo/plan-lote-12` (base `b2bd523`).

---

## 1. La tabla

| Derecho | Art. | Ruta para la persona | Internals | Plazo | Quién verifica | Implementado | Verificado |
|---|---|---|---|---|---|---|---|
| Acceso | 15 | `/dashboard/account` → «Download my data» | `GET app/api/account/export/route.ts` (`withAuth`, rechaza cuentas suspendidas, 3 por hora por `consumeRateLimit`) → `buildAccountExport`, `services/data-export-service.ts:95` | inmediato | Nadie: self-serve | ✅ | ✅ unit: `tests/api-account-export.test.ts` (10) y `tests/data-export.test.ts`, con los dos casos de volumen que agregó el arreglo del techo de 1.000 filas (25/09, `67a5a0c`). ❌ **Ningún E2E descarga el archivo** |
| Portabilidad | 20 | La misma descarga | El mismo JSON, legible (test «returns readable JSON, since a person is going to open it») | inmediato | Nadie | ✅ | ✅ unit, mismos tests. ❌ sin E2E |
| Rectificación del nombre | 16 | `/dashboard/account` | `updateNameAction`, `app/(en)/dashboard/account/actions.ts:75` | inmediato | Nadie | ✅ | ✅ unit: `tests/account-rectification.test.ts` (12) |
| Rectificación del email | 16 | `/dashboard/account`, formulario de pedido | `filePrivacyRequestAction` (`actions.ts:186`) → fila en `privacy_requests` con `kind='rectify_email'` y `due_at` a 30 días (migración `0030`, línea 82) → mail a la casilla (`notifyPrivacyRequest`, `services/privacy-request-email-service.ts:41`) → cola en `/backstage` (`PrivacyRequestQueue.tsx`, vencidos en rojo) → una persona lo cambia en WorkOS → `resolvePrivacyRequest`, `services/privacy-request-service.ts:308` | 30 días | Robertino | ✅ el registro y la cola | ✅ unit: `tests/privacy-requests.test.ts` (13). ❌ **El cambio en WorkOS es manual y nunca se hizo**; el aviso de que los sets compartidos con esa dirección dejan de verse (`set_collaborators` keyeado por mail, `0023`) es un paso del procedimiento, no del código |
| Supresión | 17 | `/dashboard/account`, con confirmación escrita | `requestAccountDeletionAction` (`actions.ts:304`) → `requestAccountDeletion` (`services/account-deletion-service.ts:78`): marca `deletion_requested_at` (migración `0031`), frena la renovación en Stripe → a los 30 días `sweepDeletedAccounts` (`:276`) llama a `deleteUserEverywhere` (`services/backstage-service.ts:197`) con actor `system:deletion-grace`. Reversible con `cancelAccountDeletionAction` (`actions.ts:383`) → `cancelAccountDeletion` (`:163`) | 30 días | Nadie: self-serve | ✅ el pedido, la gracia y el barrido | ✅ unit: `tests/account-deletion.test.ts` (13), `tests/api-cron-retention.test.ts` (9). ❌ **Ver §2: el barrido no corre en producción y el borrado nunca se validó contra datos reales** |
| Limitación | 18 | `/dashboard/account`, formulario de pedido | `filePrivacyRequestAction` con `kind='restrict'` → misma cola → una persona suspende desde `/backstage`: `setUserSuspension` (`services/backstage-service.ts:144`) escribe `suspended_at` (migración `0004`); `isSuspended` (`lib/auth/suspension.ts`) corta toda escritura | 30 días | Robertino | ✅ el registro y la suspensión | ✅ unit: `tests/suspension.test.ts` (6, incluida «every server action is covered by one check in requireProfile») y `tests/backstage-admin-actions.test.ts`. ❌ el circuito pedido → suspensión nunca se recorrió entero |
| Oposición a analytics | 21 | Banner, y `/cookie-policy` para retirarlo | `components/privacy/consent-control.tsx`, `lib/privacy/consent`; nada se inicializa antes de la respuesta y el silencio se lee como no | inmediato | Nadie: self-serve | ✅ | ✅ E2E: `e2e/consent.spec.ts` (10) |
| Oposición (general) y «otro» | 21 | `/dashboard/account`, formulario de pedido | `kind='object'` u `'other'` → misma cola → contesta una persona | 30 días | Robertino | ✅ el registro | ✅ unit (cola). ❌ ninguna respuesta real dada todavía |
| Cualquiera, por mail | 12 | `hello@energycurve.app` | Nada: registro a mano en `docs/security/incidents/` (procedimiento §5) | 30 días | Robertino | — | ❌ depende de que alguien mire la casilla |

Lo que la tabla dice leída de arriba abajo: **los tres self-serve están
implementados y verificados por tests; los cuatro que pasan por una persona
tienen el registro verificado y la ejecución sin verificar**, porque la
ejecución es la persona.

---

## 2. Los dos hechos en rojo, sin adjetivos

### 2.1 El borrado programado no se ejecuta

`app/api/cron/retention/route.ts` es el único lugar desde donde corre
`sweepDeletedAccounts`. Lee `process.env.CRON_SECRET` (línea 33) y **sin él
contesta 503** («Retention sweep is not configured.», líneas 37-38) sin correr
nada. Es la decisión correcta para una ruta que borra —abrir por defecto sería
peor—, y también significa que:

- cada pedido de supresión registra una fecha que se le muestra a la persona,
- y llegada esa fecha, nada pasa.

`CRON_SECRET` no está configurado en Vercel. El test «answers 503 and runs
nothing, rather than running for anyone» verifica el comportamiento, no que
el secreto exista. Configurarlo es de Robertino (fila R1 del gap assessment) y
no hay nada que este repo pueda hacer al respecto.

Mientras tanto, el estado real de un pedido de supresión es: **pendiente y
reversible, indefinidamente.** El panel lo muestra en rojo al vencer justamente
para que no sea invisible.

### 2.2 El borrado nunca se validó contra datos reales

`scripts/verify-deletion.mjs` existe desde el lote 7 (traspaso §16.6): dos
fases, `--before <email>` guarda los ids y `--after <snapshot>` va a buscarlos,
tabla por tabla, incluida la que no cascadea (`set_collaborators.invited_email`
es texto). **Nunca se corrió** — ni contra dev ni contra producción — porque
sólo acepta direcciones descartables y las cuentas de prueba las provee
Robertino.

Hasta que corra, «borrar la cuenta la elimina de nuestra base y de nuestro
proveedor de identidad, junto con tus sets, temas, análisis y versiones»
(`lib/content/legal-copy.ts:339`) es una afirmación respaldada por tests
unitarios con fakes y por la lectura de las cascadas en las migraciones, no por
una base que se miró antes y después.

---

## 3. Lo que el borrado deja, y la política ya dice

No es un hueco sino una lista, y está en la política en los dos idiomas
(`legal-copy.ts:340`): filas de `billing_events` sin payload, el registro de
Stripe, lo que PostHog ya recolectó. Lo que la política **no** dice y el
verificador sí mira: `set_collaborators.invited_email` en sets de otras
personas sobrevive. Cuando el verificador corra, ese será el primer dato real
sobre cuánto sobrevive de verdad.

---

## 4. Verificación de identidad, por vía

| Vía | Cómo se verifica | Quién |
|---|---|---|
| Desde `/dashboard/account` | La sesión autenticada es la verificación; no se pide nada más (procedimiento §3, regla 1) | El código |
| Por mail desde la dirección de la cuenta | La dirección es la verificación | Robertino, al leer |
| Por mail desde otra dirección | Se contesta a la dirección de la cuenta pidiendo confirmación; supresión sin confirmación no se ejecuta | Robertino |
| Nunca | Documento, selfie, tarjeta | — |

---

## 5. Lo que este documento cambia del procedimiento

Nada. `dsar-procedure.md` sigue siendo el documento operativo. Éste existe
porque la fila «Validación end-to-end del borrado — nunca se corrió» del
procedimiento (§6) estaba diciendo algo que la tabla del §1 no reflejaba: que
*implementado* y *verificado* son columnas distintas, y que para el derecho más
irreversible de los siete la segunda está vacía.

## 6. Lo que le toca a Robertino

1. `CRON_SECRET` en Vercel, y después una corrida manual del cron mirando
   `account_deletion.sweep_completed` en los logs.
2. Una cuenta descartable para `scripts/verify-deletion.mjs --before`, borrarla
   desde el producto, esperar el barrido (o correrlo) y `--after`.
3. Con eso, las dos ❌ de la fila «Supresión» pasan a ✅ y se anota acá la
   fecha.
