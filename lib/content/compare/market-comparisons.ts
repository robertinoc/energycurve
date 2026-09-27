import type { Comparison } from "@/lib/content/compare/comparisons"
import type { ContentNode } from "@/lib/content/content-nodes"

/**
 * The second batch of comparisons (lote 13) — pages where EnergyCurve is not
 * one of the things compared.
 *
 * "rekordbox vs serato" and "best dj software for beginners" are ten of the
 * fourteen comparison gaps in `docs/seo/keyword-map.md`, and none of them is
 * about us: they compare the programs a DJ *plays* with, and we are what a DJ
 * reads after choosing one. So these pages have to earn their place on their
 * own — somebody who reads one and never opens the product should still leave
 * with the answer — and the link to EnergyCurve sits where it is pertinent and
 * nowhere else.
 *
 * Same rule of evidence as the first four: every fact traces to
 * `docs/seo/competitor-facts-2026-09-26.md` (second batch, 27/09/2026), read
 * from the vendor's own page on that date. "Best" is a claim no vendor page
 * supports and this site does not make; the pages answer the query by laying
 * the facts side by side and naming the case each program is right for.
 *
 * Same type and renderer as the first batch. `kind: "market"` and `subjects`
 * are the two fields the structure needed to hold a page with five subjects
 * and no "us" column — see `tests/comparisons.test.ts` for what they change.
 */

const CTA: ContentNode = { kind: "cta", variant: "tool" }

const SOURCES = [
  { label: "rekordbox.com/en/plan", url: "https://rekordbox.com/en/plan/" },
  { label: "rekordbox.com/en/download", url: "https://rekordbox.com/en/download/" },
  { label: "serato.com/dj/pro/pricing", url: "https://serato.com/dj/pro/pricing" },
  { label: "serato.com/dj/pro", url: "https://serato.com/dj/pro" },
  { label: "serato.com/dj/lite", url: "https://serato.com/dj/lite" },
  {
    label: "native-instruments.com/products/traktor-pro",
    url: "https://www.native-instruments.com/products/traktor-pro",
  },
  { label: "virtualdj.com/buy", url: "https://virtualdj.com/buy/" },
  { label: "virtualdj.com/download", url: "https://virtualdj.com/download/" },
  { label: "algoriddim.com/djay-pro-mac", url: "https://www.algoriddim.com/djay-pro-mac" },
  {
    label: "algoriddim.com/djay-pro-windows",
    url: "https://www.algoriddim.com/djay-pro-windows",
  },
]

const SUBJECTS = ["Rekordbox", "Serato", "Traktor", "VirtualDJ", "djay Pro"]

