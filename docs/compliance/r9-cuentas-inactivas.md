# R9 · Cuentas inactivas: las opciones, sin la decisión

**Proyecto 3 · Privacy & Compliance · R9 del gap assessment.** Fecha: 2026-09-27.
Documento de decisión, no de diseño: acá están las salidas y lo que cuesta cada
una, y **no hay una elegida**. La elección es de Robertino. Lo que sí hay es
todo lo que hace falta para elegir sin volver a mirar el código.

Complementa `gap-assessment.md` (fila R9) y `stagelink-crossread-2026-09.md`
(§H-3), que ya nombran las tres familias de salida. Esto las baja a plazos,
listas y avisos concretos.

---

## 1. El hueco, dicho con lo que dice el código

Hoy no existe ninguna regla. Confirmado tres veces, en el momento de escribir
esto y no de memoria:

- **No hay columna de último ingreso.** `profiles` nació con `id`,
  `workos_user_id`, `email`, `created_at` y `updated_at`
  (`supabase/migrations/0001_initial_schema.sql`), y las migraciones que la
  tocaron después agregaron suspensión (`0004`), facturación (`0012`, `0013`),
  idioma (`0018`), notación de tonalidad (`0026`) y `deletion_requested_at`
  (`0031`). Ninguna agregó `last_seen`, `last_login` ni nada parecido.
- **Lo que sí hay es un proxy débil**: `profiles.updated_at` (lo mueve un
  trigger en cualquier cambio del perfil, no un ingreso) y `playlists.updated_at`
  (lo mueve editar un set). Alguien que entra, mira y se va no toca ninguno de
  los dos.
- **WorkOS sí sabe cuándo alguien entró por última vez.** El SDK tipa
  `lastSignInAt: string | null` en el usuario
  (`node_modules/@workos-inc/node/lib/workos-9ENvbxSO.d.cts:1193`). Es un dato
  del proveedor de identidad, no de nuestra base, y **no está verificado** que la
  cuenta de EnergyCurve lo devuelva poblado: es una llamada de API que nadie
  hizo todavía.

Y la política de privacidad ya toma posición sin que nadie la haya tomado: dice
*«Tu cuenta, tus sets y tus tracks: mientras exista la cuenta. Si la borrás, se
van con ella»* (`lib/content/legal-copy.ts:327`, y en inglés en `:101`). Eso es
la opción C de abajo, declarada por omisión. Cualquiera de las otras dos obliga
a cambiar ese párrafo en los dos idiomas.

---

## 2. Qué se borra y qué queda, en cualquiera de las opciones que borran

