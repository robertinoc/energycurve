import type { Metadata } from "next"

import { NotFoundContent } from "@/components/layout/not-found-content"

export const metadata: Metadata = { title: "Artículo no encontrado" }

/**
 * 404 for a Spanish article that doesn't exist, or a draft.
 *
 * Same shape as its English twin, and the same reason: `/es/blog/[slug]` is
 * statically generated, so this must not read a request. Before it existed, a
 * bad Spanish slug fell all the way through to `app/not-found.tsx` — which has
 * no layout above it, so the reader got the article's Spanish title in the tab
 * and Next's bare error shell in the page.
 */
export default function BlogNotFoundEs() {
  return <NotFoundContent locale="es" />
}
