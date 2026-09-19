/**
 * The glossary: twenty-one words a DJ meets while preparing a set.
 *
 * Written in Spanish first and translated, because the Spanish search space is
 * the one our own AEO baseline named as winnable and the one the blog already
 * writes for. The English is a translation, not a separate text.
 *
 * ## Rules this file follows, because a glossary is where they break first
 *
 * - **Nothing here invents a rule the product enforces elsewhere.** The energy
 *   scale comes from `lib/product/strategy.ts` through `<EscalaEnergia>`, and
 *   harmonic compatibility comes from the transition table in
 *   `lib/music/harmonic-transitions.ts` through the tools. An entry that wanted
 *   to restate either would be a second source of truth, and the older articles
 *   already show how that ends: two of them describe the wheel-distance rule the
 *   table replaced in #225.
 * - **No numbers we have not measured.** No user counts, no accuracy claims, no
 *   "most DJs". Where something is a convention rather than a fact, the entry
 *   says it is a convention.
 * - **Each body is 150–300 words**, enforced by `tests/glossary.test.ts`. The
 *   floor is there because a forty-word entry is a dictionary stub competing for
 *   a query it cannot answer; the ceiling because past three hundred it is an
 *   article and belongs in the blog.
 *
 * Three words that were on the first list — compás, tracklist and residencia —
 * are deliberately absent: none of them reached a hundred and fifty useful words
 * without padding. Leaving them out was the decision; do not add them back.
 */

import type {
  ArticleLink,
  Bilingual,
  ContentLink,
} from "@/lib/content/content-nodes"
import type { SiteLocale } from "@/lib/content/site-copy"

export interface GlossaryTerm {
  /** Stable identifier. Used by `<Termino id="...">` and as the anchor in the index. */
  id: string
  /** The URL segment, per language — these differ, which is why they live here. */
  slug: Record<SiteLocale, string>
  title: Bilingual
  /** One or two sentences. The tooltip and the index both show exactly this. */
  short: Bilingual
  /** The page's meta description. 140–155 characters, enforced by test. */
  description: Bilingual
  /** The body, as markdown for `lib/blog/markdown.ts`. 150–300 words. */
  body: Bilingual
  /** Pages on this site worth reading next. */
  links?: ContentLink[]
  /** Articles from the blog. Spanish only — that is where they exist. */
  articles?: ArticleLink[]
  /** Other entries in this glossary. */
  see?: string[]
  /**
   * The phrases that should become a link to this entry when they appear in an
   * article. Defaults to the title.
   *
   * Written out rather than derived, because the form a word takes in prose is
   * not the form it takes as a heading: an article says "tonalidades" and
   * "transiciones", and a stemmer that guessed at those would sooner or later
   * guess at something else too.
   */
  match?: Record<SiteLocale, string[]>
}

