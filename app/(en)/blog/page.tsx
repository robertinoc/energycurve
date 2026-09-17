import type { Metadata } from "next"

import { BlogIndex } from "@/components/marketing/blog-index"
import { listPosts } from "@/lib/blog/posts"
import { marketingMetadata } from "@/lib/seo"

const LOCALE = "en" as const

export const metadata: Metadata = marketingMetadata("/blog", LOCALE)

export default function BlogIndexPage() {
  return <BlogIndex posts={listPosts(LOCALE)} locale={LOCALE} />
}