/** The five programs, one table row each, in the vendors' own words. */
const PRICE_TABLE = {
  en: `| Program | What its own site says about price, 27 September 2026 |
|---|---|
| Rekordbox | Four plans: Free (no price shown), Core, Creative, Professional. With the plan page set to yearly billing: Core US$19, Creative US$23, Professional US$30 per month, quoted as the monthly conversion of US$228, US$276 and US$360 a year. A "Free + Cloud Option" is US$9 a month on the same basis. |
| Serato | Serato DJ Lite is free. Serato DJ Pro is US$11.99 a month, or US$299 to buy; Serato DJ Suite is US$14.99 a month, or US$499 to buy. Hardware that unlocks Serato DJ Pro removes the need for a licence. |
| Traktor | Traktor Pro 4 is US$149, one payment, download available immediately. The page's own FAQ carries the heading "Why has Traktor Pro Plus been canceled?" — the subscription tier is gone. |
| VirtualDJ | Free for home use. VirtualDJ Home is US$4 a month for home use and "cannot be used at paid gigs"; VDJ Pro is US$19 a month and "can be used in public or paid gigs"; a Business plan is US$99 a month. Prices in US dollars, before taxes. |
| djay Pro | Not published on algoriddim.com: the product pages show no figure and there is no pricing page. The price lives in the app stores, so there is no number here to quote. |`,
  es: `| Programa | Qué dice su propio sitio sobre el precio, 27 de septiembre de 2026 |
|---|---|
| Rekordbox | Cuatro planes: Free (sin precio a la vista), Core, Creative, Professional. Con la página de planes en facturación anual: Core u$s19, Creative u$s23, Professional u$s30 por mes, citados como la conversión mensual de u$s228, u$s276 y u$s360 al año. Un «Free + Cloud Option» cuesta u$s9 por mes sobre la misma base. |
| Serato | Serato DJ Lite es gratis. Serato DJ Pro cuesta u$s11,99 por mes, o u$s299 para comprarlo; Serato DJ Suite, u$s14,99 por mes o u$s499. Un hardware que desbloquea Serato DJ Pro hace innecesaria la licencia. |
| Traktor | Traktor Pro 4 cuesta u$s149, un solo pago, descarga inmediata. La FAQ de la propia página lleva el título «Why has Traktor Pro Plus been canceled?»: el nivel por suscripción ya no existe. |
| VirtualDJ | Gratis para uso hogareño. VirtualDJ Home cuesta u$s4 por mes para uso en casa y «cannot be used at paid gigs»; VDJ Pro, u$s19 por mes, y «can be used in public or paid gigs»; hay un plan Business de u$s99 por mes. Precios en dólares, antes de impuestos. |
| djay Pro | No está publicado en algoriddim.com: las páginas de producto no muestran cifra y no hay página de precios. El precio vive en las tiendas de apps, así que acá no hay número que citar. |`,
}

const PLATFORM_TABLE = {
  en: `| Program | Runs on | Streaming services its site names |
|---|---|---|
| Rekordbox | Windows 11, Windows 10, macOS (Tahoe 26 and earlier) | "Beatport/Beatsource/TIDAL/SoundCloud and other music streaming services", with the note that some are not available in some countries |
| Serato | Mac and PC | Apple Music, Beatport, SoundCloud, Spotify, Tidal — and recording is not available while playing from a streaming service |
| Traktor | macOS 13, 14, 15; Windows 11 | Beatport and Beatsource |
| VirtualDJ | Windows 10 or later, macOS 10.15 or later | Not read on the pages we consulted — left unverified rather than inferred |
| djay Pro | macOS 10.15 or later, Windows 10 (21H1) or later, plus djay for iOS and Android | Spotify, Apple Music, TIDAL, SoundCloud, Beatport |`,
  es: `| Programa | Corre en | Servicios de streaming que nombra su sitio |
|---|---|---|
| Rekordbox | Windows 11, Windows 10, macOS (Tahoe 26 y anteriores) | «Beatport/Beatsource/TIDAL/SoundCloud and other music streaming services», con la nota de que algunos no están disponibles en algunos países |
| Serato | Mac y PC | Apple Music, Beatport, SoundCloud, Spotify, Tidal; y no se puede grabar mientras se toca desde un servicio de streaming |
| Traktor | macOS 13, 14, 15; Windows 11 | Beatport y Beatsource |
| VirtualDJ | Windows 10 o posterior, macOS 10.15 o posterior | No se leyó en las páginas consultadas; queda sin verificar en vez de inferido |
| djay Pro | macOS 10.15 o posterior, Windows 10 (21H1) o posterior, más djay para iOS y Android | Spotify, Apple Music, TIDAL, SoundCloud, Beatport |`,
}

