import type { CopySection, FaqEntry } from "@/lib/content/tools-copy"

/**
 * Copy for the Traktor ↔ Rekordbox playlist converter.
 *
 * Its own file for the same reason the harmonic tools have theirs: one page's
 * worth of strings per file keeps a diff readable. The article stays on **using
 * the tool** — what goes in, what comes out, what the other program does with
 * it. The longer story of moving between the two programs is the blog article
 * this page links to, and two of our pages competing for one query would be
 * the wrong kind of coverage.
 *
 * The tool came from TraktorBox, and the page says so: a DJ who bookmarked
 * apps.robertino.world/traktorbox lands here from a redirect and should
 * recognise what they found.
 */
export const CONVERTER_COPY = {
  h1: {
    en: "Convert Traktor playlists to Rekordbox, and back",
    es: "Convertí playlists de Traktor a Rekordbox, y al revés",
  },
  lede: {
    en: "Drop a Traktor .nml and get a .m3u8 Rekordbox imports, or drop a .m3u8 and get an .nml Traktor opens. Track order and file paths carried across, in your browser, with nothing uploaded.",
    es: "Soltá un .nml de Traktor y llevate un .m3u8 que Rekordbox importa, o soltá un .m3u8 y llevate un .nml que Traktor abre. El orden y las rutas de los archivos viajan enteros, en tu navegador y sin subir nada.",
  },

  // --- The tool's own interface -------------------------------------------
  ui: {
    dropTitle: {
      en: "Drop a playlist file here",
      es: "Soltá acá el archivo de la playlist",
    },
    dropBody: {
      en: "A Traktor .nml, or a Rekordbox .m3u8 or .m3u. The direction is read from the file. Nothing leaves your browser.",
      es: "Un .nml de Traktor, o un .m3u8 o .m3u de Rekordbox. La dirección se lee del archivo. Nada sale de tu navegador.",
    },
    browse: { en: "Choose a file", es: "Elegir un archivo" },

    directionsTitle: { en: "Both directions", es: "Las dos direcciones" },
    nmlToM3u8: {
      en: "Traktor → Rekordbox",
      es: "Traktor → Rekordbox",
    },
    nmlToM3u8Body: {
      en: "You drop a .nml, you get one .m3u8 per playlist inside it.",
      es: "Soltás un .nml, te llevás un .m3u8 por cada playlist que tenga adentro.",
    },
    m3u8ToNml: {
      en: "Rekordbox → Traktor",
      es: "Rekordbox → Traktor",
    },
    m3u8ToNmlBody: {
      en: "You drop a .m3u8, you get a .nml with the playlist and its tracks.",
      es: "Soltás un .m3u8, te llevás un .nml con la playlist y sus temas.",
    },

    resultTitle: { en: "Ready to download", es: "Listo para descargar" },
    resultOne: {
      en: "One file, converted from",
      es: "Un archivo, convertido desde",
    },
    resultMany: {
      en: "playlists found. Each one is its own file:",
      es: "playlists encontradas. Cada una es un archivo aparte:",
    },
    /** `{n}` is the count; singular and plural because Spanish and English
     *  both mark it and "1 tracks" reads as a bug. */
    trackCountOne: { en: "1 track", es: "1 tema" },
    trackCountMany: { en: "{n} tracks", es: "{n} temas" },
    download: { en: "Download", es: "Descargar" },
    convertAnother: {
      en: "Convert another file",
      es: "Convertir otro archivo",
    },
    nextNml: {
      en: "In Rekordbox: File → Import → Import playlist, and pick the .m3u8. The tracks have to be where the paths say they are.",
      es: "En Rekordbox: File → Import → Import playlist, y elegí el .m3u8. Los temas tienen que estar donde dicen las rutas.",
    },
    nextM3u8: {
      en: "In Traktor: right-click Playlists in the browser tree → Import Playlist, and pick the .nml.",
      es: "En Traktor: clic derecho en Playlists en el árbol del browser → Import Playlist, y elegí el .nml.",
    },

    errorUnsupported: {
      en: "That is not a file we convert. Drop a Traktor .nml, or a Rekordbox .m3u8 or .m3u.",
      es: "Ese archivo no lo convertimos. Soltá un .nml de Traktor, o un .m3u8 o .m3u de Rekordbox.",
    },
    errorUnreadable: {
      en: "We couldn't read that file. Export the playlist again from Traktor or Rekordbox and try the new file.",
      es: "No pudimos leer ese archivo. Exportá la playlist de nuevo desde Traktor o Rekordbox y probá con el archivo nuevo.",
    },
    errorNoPlaylists: {
      en: "This .nml has no playlist with tracks in it. In Traktor, right-click the playlist itself and choose Export Playlist.",
      es: "Este .nml no tiene ninguna playlist con temas. En Traktor, clic derecho sobre la playlist y elegí Export Playlist.",
    },
    errorNoTracks: {
      en: "This .m3u8 lists no tracks. Export the playlist again and check it is not empty.",
      es: "Este .m3u8 no tiene ningún tema. Exportá la playlist de nuevo y fijate que no esté vacía.",
    },
  },

  // --- The article under the tool ----------------------------------------
  article: [
    {
      heading: {
        en: "What moves across, and what doesn't",
        es: "Qué pasa de un lado al otro, y qué no",
      },
      paragraphs: [
        {
          en: "A playlist is an ordered list of file paths, and that is exactly what both formats carry: for each track, where the file lives, how long it runs, and the artist and title. The converter keeps all four in the order they were in. Traktor's .nml writes a location as a volume, a folder chain and a filename; the .m3u8 wants one absolute path. This tool joins the three into /Volumes/<disk>/… on the way out and splits the path back on the way in.",
          es: "Una playlist es una lista ordenada de rutas de archivo, y eso es exactamente lo que llevan los dos formatos: por cada tema, dónde está el archivo, cuánto dura, y el artista y el título. El conversor conserva las cuatro cosas en el orden en que estaban. El .nml de Traktor escribe la ubicación como un volumen, una cadena de carpetas y un nombre de archivo; el .m3u8 quiere una sola ruta absoluta. Esta herramienta junta las tres partes en /Volumes/<disco>/… al salir, y vuelve a separar la ruta al entrar.",
        },
        {
          en: "What does not move is analysis. Cue points, loops, beatgrids, and Traktor's key and BPM live in each program's own library, not in the playlist file, and neither format has a place for them. Rekordbox will analyse the tracks again when it imports the .m3u8. If you want to keep the energy values you tagged, they travel in the file's comment field, which is what the energy tags reference explains.",
          es: "Lo que no se mueve es el análisis. Cue points, loops, beatgrids, y la tonalidad y el BPM de Traktor viven en la librería de cada programa, no en el archivo de la playlist, y ninguno de los dos formatos tiene dónde ponerlos. Rekordbox va a analizar los temas de nuevo cuando importe el .m3u8. Si querés conservar los valores de energía que etiquetaste, viajan en el campo de comentario del archivo, que es lo que explica la referencia de tags de energía.",
        },
      ],
    },
    {
      heading: {
        en: "Traktor to Rekordbox, step by step",
        es: "De Traktor a Rekordbox, paso a paso",
      },
      paragraphs: [
        {
          en: "In Traktor, right-click the playlist in the browser tree and choose Export Playlist. You get a folder with the audio and a .nml beside it. Drop the .nml here. If the .nml holds several playlists — a whole folder exported at once, or a collection backup — you get one .m3u8 per playlist and you pick the ones you want.",
          es: "En Traktor, clic derecho sobre la playlist en el árbol del browser y elegí Export Playlist. Te queda una carpeta con el audio y un .nml al lado. Soltá el .nml acá. Si el .nml tiene varias playlists — una carpeta entera exportada de una, o un backup de la colección — te llevás un .m3u8 por playlist y elegís los que te sirven.",
        },
        {
          en: "In Rekordbox, File → Import → Import playlist, and choose the .m3u8. Rekordbox follows each path to the audio file, so the tracks have to be where Traktor said they were — on the same disk, under the same name. A track it cannot find is skipped, not invented.",
          es: "En Rekordbox, File → Import → Import playlist, y elegí el .m3u8. Rekordbox sigue cada ruta hasta el archivo de audio, así que los temas tienen que estar donde Traktor dijo que estaban — en el mismo disco, con el mismo nombre. Un tema que no encuentra lo salta, no lo inventa.",
        },
      ],
    },
    {
      heading: {
        en: "Rekordbox to Traktor",
        es: "De Rekordbox a Traktor",
      },
      paragraphs: [
        {
          en: "Rekordbox exports a playlist as .m3u8 from the playlist's right-click menu. Drop that here and you get a .nml named after the file, with a collection entry per track and one playlist referencing them. In Traktor, right-click Playlists in the browser tree, choose Import Playlist, and pick the .nml. Traktor reads the paths and analyses the tracks itself.",
          es: "Rekordbox exporta una playlist como .m3u8 desde el menú del clic derecho de la playlist. Soltá eso acá y te llevás un .nml con el nombre del archivo, una entrada de colección por tema y una playlist que las referencia. En Traktor, clic derecho en Playlists en el árbol del browser, elegí Import Playlist, y buscá el .nml. Traktor lee las rutas y analiza los temas por su cuenta.",
        },
      ],
    },
    {
      heading: {
        en: "This used to be TraktorBox",
        es: "Esto antes era TraktorBox",
      },
      paragraphs: [
        {
          en: "The converter ran for a while as TraktorBox, a small standalone page. It now lives here, doing the same conversion with the same rules, with one difference that matters: the file used to be posted to a server to convert it, and now the conversion runs in your browser. The playlist never leaves your machine, which is the promise every tool on this site makes.",
          es: "El conversor funcionó un tiempo como TraktorBox, una página chica y aparte. Ahora vive acá, haciendo la misma conversión con las mismas reglas, con una diferencia que importa: antes el archivo se subía a un servidor para convertirlo, y ahora la conversión corre en tu navegador. La playlist no sale de tu máquina, que es la promesa que hace cada herramienta de este sitio.",
        },
      ],
    },
  ] satisfies readonly CopySection[],

  // --- FAQ: rendered on the page AND the source of the FAQPage schema ----------
  faq: [
    {
      question: {
        en: "Is the file uploaded anywhere?",
        es: "¿El archivo se sube a algún lado?",
      },
      answer: {
        en: "No. The conversion runs in your browser with the file it already has open. Nothing is posted to a server, and there is no account. The old TraktorBox did upload the file to convert it; this version does not.",
        es: "No. La conversión corre en tu navegador con el archivo que ya tiene abierto. No se manda nada a ningún servidor, y no hay cuenta. El TraktorBox viejo sí subía el archivo para convertirlo; esta versión no.",
      },
    },
    {
      question: {
        en: "Will Rekordbox find the tracks?",
        es: "¿Rekordbox va a encontrar los temas?",
      },
      answer: {
        en: "If they are where Traktor said they were. The .m3u8 points at /Volumes/<disk>/<folder>/<file>, built from the .nml's own location fields. Move the audio or rename the disk and Rekordbox will report the tracks as missing, same as it would for any playlist.",
        es: "Si están donde Traktor dijo que estaban. El .m3u8 apunta a /Volumes/<disco>/<carpeta>/<archivo>, armado con los campos de ubicación del propio .nml. Si movés el audio o renombrás el disco, Rekordbox va a marcar los temas como faltantes, igual que con cualquier playlist.",
      },
    },
    {
      question: {
        en: "Do cue points, BPM and key come across?",
        es: "¿Pasan los cue points, el BPM y la tonalidad?",
      },
      answer: {
        en: "No, and no playlist converter can do that with these two formats: neither .nml playlist exports nor .m3u8 files carry analysis. Order, paths, titles, artists and durations come across. Rekordbox and Traktor each analyse the tracks again on import.",
        es: "No, y ningún conversor de playlists puede hacerlo con estos dos formatos: ni el export de playlist .nml ni el .m3u8 llevan análisis. Pasan el orden, las rutas, los títulos, los artistas y las duraciones. Rekordbox y Traktor analizan los temas de nuevo al importar.",
      },
    },
    {
      question: {
        en: "My .nml has several playlists. What do I get?",
        es: "Mi .nml tiene varias playlists. ¿Qué me llevo?",
      },
      answer: {
        en: "One .m3u8 per playlist, each named after its playlist, listed so you can download the ones you want. Playlists with no tracks are left out.",
        es: "Un .m3u8 por playlist, cada uno con el nombre de su playlist, en una lista para que descargues los que quieras. Las playlists sin temas quedan afuera.",
      },
    },
    {
      question: {
        en: "Does it work with Windows paths?",
        es: "¿Funciona con rutas de Windows?",
      },
      answer: {
        en: "Going into Traktor, yes: a path like D:\\Music\\track.mp3 becomes a Traktor location on volume D:. Going out to .m3u8, paths are written the macOS way, under /Volumes/, because that is how Traktor's .nml names the disk. Rekordbox on Windows may need the paths relinked.",
        es: "Hacia Traktor, sí: una ruta como D:\\Music\\track.mp3 se convierte en una ubicación de Traktor en el volumen D:. Hacia .m3u8, las rutas se escriben a la manera de macOS, bajo /Volumes/, porque así nombra el disco el .nml de Traktor. Rekordbox en Windows puede necesitar que relinkees las rutas.",
      },
    },
  ] satisfies readonly FaqEntry[],
} as const
