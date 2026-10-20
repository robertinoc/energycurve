import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Lote 20, task 9: `shadcn` moved to devDependencies, which took the last
 * seven high advisories (and the critical, before `npm audit fix`) out of
 * `npm audit --omit=dev`. That is only true while nothing imports it from
 * code: today the one use is `@import "shadcn/tailwind.css"`, resolved by
 * Tailwind at build time, and the build's function traces contain no part of
 * it (docs/security/dependencias-2026-10.md). If a component ever imports the
 * package, it would ship — and this fails, so the classification is revisited
 * instead of quietly becoming false.
 */

const ROOT = process.cwd()

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)

    if (statSync(path).isDirectory()) {
      return files(path)
    }

    return /\.(ts|tsx|js|jsx|mjs|css)$/.test(name) ? [path] : []
  })
}

describe("shadcn is a build-time dependency", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"))

  it("is declared for development, not production", () => {
    expect(pkg.dependencies).not.toHaveProperty("shadcn")
    expect(pkg.devDependencies).toHaveProperty("shadcn")
  })

  it("is used only from CSS, never imported by code", () => {
    const uses = ["app", "components", "lib", "services"]
      .flatMap((dir) => files(join(ROOT, dir)))
      .filter((file) => /from\s+["']shadcn|import\s*\(\s*["']shadcn|@import\s+["']shadcn/.test(readFileSync(file, "utf8")))
      .map((file) => relative(ROOT, file))

    expect(uses).toEqual(["app/globals.css"])
  })
})