const WHEN_EACH = {
  en: `**Rekordbox is the right call** if you play on Pioneer DJ and AlphaTheta equipment in clubs: it is the program that prepares the USB stick those players read, and its cloud tiers exist for exactly that library. It is also the one with a free plan that stays usable for managing music.

**Serato is the right call** if your controller unlocks it — then there is nothing to buy — or if you want to learn on a free program (Serato DJ Lite) that grows into the paid one without changing habits. Its own FAQ lists Spotify among its streaming services, which the others' pages do not.

**Traktor is the right call** if you want one payment and no subscription: the page shows a single price, and its FAQ is explicit that the subscription tier was cancelled. It is the one whose export format, NML, carries the most metadata fields, which matters for a tagged library.

**VirtualDJ is the right call** if you are mixing at home and do not want to pay anything yet: it is free for home use, with paid tiers that start at US$4 a month and a Pro tier priced for paid gigs. It is also the one that states minimum requirements going back to Windows 10 and macOS 10.15.

**djay Pro is the right call** if you play from a phone or tablet as well as a computer, or if Spotify and Apple Music inside the DJ app is the feature you are choosing on: its pages lead with both. Its price is not on its site, so compare it in the app store you use.`,
  es: `**Conviene Rekordbox** si tocás en equipos Pioneer DJ y AlphaTheta en clubes: es el programa que prepara el pendrive que leen esos reproductores, y sus planes en la nube existen para esa librería. También es el que tiene un plan gratuito que sigue sirviendo para gestionar música.

**Conviene Serato** si tu controlador lo desbloquea —entonces no hay nada que comprar— o si querés aprender con un programa gratis (Serato DJ Lite) que crece hacia el pago sin cambiar de hábitos. Su propia FAQ lista Spotify entre sus servicios de streaming, cosa que las páginas de los otros no hacen.

**Conviene Traktor** si querés un solo pago y ninguna suscripción: la página muestra un precio único, y su FAQ es explícita en que el nivel por suscripción se canceló. Es el que tiene el formato de export, NML, con más campos de metadata, y eso importa con una librería etiquetada.

**Conviene VirtualDJ** si mezclás en casa y todavía no querés pagar nada: es gratis para uso hogareño, con niveles pagos desde u$s4 por mes y un Pro pensado para toques pagos. También es el que declara requisitos mínimos desde Windows 10 y macOS 10.15.

**Conviene djay Pro** si tocás desde un teléfono o una tablet además de la computadora, o si Spotify y Apple Music adentro de la app de DJ es la función por la que elegís: sus páginas abren con las dos. Su precio no está en su sitio, así que comparalo en la tienda de apps que uses.`,
}

const WHERE_ENERGYCURVE = {
  en: `None of the five is a competitor of EnergyCurve, and this page is not going to pretend otherwise. They are the programs you play with; EnergyCurve reads what they export — Rekordbox XML, Traktor NML, an M3U8, a folder of tagged files — and tells you what the order of a set does across an hour, before you play it. It does not replace any of them, and it does not convert one library into another. Which program you choose changes which export you drop into it, and nothing else. [The import formats page](/import-formats) says what each one carries, and if the choice itself is the open question, [choosing DJ software](/compare/best-dj-software) walks through it by what is free, what runs where and what streams.`,
  es: `Ninguno de los cinco compite con EnergyCurve, y esta página no va a fingir lo contrario. Son los programas con los que tocás; EnergyCurve lee lo que exportan —XML de Rekordbox, NML de Traktor, un M3U8, una carpeta de archivos etiquetados— y te dice qué hace el orden de un set a lo largo de una hora, antes de tocarlo. No reemplaza a ninguno, y no convierte una librería en otra. El programa que elijas cambia qué export le tirás, y nada más. [La página de formatos](/es/import-formats) dice qué trae cada uno, y si la pregunta abierta es la elección misma, [elegir software de DJ](/es/comparar/mejor-software-para-dj) la recorre por lo que es gratis, dónde corre y desde dónde hace streaming.`,
}

