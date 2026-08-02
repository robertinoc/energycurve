"use client"

import { useEffect } from "react"

/**
 * Last-resort boundary: catches throws in the ROOT layout itself, which no
 * other error.tsx can reach. Next.js replaces the whole document here, so
 * this component must render its own <html> and <body> — and cannot rely on
 * the fonts or providers the root layout would normally set up. Keep it
 * dependency-free and inline-styled for that reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("app.root_layout_failed", error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "18px",
          padding: "48px 24px",
          textAlign: "center",
          background: "#0C0917",
          color: "#F5F2FC",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 600 }}>
          EnergyCurve hit an unexpected error
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: "460px",
            fontSize: "14px",
            lineHeight: 1.7,
            color: "rgba(245,242,252,0.6)",
          }}
        >
          Your data is safe. Try again — if it keeps happening, the reference
          below lets us trace exactly what failed.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            cursor: "pointer",
            border: "none",
            borderRadius: "13px",
            padding: "11px 22px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#fff",
            background:
              "linear-gradient(96deg, #A24DE0 0%, #6A5CF0 46%, #22D3EE 100%)",
          }}
        >
          Try again
        </button>
        {error.digest ? (
          <p
            style={{
              margin: 0,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "11px",
              color: "rgba(245,242,252,0.32)",
            }}
          >
            Reference: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  )
}
