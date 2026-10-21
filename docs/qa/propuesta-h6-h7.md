# H-6 y H-7 — Settings y Help Center, ítem por ítem

Lote 21, 21/10/2026. **Es una propuesta, no hay nada implementado.** Decide
Robertino. Hallazgos de origen: `docs/qa/output-test-tanda-01.md`, H-6
(«Account» debería ser «⚙️ Settings») y H-7 (el contacto no debería vivir en
la cuenta; pedido: un «🛟 Help Center»).

La lista sale de lo que el producto **ya tiene**: las secciones de
`app/(en)/dashboard/account/page.tsx`, en su orden de hoy, y las páginas
públicas que existen. No suma ninguna función nueva. Donde el pedido nombra
algo que no existe (buscador, Discord), lo digo.

---

## Hoy: qué hay en Account

| # | Sección de hoy | Qué hace |
|---|---|---|
| 1 | Tus datos: nombre, email, idioma, notación de tonalidad | El nombre se edita (`NameForm`). Email, idioma y notación **sólo se muestran**: el idioma se cambia con el selector del sidebar y la notación desde la tabla de tracks |
| 2 | Tu plan | `PlanCard`, con el único botón que abre el portal de Stripe |
| 3 | Escribinos | `LandingContactForm`, con nombre y email precargados |
| 4 | Tus datos, para llevar | Descarga de `/api/account/export` |
| 5 | Tus derechos | `PrivacyRequestForm` |
| 6 | Borrar la cuenta | `DeleteAccount` |

---

## H-6 · ⚙️ Settings: qué entra

Settings es lo que el usuario **configura o decide sobre su cuenta**. Con ese
criterio, entra todo lo de Account menos el contacto.

| Ítem | Va a | Por qué |
|---|---|---|
| Nombre (editable) | Settings · Perfil | Es configuración |
| Email (sólo lectura, lo custodia WorkOS) | Settings · Perfil | Es configuración, aunque no se edite acá |
| Idioma | Settings · Preferencias | Hoy se muestra acá y se cambia en el sidebar. **Propuesta:** que se pueda cambiar también acá; el selector del sidebar queda |
| Notación de tonalidad | Settings · Preferencias | Hoy se cambia desde la tabla de tracks, donde se usa. **Propuesta:** el mismo control acá; el de la tabla queda |
| Plan y «Gestionar suscripción» | Settings · Plan | Es el único lugar fuera del dashboard con el botón de Stripe (ver `docs/qa/decisiones-h1-h2.md`). Los textos de borrado dicen «Gestionar suscripción más arriba»: tiene que seguir arriba de Borrar |
| Descargar mis datos | Settings · Datos y privacidad | Es una decisión sobre la cuenta |
| Mis derechos (pedido de privacidad) | Settings · Datos y privacidad | ídem. Es un trámite legal, no una consulta de ayuda |
| Borrar la cuenta | Settings · al final | Como hoy |
| **Escribinos** | **Sale** → Help Center | H-7 |

Dos cosas para Robertino:

- **El nombre.** «Settings» en el nav, con «My Account» como primera sección
  adentro, como pide el hallazgo. En español: «Ajustes» y «Tu cuenta».
- **La ruta.** Si `/dashboard/account` pasa a `/dashboard/settings`, hace
  falta un redirect. El mail de borrado de cuenta
  (`services/account-deletion-email-service.ts`) tiene esa URL en un botón, y
  mails ya enviados no se pueden corregir. Además, tres e2e de
  `subscription-billing` la visitan. El portal de Stripe no se ve afectado:
  vuelve a `/dashboard`. Mantener la ruta y cambiar sólo el rótulo es más
  barato.
  Mi recomendación es mantenerla.

---

## H-7 · 🛟 Help Center: qué entra

Help Center es lo que el usuario **lee o pregunta** cuando no entiende algo.
Del pedido (buscador, guías, docs, blog, Discord), esto es lo que ya existe:

| Ítem | Existe | Ruta |
|---|---|---|
| Empezar: instalar y primer set | ✅ | `/install` |
| La guía de la curva de energía | ✅ | `/guide` · `/es/guia/…` |
| Formatos de import (qué lee, de qué programa) | ✅ | `/import-formats` |
| Energy tags | ✅ | `/energy-tags` |
| Glosario | ✅ | `/glossary` |
| Cheat sheet armónico | ✅ | `/harmonic-mixing-cheat-sheet` |
| Herramientas gratis | ✅ | `/tools` |
| Blog | ✅ | `/blog` |
| Privacidad, términos, cookies, subprocesadores | ✅ | las cuatro páginas legales |
| **Escribinos** (el formulario) | ✅ | hoy en Account y en la landing |
| Buscador de ayuda | ❌ | No existe. Con ocho páginas, una lista agrupada alcanza. Propongo no construirlo ahora |
| Discord | ❌ | No hay servidor. Si Robertino abre uno, es un enlace más en la lista |
| FAQ de la cuenta | ❌ | No hay una página propia. Hay FAQ en las comparaciones y en la guía, que son de marketing |

Todo lo de arriba son páginas públicas que ya existen. El Help Center sería
**una página del dashboard que las agrupa y enlaza**, en los dos idiomas con
`localizedPath()`, más el formulario. No hay contenido nuevo que escribir.

## Dónde vive el formulario de contacto

**Al pie del Help Center, en `/dashboard/help`, con nombre y email precargados
como hoy.** El de la landing queda como está, para quien no tiene cuenta.

Por qué:

1. **Quien escribe desde adentro tiene un problema**, y el Help Center es
   donde lo va a buscar. Poner las guías arriba y el formulario abajo hace que
   muchas preguntas se contesten antes de escribir, sin esconder el formulario.
2. **En Settings estaba entre el plan y la descarga de datos.** Ahí un pedido
   de ayuda se mezclaba con «Tus derechos», que es otro canal: un trámite
   legal con plazo. Separarlos ayuda a no confundir los dos pedidos.
3. **El precargado se mantiene.** Dentro del dashboard la sesión está; en la
   landing no. El comentario del código explica por qué importa: «making
   someone retype them is how a two-line bug report becomes no bug report».
4. **Un solo componente.** `LandingContactForm` ya se usa en los dos lugares;
   se mueve el uso, no el componente, y `/api/contact` no cambia.

---

## Lo que tiene que decidir Robertino

- ¿«Settings / Ajustes» y «Help Center / Ayuda» como dos ítems del nav?
- ¿Se mantiene la ruta `/dashboard/account`? Recomiendo que sí.
- ¿Idioma y notación se pueden cambiar también desde Settings?
- ¿El formulario va al pie del Help Center?
- ¿Discord? Sólo si va a haber alguien atendiéndolo.

Con eso, H-6 y H-7 son un lote chico: dos páginas, el nav, el copy en los dos
idiomas y los e2e de `account`. Fila del banco: L21.10.
