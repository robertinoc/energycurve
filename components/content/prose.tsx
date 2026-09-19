import Link from "next/link"

import type { BlogBlock, InlineNode } from "@/lib/blog/markdown"

/**
 * The renderers for parsed markdown, shared by the blog, the guides and the
 * glossary.
 *
 * They lived inside `blog-article.tsx` until the glossary needed exactly the
 * same thing. Copying them would have been the easy move and the wrong one:
 * two copies of "how a link node becomes an anchor" is how one of them ends up
 * without `rel="noopener"`.
 *
 * No `dangerouslySetInnerHTML` anywhere. React escapes text, the components
 * render elements, and there is no string of HTML to get wrong.
 */
export function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.kind) {
          case "strong":
            return <strong key={index}>{node.text}</strong>
          case "em":
            return <em key={index}>{node.text}</em>
          case "term":
            // The same markup `<Termino>` renders. Not the component itself:
            // that one looks a term up by id, and here the node already carries
            // everything, so going back to the map would be a second lookup
            // that could disagree with the first.
            return (
              <span key={index} className="ec-term">
                <Link
                  href={node.href}
                  className="ec-term-link"
                  aria-describedby={`term-${node.id}`}
                >
                  {node.text}
                </Link>
                <span
                  role="tooltip"
                  id={`term-${node.id}`}
                  className="ec-term-tip"
                >
                  {node.short}
                </span>
              </span>
            )
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

export function Block({ block }: { block: BlogBlock }) {
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

/** A whole parsed document, in the prose styles. */
export function Prose({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="ec-prose">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  )
}
