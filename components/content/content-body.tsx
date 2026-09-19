import { Callout, Comparacion, CTA, FAQ, Pasos } from "@/components/content/blocks"
import { CurvaDemo } from "@/components/content/curva-demo"
import { EscalaEnergia } from "@/components/content/escala-energia"
import { Prose } from "@/components/content/prose"
import { parseMarkdown } from "@/lib/blog/markdown"
import type { ContentNode } from "@/lib/content/content-nodes"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Turns a list of content nodes into a page.
 *
 * One switch, every component reachable from data. Keeping it exhaustive is the
 * type checker's job: a new node kind added to `ContentNode` fails to compile
 * here until it has a branch, which is better than rendering nothing and
 * discovering it in a screenshot.
 */
export function ContentBody({
  nodes,
  locale,
  page,
}: {
  nodes: ContentNode[]
  locale: SiteLocale
  /** The path these nodes are rendered on, for the CTA's funnel event. */
  page: string
}) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.kind) {
          case "prose":
            return <Prose key={index} blocks={parseMarkdown(node.markdown[locale])} />
          case "curva":
            return <CurvaDemo key={index} shape={node.shape} locale={locale} />
          case "escala":
            return <EscalaEnergia key={index} locale={locale} />
          case "faq":
            return <FAQ key={index} entries={node.entries} locale={locale} />
          case "callout":
            return (
              <Callout
                key={index}
                tone={node.tone}
                title={node.title}
                body={node.body}
                locale={locale}
              />
            )
          case "pasos":
            return <Pasos key={index} steps={node.steps} locale={locale} />
          case "comparacion":
            return (
              <Comparacion
                key={index}
                caption={node.caption}
                leftHeading={node.leftHeading}
                rightHeading={node.rightHeading}
                rows={node.rows}
                locale={locale}
              />
            )
          case "cta":
            return (
              <CTA
                key={index}
                variant={node.variant}
                locale={locale}
                page={page}
              />
            )
        }
      })}
    </>
  )
}
