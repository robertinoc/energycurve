import type { Metadata } from "next"

import { BlogIndex } from "@/components/marketing/blog-index"
import { listPosts } from "@/lib/blog/posts"
import { buildBlogIndexStructuredData } from "@/lib/blog/structured-data"
import { marketingMetadata, serializeStructuredData } from "@/lib/seo"

const LOCALE = "en" as const

export const metadata: Metadata = marketingMetadata("/blog", LOCALE)

export default function BlogIndexPage() {
  const posts = listPosts(LOCALE)

  return (
    <>
      {/* Only when there are articles. A `Blog` node listing nothing is a claim
          about emptiness, and this index is `noindex` when it is empty. */}
      {posts.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeStructuredData(
              buildBlogIndexStructuredData(posts, LOCALE)
            ),
          }}
        />
      ) : null}
      <BlogIndex posts={posts} locale={LOCALE} />
    </>
  )
}
