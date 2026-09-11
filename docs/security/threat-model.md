# Modelo de amenazas — EnergyCurve

Fase F0 del proyecto *2. Auditoría de Seguridad*. Escrito el 11/09/2026 contra
`main` @ `d45ec1d`.

El plan original pedía inventariar medidores, empresas de servicios públicos y
buckets públicos. Este documento modela el producto que existe.

---

## Qué hay que proteger, y por qué

| Activo | Dónde vive | Por qué importa |
|---|---|---|
| **Los sets de un DJ** | `playlists` + `tracks` en Supabase | Un set sin tocar es trabajo no publicado. Filtrarlo antes de la fecha es filtrar la sorpresa de alguien. |
| **La librería del DJ en su máquina** | Fuera de nuestro alcance, pero **le escribimos encima** | El export nativo modifica el archivo de colección de Rekordbox o Traktor. Un bug ahí destruye datos que no son nuestros y que no tenemos cómo restaurar. Ya pasó una vez. |
| **Identidad y sesión** | WorkOS | Da acceso a todo lo de arriba. |
| **Estado de facturación** | `profiles.plan` + `billing_events` | Escribirlo sin pagar es robo; borrarlo es cortarle el servicio a alguien que pagó. |
| **La service-role key de Supabase** | Variable de entorno en Vercel | Es la llave maestra. Saltea RLS por diseño. |
| **El secreto de webhooks de Stripe** | Variable de entorno | Falsificarlo otorga planes pagos gratis. |
| **`CURVE_SHARE_SECRET`** | Variable de entorno | Firma los links públicos de curva. |
| **La clave de Anthropic** | Variable de entorno | Costo directo por uso. |

## Qué datos personales tocamos

Poco, y conviene decirlo con precisión porque el plan asumía perfilado de hábitos
de vida.

- Dirección de mail y nombre (los guarda WorkOS; `profiles` solo tiene el mail).
- Metadata de playlists y tracks: títulos, artistas, BPM, tonalidad, comentarios.
- Mail del colaborador en sets compartidos, visible para el dueño y viceversa.
- Datos de facturación, que viven en Stripe. Nosotros guardamos el id de cliente.
- Eventos de PostHog, identificados por `profileId` y con la IP desactivada.
- Mensajes del formulario de contacto.
- Artista y título hacia GetSongBPM cuando el usuario opta por el lookup.
- Metadata de tracks hacia Anthropic en el ordenamiento inteligente.

**El audio nunca sale del navegador.** Se analiza con Web Audio localmente y solo
viaja el JSON resultante. Es una decisión de arquitectura con consecuencia de
privacidad, y hay que defenderla en cada feature nueva.

---

## Superficies de ataque

| Superficie | Autenticación | Nota |
|---|---|---|
| Rutas públicas de marketing | Ninguna | Estáticas y prerenderizadas |
| `POST /api/contact` | Ninguna | El único POST sin sesión |
| `GET /api/health` | Ninguna | Sonda de uptime |
| `GET /c/[token]` | Firma HMAC | Sin estado, sin revocación por link |
| `POST /api/billing/webhook` | Firma de Stripe | Sin sesión por diseño |
| `/dashboard/**` + server actions | Sesión WorkOS vía `proxy.ts` | La mayor parte de las escrituras |
| `POST /api/playlists/[id]/smart-order` | Sesión + propiedad + cuota | La única que gasta plata por llamada |
| `/backstage/**` + `/api/backstage/*` | Lista blanca de mails | Puede suspender y borrar usuarios |
| Import de archivos | Sesión | XML hasta 12 MB, parseado en el servidor |

---

## STRIDE

Cada amenaza con su vector, el control que debería existir, y el estado real
medido en esta auditoría.

### Suplantación

| Amenaza | Vector | Control esperado | Estado |
|---|---|---|---|
| Robo de cuenta por fuerza bruta | Login repetido | Límite de tasa + política de contraseña | ⚠️ El límite vive en memoria del proceso: por instancia, se reinicia en frío (S-06) |
| Robo por reset de contraseña | Pedir reset del mail de otro | Anti-enumeración + límite | ✅ Respuesta neutral para mails desconocidos; ⚠️ mismo límite débil |
| Alta con mail ajeno | Registrarse sin verificar | Verificación obligatoria | ⚠️ `AUTH_REQUIRE_EMAIL_VERIFICATION` está en `false` por defecto; confirmar producción |
| Webhook falsificado | POST a `/api/billing/webhook` | Verificación de firma sobre el cuerpo crudo | ✅ Verificado con el SDK real, incluido cuerpo alterado después de firmar |
| Suplantar a un admin | Llegar a `/backstage` | Lista blanca + MFA | ⚠️ Lista blanca sí; **MFA no**, y el fallback está hardcodeado (S-08) |

### Manipulación

