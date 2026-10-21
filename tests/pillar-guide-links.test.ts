import { describe, expect, it } from "vitest"

import { listPosts } from "@/lib/blog/posts"
import { GUIDES } from "@/lib/content/guides/guides"
import { guidePath } from "@/lib/content/glossary/paths"

/**
 * The Spanish articles link the pillar guide (lote 21).
 *
 * One of nine did. The guide is the site's main content asset, and the
 * articles that discuss the curve's shape, its scale or reading it are where a
 * reader goes next. The link sits in the body, where the text already talks
 * about it — not in a block at the end.
 */

const guide = GUIDES.find((g) => g.id === "curva-de-energia")!
const href = guidePath(guide, "es")

/**
 * Left out on purpose: these three are about moving files between programs,
 * and nothing in them is about the curve. A link there would be filler.
 */
const NOT_ABOUT_THE_CURVE = new Set([
  "exportar-playlist-de-traktor-a-rekordbox",
  "exportar-playlist-de-rekordbox-a-usb",
  "crates-de-serato-y-rekordbox",
])

describe("the Spanish articles link the energy-curve guide", () => {
  const posts = listPosts("es")

  it("the list of exceptions names real articles", () => {
    const slugs = new Set(posts.map((p) => p.slug))
    for (const slug of NOT_ABOUT_THE_CURVE) expect(slugs.has(slug), slug).toBe(true)
  })

  for (const post of posts.filter((p) => !NOT_ABOUT_THE_CURVE.has(p.slug))) {
    it(post.slug, () => {
      expect(JSON.stringify(post.blocks)).toContain(`"href":"${href}"`)
    })
  }
})
