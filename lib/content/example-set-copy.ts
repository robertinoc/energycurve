import type { SiteLocale } from "@/lib/content/site-copy"

type Copy = Record<SiteLocale, string>

/**
 * The words of the dashboard's example set (docs/conversion-plan.md, step 1.1).
 * Its own module so parallel branches don't meet in dashboard-copy.ts
 * (AGENTS.md, «Parallel PRs»).
 *
 * Two jobs, and every string serves one of them: never let the example pass for
 * the DJ's own set, and end on their own import, not on the example.
 */
export const EXAMPLE_SET_COPY = {
  open: {
    en: "No export at hand? See an example set first",
    es: "¿No tenés un export a mano? Mirá primero un set de ejemplo",
  } satisfies Copy,
  badge: { en: "Example", es: "Ejemplo" } satisfies Copy,
  title: {
    en: "An example set — not yours",
    es: "Un set de ejemplo, no es tuyo",
  } satisfies Copy,
  note: {
    en: "It isn't saved to your account and doesn't count as a playlist. What you see is the same analysis your own set gets.",
    es: "No se guarda en tu cuenta ni cuenta como playlist. Lo que ves es el mismo análisis que va a tener tu set.",
  } satisfies Copy,
  meta: {
    en: "{count} tracks · {genre} · {context} · {minutes} min",
    es: "{count} temas · {genre} · {context} · {minutes} min",
  } satisfies Copy,
  scoreLabel: { en: "Score", es: "Puntaje" } satisfies Copy,
  curveLabel: { en: "Energy curve of the example set", es: "Curva de energía del set de ejemplo" } satisfies Copy,
  curveLegend: {
    en: "The line is each track's energy; the dashed one is where a set like this should go.",
    es: "La línea es la energía de cada tema; la punteada, por dónde debería ir un set así.",
  } satisfies Copy,
  problemsTitle: { en: "What the analysis found", es: "Lo que encontró el análisis" } satisfies Copy,
  moreProblems: {
    en: "And {count} more. On your own set, the analysis lists every one, with the fix beside it.",
    es: "Y {count} más. En tu set, el análisis los muestra todos, con el arreglo al lado.",
  } satisfies Copy,
  cta: { en: "Now try it with yours", es: "Ahora probá con lo tuyo" } satisfies Copy,
  ctaHint: {
    en: "Your set gets this, plus every fix applied in a click.",
    es: "Tu set recibe esto, y cada arreglo se aplica con un clic.",
  } satisfies Copy,
} as const
