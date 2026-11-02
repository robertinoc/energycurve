import type { SiteLocale } from "@/lib/content/site-copy"

type Copy = Record<SiteLocale, string>

/**
 * The words of the sales walls (docs/conversion-plan.md, step 3.1). Its own
 * module rather than a block in dashboard-copy.ts or analysis-copy.ts: the walls
 * live on three screens, and keeping them together keeps what each plan is
 * said to unlock consistent between them, and keeps parallel branches out of
 * the shared copy tables (AGENTS.md, «Parallel PRs»).
 *
 * Every wall says what the plan changes *here*, and nothing it doesn't: the
 * features named are all shipped (`lib/product/capabilities.ts`).
 */
export const SALES_WALL_COPY = {
  cta: { en: "See plans", es: "Ver planes" } satisfies Copy,

  playlistLimitTitle: {
    en: "You've reached {max} playlists on your plan.",
    es: "Llegaste a {max} playlists en tu plan.",
  } satisfies Copy,
  playlistLimitBody: {
    en: "Nothing was created. PRO keeps as many sets as you want, reads the real BPM from your audio, shows you every version of each set and prints the set sheet. Or delete one of yours to make room.",
    es: "No se creó nada. PRO guarda todos los sets que quieras, lee el BPM real de tu audio, te muestra cada versión de cada set e imprime la hoja del set. O borrá uno de los tuyos para hacer lugar.",
  } satisfies Copy,

  /** FREE, with this month's ordering spent: PRO is the next step up. */
  aiMoreOnProTitle: {
    en: "PRO gives you {limit} AI orderings a month.",
    es: "Con PRO son {limit} ordenamientos con IA por mes.",
  } satisfies Copy,
  /** PRO, with all of this month's spent: only PRO+ gives more. */
  aiNoLimitTitle: {
    en: "PRO+ has no monthly limit on AI ordering.",
    es: "PRO+ no tiene límite mensual de ordenamientos con IA.",
  } satisfies Copy,
  aiMoreOnProBody: {
    en: "And PRO+ has no limit at all. Whatever you've ordered stays as it is, and the fixes and moving tracks by hand work exactly the same.",
    es: "Y PRO+ no tiene límite. Lo que ya ordenaste queda como está, y los arreglos y mover temas a mano funcionan igual.",
  } satisfies Copy,
  aiNoLimitBody: {
    en: "Whatever you've ordered stays as it is, and the fixes and moving tracks by hand work exactly the same.",
    es: "Lo que ya ordenaste queda como está, y los arreglos y mover temas a mano funcionan igual.",
  } satisfies Copy,
} as const
