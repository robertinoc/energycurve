# Restaurar la base, y qué número sale de hacerlo

> **Por qué existe esta página.** La brecha más seria del Art. 32 es
> `32(1)(c)` — restaurar disponibilidad tras un incidente — y las cinco filas de
> esa tabla en [`../compliance/security-measures.md`](../compliance/security-measures.md)
> están en rojo por la misma razón: **nadie restauró nunca un backup.** Un
> backup que nunca se restauró es una hipótesis, no un control.
>
> Esta página no cierra esa brecha. La convierte en una tarea de una tarde con
> pasos, con una tabla de resultados para llenar, y con las tres trampas que
> tiene el ejercicio escritas de antemano. **La brecha se cierra cuando los
> huecos de la §5 tengan números.**
>
> Escrita el 21/09/2026.

---

## 1 · Lo primero: sólo una de las cuatro mitades del producto tiene backup

Antes de medir nada conviene tener claro qué es lo que un backup de Postgres
puede devolver, porque el estado de este producto **no vive todo en Postgres**:

| Sistema | Qué tiene | ¿Backup nuestro? |
|---|---|---|
| **Supabase / Postgres** | Los 14 tablas: perfiles, sets, tracks, análisis, versiones, colaboraciones, facturación, auditoría | Sí — es de lo que habla esta página |
| **WorkOS** | Los usuarios, las credenciales, las sesiones | No. Lo custodia WorkOS |
| **Stripe** | Suscripciones, facturas, clientes | No. Lo custodia Stripe |
| **La máquina del DJ** | Los archivos de audio y la librería | No, y a propósito: **el audio nunca sale del dispositivo** |

Esto acota el escenario que la restauración resuelve y el que no:

- **Sí resuelve** una pérdida o corrupción de datos nuestros: un `delete` mal
  filtrado, una migración destructiva, un bug de escritura.
- **No resuelve** un incidente en WorkOS ni en Stripe. Restaurar Postgres con
  `profiles.workos_user_id` apuntando a usuarios que ya no existen en WorkOS
  deja filas que no resuelven a nadie.
- **No puede resolver** el único daño irreversible y ajeno que este producto
  puede causar: un bug de export que sobreescriba la librería de Traktor de
  alguien. Eso ya pasó, en producción, durante semanas
  ([`../security/threat-model.md`](../security/threat-model.md)). **No hay
  backup que devuelva la colección de otra persona**, y por eso la mitigación
  de ese riesgo no es ésta.

---

## 2 · Antes del ejercicio: cuatro cosas que hay que leer del panel

No se pueden leer desde el código y hoy **ninguna está confirmada**. Son las
cuatro primeras filas de la tabla de resultados:

1. **Qué plan tiene el proyecto de producción** (`iwzkzybzadsmnwilcity`).
   Supabase → Settings → Billing.
2. **Con qué frecuencia se hacen los backups y cuántos se retienen.**
   Supabase → Database → Backups.
3. **Si Point-in-time recovery está habilitado**, y con qué ventana.
   Misma pantalla. Es lo que separa "perdemos hasta 24 horas" de "perdemos
   hasta unos minutos", y es la diferencia más grande entre dos RPO posibles.
4. **Si los backups están cifrados y en qué región viven.** La región del
   proyecto es además el punto R3 del plan de remediación: la política de
   privacidad afirmó "región UE" y nadie lo confirmó.

> ⚠️ **Confirmar el `ref` en la URL, no la insignia.** El panel muestra
> `main PRODUCTION` en verde **en los dos proyectos** — etiqueta la rama, no el
> entorno ([`operations.md` §1](operations.md)). Leer la frecuencia de backups
> del proyecto de desarrollo y anotarla como la de producción es el error
> natural de esta página.

---

## 3 · El ejercicio

**Nunca restaurar sobre producción.** Ni para probar, ni "un ratito". Una
restauración es una escritura destructiva sobre la base entera; el ejercicio se
hace contra un proyecto nuevo y descartable.

1. **Arrancar el cronómetro.** El número es el producto de este ejercicio; si se
   arranca a mitad de camino, no hay RTO.
2. **Crear un proyecto de Supabase descartable**, en **la misma región** que
   producción. Una restauración a otra región mide la latencia de la otra
   región, no la tuya.
3. **Restaurar el backup más reciente de producción** al proyecto nuevo.
4. **Parar el cronómetro** cuando la base acepte consultas. Anotar: *tiempo de
   restauración*.
