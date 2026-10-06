# La entidad, lista para pegar — SEO-E22

**06/10/2026, lote 18.** Lo que hace lento dar de alta seis perfiles no es
abrirlos: es redactar seis veces lo mismo con límites distintos. Esto es eso
redactado. **Abrir las cuentas, completar los formularios y elegir los handles
es de Robertino**; este documento no abrió ninguna cuenta ni completó ningún
formulario.

Tres reglas que no se aflojan, y por qué:

- **La misma frase en todos lados.** El punto de SEO-E22 es que un motor
  resuelva «EnergyCurve» a una sola cosa. Cada descripción de abajo sale de la
  frase canónica del sitio, la del pie, que es también la `description` del
  `Organization` en `lib/seo.ts`. Donde hay que acortar, se recorta esa frase;
  donde sobra lugar, se le suma la frase siguiente que ya está publicada en el
  hero. Ninguna frase de abajo es nueva.
- **Desambiguar sin sonar a defensa.** `energycurve.com` es una empresa
  agrícola de Missouri (`docs/brand-name-collision.md`). Ningún perfil la
  nombra: alcanza con que el nuestro diga «DJ» temprano y se escriba en una
  palabra, como manda la decisión 3 de ese documento.
- **Nada que no podamos sostener.** Ni usuarios, ni precisión, ni premios. La
  palabra «AI» tampoco: si va en el posicionamiento es una decisión de
  Robertino, pendiente (fila 20 de `docs/pendientes-robertino.md`).

---

## Lo canónico, una vez

| Campo | Valor | De dónde sale |
|---|---|---|
| Nombre | **EnergyCurve** — una palabra, siempre | `lib/seo.ts`, `buildOrganization().name` |
| Nombre alternativo | **EnergyCurve DJ** | `lib/seo.ts`, `alternateName` |
| URL canónica | **https://energycurve.app** | `SITE_URL`; la decisión 2 de `docs/brand-name-collision.md` |
| Frase canónica (en) | EnergyCurve helps DJs understand set energy, transitions, and performance flow. — **79 caracteres** | `lib/content/site-copy.ts`, `footer.description` |
| Frase canónica (es) | EnergyCurve ayuda a DJs a entender la energía del set, las transiciones y el flujo de la performance. — **101 caracteres** | ídem |
| Frase siguiente (en) | Import from Rekordbox, Traktor, or your own audio files. EnergyCurve scores the set out of 10, draws the energy curve it actually traces, and names the exact move that fixes it — then exports the new order back to your DJ software. — **231 caracteres** | `hero.subtitle` |
| Operador | **StageLink LLC** | `OPERATING_COMPANY` en `lib/seo.ts` |
| Mail | hello@energycurve.app | `Organization.email` |

Los largos se contaron con un script el 06/10, no a ojo.

**Los logos** (`public/brand-kit/`, medidos con `file`):

| Archivo | Medidas | Para |
|---|---|---|
| `app-icon.png` | 437 × 437 | avatar cuadrado: Product Hunt, X, TikTok, Crunchbase, AlternativeTo |
| `logo-horizontal.png` | 875 × 187 | donde se pida un logo apaisado; es el `logo` del `Organization` |
| `logo-icon-lockup.png` | 437 × 437 | alternativa cuadrada con el nombre, si el avatar se ve muy chico sin texto |

---

## Por destino

### Product Hunt

