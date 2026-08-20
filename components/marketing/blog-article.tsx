import Link from "next/link"

import { BlogShell } from "@/components/marketing/blog-shell"
import { BLOG_COPY, formatPostDate } from "@/lib/content/blog-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { BlogBlock, InlineNode } from "@/lib/blog/markdown"
import type { BlogPost } from "@/lib/blog/posts"

/**
 * One article, rendered from the parsed blocks.
 *
 * No `dangerouslySetInnerHTML`. The parser used to emit an HTML string, which
 * meant it owned HTML escaping and every edit to it carried the question of
 * whether a stray character in an article could break out of its element.
 * Rendering nodes deletes the question: React escapes text, and there is no
 * string of HTML anywhere to get wrong.
 */
function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.kind) {
          case "strong":
            return <strong key={index}>{node.text}</strong>
          case "em":
            return <em key={index}>{node.text}</em>
          case "link":
            // Internal links go through next/link so they don't reload the app;
            // external ones are plain anchors with the usual safety attributes.
            return node.href.startsWith("/") ? (
              <Link key={index} href={node.href}>
                {node.text}
              </Link>
            ) : (
              <a
                key={index}
                href={node.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {node.text}
              </a>
            )
          default:
            return node.text
        }
      })}
    </>
  )
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.kind) {
    case "heading": {
      // The level is data, so the tag has to be chosen rather than written.
      const Tag = `h${block.level}` as "h2" | "h3" | "h4"
      return (
        <Tag>
          <Inline nodes={block.inline} />
        </Tag>
      )
    }
    case "list": {
      const Tag = block.ordered ? "ol" : "ul"
      return (
        <Tag>
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline nodes={item} />
            </li>
          ))}
        </Tag>
      )
    }
    case "code":
      return (
        <pre>
          <code>{block.lines.join("\n")}</code>
        </pre>
      )
    case "table":
      return (
        <table>
          <thead>
            <tr>
              {block.header.map((cell, index) => (
                <th key={index}>
                  <Inline nodes={cell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>
                    <Inline nodes={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    default:
      return (
        <p>
          <Inline nodes={block.inline} />
        </p>
      )
  }
}

export function BlogArticle({ post }: { post: BlogPost }) {
  return (
    <BlogShell locale={post.locale}>
      <article className="flex flex-col gap-5">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
            {BLOG_COPY.publishedOn[post.locale]}{" "}
            {formatPostDate(post.publishedAt!, post.locale)}
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.15]">
            {post.title}
          </h1>
        </header>

        {/* .ec-prose styles the bare elements the blocks render into, so the
            parser stays free of presentation and the CSS stays in one place. */}
        <div className="ec-prose">
          {post.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </div>

        <nav className="border-t border-white/8 pt-6">
          <Link
            href={localizedPath("/blog", post.locale)}
            className="text-sm text-white/60 transition hover:text-white"
          >
            ← {BLOG_COPY.backToIndex[post.locale]}
          </Link>
        </nav>
      </article>
    </BlogShell>
  )
}