5. **Verificar integridad** (§4). No "parece que están los datos".
6. **Verificar la postura de seguridad** (§4). Es el paso que nadie hace y el
   que más importa.
7. **Medir el segundo tramo**: cuánto tarda apuntar la app al proyecto nuevo
   (§6). Anotar: *tiempo de reapuntado*.
8. **Borrar el proyecto descartable.** No es limpieza, es parte del
   procedimiento — ver §7.
9. **Escribir los números** en la tabla de la §5, y actualizar la tabla del
   Art. 32(1)(c) en
   [`../compliance/security-measures.md`](../compliance/security-measures.md).

---

## 4 · Qué verificar en la base restaurada

### Integridad — que los datos estén y sean los mismos

Contar filas por tabla y compararlas con producción. Las 14 tablas, y estas
cuatro comprobaciones porque cada una falla de una forma distinta:

| Comprobación | Por qué ésta |
|---|---|
| `count(*)` en las 14 tablas, contra producción | Lo obvio, y lo único que detecta una restauración parcial |
| Un set concreto con sus tracks **en orden** (`tracks.position`) | Las filas pueden estar todas y el orden ser el dato. Un set es una secuencia; desordenado no es el mismo set |
| `admin_audit_log` tiene filas | Es la tabla cuya razón de existir es sobrevivir. Si un backup la pierde, el rastro de las acciones irreversibles no existe |
| `billing_events` conserva sus `id` de Stripe | La clave primaria **es** la garantía de idempotencia. Un backup que los perdiera haría que una reentrega vieja se procese como nueva |

### Postura de seguridad — que la base restaurada no sea un agujero

Esto es lo que convierte el ejercicio en una prueba de seguridad y no sólo de
disponibilidad, y es la parte que es fácil no hacer:

| Comprobación | Qué significa si falla |
|---|---|
| **RLS habilitado en las 14 tablas** | Una restauración que devuelva RLS apagado es una exposición total y silenciosa |
| **Cero políticas RLS**, como en producción | Es la postura deliberada del producto: denegar por defecto para `anon` y `authenticated`. Una política que aparezca de la nada concede algo que nadie escribió |
| **REST sin key devuelve 401** | Es la prueba desde afuera: `curl` al `/rest/v1/profiles` del proyecto nuevo, sin cabecera |
| **La clave de servicio del proyecto nuevo es distinta** | Lo es por construcción, y es justamente por eso que el tramo de reapuntado existe |

`tests/migrations.test.ts` ya fija que toda tabla nace con RLS y sin políticas,
así que la comprobación de acá es la misma propiedad verificada **después de un
viaje por el backup**, que es un camino que ningún test cubre.

---

## 5 · La tabla que hay que llenar

Los huecos son el estado real. Cuando estén llenos, esta sección es la evidencia
del Art. 32(1)(c) y las cinco filas rojas de `security-measures.md` se mueven.

| Qué | Valor | Fuente |
|---|---|---|
| Plan de Supabase en producción | ⬜ | Panel → Billing |
| Frecuencia de backup | ⬜ | Panel → Database → Backups |
| Retención de backups | ⬜ | ídem |
| PITR habilitado | ⬜ | ídem |
| Ventana de PITR | ⬜ | ídem |
| Región del proyecto | ⬜ | Panel → General |
| Backups cifrados | ⬜ | Documentación del plan |
| **Fecha del ejercicio** | ⬜ | |
| **Tiempo de restauración medido** | ⬜ | Pasos 1–4 |
| **Tiempo de reapuntado medido** | ⬜ | Paso 7 |
| **Integridad confirmada** | ⬜ | §4 |
| **Postura de seguridad confirmada** | ⬜ | §4 |

### De dónde salen el RPO y el RTO

No son objetivos que se eligen primero: en este producto **son consecuencias de
lo que el panel diga**, y conviene calcularlos así en vez de declararlos.

- **RPO** (cuánto dato se puede perder) **= la ventana de PITR si está
  habilitado; la frecuencia de backup si no.** Sin PITR y con backup diario, el
  RPO real es *hasta 24 horas de sets, análisis y cobros*. Con PITR, minutos.
  Esta única fila del panel cambia el RPO en dos órdenes de magnitud, y es por
  eso que es la primera cosa a leer.
- **RTO** (cuánto se tarda en volver) **= tiempo de restauración + tiempo de
  reapuntado.** Los dos medidos, no estimados. El segundo tramo es el que la
  gente olvida, y acá pesa: ver §6.