No hay que diseñar nada nuevo para esto: es exactamente lo que hace hoy el
borrado con gracia (PR #253). Marcar `deletion_requested_at` en una cuenta
inactiva y dejar que `sweepDeletedAccounts`
(`services/account-deletion-service.ts:276`) haga el resto produce este
resultado, fila por fila:

| Se va con la cuenta (cascada desde `profiles.id`) | Migración |
|---|---|
| Sets (`playlists`) y sus temas (`tracks`), con local y franja horaria | `0001` |
| Análisis (`analyses`) | `0003` |
| Taxonomías propias (dos tablas) | `0009` |
| Uso de funciones (`feature_usage`) | `0014` |
| Plantillas de curva (`curve_templates`) | `0019` |
| Colaboraciones que invitó y sugerencias que escribió (`set_collaborators.invited_by`, `set_suggestions.author_id`) | `0023` |
| Pedidos de derechos (`privacy_requests`) | `0030` |
| El usuario en WorkOS | `deleteUserEverywhere`, `services/backstage-service.ts:197` |

| Queda, a propósito | Por qué |
|---|---|
| Filas de `billing_events` sin payload (`profile_id` pasa a NULL) | Idempotencia de Stripe, `0012` |
| El registro de Stripe | Obligación fiscal del proveedor |
| La persona en PostHog | Fuera de `deleteUserEverywhere`; pendiente desde F2 |
| `set_collaborators.invited_email` en sets ajenos | Es texto, no clave foránea — hallazgo de `scripts/verify-deletion.mjs` (traspaso §16.6) |
| `playlists.edit_lock_holder` de otros sets pasa a NULL | `0024`, `on delete set null` |

**Lo que esto no contempla y hay que decidir junto con el plazo:** un set
compartido cuyo dueño expira desaparece para los colaboradores también, porque
`playlists.user_id` cascadea. Un DJ que hace un año no entra pero cuyo set sigue
abierto por un colaborador activo es un caso real que el borrado por inactividad
crea y el borrado a pedido no.

---

## 3. Las opciones

### A · Avisar y borrar, con plazo N

Un barrido marca `deletion_requested_at` en las cuentas sin actividad en N meses
y manda un aviso; los 30 días de gracia que ya existen son la ventana para
volver, y entrar (o cancelar desde `/dashboard/account`, que ya existe) la
salva. Es la recomendada en §H-3 del cruce con StageLink.

| N | Qué implica | A favor | En contra |
|---|---|---|---|
| **12 meses** | Borrado a los 13 meses de la última actividad | El más defendible bajo 5(1)(e): un año sin entrar es una finalidad agotada para un producto de preparar sets | Un DJ que toca por temporada (verano, un festival al año) queda justo en el borde. Es el plazo que más avisos falsos manda |
| **24 meses** | Borrado a los 25 meses | Es lo que hace la mayoría de los servicios comparables; cubre dos temporadas; el que no volvió en dos años no vuelve | Dos años de sets, locales y mails de alguien que se olvidó de que existía la cuenta |
| **36 meses** | Borrado a los 37 meses | Casi no produce falsos positivos | Difícil de justificar como «limitación» de nada: tres años es más de lo que el producto lleva existiendo |

Lo que cuesta, para cualquier N:

- **Una señal de actividad que hoy no existe** (§1). Dos caminos: (a) una
  columna `profiles.last_seen_at` que se actualiza al cargar una sesión —un
  dato nuevo, con finalidad declarada, que hay que sumar al RoPA y a la
  política—, o (b) preguntarle a WorkOS `lastSignInAt` desde el barrido, sin
  guardar nada nuevo. La (b) es la que menos datos agrega y la que depende de
  algo sin verificar.
- **Un aviso**, que es un mail transaccional más sobre el mismo remitente que
  ya manda confirmación de compra y pago fallido (`lib/email/send-email.ts`,
  Resend). Un aviso al marcar y otro a los 7 días del borrado es lo razonable;
  el segundo es el que salva al que borró el primero sin leerlo.
- **Excluir a quien paga.** Una suscripción viva es actividad, aunque nadie
  entre: cobrarle a alguien y borrarle los sets el mismo mes es indefendible.
  `stripe_subscription_id` no nulo debería sacar la cuenta del barrido.
- **Actualizar la política** (los dos párrafos de §1), el RoPA (fila de
  retención de T1/T2), la tabla de retención de `privacy-by-design.md` §3 y la
  fila R9 del gap assessment.

### B · Anonimizar y quedarse con los sets

Borrar la identidad (mail, WorkOS, nombre) y dejar los sets sin dueño. Está en
§H-3 y se mantiene acá por completitud, con la misma conclusión: **rompe el
producto**. Un set sin dueño no lo puede abrir nadie, `playlists.user_id` es
`not null`, y el RoPA dice explícitamente que el contenido del DJ se va con la
persona. No hay versión barata de esta opción: implica un esquema nuevo para
sets huérfanos que nadie va a leer.

### C · Declararlo y no hacerlo

Dejar la política como está —«mientras exista la cuenta»— y no expirar nada.
Es lo que pasa hoy, con una diferencia: hoy pasa por omisión y acá pasaría por
decisión, anotada en el gap assessment como R9 cerrada con «no, y por esto».

Defendible ahora, con la cantidad de cuentas que tiene el producto, y cada vez
menos a medida que crezca. Si se elige, conviene ponerle fecha de revisión.

---

## 4. Cuántas cuentas caerían en cada plazo

**No se puede contar, y conviene decirlo antes que estimarlo.**

- No hay columna de último ingreso (§1), así que no existe la consulta que
  responda «cuántas cuentas llevan más de N meses sin entrar».
- Los proxies (`profiles.updated_at`, `playlists.updated_at`) responden otra
  pregunta —cuántas no *editaron* nada— y subestiman la actividad.
- Y aunque existiera la columna, **este entorno sólo tiene acceso a la base de
  dev**, donde las cuentas son las de prueba. Un número de ahí no dice nada de
  producción.

La consulta que lo respondería, el día que exista la señal, es una sola:

```sql
select count(*) from profiles
where coalesce(last_seen_at, created_at) < now() - interval '24 months'
  and deletion_requested_at is null
  and stripe_subscription_id is null;
```

Hasta entonces, cualquier número acá sería inventado.

---

## 5. Avisos que hacen falta

| Cuándo | Qué | Por dónde |
|---|---|---|
| Al decidir | Cambiar el párrafo de retención de la política de privacidad, en los dos idiomas (`legal-copy.ts:101` y `:327`), y avisar el cambio a las cuentas existentes — una política que empieza a borrar por inactividad sin decirlo antes es la peor versión del cambio | Mail a todas las cuentas + página `/privacy` |
| Al marcar una cuenta | «Tu cuenta lleva N meses sin uso y se borra el DD/MM. Entrar la conserva.» | Resend, mismo remitente que los mails de facturación |
| 7 días antes | El mismo aviso, más corto | Resend |
| Nunca | Un aviso *después* del borrado: ya no hay a quién ni con qué | — |

Lo que el aviso tiene que decir sin vueltas, porque el borrado con gracia ya lo
dice para el pedido voluntario: qué se va (§2), qué queda (§2), y que descargar
los datos desde `/dashboard/account` sigue disponible hasta el último día.

---

## 6. Lectura de diligencia debida

- **Art. 5(1)(e), limitación del plazo.** Es el artículo que abre el hueco: los
  datos se guardan «no más tiempo del necesario para los fines». «Mientras exista
  la cuenta» no es un plazo, es la ausencia de uno. La opción C lo esquiva
  declarándolo; A lo cierra.
- **Art. 13(2)(a), información.** El plazo de conservación —o el criterio para
  fijarlo— es información obligatoria en la política. Hoy la política tiene un
  criterio (existencia de la cuenta). Cualquier cambio es un cambio de política
  con aviso.
- **Art. 17, supresión.** La opción A es una supresión que no pidió nadie. Es
  legítima si el aviso llega y la gracia es real; no lo es si el mail rebota y
  la cuenta se borra igual sin que nadie lo sepa. Por eso los dos avisos, y por
  eso tiene sentido no borrar cuentas cuyo aviso rebotó hasta revisar a mano.
- **Art. 25, por diseño.** Agregar `last_seen_at` es recolectar un dato nuevo
  para poder borrar otros. Es proporcional si es un solo timestamp y no un
  historial; deja de serlo si alguien lo convierte en analítica.
- **Lo que no está y afecta la decisión:** el barrido de retención **no corre en
  producción**. `CRON_SECRET` no está configurado y
  `app/api/cron/retention/route.ts` contesta 503 sin él. Cualquier opción que
  borre depende de que eso se resuelva antes; elegir A hoy sería prometer un
  borrado que nada ejecuta, que es el mismo estado en que ya está R7.

---

## 7. Costo de implementar, si se elige A

Barato, porque casi todo existe:

1. Señal de actividad: columna `last_seen_at` (una migración, un `update` en
   la carga de sesión) **o** llamada a WorkOS desde el barrido.
2. Un `sweepInactiveAccounts` al lado de los seis barridos que ya hay en
   `app/api/cron/retention/route.ts`: selecciona por inactividad, excluye
   suscripciones vivas y `deletion_requested_at` no nulo, marca
   `deletion_requested_at`, manda el aviso.
3. Dos plantillas de mail sobre `lib/email/build-email-html.ts`.
4. La gracia, la cancelación desde la cuenta, el barrido de borrado y la fila
   de auditoría `system:deletion-grace` **ya existen** y no se tocan.
5. Los cuatro documentos de §3-A y los dos párrafos de la política.

La estimación de «decisión + ~2 h» de la fila R9 sigue siendo razonable para el
código; el aviso previo a las cuentas existentes es lo que no entra en dos
horas.

---

## 8. Lo que se le pide a Robertino

Una línea: **A con 12, 24 o 36 meses; o C con fecha de revisión.** B no.

Y dos cosas que no dependen de la línea: configurar `CRON_SECRET` en Vercel
(sin eso ninguna opción que borre existe) y correr `scripts/verify-deletion.mjs`
contra una cuenta descartable, porque el borrado por inactividad va a borrar
cuentas de gente que no lo pidió, y hoy nadie verificó que el borrado a pedido
borre lo que dice.