**Límites:** eslogan **60** caracteres, descripción **500**. El nombre no
tiene límite publicado: «sólo el nombre del producto, sin descripción ni
emojis». Fuente primaria: la guía de lanzamiento de Product Hunt
([producthunt.com/launch/preparing-for-launch](https://www.producthunt.com/launch/preparing-for-launch)),
leída el 06/10.

| Campo | Valor | Largo |
|---|---|---|
| Nombre | EnergyCurve | 11 |
| Eslogan | Helps DJs understand set energy, transitions, and flow | **54** / 60 |
| Descripción | EnergyCurve helps DJs understand set energy, transitions, and performance flow. Import from Rekordbox, Traktor, or your own audio files. EnergyCurve scores the set out of 10, draws the energy curve it actually traces, and names the exact move that fixes it — then exports the new order back to your DJ software. | **311** / 500 |
| Tópicos | Music · Productivity · Audio | — |
| Web | https://energycurve.app | — |
| Logo | `app-icon.png` | — |

El eslogan es la frase canónica sin el sujeto y con «performance flow»
recortado a «flow»: el recorte de la misma frase, no otra.

### AlternativeTo

**Límites: sin confirmar.** El formulario de alta está detrás del inicio de
sesión (`alternativeto.net/manage-item/` devuelve la pantalla de login) y no hay
una página pública que los publique. Se ven al cargar.

| Campo | Valor |
|---|---|
| Nombre | EnergyCurve |
| Descripción corta | EnergyCurve helps DJs understand set energy, transitions, and performance flow. (79) |
| Descripción larga | la de Product Hunt (311) |
| Categoría | Audio & Music |
| Plataforma | Online / Web |
| Licencia | Freemium |
| «Alternativa a» | Mixed In Key, DJ.Studio, SetFlow, Lexicon — los cuatro que el sitio ya compara con fuente (`/compare/*`), y ninguno más |
| Web | https://energycurve.app |

### Crunchbase — bajo StageLink LLC

**Límites: sin confirmar.** El centro de ayuda de Crunchbase devolvió 403 a la
lectura, y la única cifra encontrada en una fuente secundaria (30–120
caracteres para la descripción corta) no es verificable. Lo que sí está en su
guía, según los resultados de búsqueda: la descripción va en **tercera
persona**.

La forma propuesta: el perfil de organización es **StageLink LLC**, que es la
empresa que factura y la que figura como `parentOrganization` en el schema, y
EnergyCurve va como su producto. Crear un «EnergyCurve» como empresa aparte
diría que hay dos compañías, que es justo lo que `lib/seo.ts` evita cuando no
pone `stagelink.art` en `sameAs`.

| Campo | Valor | Largo |
|---|---|---|
| Organización | StageLink LLC | — |
| Producto | EnergyCurve | — |
| Descripción corta del producto | EnergyCurve helps DJs understand set energy, transitions, and performance flow. | **79** — entra en el rango secundario de 120 |
| Descripción larga | la de Product Hunt | 311 |
| Industrias | Music · Software · Audio | — |
| Web | https://energycurve.app | — |

### X

**Límites:** nombre **50**, bio **160**. **Fuente secundaria**: el centro de
ayuda de X devolvió 403 a la lectura; varias guías de 2026 coinciden en esas
cifras. El handle sólo admite letras, números y guion bajo, así que el
`energycurve.app` de Instagram no se puede repetir.

| Campo | Valor | Largo |
|---|---|---|
| Nombre | EnergyCurve | 11 / 50 |
| Handle | `@energycurveapp` si está libre — **comprobarlo al dar de alta** | — |
| Bio | EnergyCurve helps DJs understand set energy, transitions, and performance flow. Import from Rekordbox, Traktor, or your own audio files. | **136** / 160 |
| Web | https://energycurve.app | — |
| Avatar | `app-icon.png` | — |

### TikTok

**Límites:** nombre **30**, bio **80**. **Fuente secundaria**, por la misma
razón: la página de soporte de TikTok no publica la cifra en el texto que se
puede leer; las guías coinciden.

| Campo | Valor | Largo |
|---|---|---|
| Nombre | EnergyCurve | 11 / 30 |
| Handle | `@energycurve.app`, el mismo que Instagram — **comprobarlo al dar de alta** | — |
| Bio | EnergyCurve helps DJs understand set energy, transitions, and performance flow. | **79** / 80 |
| Avatar | `app-icon.png` | — |

La bio entra con un carácter de sobra. Si la plataforma cuenta distinto y no
entra, el recorte es el mismo del eslogan de Product Hunt (54).

### Wikidata

**Límites:** etiqueta y descripción, **250** caracteres cada una
([Help:Label](https://www.wikidata.org/wiki/Help:Label), leída el 06/10). La
guía de estilo de [Help:Description](https://www.wikidata.org/wiki/Help:Description)
pide además: **entre dos y doce palabras**, minúscula al principio salvo nombre
propio, sin artículo inicial y sin punto final. Su función es **distinguir
ítems con la misma etiqueta**: es el campo donde la desambiguación es lo que se
espera, no una defensa.

| Campo | en | es |
|---|---|---|
| Etiqueta | EnergyCurve | EnergyCurve |
| Descripción | DJ set analysis software by StageLink LLC (41) | software de análisis de sets de DJ, de StageLink LLC (52) |
| También conocido como | EnergyCurve DJ | EnergyCurve DJ |

Declaraciones, sólo las que el sitio sostiene:

| Propiedad | Valor |
|---|---|
| instancia de (P31) | software (Q7397) |
| sitio web oficial (P856) | https://energycurve.app |
| desarrollador (P178) | StageLink LLC — necesita su propio ítem, o queda sin esta declaración |

**Una advertencia, que no es una regla nuestra:** Wikidata borra ítems sin
referencias públicas y serias que los sostengan (su política de notabilidad).
Un ítem creado sólo con el propio sitio puede no sobrevivir. Si existe una
mención en un medio, conviene que el ítem la cite. Esto no se verificó contra
un caso concreto: es lo que dice la política, no una predicción.

---

## El `sameAs` final

Comentado en `lib/seo.ts`, arriba de `ENTITY_PROFILES`, **sin aplicar**. Un
`sameAs` que apunta a un perfil que no existe es una señal de entidad rota,
peor que no tener la propiedad. Cada línea se descomenta el día que su perfil
existe, con la URL real que haya quedado — los handles de arriba están sin
comprobar.

Instagram ya está en el array y sigue ahí: existe y es nuestro, aunque esté
vacío (verificado el 19/09, ver el comentario de `lib/seo.ts`).
