import type { MetadataRoute } from "next"

/**
 * PWA manifest. start_url is /login on purpose: the login page redirects
 * authenticated users straight to /dashboard (see app/login/page.tsx), so
 * the installed app opens the dashboard for logged-in users and the login
 * screen (with its signup cross-link) for everyone else.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EnergyCurve",
    short_name: "EnergyCurve",
    description:
      "Analyze DJ set energy, transition quality, and performance flow to design better mixes.",
    id: "/",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#08050F",
    theme_color: "#08050F",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
