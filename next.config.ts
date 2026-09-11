import type { NextConfig } from "next"

const BACKSTAGE_HOST = "backstage.energycurve.app"

/**
 * Content Security Policy — the header this app did not have.
 *
 * Shipped as **Report-Only** first, which is not hedging: an enforcing policy
 * that is one directive short takes the site down, and there is no way to know
 * it is one directive short without watching real traffic. Report-Only makes
 * every violation visible in the browser console while breaking nothing, and the
 * switch to enforcement is a one-word edit to the header key above.
 *
 * What each directive is for, and why the two loose ones are loose:
 *
 * - `script-src` allows `'unsafe-inline'` because Next's App Router inlines its
 *   own bootstrap and the RSC payload, and `lib/seo.ts` renders four JSON-LD
 *   blocks inline. The clean fix is a per-request nonce — which requires reading
 *   the request in the root layout, and that opts **every** page out of static
 *   rendering. Twelve marketing routes currently prerender; paying a
 *   per-request cost on all of them to harden against an XSS we have no evidence
 *   of is the wrong trade today. Written down so it is a decision and not an
 *   oversight.
 * - `style-src` allows `'unsafe-inline'` for the same structural reason:
 *   Tailwind and Next both inject inline style attributes.
 * - `connect-src` names PostHog's ingestion and asset hosts explicitly. Note
 *   they are the **US** region, which the privacy policy's "EU region" claim is
 *   about Supabase and not about analytics — flagged separately in the
 *   compliance pass.
 * - `frame-ancestors 'none'` says the same thing as `X-Frame-Options: DENY`,
 *   for browsers that honour CSP instead.
 * - `object-src 'none'` and `base-uri 'self'` close two injection routes that
 *   cost nothing to close.
 * - `form-action 'self'`: Stripe checkout is reached by a JS redirect to a
 *   hosted URL, not by posting a form off-origin, so it needs no exception.
 *
 * Fonts are self-hosted by `next/font/google` at build time, so no external
 * font origin appears here. Crisp has an env var in Vercel but is not loaded by
 * any code in this repo; if it is ever added, it needs entries in `script-src`
 * and `connect-src` and this comment should stop saying otherwise.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.vercel.com",
  "font-src 'self' data:",
  "connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://*.supabase.co",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ")

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=()",
  },
  {
    // Report-Only on purpose — see the note above CONTENT_SECURITY_POLICY.
    key: "Content-Security-Policy-Report-Only",
    value: CONTENT_SECURITY_POLICY,
  },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // The admin panel must never be indexed, whichever host serves it.
      {
        source: "/:path*",
        has: [{ type: "host", value: BACKSTAGE_HOST }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/backstage/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ]
  },
  async rewrites() {
    return {
      // backstage.energycurve.app serves the /backstage segment of this same
      // app (StageLink's behind.stagelink.art pattern). API routes, Next
      // internals, and static files keep their real paths.
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: BACKSTAGE_HOST }],
          destination: "/backstage",
        },
        {
          source: "/:path((?!backstage|api/|_next/|_vercel/|.*\\..*).*)",
          has: [{ type: "host", value: BACKSTAGE_HOST }],
          destination: "/backstage/:path",
        },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
}

export default nextConfig