export const REKORDBOX_VS: Comparison = {
  id: "rekordbox-vs-serato-vs-traktor",
  kind: "market",
  competitor: "Rekordbox, Serato, Traktor, VirtualDJ and djay Pro",
  subjects: SUBJECTS,
  footerLabel: {
    en: "Rekordbox vs Serato vs Traktor",
    es: "Rekordbox vs Serato vs Traktor",
  },
  slug: {
    en: "rekordbox-vs-serato-vs-traktor",
    es: "rekordbox-vs-serato-vs-traktor",
  },
  verifiedAt: "2026-09-27",
  sources: SOURCES,
  title: {
    en: "Rekordbox vs Serato vs Traktor (and VirtualDJ, djay Pro): what each DJ program says it is",
    es: "Rekordbox vs Serato vs Traktor (y VirtualDJ, djay Pro): qué dice cada programa de DJ que es",
  },
  description: {
    en: "Five DJ programs compared on what their own sites say: price and licence, platforms, streaming, and the case each one is right for. Read 27 Sep 2026.",
    es: "Cinco programas de DJ comparados por lo que dicen sus sitios: precio, plataformas, streaming y para qué caso conviene cada uno. Leído el 27/9/2026.",
  },
  summary: {
    en: "The question behind \"rekordbox vs serato\" is rarely which is good. It is which one fits the gear you own, the money you want to spend and where your music lives. Each row below is what the maker's own page said on the date shown, and nothing else.",
    es: "La pregunta detrás de «rekordbox vs serato» rara vez es cuál es bueno. Es cuál encaja con el equipo que tenés, la plata que querés gastar y dónde vive tu música. Cada fila de abajo es lo que dijo la página del propio fabricante en la fecha indicada, y nada más.",
  },
  sections: [
    {
      id: "precio-y-licencia",
      heading: { en: "Price and licence", es: "Precio y licencia" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `The five do not sell the same way, and that is the first real difference. Two of them sell a subscription with a buy-out option, one sells a single payment, one is free at home and paid at gigs, and one runs on plans that change what the cloud does. Prices age; the date at the top is when these were read, and the vendor's page wins over this one.

${PRICE_TABLE.en}

Two details the table cannot carry. Rekordbox's plan page has a yearly/monthly switch and was read on **yearly**, so its per-month figures are what it calls the monthly conversion of an annual payment. And Serato's licence question depends on hardware: a controller that unlocks Serato DJ Pro is, in its own words, all the licence you need.`,
            es: `Los cinco no venden de la misma forma, y ésa es la primera diferencia real. Dos venden una suscripción con opción de compra, uno vende un pago único, uno es gratis en casa y pago en los toques, y uno corre con planes que cambian lo que hace la nube. Los precios envejecen: la fecha de arriba es cuándo se leyeron, y la página del fabricante le gana a ésta.

${PRICE_TABLE.es}

Dos detalles que la tabla no puede llevar. La página de planes de Rekordbox tiene un selector anual/mensual y se leyó en **anual**, así que sus cifras por mes son lo que ella llama la conversión mensual de un pago anual. Y la pregunta de la licencia de Serato depende del hardware: un controlador que desbloquea Serato DJ Pro es, en sus propias palabras, toda la licencia que necesitás.`,
          },
        },
      ],
    },
    {
      id: "plataformas-y-streaming",
      heading: { en: "Platforms and streaming", es: "Plataformas y streaming" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `All five run on Windows and macOS, so the platform question is mostly about versions and about phones. djay Pro is the one whose maker also lists an iOS and an Android app; Traktor is the one whose stated Windows requirement starts at Windows 11.

${PLATFORM_TABLE.en}

Streaming is where the pages disagree most, and it is worth reading them literally. Serato's FAQ names Spotify; djay Pro's pages lead with Spotify and Apple Music; Rekordbox names four services "and other"; Traktor names two. Whether a service works in your country is, by Rekordbox's own note, a separate question.`,
            es: `Los cinco corren en Windows y macOS, así que la pregunta de plataforma es sobre todo de versiones y de teléfonos. djay Pro es el que además lista una app para iOS y otra para Android; Traktor es el que declara un requisito de Windows que arranca en Windows 11.

${PLATFORM_TABLE.es}

El streaming es donde las páginas más difieren, y conviene leerlas al pie de la letra. La FAQ de Serato nombra a Spotify; las páginas de djay Pro abren con Spotify y Apple Music; Rekordbox nombra cuatro servicios «and other»; Traktor nombra dos. Si un servicio funciona en tu país es, por la propia nota de Rekordbox, otra pregunta.`,
          },
        },
      ],
    },
    {
      id: "cuando-conviene-cada-uno",
      heading: { en: "When each one is the right call", es: "Cuándo conviene cada uno" },
      nodes: [{ kind: "prose", markdown: WHEN_EACH }],
    },
    {
      id: "donde-entra-energycurve",
      heading: { en: "Where EnergyCurve comes in", es: "Dónde entra EnergyCurve" },
      nodes: [{ kind: "prose", markdown: WHERE_ENERGYCURVE }],
    },
    {
      id: "preguntas",
      heading: { en: "Questions", es: "Preguntas" },
      nodes: [
        {
          kind: "faq",
          entries: [
            {
              question: {
                en: "Is Rekordbox free?",
                es: "¿Rekordbox es gratis?",
              },
              answer: {
                en: "Its plan page lists a Free plan, described as basic music management and DJ experience, with no price shown. The paid tiers — Core, Creative, Professional — add cloud storage, syncing and analysis features; a Free + Cloud Option is also listed as a paid add-on.",
                es: "Su página de planes lista un plan Free, descrito como gestión básica de música y experiencia de DJ, sin precio a la vista. Los niveles pagos —Core, Creative, Professional— agregan almacenamiento en la nube, sincronización y análisis; también aparece un «Free + Cloud Option» pago.",
              },
            },
            {
              question: {
                en: "Which DJ software works with Spotify?",
                es: "¿Qué software de DJ funciona con Spotify?",
              },
              answer: {
                en: "On the pages read on 27 September 2026, Serato DJ Pro's FAQ lists Spotify among its streaming services, and djay Pro's pages say you can connect a Spotify account. Rekordbox's plan page names Beatport, Beatsource, TIDAL and SoundCloud \"and other\" services; Traktor's names Beatport and Beatsource. We did not read a streaming list on VirtualDJ's pages.",
                es: "En las páginas leídas el 27 de septiembre de 2026, la FAQ de Serato DJ Pro lista a Spotify entre sus servicios de streaming, y las páginas de djay Pro dicen que podés conectar una cuenta de Spotify. La página de planes de Rekordbox nombra Beatport, Beatsource, TIDAL y SoundCloud «and other»; la de Traktor nombra Beatport y Beatsource. No leímos una lista de streaming en las páginas de VirtualDJ.",
              },
            },
            {
              question: {
                en: "Can I move my library from one of these to another?",
                es: "¿Puedo pasar mi librería de uno de éstos a otro?",
              },
              answer: {
                en: "None of the five documents an import from the others, as far as their manuals go. What travels is the files and their tags; playlist order and cue points are each program's own. How a playlist moves between Traktor, Rekordbox and Serato, step by step, is written up in our import articles.",
                es: "Ninguno de los cinco documenta una importación desde los otros, hasta donde llegan sus manuales. Lo que viaja son los archivos y sus tags; el orden de la playlist y los cue points son de cada programa. Cómo se mueve una playlist entre Traktor, Rekordbox y Serato, paso a paso, está en nuestros artículos de importación.",
              },
            },
          ],
        },
        CTA,
      ],
    },
  ],
}