| Amenaza | Vector | Control esperado | Estado |
|---|---|---|---|
| Editar el set de otro | Adivinar un id de playlist | Filtro por dueño en cada consulta | ✅ Aplicado en la capa de servicios y **ahora con tests** que lo prueban rompiéndolo |
| Otorgarse un plan pago | Manipular el checkout | Resolver el precio en el servidor | ✅ Un test manda `priceId`, `price` y `amount: 0` y verifica que ninguno llega a Stripe |
| Reprocesar un evento de pago | Reenviar un webhook | Idempotencia | ✅ Clave primaria en `billing_events` |
| Falsificar un link de curva | Construir un token | HMAC con comparación de tiempo constante | ✅ Firma verificada; ⚠️ sin revocación ni expiración (S-07) |

### Repudio

| Amenaza | Control esperado | Estado |
|---|---|---|
| Un admin suspende a alguien y lo niega | Registro de auditoría | ⚠️ Solo `logInfo` a stdout. No hay tabla de auditoría |
| Un usuario niega haber pagado | Registro de eventos | ✅ `billing_events` guarda el evento completo de Stripe |

### Divulgación

| Amenaza | Vector | Control esperado | Estado |
|---|---|---|---|
| Leer el set de otro | Id en la URL | Filtro por dueño | ✅ Con tests |
| Datos personales en logs | Cualquier `logInfo` | Sin PII en claro | ⚠️ **Corregido** para el formulario de contacto (S-03); los eventos de auth siguen registrando direcciones de mail |
| Fuga de la service-role key | Variable de entorno | Alcance por entorno + rotación | ⚠️ Sin vault ni runbook de rotación. Un compromiso es total |
| Tokens en URLs hacia analytics | `?token=` en pageviews | No mandar query strings sensibles | ⚠️ Las páginas de reset y verificación llevan el token en la URL y PostHog captura `$current_url` |
| Mail del colaborador expuesto | Invitación por mail | Consentimiento | ⚠️ La invitación no requiere aceptación |

### Denegación de servicio

| Amenaza | Vector | Control esperado | Estado |
|---|---|---|---|
| Bomba de entidades XML | Import de Rekordbox o Traktor | Límites del parser + guarda propia | ✅ **Corregido**: librería actualizada y guarda estructural propia (S-02) |
| Agotar la cuota de IA de otro | Adivinar ids de playlist | Chequear propiedad antes del límite | ✅ Con test del orden en que disparan los guards |
| Bombardeo de mails vía reset | Pedir reset en loop | Límite por mail | ⚠️ Límite en memoria (S-06) |
| Agotar la base de datos | Consultas sin paginar | Paginación | ⚠️ La librería global no pagina y trunca en silencio a volumen alto |

### Elevación de privilegios

| Amenaza | Vector | Control esperado | Estado |
|---|---|---|---|
| Usuario común llega al panel | Adivinar la URL | Guarda del lado del servidor | ✅ `requireBackstageSession` en el layout, con test de paridad del matcher |
| Bypass de `proxy.ts` | Inyección en parámetros de ruta | Framework al día | ✅ **Corregido**: era CVSS 8,1 en Next 16.2.3 (S-01) |
| Colaborador edita sin turno | Llamar la acción de reorden directo | Chequeo del lock | ⚠️ Correcto hoy, pero autoriza **a dos saltos** de la escritura: `reorderTracksAsLockHolder` no verifica nada por sí misma |

---

## Los tres escenarios que más deberían preocupar

Priorizados por impacto por probabilidad, no por severidad nominal.

### 1. La service-role key se filtra

Es el único camino a la base de datos. RLS está activo con cero políticas, lo que
es denegar-por-defecto para `anon`, pero esa llave **saltea RLS por diseño**. No
hay segunda barrera: si se filtra, se lee y se escribe todo, de todos.

Mitigación existente: `import "server-only"` en el único módulo que la usa, y
nada de cliente de navegador. Mitigación ausente: vault, rotación, y cualquier
alerta que note un acceso desde fuera de Vercel.

### 2. Un bug de export vuelve a destruir librerías

Ya pasó, en septiembre de 2026, durante semanas y en producción. Es el único
riesgo del producto donde el daño es **irreversible y ajeno**: no podemos
restaurar la colección de Traktor de nadie.

Mitigación existente: los payloads de origen se devuelven byte a byte, y hay
siete tests que se ponen en rojo si eso se rompe. Verificado inyectando el bug
original. Mitigación ausente: la verificación del lado de Traktor, que solo se
puede hacer importando de verdad.

### 3. El panel de administración cae

Una lista blanca de mails sin MFA, con el fallback hardcodeado y sin registro de
auditoría, delante de acciones que borran usuarios de WorkOS y de la base. Si la
cuenta de Google de ese mail se compromete, no hay segundo factor ni rastro
posterior de lo que hizo el atacante.

---

## Reglas de engagement de esta auditoría

- Contra **producción**: solo lectura pasiva y sin sesión. Cabeceras, TLS,
  `robots.txt`, `/api/health`, y tiempos con volumen mínimo. Nada que escriba.
- Todo lo que muta corre en **local** contra Supabase de dev y Stripe en modo test.
- Las pruebas activas de IDOR y escalamiento de privilegios necesitan las tres
  cuentas de prueba y todavía no se corrieron.
- No se ejecutan escáneres automáticos contra producción.
