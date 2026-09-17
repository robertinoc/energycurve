import type { Metadata } from "next"

import { NotFoundContent } from "@/components/layout/not-found-content"

export const metadata: Metadata = { title: "Página no encontrada" }

/**
 * 404 for the `/es` tree — a Spanish article that moved, or a slug that never
 * existed.
 *
 * Hard-coded to Spanish, unlike its English twin: everything under this root
 * layout is Spanish by construction, so reading the cookie could only produce a
 * Spanish URL apologising in English.
 */
export default function NotFoundEs() {
  return <NotFoundContent locale="es" />
}
