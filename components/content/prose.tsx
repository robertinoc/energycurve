import Link from "next/link";

import {
  inlineToText,
  type BlogBlock,
  type InlineNode,
} from "@/lib/blog/markdown";

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
            return <strong key={index}>{node.text}</strong>;
          case "em":
            return <em key={index}>{node.text}</em>;
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
            );
          case "link":
            // Internal links go through next/link so they don't reload the app;
            // external ones are plain anchors with the usual safety attributes.
            return node.href.startsWith("/") ? (
              <Link key={index} href={node.href}>
                {node.strong ? <strong>{node.text}</strong> : node.text}
              </Link>
            ) : (
              <a
                key={index}
                href={node.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {node.strong ? <strong>{node.text}</strong> : node.text}
              </a>
            );
          default:
            return node.text;
        }
      })}
    </>
  );
}

export function Block({ block }: { block: BlogBlock }) {
  switch (block.kind) {
    case "heading": {
      // The level is data, so the tag has to be chosen rather than written.
      const Tag = `h${block.level}` as "h2" | "h3" | "h4";
      return (
        <Tag>
          <Inline nodes={block.inline} />
        </Tag>
      );
    }
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag>
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline nodes={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "code":
      return (
        <pre>
          <code>{block.lines.join("\n")}</code>
        </pre>
      );
    case "table":
      /**
       * A scrollable region has to be a keyboard stop, or on a narrow screen
       * the right-hand columns can only be reached by dragging. Same barrier
       * and same fix as the key table and the comparison block; found when the
       * five-column tables of the market comparisons (lote 13) joined the WCAG
       * sweep and mobile-safari flagged `scrollable-region-focusable` on all
       * four pages. Named after its own header row, which is the one name a
       * table carries in every language without the renderer knowing which.
       */
      return (
        <div
          className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/45"
          tabIndex={0}
          role="region"
          aria-label={block.header
            .map((cell) => inlineToText(cell))
            .join(" · ")}
        >
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
        </div>
      );
    case "faq":
      /**
       * Native `<details>`, matching `components/content/blocks.tsx` and for the
       * same reason: every answer ships inside the HTML while collapsed, so a
       * crawler and a reader without JavaScript both get the whole answer.
       * `AGENTS.md` names this explicitly — don't replace it with a JS-only
       * accordion.
       *
       * The classes are deliberately the same as the guides' FAQ rather than
       * new ones. Two FAQs on the same site that look different are two
       * components someone will later have to reconcile.
       */
      return (
        <div className="my-6 flex flex-col gap-2 not-prose">
          {block.entries.map((entry, index) => (
            <details
              key={index}
              className="group rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 sm:px-5"
            >
              <summary className="cursor-pointer list-none font-heading text-sm font-semibold text-white marker:hidden">
                {entry.question}
              </summary>
              <p className="mt-2 text-sm leading-6 text-white/64">
                <Inline nodes={entry.answer} />
              </p>
            </details>
          ))}
        </div>
      );
    default:
      return (
        <p>
          <Inline nodes={block.inline} />
        </p>
      );
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
  );
}