export const GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  {
    id: "curva-de-energia",
    slug: { es: "curva-de-energia", en: "energy-curve" },
    title: { es: "Curva de energía", en: "Energy curve" },
    short: {
      es: "El dibujo que forman, uno detrás de otro, los niveles de energía de los temas de un set.",
      en: "The shape formed by the energy levels of a set's tracks, one after another.",
    },
    description: {
      es: "Qué es la curva de energía de un set de DJ, cómo se lee de principio a fin y por qué mover un solo tema de lugar le cambia la forma a todo el set.",
      en: "What a DJ set's energy curve is, how to read it from the first track to the last, and why moving a single track changes the shape of the whole set.",
    },
    body: {
      es: `Si a cada tema de un set le ponés un número de energía y los graficás en el orden en que van a sonar, el resultado es la curva de energía. No es una métrica de un tema suelto: es lo que pasa **entre** los temas, y por eso cambia entera cuando movés uno solo de lugar.

Sirve porque es lo único que se puede mirar de un set antes de tocarlo. Escuchar una hora y media de música para saber si el arranque se cae lleva una hora y media; mirar la curva lleva diez segundos, y los problemas que tiene un set suelen ser de forma: un pozo en el medio, tres temas planos seguidos, un final que se apaga antes de terminar.

La forma correcta depende del [toque](/es/glosario/warm-up). Un warm-up que empieza arriba deja sin lugar a quien sigue; un [peak time](/es/glosario/peak-time) que arranca abajo tarda demasiado en llegar. Por eso EnergyCurve compara la curva contra el contexto que elegiste, no contra una forma ideal única.

Lo que la curva **no** dice es si el set suena bien. Dos temas pueden tener el mismo número y chocar por [tonalidad](/es/glosario/tonalidad), o encajar perfecto y aburrir. La curva es una de las capas, y es la que se puede leer sin escuchar.`,
      en: `Give every track in a set an energy number, plot them in the order they will play, and what you get is the energy curve. It is not a property of a single track: it is what happens **between** tracks, which is why moving one changes the whole shape.

It is useful because it is the one thing you can inspect about a set before playing it. Listening to ninety minutes of music to find out whether the opening sags takes ninety minutes; reading the curve takes ten seconds, and a set's problems are usually problems of shape — a dip in the middle, three flat tracks in a row, an ending that fades out before it finishes.

Which shape is right depends on the slot. A [warm-up](/glossary/warm-up) that opens high leaves the next DJ nowhere to go; a [peak time](/glossary/peak-time) that opens low takes too long to arrive. That is why EnergyCurve compares your curve against the context you chose rather than against one ideal shape.

What the curve does **not** tell you is whether the set sounds good. Two tracks can share a number and clash on [key](/glossary/key), or fit perfectly and bore. The curve is one layer, and it is the layer you can read without listening.`,
    },
    links: [{ path: "/tools/energy-curve", label: { es: "Analizá tu set gratis", en: "Analyse your set for free" } }],
    articles: [
      { slug: "esta-bien-el-orden-de-mi-set", label: { es: "¿Está bien el orden de mi set?", en: "Is my set in the right order?" } },
    ],
    see: ["energia-de-un-tema", "peak-time", "warm-up"],
    match: { es: ["curva de energía", "curvas de energía"], en: ["energy curve", "energy curves"] },
  },
  {
    id: "energia-de-un-tema",
    slug: { es: "energia-de-un-tema", en: "track-energy" },
    title: { es: "Energía de un tema", en: "Track energy" },
    short: {
      es: "Cuánto empuja un tema, resumido en un número del 1 al 10.",
      en: "How hard a track pushes, summarised as a number from 1 to 10.",
    },
    description: {
      es: "Qué mide el número de energía de un tema, en qué se diferencia del de Mixed In Key y por qué una escala del 1 al 10 alcanza para ordenar un set entero.",
      en: "What a track's energy number measures, how it differs from the Mixed In Key scale, and why a 1-to-10 range is enough to order a whole set by.",
    },
    body: {
      es: `La energía de un tema es cuánto empuja: cuánta intensidad mete en la pista en el momento en que suena. Se resume en un número del 1 al 10 porque es la escala que los DJs ya tienen en la cabeza —la misma que popularizó Mixed In Key— y cambiarla sólo agregaría una traducción mental más.

Es una simplificación, y conviene decirlo. Un tema no tiene un solo nivel de energía: tiene un [breakdown](/es/glosario/breakdown) que baja, un [build-up](/es/glosario/build-up) que sube y un [drop](/es/glosario/drop) que estalla. El número es el resumen de todo eso, útil para ordenar, inútil para describir el tema por dentro.

Hay una diferencia con Mixed In Key que vale la pena tener clara: su 1 a 10 puntúa cada tema por separado, y el nuestro se usa para puntuar el **set entero**. Un set lleno de dieces no saca diez: saca menos, porque no va a ningún lado.

De dónde sale el número depende de qué traigan tus temas. Si tienen [BPM](/es/glosario/bpm) en los tags, el motor lo usa como primera referencia; si traen una etiqueta de energía de otro programa, la respeta. Cuando un tema no tiene con qué estimarse, el producto lo dice en vez de inventar un número.`,
      en: `A track's energy is how hard it pushes — how much intensity it puts on the floor while it plays. It is summarised as a number from 1 to 10 because that is the scale DJs already carry in their heads, the one Mixed In Key popularised, and changing it would only add one more mental conversion.

It is a simplification, and it is worth saying so. A track does not have a single energy level: it has a [breakdown](/glossary/breakdown) that drops away, a [build-up](/glossary/build-up) that climbs and a [drop](/glossary/drop) that lands. The number summarises all of it — useful for ordering, useless for describing the track's insides.

One difference from Mixed In Key is worth keeping straight: their 1 to 10 scores each track on its own, and ours is used to score the **whole set**. A set of nothing but tens does not score ten. It scores lower, because it goes nowhere.

Where the number comes from depends on what your tracks carry. If they have [BPM](/glossary/bpm) in their tags, the engine uses it as a first reference; if they carry an energy tag from another program, it respects that. When a track has nothing to estimate from, the product says so instead of inventing a number.`,
    },
    links: [{ path: "/energy-tags", label: { es: "Cómo leemos las etiquetas de energía", en: "How we read energy tags" } }],
    see: ["curva-de-energia", "bpm", "drop"],
    match: { es: ["energía de un tema", "energía del tema"], en: ["track energy", "a track's energy"] },
  },
  {
    id: "bpm",
    slug: { es: "bpm", en: "bpm" },
    title: { es: "BPM", en: "BPM" },
    short: {
      es: "Pulsos por minuto: la velocidad de un tema, y el primer dato que mira cualquier DJ.",
      en: "Beats per minute: a track's tempo, and the first number any DJ looks at.",
    },
    description: {
      es: "Qué son los BPM de un tema, por qué el mismo tema puede figurar a 87 y a 174, y para qué sirve el tempo a la hora de ordenar un set y de mezclarlo.",
      en: "What a track's BPM means, why the same track can read as 87 and as 174, and what tempo is actually good for when you order a set and when you mix it.",
    },
    body: {
      es: `BPM son los pulsos por minuto: cuántos golpes de pulso entran en un minuto de música. Es el dato más viejo y más confiable de la cabina, porque se puede contar sin opinar.

La trampa más común es la del doble tiempo. Un tema de drum and bass a 174 y el mismo tema leído a 87 son la misma música: un programa contó el pulso y otro contó la mitad. Por eso una diferencia de BPM que parece enorme puede no serlo, y un salto del cincuenta por ciento entre dos temas seguidos casi siempre es esto y no un error de orden. El chequeador de compatibilidad lo marca aparte en vez de contarlo como un salto.

Para ordenar un set, el BPM sirve de dos maneras. Como referencia de energía, porque en la mayoría de los géneros más rápido se siente más arriba —una relación real pero floja, que el motor usa como punto de partida y no como veredicto—. Y como restricción de mezcla: dos temas muy separados de tempo se pueden juntar, pero cuesta, y ahí entra el [pitch](/es/glosario/pitch).

Si tus temas no traen BPM en los tags, no hay forma de adivinarlo del nombre del archivo. Hay que analizarlos con algún programa que lea el audio.`,
      en: `BPM is beats per minute: how many pulses fit into a minute of music. It is the oldest and most reliable number in the booth, because you can count it without having an opinion.

The usual trap is half time. A drum and bass track at 174 and the same track read as 87 are the same music: one program counted the pulse and another counted every second one. So a BPM difference that looks enormous may not be one, and a fifty per cent jump between two consecutive tracks is almost always this rather than a mistake in the order. The compatibility checker reports it separately instead of counting it as a jump.

For ordering a set, tempo is useful in two ways. As a proxy for energy, because in most genres faster feels higher — a real relationship but a loose one, which the engine uses as a starting point rather than a verdict. And as a mixing constraint: two tracks far apart in tempo can be brought together, but it costs something, and that is where [pitch](/glossary/pitch) comes in.

If your tracks carry no BPM in their tags, there is no guessing it from a filename. They have to be analysed by a program that reads the audio.`,
    },
    links: [{ path: "/tools/key-bpm-compatibility", label: { es: "Chequeá dos temas por tonalidad y BPM", en: "Check two tracks by key and BPM" } }],
    articles: [
      { slug: "tus-temas-no-tienen-bpm-ni-tonalidad", label: { es: "Tus temas no tienen BPM ni tonalidad", en: "Your tracks have no BPM or key" } },
    ],
    see: ["pitch", "beatmatching", "key-lock"],
    match: { es: ["BPM"], en: ["BPM"] },
  },
  {
    id: "tonalidad",
    slug: { es: "tonalidad", en: "key" },
    title: { es: "Tonalidad", en: "Key" },
    short: {
      es: "La nota y el modo en que está escrito un tema: lo que decide si dos temas suenan bien juntos.",
      en: "The note and mode a track is written in — what decides whether two tracks sit well together.",
    },
    description: {
      es: "Qué es la tonalidad de un tema, cómo se escribe en notación musical, en Camelot y en Open Key, y por qué importa al encadenar dos temas seguidos.",
      en: "What a track's key is, how it is written in musical notation, in Camelot and in Open Key, and why it matters when you chain two tracks together.",
    },
    body: {
      es: `La tonalidad es la nota alrededor de la cual está construido un tema y el modo en que lo está: La menor, Sol mayor, Fa sostenido menor. Dos temas en tonalidades que no se llevan producen, al superponerse, notas que chocan — y se escucha aunque el [BPM](/es/glosario/bpm) calce perfecto.

Se escribe de dos maneras. En notación musical, que es la que usa un músico, y en un código corto pensado para la cabina: [Camelot](/es/glosario/rueda-camelot) (**8A**, **9B**) u [Open Key](/es/glosario/open-key) (**1m**, **2d**). Las tres dicen lo mismo; las dos últimas existen para poder compararlas de un vistazo con las manos ocupadas.

El problema práctico no es entenderla, es tenerla. La tonalidad no viene con el archivo: la escribe algún programa después de analizar el audio, y detectarla bien es un problema difícil de verdad. Distintos programas discrepan sobre el mismo tema, sobre todo en música con poco contenido armónico. Si alguien te promete detección perfecta, desconfiá.

Cuando la mitad de tu set no tiene tonalidad en los tags, EnergyCurve no adivina: ordena por lo que sí puede leer y te dice qué quedó sin chequear. Es preferible a un veredicto de compatibilidad construido sobre datos que no existen.`,
      en: `A track's key is the note it is built around and the mode it is built in: A minor, G major, F sharp minor. Two tracks in keys that do not get along produce clashing notes when they overlap — and you hear it even when the [BPM](/glossary/bpm) lines up perfectly.

It is written two ways. In musical notation, which is what a musician uses, and in a short code meant for the booth: [Camelot](/glossary/camelot-wheel) (**8A**, **9B**) or [Open Key](/glossary/open-key) (**1m**, **2d**). All three say the same thing; the last two exist so you can compare them at a glance with your hands busy.

The practical problem is not understanding key, it is having it. Key does not come with the file: some program writes it after analysing the audio, and detecting it well is a genuinely hard problem. Different programs disagree about the same track, especially in music with little harmonic content. If someone promises you perfect detection, be suspicious.

When half your set carries no key in its tags, EnergyCurve does not guess: it orders by what it can read and tells you what went unchecked. That is better than a compatibility verdict built on data that is not there.`,
    },
    links: [{ path: "/tools/camelot-wheel", label: { es: "Rueda Camelot interactiva", en: "Interactive Camelot wheel" } }],
    articles: [
      { slug: "tus-temas-no-tienen-bpm-ni-tonalidad", label: { es: "Tus temas no tienen BPM ni tonalidad", en: "Your tracks have no BPM or key" } },
    ],
    see: ["rueda-camelot", "open-key", "mezcla-armonica"],
    match: { es: ["tonalidad", "tonalidades"], en: ["key", "keys"] },
  },
  {
    id: "rueda-camelot",
    slug: { es: "rueda-camelot", en: "camelot-wheel" },
    title: { es: "Rueda Camelot", en: "Camelot wheel" },
    short: {
      es: "Un círculo de 24 posiciones que traduce cada tonalidad a un código corto, tipo 8A o 9B.",
      en: "A 24-position circle that turns every key into a short code like 8A or 9B.",
    },
    description: {
      es: "Qué es la rueda Camelot, cómo se lee un código como 8A y por qué la distancia en la rueda no alcanza por sí sola para decidir si una mezcla funciona.",
      en: "What the Camelot wheel is, how a code like 8A reads, and why distance around the wheel is not enough on its own to decide whether a mix will work.",
    },
    body: {
      es: `La rueda Camelot es una forma de nombrar tonalidades pensada para la cabina. Cada tonalidad recibe un número del 1 al 12 y una letra: **A** para las menores, **B** para las mayores. La menor es **8A**, Do mayor es **8B**. Veinticuatro posiciones en total, dispuestas en círculo.

La gracia es que reemplaza el conocimiento musical por lectura de códigos: no hace falta saber qué es una quinta para ver que dos temas están cerca. Es la notación que usan Mixed In Key, Rekordbox y casi todo el software de DJ, así que en la práctica es el idioma común.

Acá conviene una advertencia. Durante años la regla que se enseñó con la rueda fue "quedate en la misma posición, andá al relativo, o movete una hora". Es una simplificación, y es más angosta de lo que corresponde: deja afuera movimientos que suenan perfectamente bien. En septiembre de 2026 adoptamos, de un DJ que nos mandó su archivo de referencia, una tabla de transiciones que reemplaza esa heurística de distancia. Nuestra rueda y nuestro chequeador leen de esa tabla, no de la regla de la hora.

Si dos herramientas te dan veredictos distintos sobre el mismo par de temas, es probable que estén usando reglas distintas y no que una esté rota.`,
      en: `The Camelot wheel is a way of naming keys built for the booth. Every key gets a number from 1 to 12 and a letter: **A** for minor, **B** for major. A minor is **8A**, C major is **8B**. Twenty-four positions in all, laid out in a circle.

The point of it is that it replaces musical knowledge with code reading: you do not need to know what a fifth is to see that two tracks sit close together. It is the notation Mixed In Key, Rekordbox and most DJ software use, so in practice it is the common language.

A warning belongs here. For years the rule taught alongside the wheel was "stay put, go to the relative, or move one hour". That is a simplification, and a narrower one than it should be: it leaves out moves that sound perfectly good. In September 2026 we adopted a transition table from a DJ who sent us his reference file, and it replaces that distance heuristic. Our wheel and our checker read from that table, not from the one-hour rule.

If two tools give you different verdicts on the same pair of tracks, they are probably using different rules rather than one of them being broken.`,
    },
    links: [{ path: "/tools/camelot-wheel", label: { es: "Abrí la rueda", en: "Open the wheel" } }],
    see: ["tonalidad", "open-key", "mezcla-armonica"],
    match: { es: ["rueda Camelot", "Camelot"], en: ["Camelot wheel", "Camelot"] },
  },
  {
    id: "open-key",
    slug: { es: "open-key", en: "open-key" },
    title: { es: "Open Key", en: "Open Key" },
    short: {
      es: "La otra notación corta de tonalidades, con m y d en lugar de A y B.",
      en: "The other short key notation, using m and d where Camelot uses A and B.",
    },
    description: {
      es: "Qué es la notación Open Key, en qué se diferencia de la Camelot y cómo convertir de una a la otra sin que se te corra una posición por el camino.",
      en: "What Open Key notation is, how it differs from the Camelot one, and how to convert between the two without slipping a position somewhere along the way.",
    },
    body: {
      es: `Open Key es la otra notación corta para tonalidades. Usa números del 1 al 12 y las letras **m** y **d** —menor y mayor, en la convención que popularizó Traktor— donde [Camelot](/es/glosario/rueda-camelot) usa **A** y **B**.

Las dos describen exactamente el mismo círculo de quintas; lo único que cambia es dónde empieza la numeración. Por eso la conversión entre una y otra es un corrimiento fijo, y por eso es tan fácil equivocarse por uno: si copiás la tabla de un lado y la comparás con la de otro, un error de una posición no se nota hasta que dos temas que deberían encajar suenan mal.

Cuál usás depende de tu software más que de una preferencia. Traktor tiende a Open Key; Rekordbox y Mixed In Key, a Camelot. Si trabajás con librerías que vienen de los dos mundos, vas a ver las dos notaciones en la misma carpeta.

Nuestra tabla de equivalencias muestra las tres formas —notación musical, Camelot y Open Key— en la misma fila, para que la conversión sea una lectura y no una cuenta. Es, además, el tipo de tabla que conviene chequear contra la tuya antes de confiarle un set: no todas las que circulan están bien.`,
      en: `Open Key is the other short notation for keys. It uses numbers from 1 to 12 with the letters **m** and **d** — minor and major, in the convention Traktor popularised — where [Camelot](/glossary/camelot-wheel) uses **A** and **B**.

Both describe exactly the same circle of fifths; the only difference is where the numbering starts. That makes conversion between them a fixed offset, and it is why an off-by-one is so easy: copy a table from one place, compare it against another, and a single position out of step goes unnoticed until two tracks that should have fitted sound wrong.

Which one you use depends on your software more than on taste. Traktor leans Open Key; Rekordbox and Mixed In Key lean Camelot. If you work with libraries that came from both worlds, you will see both notations in the same folder.

Our equivalence table shows all three forms — musical notation, Camelot and Open Key — on the same row, so conversion is something you read rather than something you calculate. It is also exactly the kind of table worth checking against your own before trusting a set to it: not all of the ones in circulation are correct.`,
    },
    links: [{ path: "/tools/camelot-wheel", label: { es: "Tabla de equivalencias", en: "Equivalence table" } }],
    see: ["tonalidad", "rueda-camelot"],
    match: { es: ["Open Key"], en: ["Open Key"] },
  },
  {
    id: "mezcla-armonica",
    slug: { es: "mezcla-armonica", en: "harmonic-mixing" },
    title: { es: "Mezcla armónica", en: "Harmonic mixing" },
    short: {
      es: "Encadenar temas cuyas tonalidades se llevan bien, para que la superposición no choque.",
      en: "Chaining tracks whose keys get along, so the overlap does not clash.",
    },
    description: {
      es: "Qué es la mezcla armónica, qué gana un set cuando las tonalidades encajan entre sí y cuándo conviene romper la regla a propósito en plena cabina.",
      en: "What harmonic mixing is, what a set gains when the keys fit together, and when it is worth breaking the rule on purpose in the middle of a night.",
    },
    body: {
      es: `Mezcla armónica es elegir el próximo tema mirando la [tonalidad](/es/glosario/tonalidad) además del [BPM](/es/glosario/bpm), de modo que los segundos en que los dos suenan juntos no produzcan un choque de notas. Es la diferencia entre una [transición](/es/glosario/transicion) que se siente inevitable y una que se siente como un corte.

La idea es vieja y la notación que la hizo popular es nueva: con [Camelot](/es/glosario/rueda-camelot) u [Open Key](/es/glosario/open-key), decidir si dos temas se llevan pasó de requerir oído entrenado a requerir leer dos códigos.

Dos advertencias que conviene tener juntas. La primera es que las reglas que circulan suelen ser más angostas que la realidad: muchas combinaciones que una regla simple marca como choque suenan bien. Por eso nuestras herramientas leen de una tabla de transiciones y no de la distancia en el círculo.

La segunda es que la mezcla armónica no es una obligación. Un cambio de tonalidad brusco, puesto a propósito en el momento correcto, es un recurso — y hay géneros enteros donde el contenido armónico es tan bajo que la pregunta casi no aplica. La regla sirve para no chocar sin querer, no para prohibir chocar a propósito.

EnergyCurve la usa como un criterio más al ordenar, junto con la energía.`,
      en: `Harmonic mixing means choosing the next track by [key](/glossary/key) as well as [BPM](/glossary/bpm), so that the seconds where both tracks sound together do not produce clashing notes. It is the difference between a [transition](/glossary/transition) that feels inevitable and one that feels like a cut.

The idea is old; the notation that made it popular is not. With [Camelot](/glossary/camelot-wheel) or [Open Key](/glossary/open-key), deciding whether two tracks get along went from requiring a trained ear to requiring you to read two codes.

Two warnings belong together here. The first is that the rules in circulation tend to be narrower than reality: plenty of combinations a simple rule calls a clash sound fine. That is why our tools read from a transition table rather than from distance around the circle.

The second is that harmonic mixing is not an obligation. An abrupt key change, placed deliberately at the right moment, is a tool — and there are whole genres where the harmonic content is low enough that the question barely applies. The rule exists to keep you from clashing by accident, not to forbid clashing on purpose.

EnergyCurve uses it as one criterion among others when ordering, alongside energy.`,
    },
    links: [{ path: "/tools/key-bpm-compatibility", label: { es: "Chequeá dos temas", en: "Check two tracks" } }],
    see: ["tonalidad", "rueda-camelot", "transicion"],
    match: { es: ["mezcla armónica", "mezcla armonica"], en: ["harmonic mixing"] },
  },
  {
    id: "phrasing",
    slug: { es: "phrasing", en: "phrasing" },
    title: { es: "Phrasing", en: "Phrasing" },
    short: {
      es: "Mezclar respetando las frases musicales, para que los cambios caigan donde el oído los espera.",
      en: "Mixing in step with the musical phrases, so changes land where the ear expects them.",
    },
    description: {
      es: "Qué es el phrasing al mezclar, por qué la música de pista se agrupa de a ocho y dieciséis compases, y cómo se escucha un set cuando el phrasing falla.",
      en: "What phrasing means when mixing, why dance music groups itself in eights and sixteens, and what a set sounds like when you get the phrasing wrong.",
    },
    body: {
      es: `La música electrónica de pista está construida en bloques: los compases se agrupan de a cuatro, de a ocho, de a dieciséis, y los cambios importantes —que entre el bombo, que arranque el [breakdown](/es/glosario/breakdown)— caen al principio de un bloque, no en el medio. Phrasing es mezclar respetando esos bloques.

Cuando se respeta, no se nota nada, y eso es exactamente el objetivo. Cuando no, el resultado tiene un nombre claro en cualquier cabina: el set "cojea". Los dos temas pueden estar perfectamente sincronizados en [BPM](/es/glosario/bpm) y en [tonalidad](/es/glosario/tonalidad) y aun así sonar mal, porque uno está corrido medio bloque respecto del otro y cada cambio cae donde el oído no lo espera.

Es la parte de mezclar que el software no resuelve por vos. Un sincronizador alinea el pulso, no las frases: podés tener los beats calzados y la estructura desfasada. Ahí entran los [cue points](/es/glosario/cue-point), que existen en buena medida para marcar dónde empieza un bloque y poder entrar justo ahí.

Es también la razón por la que un buen orden de temas no garantiza un buen set. EnergyCurve trabaja sobre el orden y sobre la compatibilidad; dónde arrancás la mezcla dentro de cada tema sigue siendo tuyo.`,
      en: `Dance music is built in blocks: bars group into fours, eights and sixteens, and the changes that matter — the kick coming in, the [breakdown](/glossary/breakdown) starting — land at the beginning of a block rather than in the middle of one. Phrasing is mixing in step with those blocks.

When you get it right, nobody notices, and that is exactly the goal. When you get it wrong, every booth has a word for the result: the set limps. The two tracks can be perfectly matched in [BPM](/glossary/bpm) and in [key](/glossary/key) and still sound wrong, because one is half a block out of step with the other and every change lands where the ear was not waiting for it.

It is the part of mixing software does not solve for you. A sync button aligns the pulse, not the phrases: you can have the beats locked and the structure offset. This is where [cue points](/glossary/cue-point) earn their keep — they exist in large part to mark where a block starts so you can come in exactly there.

It is also why a good track order does not guarantee a good set. EnergyCurve works on order and compatibility; where you start the mix inside each track stays yours.`,
    },
    see: ["cue-point", "beatmatching", "transicion"],
    match: { es: ["phrasing"], en: ["phrasing"] },
  },
  {
    id: "drop",
    slug: { es: "drop", en: "drop" },
    title: { es: "Drop", en: "Drop" },
    short: {
      es: "El momento en que un tema descarga toda su energía, después de la tensión que lo precede.",
      en: "The moment a track releases all its energy, after the tension that built up to it.",
    },
    description: {
      es: "Qué es el drop de un tema, por qué no funciona sin la tensión que lo precede y qué le pasa a un set que los encadena uno detrás de otro sin respiro.",
      en: "What a track's drop is, why it does not work without the tension before it, and what happens to a set that chains them one after another with no breath.",
    },
    body: {
      es: `El drop es el momento en que un tema suelta todo: vuelve el bombo, entra el bajo, y la tensión acumulada durante el [build-up](/es/glosario/build-up) se descarga de golpe. Es la parte que la gente espera y, en muchos géneros, la razón de ser del tema.

Lo importante para preparar un set es que el drop **no existe solo**. Lo que lo hace funcionar es lo que vino antes: el [breakdown](/es/glosario/breakdown) que despejó la pista y el build-up que fue apretando. Un drop sin esa preparación es ruido fuerte llegando en un momento cualquiera.

De ahí se sigue lo que más se ve en un set mal ordenado: encadenar temas que son todos drop. Cada uno por separado es enorme, y juntos se anulan, porque después del tercero el oído ya no registra el salto. Sin contraste no hay altura — un set completamente arriba se escucha plano, que es el resultado opuesto al buscado.

En la [curva de energía](/es/glosario/curva-de-energia) esto aparece como una zona plana en la parte alta. No es un error de lectura: es exactamente el problema, dibujado. La solución rara vez es sacar temas fuertes; suele ser meter uno que baje lo suficiente como para que el siguiente vuelva a sentirse alto.`,
      en: `The drop is the moment a track lets go: the kick returns, the bass lands, and the tension built through the [build-up](/glossary/build-up) discharges at once. It is the part the floor is waiting for and, in many genres, the reason the track exists.

What matters when preparing a set is that a drop **does not exist on its own**. What makes it work is what came before: the [breakdown](/glossary/breakdown) that cleared the floor and the build-up that tightened the screw. A drop without that preparation is loud noise arriving at no particular moment.

From which follows the most common fault in a badly ordered set: chaining tracks that are all drop. Each one is enormous by itself, and together they cancel out, because after the third one the ear stops registering the jump. Without contrast there is no height — a set that is entirely up reads as flat, which is the opposite of what it was going for.

On the [energy curve](/glossary/energy-curve) this shows up as a flat stretch near the top. That is not a reading error: it is the problem, drawn. The fix is rarely removing the strong tracks; it is usually adding one that comes down far enough for the next one to feel high again.`,
    },
    links: [{ path: "/tools/energy-curve", label: { es: "Mirá la curva de tu set", en: "See your set's curve" } }],
    articles: [
      { slug: "cuanto-es-mucho-salto-de-energia", label: { es: "¿Cuánto es mucho salto de energía?", en: "How big is too big an energy jump?" } },
    ],
    see: ["build-up", "breakdown", "peak-time"],
    match: { es: ["drops", "drop"], en: ["drops", "drop"] },
  },
  {
    id: "breakdown",
    slug: { es: "breakdown", en: "breakdown" },
    title: { es: "Breakdown", en: "Breakdown" },
    short: {
      es: "La parte de un tema donde se caen los elementos rítmicos y la energía baja a propósito.",
      en: "The part of a track where the rhythmic elements drop away and the energy deliberately falls.",
    },
    description: {
      es: "Qué es el breakdown de un tema, qué función cumple dentro de la estructura y por qué suele ser el mejor lugar para empezar a mezclar con el siguiente.",
      en: "What a track's breakdown is, what job it does inside the structure, and why it is usually the best place to start mixing the next track from.",
    },
    body: {
      es: `El breakdown es la parte donde el tema se desarma: se va el bombo, a veces se va el bajo, y quedan los elementos melódicos o atmosféricos. La energía baja, y baja porque el tema quiere que baje.

Cumple dos funciones a la vez. Le da a la pista un respiro —nadie sostiene una hora de intensidad constante— y construye la tensión que hace que el [drop](/es/glosario/drop) siguiente se sienta grande. Sin breakdown no hay contraste, y sin contraste el drop es apenas más volumen.

Para el DJ es, además, el lugar más cómodo para mezclar. Con menos elementos sonando hay menos cosas que puedan chocar: un breakdown es donde dos temas se superponen sin pelearse, y es por eso que muchos [cue points](/es/glosario/cue-point) se marcan justo ahí.

Al preparar un set conviene saber dónde caen los breakdowns de los temas que elegiste, no sólo qué energía tiene cada uno. Dos temas seguidos cuyos breakdowns quedan pegados dejan un pozo largo en el medio del set; ninguno de los dos está mal, la secuencia sí. Eso es algo que la [curva de energía](/es/glosario/curva-de-energia) muestra como forma y que escuchando tema por tema es difícil de ver.`,
      en: `The breakdown is the part where a track comes apart: the kick leaves, sometimes the bass leaves, and what remains is the melodic or atmospheric material. The energy falls, and it falls because the track wants it to.

It does two jobs at once. It gives the floor a breath — nobody sustains an hour of constant intensity — and it builds the tension that makes the next [drop](/glossary/drop) feel big. Without a breakdown there is no contrast, and without contrast a drop is just more volume.

For the DJ it is also the most comfortable place to mix. With fewer elements sounding there is less that can collide: a breakdown is where two tracks overlap without fighting, which is why so many [cue points](/glossary/cue-point) get marked right there.

When preparing a set it is worth knowing where the breakdowns fall in the tracks you picked, not only what energy each one carries. Two consecutive tracks whose breakdowns end up adjacent leave a long trough in the middle of the set; neither track is wrong, the sequence is. That is the kind of thing the [energy curve](/glossary/energy-curve) shows as a shape and that listening track by track makes hard to see.`,
    },
    see: ["drop", "build-up", "curva-de-energia"],
    match: { es: ["breakdowns", "breakdown"], en: ["breakdowns", "breakdown"] },
  },
  {
    id: "build-up",
    slug: { es: "build-up", en: "build-up" },
    title: { es: "Build-up", en: "Build-up" },
    short: {
      es: "El pasaje que sube tensión de forma dirigida hasta resolver en un drop o en un cambio.",
      en: "The passage that builds tension on purpose until it resolves into a drop or a change.",
    },
    description: {
      es: "Qué es un build-up, en qué se diferencia de una intro larga y por qué su duración cambia cuánto se siente el drop que viene justo después de él.",
      en: "What a build-up is, how it differs from a long intro, and why its length changes how big the drop that comes right after it is going to feel.",
    },
    body: {
      es: `El build-up es el tramo que va apretando hasta el [drop](/es/glosario/drop). Suele empezar donde termina el [breakdown](/es/glosario/breakdown) y se construye con recursos bastante reconocibles: un redoble que se acelera, un filtro que abre, un sonido que sube de tono, capas que se van sumando.

Lo que lo define no es durar, es ir hacia algún lado. Una intro larga también son treinta o cuarenta segundos antes de que el tema arranque en serio, y no es un build-up: la intro puede ser plana, existe para darte tiempo de mezclar y no promete nada. En un build-up la energía crece de forma dirigida y **resuelve** — en un drop o en un cambio. Si no resuelve, era otra cosa.

Su trabajo es prometer. Todo build-up le dice a la pista que algo va a pasar, y la calidad del drop depende tanto de esa promesa como del drop en sí. Por eso el largo importa: uno corto no alcanza a generar expectativa, y uno demasiado largo la agota — a los treinta segundos de redoble la gente dejó de esperar y se puso a mirar el techo.

Para preparar un set, el build-up es el lugar donde se decide si una subida de energía se va a sentir natural o brusca. Un tema con build-up largo puede sostener un salto mayor que el que soportaría una entrada seca, porque el salto ya viene anunciado.

Es, junto con el breakdown, la razón por la que un número de energía por tema es una simplificación útil pero incompleta: dos temas pueden puntuar igual y tener estructuras internas que hacen que uno funcione donde el otro no.`,
      en: `The build-up is the stretch that tightens up to the [drop](/glossary/drop). It usually starts where the [breakdown](/glossary/breakdown) ends and is made of fairly recognisable devices: a roll that accelerates, a filter opening, a sound rising in pitch, layers stacking up.

What defines it is not length, it is direction. A long intro is also thirty or forty seconds before the track properly starts, and it is not a build-up: an intro can be flat, it exists to give you time to mix, and it promises nothing. In a build-up the energy rises on purpose and **resolves** — into a drop or into a change. If it never resolves, it was something else.

Its job is to promise. Every build-up tells the floor that something is about to happen, and the quality of the drop depends as much on that promise as on the drop itself. Which is why length matters: too short and there is no expectation to speak of, too long and it exhausts itself — thirty seconds into a snare roll the room has stopped waiting and started looking at the ceiling.

When preparing a set, the build-up is where it gets decided whether a rise in energy will feel natural or abrupt. A track with a long build-up can carry a bigger jump than a cold entrance would, because the jump has already been announced.

It is, together with the breakdown, why a single energy number per track is a useful simplification rather than a complete description: two tracks can score the same and have internal structures that make one work where the other does not.`,
    },
    see: ["drop", "breakdown", "energia-de-un-tema"],
    match: { es: ["build-up", "buildup"], en: ["build-up", "buildup"] },
  },
  {
    id: "warm-up",
    slug: { es: "warm-up", en: "warm-up" },
    title: { es: "Warm-up", en: "Warm-up" },
    short: {
      es: "El set de apertura: su trabajo es preparar la pista, no lucirse.",
      en: "The opening set: its job is to prepare the floor, not to show off.",
    },
    description: {
      es: "Qué es un set de warm-up, por qué empezar arriba es el error clásico de ese toque y en qué se lo evalúa distinto que a un set de peak time o de cierre.",
      en: "What a warm-up set is, why opening high is the classic mistake in that slot, and why it gets judged differently from a peak time or closing set.",
    },
    body: {
      es: `El warm-up es el set de apertura: la pista todavía se está llenando y la noche recién empieza. Su trabajo no es impresionar a nadie, es dejar la pista lista para quien sigue.

Es el toque que más se malinterpreta, y el error tiene una sola forma: arrancar arriba. Un warm-up que abre a toda intensidad quema en cuarenta minutos el margen de una noche entera —el que sigue no tiene a dónde subir— y, encima, no funciona, porque una pista con veinte personas no responde como una llena.

Un buen warm-up se mide por lo que entrega, no por lo que suena: la pista con gente, calibrada, y un margen de energía que el siguiente pueda usar. Es un trabajo que se nota poco cuando está bien hecho y mucho cuando está mal.

En EnergyCurve esto no es una opinión de copy: cuando marcás un set como de apertura, el motor lo evalúa contra el rango de energía que corresponde a ese contexto y no contra el de un [peak time](/es/glosario/peak-time). El mismo set puede estar perfecto para un toque y mal para el otro, y eso es exactamente lo que queremos que muestre — un puntaje que ignore el contexto sólo premia el set más fuerte, que no es el mejor set.`,
      en: `The warm-up is the opening set: the floor is still filling and the night has barely started. Its job is not to impress anyone, it is to leave the floor ready for whoever comes next.

It is the most misread slot there is, and the mistake has one shape: opening high. A warm-up that opens at full intensity burns a whole night's headroom in forty minutes — the next DJ has nowhere to climb — and it does not even work, because a floor with twenty people on it does not respond like a full one.

A good warm-up is measured by what it hands over, not by what it sounded like: a floor with people on it, calibrated, and energy headroom the next DJ can use. It is work that goes unnoticed when it is done well and is very noticeable when it is not.

In EnergyCurve this is not marketing copy: when you mark a set as an opening slot, the engine judges it against the energy range for that context rather than a [peak time](/glossary/peak-time) one. The same set can be right for one slot and wrong for the other, and showing that is the point — a score that ignores context only rewards the loudest set, which is not the best set.`,
    },
    links: [{ path: "/tools/energy-curve", label: { es: "Probá tu set de apertura", en: "Try your opening set" } }],
    see: ["peak-time", "closing-set", "curva-de-energia"],
    match: { es: ["warm-up", "warmup"], en: ["warm-up", "warmup"] },
  },
  {
    id: "peak-time",
    slug: { es: "peak-time", en: "peak-time" },
    title: { es: "Peak time", en: "Peak time" },
    short: {
      es: "El tramo más alto de la noche, con la pista llena y la energía arriba.",
      en: "The highest stretch of the night, with a full floor and the energy up.",
    },
    description: {
      es: "Qué es el peak time de una noche, por qué no es una hora fija del reloj y por qué sostener el pico no es lo mismo que subir la energía todo el tiempo.",
      en: "What peak time is, why it is not a fixed hour on the clock, and why holding the peak is not the same thing as climbing for the whole of your set.",
    },
    body: {
      es: `Peak time es el tramo más alto de la noche: la pista llena, la energía arriba y el margen para arriesgar en su punto máximo. Es el toque que todo el mundo quiere y el que menos margen de error tiene.

No es una hora del reloj. Depende del lugar, de la noche y de cómo vino todo antes: en un club puede caer a las dos y en un festival a las siete de la tarde. Por eso se define por dónde está la pista, no por el horario del flyer.

El error clásico no es empezar bajo, es intentar subir todo el tiempo. La energía no es acumulable: pasado cierto punto la única manera de que algo se sienta más alto es que lo anterior haya bajado. Un peak time que sube y sube sin soltar termina plano, que es el mismo problema que tiene un set hecho sólo de [drops](/es/glosario/drop).

Sostener el pico es un trabajo de contraste, no de escalada: pequeñas bajadas que dan aire, [breakdowns](/es/glosario/breakdown) usados a propósito, y algún tema que corte el clima antes de volver. Dibujado, un buen peak time tiene dientes; una recta ascendente rara vez es la forma que corresponde.`,
      en: `Peak time is the highest stretch of the night: a full floor, the energy up, and the most room there will be to take a risk. It is the slot everyone wants and the one with the least margin for error.

It is not an hour on the clock. It depends on the venue, the night and how everything before it went: in a club it might land at two, at a festival at seven in the evening. Which is why it is defined by where the floor is, not by what the flyer says.

The classic mistake is not opening low, it is trying to climb the whole way. Energy does not accumulate: past a certain point the only way to make something feel higher is for what came before it to have come down. A peak time that climbs and climbs without ever letting go ends up flat — the same problem a set made entirely of [drops](/glossary/drop) has.

Holding the peak is work done with contrast, not with escalation: small dips that give air, [breakdowns](/glossary/breakdown) used on purpose, a track that cuts the mood before returning. Drawn out, a good peak time has teeth; a straight rising line is rarely the right shape.`,
    },
    see: ["warm-up", "closing-set", "drop"],
    match: { es: ["peak time", "peak-time"], en: ["peak time", "peak-time"] },
  },
  {
    id: "closing-set",
    slug: { es: "closing-set", en: "closing-set" },
    title: { es: "Closing set", en: "Closing set" },
    short: {
      es: "El set de cierre: el que decide cómo se van a acordar de la noche.",
      en: "The closing set: the one that decides how the night will be remembered.",
    },
    description: {
      es: "Qué es un closing set, por qué bajar la energía no es lo mismo que apagarse y cómo se elige el último tema con el que termina toda una noche.",
      en: "What a closing set is, why bringing the energy down is not the same as fading out, and how the last track of an entire night ends up getting chosen.",
    },
    body: {
      es: `El closing es el último set de la noche, y es el que define el recuerdo: la gente se va a acordar de cómo terminó mucho más que de lo que pasó a las dos de la mañana.

Tiene una tensión propia. Hay que bajar —la noche se termina y forzar un pico artificial a las seis no engaña a nadie— pero bajar no es apagarse. Un cierre que se desinfla deja a la pista vaciándose de a poco; uno bueno acompaña la bajada y aun así llega al final con algo para decir.

Dónde ponés el último tema importa más que en cualquier otro toque. No tiene que ser el más fuerte; tiene que ser el que cierra. Muchos cierres funcionan con un tema que baja de energía pero sube de intensidad emocional, que es una distinción que ningún número de energía captura y conviene decirlo.

En la [curva](/es/glosario/curva-de-energia), un closing bien armado no es una pendiente que cae hasta cero: es un descenso con algún repunte y un final definido. Por eso EnergyCurve evalúa el cierre contra su propio rango de contexto, y por eso marca como "final débil" un set que termina apagándose sin resolver — no porque bajar esté mal, sino porque irse sin cerrar sí.`,
      en: `The closing is the last set of the night, and it is the one that sets the memory: people remember how it ended far more than what happened at two in the morning.

It carries its own tension. You have to come down — the night is ending and forcing an artificial peak at six fools nobody — but coming down is not fading out. A closing that deflates leaves the floor emptying in instalments; a good one accompanies the descent and still arrives at the end with something to say.

Where you place the last track matters more than in any other slot. It does not have to be the biggest; it has to be the one that closes. Plenty of closings work with a track that drops in energy while rising in emotional intensity, and that is a distinction no energy number captures — worth saying plainly.

On the [curve](/glossary/energy-curve), a well-built closing is not a slope falling to zero: it is a descent with a lift in it and a definite ending. That is why EnergyCurve judges a closing against its own context range, and why it flags a set that simply fades out as a weak ending — not because coming down is wrong, but because leaving without closing is.`,
    },
    see: ["warm-up", "peak-time", "curva-de-energia"],
    match: { es: ["closing set", "set de cierre"], en: ["closing set"] },
  },
  {
    id: "leer-la-pista",
    slug: { es: "leer-la-pista", en: "crowd-reading" },
    title: { es: "Leer la pista", en: "Crowd reading" },
    short: {
      es: "Mirar cómo responde la gente y ajustar el set en consecuencia, en tiempo real.",
      en: "Watching how the room responds and adjusting the set accordingly, in real time.",
    },
    description: {
      es: "Qué significa leer la pista, en qué señales concretas se apoya un DJ para hacerlo y por qué ninguna preparación previa reemplaza esa lectura en vivo.",
      en: "What crowd reading means, which concrete signals a DJ leans on to do it, and why no amount of preparation beforehand replaces reading the room live.",
    },
    body: {
      es: `Leer la pista es mirar qué está pasando delante tuyo y cambiar el plan en consecuencia. Es la habilidad menos automatizable de la cabina y la que separa a alguien que pone temas de alguien que toca.

Las señales son concretas, aunque nadie las escriba: cuánta gente está bailando y cuánta mirando el teléfono, si se acercan o se alejan de la cabina, qué pasa en los primeros treinta segundos de un tema nuevo, si la pista se vacía cuando baja la energía o simplemente respira. Un tema que funcionó el sábado pasado puede no funcionar hoy, y eso se ve antes de que termine.

Acá conviene ser claro sobre qué hace y qué no hace una herramienta como ésta. EnergyCurve trabaja **antes** del toque: te muestra la forma de lo que preparaste y te dice dónde tiene agujeros. No ve la pista, no la va a ver, y ningún análisis previo reemplaza la decisión de tirar el plan a la basura en el tercer tema porque la noche pidió otra cosa.

Lo que sí hace la preparación es abaratarte esa decisión. Llegar con la curva revisada significa que cuando improvises no vas a estar además resolviendo problemas que se podían ver desde casa.`,
      en: `Crowd reading is watching what is happening in front of you and changing the plan accordingly. It is the least automatable skill in the booth and the one that separates someone playing tracks from someone playing a set.

The signals are concrete even if nobody writes them down: how many people are dancing and how many are looking at their phones, whether they move toward the booth or away from it, what happens in the first thirty seconds of a new track, whether the floor empties when the energy drops or simply breathes. A track that worked last Saturday may not work tonight, and you can see that before it finishes.

It is worth being clear about what a tool like this does and does not do. EnergyCurve works **before** the gig: it shows you the shape of what you prepared and where it has holes. It does not see the floor, it is not going to, and no amount of prior analysis replaces the decision to throw the plan away three tracks in because the night asked for something else.

What preparation does do is make that decision cheaper. Arriving with a reviewed curve means that when you improvise you are not also solving problems you could have seen from home.`,
    },
    articles: [
      { slug: "antes-de-tocar-no-despues", label: { es: "Antes de tocar, no después", en: "Before you play, not after" } },
    ],
    see: ["warm-up", "peak-time"],
    match: { es: ["leer la pista"], en: ["crowd reading"] },
  },
  {
    id: "key-lock",
    slug: { es: "key-lock", en: "key-lock" },
    title: { es: "Key lock", en: "Key lock" },
    short: {
      es: "La función que mantiene la tonalidad de un tema aunque cambies su velocidad.",
      en: "The function that holds a track's key steady while you change its speed.",
    },
    description: {
      es: "Qué hace el key lock cuando movés el pitch de un tema, cuándo conviene tenerlo encendido y qué le pasa al sonido si lo forzás más de la cuenta.",
      en: "What key lock does when you move a track's pitch, when it is worth leaving switched on, and what happens to the sound if you push it too far.",
    },
    body: {
      es: `Sin key lock, cambiar la velocidad de un tema cambia también su [tonalidad](/es/glosario/tonalidad): es lo que pasaba con un disco de vinilo, y es física, no una decisión de diseño. Subís el [pitch](/es/glosario/pitch) y todo sube de tono.

El key lock desacopla las dos cosas. Con la función encendida podés mover el tempo y la tonalidad queda donde estaba, que es lo que hace posible la [mezcla armónica](/es/glosario/mezcla-armonica) cuando dos temas necesitan acercarse de velocidad: sin key lock, un ajuste de tempo de varios por ciento deja de ser el mismo tema en términos de tonalidad, y la compatibilidad que habías chequeado ya no vale.

Tiene un costo. Mantener la tonalidad con el tempo cambiado es un procesamiento de señal, y a partir de cierto punto se escucha: aparecen artefactos metálicos, sobre todo en las voces. Cuánto se puede estirar antes de que moleste depende del equipo y del material, y es algo que conviene probar con tus propios temas en vez de fiarse de un número.

Práctica común: tenerlo encendido por defecto y apagarlo a propósito cuando querés el efecto del cambio de tono. Nuestro chequeador tiene un interruptor de key lock justamente porque el veredicto cambia según cómo lo tengas: con key lock apagado te dice a qué tonalidad se va a mover el tema en realidad.`,
      en: `Without key lock, changing a track's speed changes its [key](/glossary/key) as well: it is what happened with vinyl, and it is physics rather than a design decision. Raise the [pitch](/glossary/pitch) and everything rises in tone.

Key lock decouples the two. With it on you can move the tempo while the key stays put, which is what makes [harmonic mixing](/glossary/harmonic-mixing) possible when two tracks need to meet in the middle on speed: without key lock, a tempo adjustment of several per cent is no longer the same track in key terms, and the compatibility you checked no longer holds.

It has a cost. Holding key steady at a changed tempo is signal processing, and past a point you hear it: metallic artefacts appear, on vocals above all. How far you can stretch before it becomes a problem depends on the material and the system, and it is worth testing with your own tracks rather than trusting a number.

Common practice: leave it on by default and switch it off deliberately when you want the pitch-shift effect. Our checker has a key lock switch for exactly this reason: with it off, it tells you which key the track will actually play in rather than the one you matched on paper.`,
    },
    links: [{ path: "/tools/key-bpm-compatibility", label: { es: "Chequeador de tonalidad y BPM", en: "Key and BPM checker" } }],
    see: ["pitch", "tonalidad", "mezcla-armonica"],
    match: { es: ["key lock", "keylock"], en: ["key lock", "keylock"] },
  },
  {
    id: "pitch",
    slug: { es: "pitch", en: "pitch" },
    title: { es: "Pitch", en: "Pitch" },
    short: {
      es: "El control que ajusta la velocidad de reproducción de un tema, en porcentaje.",
      en: "The control that adjusts a track's playback speed, as a percentage.",
    },
    description: {
      es: "Qué hace el fader de pitch en un reproductor, cuánto se puede mover antes de que se note en el sonido de un tema y qué relación tiene con el key lock.",
      en: "What the pitch fader on a player does, how far you can move it before it starts to show in the sound of a track, and how it relates to key lock.",
    },
    body: {
      es: `El pitch es el control que ajusta la velocidad de reproducción, casi siempre expresado en porcentaje: +2% significa que el tema suena un dos por ciento más rápido de lo grabado. Es el fader que se usa para acercar dos temas de [BPM](/es/glosario/bpm) distinto hasta que se puedan mezclar.

Cuánto se puede mover sin que moleste depende del material más que del equipo. Un tema instrumental aguanta más que uno con voz al frente, y un cambio que en un género pasa inadvertido en otro se escucha enseguida. Los rangos típicos de los reproductores van de unos pocos puntos porcentuales a rangos amplios, y el límite práctico casi nunca es el del aparato: es el del oído.

Sin [key lock](/es/glosario/key-lock), mover el pitch mueve también la [tonalidad](/es/glosario/tonalidad), y ahí el ajuste deja de ser sólo de velocidad. Con key lock encendido, el tempo se mueve y la tonalidad no.

Para preparar un set esto define qué es "cerca". Dos temas separados por unos pocos BPM se juntan sin drama; separados por mucho, la mezcla existe pero pide otra técnica. Es una de las razones por las que ordenar un set no es sólo ordenar energía: el salto de tempo entre vecinos también se paga.`,
      en: `Pitch is the control that adjusts playback speed, almost always expressed as a percentage: +2% means the track plays two per cent faster than it was recorded. It is the fader used to bring two tracks of different [BPM](/glossary/bpm) close enough to mix.

How far you can move it before it shows depends on the material more than on the gear. An instrumental takes more than something with a vocal up front, and a change that passes unnoticed in one genre is audible immediately in another. Player ranges run from a few percentage points to wide ones, and the practical limit is almost never the machine's: it is the ear's.

Without [key lock](/glossary/key-lock), moving pitch moves [key](/glossary/key) too, and the adjustment stops being only about speed. With key lock on, tempo moves and key does not.

For preparing a set this is what defines "close". Two tracks a few BPM apart come together without drama; far apart, the mix exists but asks for a different technique. It is one of the reasons ordering a set is not only about ordering energy: the tempo gap between neighbours is paid for too.`,
    },
    see: ["bpm", "key-lock", "beatmatching"],
    match: { es: ["pitch"], en: ["pitch"] },
  },
  {
    id: "beatmatching",
    slug: { es: "beatmatching", en: "beatmatching" },
    title: { es: "Beatmatching", en: "Beatmatching" },
    short: {
      es: "Sincronizar el pulso de dos temas para que sus golpes caigan juntos.",
      en: "Syncing the pulse of two tracks so their beats land together.",
    },
    description: {
      es: "Qué es el beatmatching, cómo se hace a mano y cómo lo hace el sync, y por qué tener el pulso de dos temas resuelto no resuelve la mezcla entera.",
      en: "What beatmatching is, how it is done by hand and how sync does it, and why having the pulse of two tracks locked does not solve the whole mix.",
    },
    body: {
      es: `Beatmatching es sincronizar el pulso de dos temas: que los golpes de uno caigan exactamente sobre los del otro, de modo que se puedan superponer sin que suene a dos músicas peleándose. Es la habilidad fundacional de mezclar.

A mano se hace con el [pitch](/es/glosario/pitch) y con el plato: se ajusta la velocidad hasta que los tempos coinciden y se empuja o frena para alinear la fase. Con sync, el software lo hace solo a partir de la grilla de beats que analizó.

La discusión sobre si usar sync está zanjada en la práctica y no vale la pena reabrirla acá. Lo que sí vale la pena decir es qué **no** resuelve el sync, porque es la fuente de una confusión frecuente: alinea el pulso, no la estructura. Dos temas perfectamente sincronizados pueden estar corridos medio bloque y sonar mal igual — eso es [phrasing](/es/glosario/phrasing), y sigue siendo tuyo.

Tampoco resuelve la [tonalidad](/es/glosario/tonalidad), ni decide qué tema va después. De ahí que preparar un set sea otra tarea distinta de mezclarlo bien: podés tener una técnica impecable sobre un orden que no va a ningún lado, y el público escucha el conjunto, no la transición.`,
      en: `Beatmatching is syncing the pulse of two tracks: getting one's beats to land exactly on the other's, so they can overlap without sounding like two pieces of music arguing. It is the foundational mixing skill.

By hand it is done with the [pitch](/glossary/pitch) fader and the platter: adjust the speed until the tempos agree, then nudge or brake to align the phase. With sync, the software does it from the beat grid it analysed.

The argument about whether to use sync is settled in practice and not worth reopening here. What is worth saying is what sync does **not** solve, because it is a common confusion: it aligns the pulse, not the structure. Two perfectly synced tracks can be half a block out of step and still sound wrong — that is [phrasing](/glossary/phrasing), and it stays yours.

It does not solve [key](/glossary/key) either, and it does not decide which track comes next. Which is why preparing a set is a different job from mixing it well: you can have impeccable technique over an order that goes nowhere, and the room hears the whole thing, not the transition.`,
    },
    see: ["phrasing", "pitch", "transicion"],
    match: { es: ["beatmatching"], en: ["beatmatching"] },
  },
  {
    id: "transicion",
    slug: { es: "transicion", en: "transition" },
    title: { es: "Transición", en: "Transition" },
    short: {
      es: "El pasaje de un tema al siguiente: lo que el público escucha como continuidad.",
      en: "The passage from one track to the next — what the room hears as continuity.",
    },
    description: {
      es: "Qué es una transición entre dos temas, de qué depende que funcione y por qué EnergyCurve evalúa un set mirando los temas de a pares vecinos.",
      en: "What a transition between two tracks is, what makes one work, and why EnergyCurve evaluates a set by looking at neighbouring pairs of tracks.",
    },
    body: {
      es: `Una transición es el pasaje de un tema al siguiente. Puede durar dos minutos de superposición o ser un corte seco; lo que la define no es la técnica sino el resultado: que el público perciba continuidad, o una sorpresa buscada, y no un accidente.

Que funcione depende de varias cosas a la vez. Del [BPM](/es/glosario/bpm), porque si los tempos están lejos hay que trabajarlos. De la [tonalidad](/es/glosario/tonalidad), porque en los segundos de superposición las dos armonías conviven. Del [phrasing](/es/glosario/phrasing), porque los cambios tienen que caer donde corresponde. Y del salto de energía, porque dos temas compatibles en todo lo anterior igual pueden dejar un escalón que la pista siente.

Este último es el que se puede revisar sin escuchar, y es el que mira EnergyCurve: el análisis recorre el set de a pares y marca dónde el salto entre vecinos es más grande de lo que el contexto tolera. Cuando los dos temas traen tonalidad, además reporta si el movimiento armónico está entre los que la tabla de transiciones recomienda.

Lo que no evalúa es cómo vas a hacer la mezcla. Un par difícil con la técnica correcta suena mejor que un par fácil mal ejecutado, y eso pasa en la cabina.`,
      en: `A transition is the passage from one track to the next. It can be two minutes of overlap or a hard cut; what defines it is not the technique but the result — that the room perceives continuity, or a deliberate surprise, rather than an accident.

Whether it works depends on several things at once. On [BPM](/glossary/bpm), because tempos far apart have to be worked. On [key](/glossary/key), because for the seconds of overlap two harmonies coexist. On [phrasing](/glossary/phrasing), because the changes have to land where they belong. And on the energy jump, because two tracks compatible in all of the above can still leave a step the floor feels.

That last one is what can be checked without listening, and it is what EnergyCurve looks at: the analysis walks the set pair by pair and flags where the jump between neighbours is larger than the context tolerates. When both tracks carry a key, it also reports whether the harmonic move is one the transition table recommends.

What it does not judge is how you are going to perform the mix. A difficult pair with the right technique sounds better than an easy pair executed badly, and that happens in the booth.`,
    },
    links: [{ path: "/tools/energy-curve", label: { es: "Revisá los saltos de tu set", en: "Check your set's jumps" } }],
    articles: [
      { slug: "cuanto-es-mucho-salto-de-energia", label: { es: "¿Cuánto es mucho salto de energía?", en: "How big is too big an energy jump?" } },
    ],
    see: ["mezcla-armonica", "phrasing", "curva-de-energia"],
    match: { es: ["transiciones", "transición"], en: ["transitions", "transition"] },
  },
  {
    id: "cue-point",
    slug: { es: "cue-point", en: "cue-point" },
    title: { es: "Cue point", en: "Cue point" },
    short: {
      es: "Una marca guardada dentro de un tema para poder saltar exactamente ahí.",
      en: "A saved marker inside a track that lets you jump exactly there.",
    },
    description: {
      es: "Qué es un cue point, para qué se usan los hot cues en la cabina y por qué conviene no perderlos cuando exportás de vuelta un set que ya reordenaste.",
      en: "What a cue point is, what hot cues get used for in the booth, and why losing them when you export a set you already reordered is a real problem.",
    },
    body: {
      es: `Un cue point es una marca guardada dentro de un tema: un punto exacto al que el reproductor puede saltar sin que tengas que buscarlo. Los hot cues son varios de esos puntos, asignados a botones.

Se usan para entrar donde conviene y no donde empieza el archivo. El principio de un [build-up](/es/glosario/build-up), la vuelta del bombo después del [breakdown](/es/glosario/breakdown), el inicio de un bloque para respetar el [phrasing](/es/glosario/phrasing): marcarlos es la diferencia entre entrar donde querías y entrar donde llegaste.

Marcarlos bien lleva tiempo y ese trabajo es del DJ, no del software. Por eso son uno de los datos más caros de una librería: una colección con los cue points puestos representa horas de preparación que no se recuperan.

Lo cual nos lleva a lo que más importa acá. Cuando exportás un set desde una herramienta de vuelta a tu programa, lo que **no** puede pasar es que ese trabajo se pierda. El export nativo de EnergyCurve conserva las entradas originales de tu archivo —hot cues, loops y tags incluidos— y reescribe el orden, no el contenido. Es gratis en todos los planes, a propósito: analizar un set y no poder devolverlo a la cabina no sirve de nada.`,
      en: `A cue point is a marker saved inside a track: an exact position the player can jump to without you hunting for it. Hot cues are several of those points, assigned to buttons.

They are used to come in where it suits you rather than where the file begins. The start of a [build-up](/glossary/build-up), the kick returning after a [breakdown](/glossary/breakdown), the beginning of a block so the [phrasing](/glossary/phrasing) works: marking them is the difference between entering where you meant to and entering where you landed.

Marking them well takes time, and that work is the DJ's, not the software's. Which makes them one of the most expensive pieces of data in a library: a collection with its cue points set represents hours of preparation you do not get back.

Which brings us to what matters most here. When you export a set from a tool back into your program, what must **not** happen is that this work disappears. EnergyCurve's native export preserves the original entries from your file — hot cues, loops and tags included — and rewrites the order, not the content. It is free on every plan, deliberately: analysing a set and not being able to get it back into the booth is worth nothing.`,
    },
    links: [{ path: "/import-formats", label: { es: "Qué formatos importa y exporta", en: "Which formats we import and export" } }],
    see: ["phrasing", "breakdown", "build-up"],
    match: { es: ["cue points", "cue point"], en: ["cue points", "cue point"] },
  },
  {
    id: "b2b",
    slug: { es: "b2b", en: "b2b" },
    title: { es: "B2B", en: "B2B" },
    short: {
      es: "Back to back: dos o más DJs tocando el mismo set, alternando temas.",
      en: "Back to back: two or more DJs playing one set, taking turns track by track.",
    },
    description: {
      es: "Qué es un B2B, cómo se reparte el turno entre dos DJs y qué problemas de preparación aparecen cuando el set no es de uno solo sino de dos personas.",
      en: "What a B2B is, how two DJs split the turn between them, and the preparation problems that show up when a set belongs to two people at the same time.",
    },
    body: {
      es: `B2B es back to back: dos o más DJs tocando un mismo set, alternando. Lo habitual es turnarse de a un tema, aunque también se usa de a dos o por tramos más largos.

Lo que cambia respecto de un set solo no es la técnica, es la planificación. Nadie controla la secuencia completa: vos elegís tu tema sabiendo con qué te dejó el otro, y el otro elige el suyo sabiendo con qué lo dejaste vos. La [curva de energía](/es/glosario/curva-de-energia) del set es el resultado de dos criterios y no siempre coinciden.

De ahí los problemas típicos. La escalada, donde cada uno responde subiendo un poco y en veinte minutos no queda a dónde ir. La falta de continuidad, cuando los dos tiran temas buenos que no conversan entre sí. Y el desacuerdo de contexto, que es el peor: uno está tocando un [warm-up](/es/glosario/warm-up) y el otro un [peak time](/es/glosario/peak-time), en el mismo set.

Casi todo eso se resuelve hablando antes: qué toque es, hasta dónde se sube, quién abre. Preparar por separado y ponerse de acuerdo sobre la forma general es la diferencia entre un B2B que suena a un set y uno que suena a dos personas turnándose.`,
      en: `B2B is back to back: two or more DJs playing a single set, taking turns. One track each is the usual arrangement, though two at a time or longer stretches are common too.

What changes compared with playing alone is not the technique, it is the planning. Nobody controls the whole sequence: you pick your track knowing what the other one left you, and they pick theirs knowing what you left them. The set's [energy curve](/glossary/energy-curve) is the result of two sets of judgement, and they do not always agree.

Hence the typical failures. The escalation, where each answers by going a little higher and twenty minutes later there is nowhere left to go. The lack of continuity, where both play good tracks that do not talk to each other. And the context disagreement, which is the worst: one is playing a [warm-up](/glossary/warm-up) and the other a [peak time](/glossary/peak-time), in the same set.

Almost all of it is solved by talking first: which slot this is, how high it goes, who opens. Preparing separately and agreeing on the overall shape is the difference between a B2B that sounds like a set and one that sounds like two people taking turns.`,
    },
    see: ["warm-up", "peak-time", "curva-de-energia"],
    match: { es: ["B2B"], en: ["B2B"] },
  },
]