---

## 6 · El tramo que nadie escribe: restaurar es también rotar

Un proyecto de Supabase restaurado **es un proyecto nuevo**, con su propia URL y
su propia clave de servicio. La app no lo encuentra sola: llega a la base por
`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, que son dos variables de entorno
de Vercel.

Así que la segunda mitad de una recuperación real es, exactamente, el
procedimiento de [`secret-rotation.md`](secret-rotation.md):

1. Poner la URL y la clave nuevas en las variables de producción de Vercel.
2. **Redesplegar** — sin eso las variables no existen.
3. Confirmar con `/api/health`, que es el único camino que ejercita el chequeo
   de base.

**Eso significa que el RTO de este producto no puede ser menor que un deploy de
Vercel**, por rápido que sea el backup. Y significa que el ejercicio de la §3
mide dos cosas distintas que hay que cronometrar aparte, porque se optimizan
distinto: el primer tramo depende del plan de Supabase, el segundo de nada que
se pueda comprar.

---

## 7 · Las tres trampas del ejercicio

### 1 · El proyecto descartable es una copia completa de datos personales de gente real

Y ésa es la trampa que hace que este ejercicio pueda **empeorar** la postura de
privacidad que viene a defender.

Un backup restaurado contiene los mails de todos los usuarios, sus sets, sus
locales y sus franjas horarias — la combinación más identificante que guarda el
producto según el [RoPA](../compliance/ropa.md). En un proyecto nuevo, eso es:

- un tratamiento que **no está declarado en el RoPA**;
- en un proyecto donde **el barrido de retención no apunta**, así que las cuatro
  ventanas no corren sobre esa copia;
- cuya existencia **nadie está siguiendo**, así que se queda ahí.

Por eso el paso 8 no es limpieza. **El ejercicio se hace en una sesión, con el
proyecto borrado al final de la sesión, y el borrado se anota.** Si el proyecto
queda vivo "por si acaso", el ejercicio creó una brecha de privacidad más grande
que el hueco de disponibilidad que cerró.

Si por algún motivo hay que dejarlo más de un día: va al RoPA, con fecha de
borrado.

### 2 · Confirmar la integridad de lo que se mira, no de lo que está a mano

La tentación es abrir la tabla `profiles`, ver filas, y anotar "integridad OK".
Las dos comprobaciones que cuestan algo son las dos que fallan distinto: el
**orden** de los tracks de un set, y que `admin_audit_log` haya sobrevivido.
Ninguna de las dos se ve mirando un `count`.

### 3 · Restaurar en la misma región, o el número no sirve

Un proyecto descartable creado en la región que el panel ofrece por defecto
puede no ser la de producción. El tiempo medido sería de otra infraestructura,
y sería el número que después se cita como RTO.

---

## 8 · Qué hacer cuando los números estén

1. Llenar la tabla de la §5.
2. Actualizar las cinco filas del Art. 32(1)(c) en
   [`../compliance/security-measures.md`](../compliance/security-measures.md).
   Tres pasan a verde (runbook, restauración probada, RTO/RPO) y dos a un hecho
   confirmado (backups, PITR).
3. Cerrar la tarea *"Probar backups cifrados y restauración real"* de la fase F5
   de Seguridad, y el gap **G-3** de
   [`../audit360/f4-consolidation-2026-09.md`](../audit360/f4-consolidation-2026-09.md).
4. Anotar la fecha acá y agendar el siguiente ejercicio. **Un RTO medido una vez
   envejece**: el volumen de datos crece y el tiempo de restauración con él. La
   cadencia razonable es anual, junto con la rotación de higiene de marzo.

---

## 9 · Lo que esta página no puede darte

- **No se ejecutó.** Los pasos salen de la arquitectura y de la documentación de
  Supabase, no de haber restaurado nada. Es la diferencia entre un runbook y una
  evidencia, y está escrita así a propósito: la tabla de la §5 con huecos es
  información, y llenarla con estimaciones la destruiría.
- **No cubre un incidente en WorkOS ni en Stripe** (§1).
- **No hay procedimiento de recuperación de integridad parcial** — restaurar
  *una* tabla o *un* usuario desde un backup completo sin pisar el resto. Es un
  escenario más probable que la pérdida total y hoy no tiene respuesta. Primera
  cosa a escribir después de que el ejercicio de esta página dé sus números.
