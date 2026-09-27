import { renderCamelotWheelSvg } from "@/lib/tools/camelot-wheel-svg"

/**
 * `/camelot-wheel.svg` — the downloadable wheel, built once at build time.
 *
 * `force-static` is the point: the file is a function of the key converters
 * and the palette, both of which are constants, so it is an artifact of the
 * build and not a render per request. Served inline so a browser shows it, with
 * a filename so "Save as" gets a sensible name.
 */
export const dynamic = "force-static"

export function GET() {
  return new Response(renderCamelotWheelSvg(), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": 'inline; filename="camelot-wheel.svg"',
      "Cache-Control": "public, max-age=86400",
    },
  })
}