/** Lookup by id, for `<Termino id="...">` and cross-references. */
export const GLOSSARY_BY_ID = new Map(
  GLOSSARY_TERMS.map((term) => [term.id, term])
)

/** Lookup by URL segment, per language — what the route needs. */
export function termBySlug(
  slug: string,
  locale: SiteLocale
): GlossaryTerm | null {
  return GLOSSARY_TERMS.find((term) => term.slug[locale] === slug) ?? null
}

/**
 * The entries grouped by initial letter, in the language's own alphabetical
 * order.
 *
 * `localeCompare` rather than a raw string sort: "energía" and "Energy" sort
 * differently, and Spanish expects accented letters to file under their base
 * letter rather than after Z.
 */
export function groupedByLetter(locale: SiteLocale) {
  const collator = new Intl.Collator(locale, { sensitivity: "base" })
  const sorted = [...GLOSSARY_TERMS].sort((a, b) =>
    collator.compare(a.title[locale], b.title[locale])
  )

  const groups = new Map<string, GlossaryTerm[]>()

  for (const term of sorted) {
    const letter = term.title[locale]
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .charAt(0)
      .toUpperCase()

    const bucket = groups.get(letter)
    if (bucket) {
      bucket.push(term)
    } else {
      groups.set(letter, [term])
    }
  }

  return [...groups.entries()].map(([letter, terms]) => ({ letter, terms }))
}
