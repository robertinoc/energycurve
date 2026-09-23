import { inlineToText } from "@/lib/blog/markdown"
import type { BlogPost } from "@/lib/blog/posts"
import { articleImageUrl } from "@/lib/blog/social-card"
import { BLOG_COPY } from "@/lib/content/blog-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import { SITE_URL, buildFaqPage, buildOrganization } from "@/lib/seo"

/**
 * The author, as a `Person` rather than the `Organization`: the articles are
 * written in one voice, in first person, and an answer engine quoting one should
 * be able to say who wrote it.
 *
 * Read off the post since SEO-E12. Every article today resolves to the site's
 * default author, which is true — but a guest post has to be able to name its
 * guest without a change here, and a constant is how that gets forgotten.
 */
function author(post: BlogPost) {
  return {
    "@type": "Person",
    name: post.author.name,
    url: post.author.url,
  }
}

/** "Blog", in the language the article is written in. */
const BLOG_CRUMB: Record<BlogPost["locale"], string> = {
  en: "Blog",
  es: "Blog",
}

/** "Home", same. */
const HOME_CRUMB: Record<BlogPost["locale"], string> = {
  en: "Home",
  es: "Inicio",
}

/**
 * `Blog` + `BreadcrumbList` for an index page — SEO-E16.
 *
 * The index had no structured data at all, which left a crawler to infer that a
 * list of five links was a blog. `Blog` with a `blogPost` list says what the
 * page is and what is on it in one node, and each entry carries enough to be
 * useful on its own — an answer engine that reads the index and never fetches an
 * article still knows the titles, the dates and the URLs.
 *
 * Built from the same `BlogPost[]` the page renders, so the list cannot name an
 * article the page does not show. Emitted only when there are articles: a `Blog`
 * declaring zero posts is a claim about emptiness, and the English index is
 * `noindex` precisely because it is empty.
 */
export function buildBlogIndexStructuredData(
  posts: BlogPost[],
  locale: BlogPost["locale"]
) {
  const url = `${SITE_URL}${localizedPath("/blog", locale)}`

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${url}#blog`,
        name: BLOG_CRUMB[locale],
        description: BLOG_COPY.intro[locale],
        url,
        inLanguage: locale,
        publisher: buildOrganization(locale),
        blogPost: posts.map((post) => ({
          "@type": "BlogPosting",
          "@id": `${SITE_URL}${localizedPath(`/blog/${post.slug}`, post.locale)}#article`,
          headline: post.title,
          description: post.description,
          url: `${SITE_URL}${localizedPath(`/blog/${post.slug}`, post.locale)}`,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt ?? post.publishedAt,
          inLanguage: post.locale,
          author: author(post),
          image: articleImageUrl(post),
          // The tags, as schema's own word for them. `keywords` on an article is
          // one of the few places the property is actually read.
          ...(post.tags.length > 0 ? { keywords: post.tags.join(", ") } : {}),
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: HOME_CRUMB[locale],
            item: `${SITE_URL}${localizedPath("/", locale)}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: BLOG_CRUMB[locale],
            item: url,
          },
        ],
      },
    ],
  }
}

/**
 * `BlogPosting` + `BreadcrumbList` for one article.
 *
 * The articles shipped with no structured data at all, which meant the one thing
 * on this site written to answer a question was also the one thing a crawler had
 * to infer everything about — including whether it was an article.
 *
 * Both entities go in a single `@graph` so the page emits one `<script>` rather
 * than two, and `mainEntityOfPage` ties the posting to the URL it lives at,
 * which is what stops a syndicated copy from reading as the original.
 *
 * `dateModified` comes from `postUpdatedAt`, so an article that has never been
 * revised reports its publication date rather than today's build.
 */
/**
 * The article's questions, straight off the blocks the page renders.
 *
 * Not from a second list in the frontmatter, which was the obvious shape and
 * the wrong one: the whole property the rest of this site holds — and that
 * `AGENTS.md` states as a rule — is that a question which is not on the page
 * cannot reach the markup. A frontmatter list would be a second copy, and a
 * second copy is a thing that stops matching quietly.
 *
 * The answer is flattened from the same inline nodes the reader sees, so an
 * answer containing a link still yields the sentence the reader reads.
 */
export function articleFaqEntries(post: BlogPost) {
  return post.blocks
    .filter((block) => block.kind === "faq")
    .flatMap((block) => block.entries)
    .map((entry) => ({
      question: entry.question,
      answer: inlineToText(entry.answer),
    }))
}

export function buildArticleStructuredData(post: BlogPost, updatedAt: string) {
  const url = `${SITE_URL}${localizedPath(`/blog/${post.slug}`, post.locale)}`
  const faqEntries = articleFaqEntries(post)

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: updatedAt,
        inLanguage: post.locale,
        author: author(post),
        publisher: buildOrganization(post.locale),
        // The article's own card (SEO-E18), which is also what
        // `generateMetadata` puts in `og:image`. Those two have to be the same
        // URL: an `image` in JSON-LD that no scraper ever fetches is a claim
        // about a picture nobody sees. A frontmatter `image` overrides the
        // generated card — both paths go through `articleImageUrl` so the two
        // cannot disagree.
        image: articleImageUrl(post),
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": url,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: HOME_CRUMB[post.locale],
            item: `${SITE_URL}${localizedPath("/", post.locale)}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: BLOG_CRUMB[post.locale],
            item: `${SITE_URL}${localizedPath("/blog", post.locale)}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: url,
          },
        ],
      },
      // Emitted only when the article actually has questions. An empty
      // `FAQPage` is a claim that the page answers nothing, which is worse than
      // saying nothing at all — the same reason the blog index emits no `Blog`
      // node when there are no posts.
      ...(faqEntries.length > 0
        ? [
            buildFaqPage({
              id: url,
              inLanguage: post.locale,
              entries: faqEntries,
            }),
          ]
        : []),
    ],
  }
}
