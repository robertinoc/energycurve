import { FooterSection } from "@/components/marketing/landing-sections"
import { getSiteCopy, type SiteLocale } from "@/lib/content/site-copy"

/**
 * The landing's footer, under a content page (lote 18).
 *
 * The reason is navigation, not indexing. Somebody who finished an article, a
 * glossary entry or a comparison had no way from there to pricing, the tools or
 * the rest of the site: the bar lives only on the landing, and these pages had
 * no footer. That was deferred three times on an SEO argument the repo never
 * proved — `/tools` is indexed with the same single inbound link — so it is not
 * the argument here, and nothing claims an effect on the crawl.
 *
 * A server component on purpose. `PageShell` is a client component, and the
 * site copy is large: resolving it here and handing the rendered footer to the
 * shell keeps that copy out of the browser bundle of every content page. The
 * footer itself is the landing's, unchanged, with its anchors pointed home.
 */
export function ContentFooter({ locale }: { locale: SiteLocale }) {
  return (
    // The landing's width, so the four columns have the room they were laid
    // out for; the reading column of a content page is too narrow for them.
    <div className="bg-[#08050F] text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pb-10 lg:px-10">
        <FooterSection copy={getSiteCopy(locale)} onLanding={false} />
      </div>
    </div>
  )
}
