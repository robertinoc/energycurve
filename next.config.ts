import type { NextConfig } from "next"

const BACKSTAGE_HOST = "backstage.energycurve.app"

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
