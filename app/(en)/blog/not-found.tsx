import type { Metadata } from "next"

import { NotFoundContent } from "@/components/layout/not-found-content"

export const metadata: Metadata = { title: "Article not found" }

/**
 * 404 for an article slug that doesn't exist, or a draft.
 *
 * Its own boundary, below the one for the rest of the English tree, and the
 * reason is mechanical: `/blog/[slug]` is statically generated, so whatever
 * renders its 404 must not read a cookie — a static page that turns dynamic at
 * request time fails with a 500 where a 404 belongs. Holding that constraint
 * here is what lets the tree-level not-found go on reading the language the
 * visitor actually chose.
 *
 * English, and that is also the right answer on its own terms: this is the
 * English blog, reached from the English index.
 */
export default function BlogNotFound() {
  return <NotFoundContent locale="en" />
}