export const CHOOSING_DJ_SOFTWARE: Comparison = {
  id: "best-dj-software",
  kind: "market",
  competitor: "Rekordbox, Serato, Traktor, VirtualDJ and djay Pro",
  subjects: SUBJECTS,
  footerLabel: {
    en: "Choosing DJ software",
    es: "Elegir software de DJ",
  },
  slug: {
    en: "best-dj-software",
    es: "mejor-software-para-dj",
  },
  verifiedAt: "2026-09-27",
  sources: SOURCES,
  title: {
    en: "Best DJ software for beginners, Mac, Windows or Spotify: how to choose, from what each maker says",
    es: "Mejor software para DJ, gratis y para empezar: cómo elegir, con lo que dice cada fabricante",
  },
  description: {
    en: "No verdict, on purpose: what Rekordbox, Serato, Traktor, VirtualDJ and djay Pro say about free tiers, Mac, Windows, Spotify and price, so a DJ can choose.",
    es: "Sin veredicto, a propósito: qué dicen Rekordbox, Serato, Traktor, VirtualDJ y djay Pro sobre versiones gratis, Mac, Windows, Spotify y precio, para elegir.",
  },
  summary: {
    en: "\"Best\" is a verdict, and no maker's page supports one — so this page does not give one. It answers the four questions people put after \"best DJ software\" with what each program's own site says, and then names the case each one is right for.",
    es: "«Mejor» es un veredicto, y ninguna página de fabricante lo sostiene; por eso esta página no lo da. Contesta las preguntas que la gente pone después de «mejor software para DJ» —gratis, para empezar, Mac o Windows, Spotify, armar sets— con lo que dice el sitio de cada programa, y después nombra para qué caso conviene cada uno.",
  },
  sections: [
    {
      id: "que-puede-querer-decir-mejor",
      heading: {
        en: "What \"best\" can mean, and what this page will not claim",
        es: "Qué puede querer decir «mejor», y qué no va a afirmar esta página",
      },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `Every maker on this page says something like it about itself — Serato calls itself "the most popular DJ software globally", VirtualDJ prints a download counter, Traktor says "hundreds of thousands of DJs". None of that is checkable, so none of it is here. What is checkable is what each site says its program costs, runs on and streams from, and that is enough to choose with. Each fact below was read from the maker's page on 27 September 2026; where a page did not say something, the table says so instead of guessing. The same five programs, compared head to head on price, platforms and streaming, are on [Rekordbox vs Serato vs Traktor](/compare/rekordbox-vs-serato-vs-traktor).`,
            es: `Cada fabricante de esta página dice algo parecido de sí mismo: Serato se llama «the most popular DJ software globally», VirtualDJ imprime un contador de descargas, Traktor dice «hundreds of thousands of DJs». Nada de eso se puede verificar, así que nada de eso está acá. Lo que sí se puede verificar es qué dice cada sitio sobre cuánto cuesta su programa, en qué corre y desde dónde hace streaming, y con eso alcanza para elegir. Cada dato de abajo se leyó de la página del fabricante el 27 de septiembre de 2026; donde una página no decía algo, la tabla lo dice en vez de adivinar. Los mismos cinco programas, cara a cara por precio, plataformas y streaming, están en [Rekordbox vs Serato vs Traktor](/es/comparar/rekordbox-vs-serato-vs-traktor).`,
          },
        },
      ],
    },
    {
      id: "para-empezar-y-gratis",
      heading: {
        en: "For beginners: what is free, and what free means",
        es: "Para empezar: qué es gratis, y qué quiere decir gratis",
      },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `Three of the five have a way in that costs nothing, and the three "free"s are different things.

| Program | The free way in, in its own words |
|---|---|
| Serato | Serato DJ Lite is "free to download" and "keeps things simple while you learn to DJ"; its Practice Mode works "without any DJ hardware". Serato DJ Pro also has a free Practice Mode, described as "a free, basic version". |
| VirtualDJ | "Free for home use" — the download page says so outright. The paid tiers begin where home use ends: the US$4 Home plan "cannot be used at paid gigs", and VDJ Pro at US$19 a month "can". |
| Rekordbox | A Free plan with "basic music management features and DJ experience"; the cloud, sync and analysis features are what the paid tiers add. |
| Traktor | The product page shows one price, US$149, and no free tier. |
| djay Pro | The pages we read show neither a price nor a free tier; the price is in the app stores. |

For somebody starting out, the honest reading is: Serato DJ Lite and VirtualDJ let you learn on a laptop for nothing, and Rekordbox's Free plan lets you manage a library for nothing. Which of those is right depends on the controller you end up buying, because the controller often decides the program — Serato's pricing page says as much about hardware that unlocks DJ Pro.`,
            es: `Tres de los cinco tienen una entrada que no cuesta nada, y los tres «gratis» son cosas distintas.

| Programa | La entrada gratis, en sus propias palabras |
|---|---|
| Serato | Serato DJ Lite es «free to download» y «keeps things simple while you learn to DJ»; su Practice Mode funciona «without any DJ hardware». Serato DJ Pro también tiene un Practice Mode gratis, descrito como «a free, basic version». |
| VirtualDJ | «Free for home use»: la página de descarga lo dice sin vueltas. Los niveles pagos empiezan donde termina el uso hogareño: el plan Home de u$s4 «cannot be used at paid gigs», y VDJ Pro, a u$s19 por mes, «can». |
| Rekordbox | Un plan Free con «basic music management features and DJ experience»; la nube, la sincronización y el análisis son lo que agregan los niveles pagos. |
| Traktor | La página de producto muestra un precio, u$s149, y ningún nivel gratis. |
| djay Pro | Las páginas que leímos no muestran ni precio ni nivel gratis; el precio está en las tiendas de apps. |

Para alguien que empieza, la lectura honesta es: Serato DJ Lite y VirtualDJ te dejan aprender en una laptop sin pagar, y el plan Free de Rekordbox te deja gestionar una librería sin pagar. Cuál de ésos conviene depende del controlador que termines comprando, porque el controlador muchas veces decide el programa: la página de precios de Serato lo dice sobre el hardware que desbloquea DJ Pro.`,
          },
        },
      ],
    },
    {
      id: "mac-o-windows",
      heading: { en: "Mac or Windows", es: "Mac o Windows" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `This one is short: all five run on both. The differences are which versions, and whether there is a phone app.

${PLATFORM_TABLE.en}

If your laptop is older, the stated minimums decide: VirtualDJ and djay Pro name macOS 10.15 and Windows 10, Traktor names macOS 13 and Windows 11. If you want to play from an iPad or a phone, djay is the one whose maker lists iOS and Android apps on the same footer as its desktop versions.`,
            es: `Ésta es corta: los cinco corren en los dos. Las diferencias son qué versiones, y si hay app para el teléfono.

${PLATFORM_TABLE.es}

Si tu laptop es vieja, deciden los mínimos declarados: VirtualDJ y djay Pro nombran macOS 10.15 y Windows 10; Traktor nombra macOS 13 y Windows 11. Si querés tocar desde un iPad o un teléfono, djay es el que tiene apps para iOS y Android listadas en el mismo pie que sus versiones de escritorio.`,
          },
        },
      ],
    },
    {
      id: "spotify-y-streaming",
      heading: { en: "Spotify, and streaming in general", es: "Spotify, y el streaming en general" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `"Best DJ software for Spotify" has a factual answer on the pages read for this article, and it is narrower than the search suggests. Two makers name Spotify: Serato, in the FAQ on its DJ Pro page, and Algoriddim, on both djay Pro pages, which say you can connect a Spotify or Apple Music account. Rekordbox names Beatport, Beatsource, TIDAL and SoundCloud "and other music streaming services", with a note that some are not available in some countries. Traktor names Beatport and Beatsource. We did not read a streaming list on VirtualDJ's pages, so it is not claimed either way.

One condition worth knowing before choosing on this: Serato's own FAQ says recording is not available while playing from a streaming service. Streaming is for playing, not for making a mix file.`,
            es: `«Mejor software para DJ con Spotify» tiene una respuesta fáctica en las páginas leídas para este artículo, y es más angosta de lo que sugiere la búsqueda. Dos fabricantes nombran a Spotify: Serato, en la FAQ de su página de DJ Pro, y Algoriddim, en las dos páginas de djay Pro, que dicen que podés conectar una cuenta de Spotify o de Apple Music. Rekordbox nombra Beatport, Beatsource, TIDAL y SoundCloud «and other music streaming services», con la nota de que algunos no están disponibles en algunos países. Traktor nombra Beatport y Beatsource. No leímos una lista de streaming en las páginas de VirtualDJ, así que no se afirma nada en ningún sentido.

Una condición que conviene saber antes de elegir por esto: la propia FAQ de Serato dice que no se puede grabar mientras se toca desde un servicio de streaming. El streaming es para tocar, no para armar un archivo de mezcla.`,
          },
        },
      ],
    },
    {
      id: "cuando-conviene-cada-uno",
      heading: { en: "When each one is the right call", es: "Cuándo conviene cada uno" },
      nodes: [{ kind: "prose", markdown: WHEN_EACH }],
    },
    {
      id: "programa-para-armar-sets",
      heading: {
        en: "A program to build sets, which is a different question",
        es: "Un programa para armar sets, que es otra pregunta",
      },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `All five above are programs to *play* with. "A program to build DJ sets" is a different search, and it is the one EnergyCurve answers: you export the playlist from whichever of the five you chose, and it reads the order — energy, key, tempo, track by track — and tells you where the hour climbs, sags or clashes, before you play it. It does not replace the DJ software, does not convert libraries, and does not need you to switch anything. [The free energy curve tool](/tools/energy-curve) takes a Rekordbox XML, a Traktor NML, an M3U8 or a folder of tagged files, without an account.`,
            es: `Los cinco de arriba son programas para *tocar*. «Programa para armar sets de DJ» es otra búsqueda, y es la que contesta EnergyCurve: exportás la playlist desde el que hayas elegido de los cinco, y lee el orden —energía, tonalidad, tempo, tema por tema— y te dice dónde la hora sube, se cae o choca, antes de tocarla. No reemplaza al software de DJ, no convierte librerías y no te pide cambiar nada. [La herramienta gratuita de curva de energía](/es/herramientas/curva-de-energia) toma un XML de Rekordbox, un NML de Traktor, un M3U8 o una carpeta de archivos etiquetados, sin cuenta.`,
          },
        },
      ],
    },
    {
      id: "preguntas",
      heading: { en: "Questions", es: "Preguntas" },
      nodes: [
        {
          kind: "faq",
          entries: [
            {
              question: {
                en: "Which DJ software is free?",
                es: "¿Qué software de DJ es gratis?",
              },
              answer: {
                en: "By their own pages: Serato DJ Lite is free to download; VirtualDJ is free for home use, with paid plans for paid gigs; Rekordbox has a Free plan for basic music management. Traktor's page shows a single price, and djay Pro's price is not on its site.",
                es: "Según sus propias páginas: Serato DJ Lite es gratis para descargar; VirtualDJ es gratis para uso hogareño, con planes pagos para toques pagos; Rekordbox tiene un plan Free para gestión básica de música. La página de Traktor muestra un precio único, y el precio de djay Pro no está en su sitio.",
              },
            },
            {
              question: {
                en: "Which DJ software is easiest to start with?",
                es: "¿Con qué software de DJ es más fácil empezar?",
              },
              answer: {
                en: "That is a judgement this page does not make. What the pages say: Serato DJ Lite is positioned as the version for learning, VirtualDJ says it is free for home use and works without hardware, and djay Pro's pages address beginners and experienced DJs alike. Try the free ones on the laptop you have before buying a controller, because the controller may decide the program.",
                es: "Es un juicio que esta página no hace. Lo que dicen las páginas: Serato DJ Lite se presenta como la versión para aprender, VirtualDJ dice que es gratis para uso hogareño y funciona sin hardware, y las páginas de djay Pro hablan tanto a principiantes como a DJs con experiencia. Probá los gratis en la laptop que tenés antes de comprar un controlador, porque el controlador puede decidir el programa.",
              },
            },
            {
              question: {
                en: "Does EnergyCurve replace any of these?",
                es: "¿EnergyCurve reemplaza a alguno de éstos?",
              },
              answer: {
                en: "No. They play music; EnergyCurve reads the playlist they export and analyses the order of a set before you play it. You need one of them, or any program that exports a playlist, for EnergyCurve to have something to read.",
                es: "No. Ellos tocan música; EnergyCurve lee la playlist que exportan y analiza el orden de un set antes de tocarlo. Necesitás uno de ellos, o cualquier programa que exporte una playlist, para que EnergyCurve tenga algo que leer.",
              },
            },
          ],
        },
        CTA,
      ],
    },
  ],
}
