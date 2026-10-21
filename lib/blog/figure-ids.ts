/**
 * The ids an article can name in a ```figure fence (lote 22). Apart from
 * `figures.ts` so the markdown parser, which client components import, can
 * check an id without pulling the analysis engine into the browser bundle.
 */
export const BLOG_FIGURE_IDS = ["set-order-example", "transition-tolerance"] as const

export type BlogFigureId = (typeof BLOG_FIGURE_IDS)[number]

export function isBlogFigureId(id: string): id is BlogFigureId {
  return (BLOG_FIGURE_IDS as readonly string[]).includes(id)
}
