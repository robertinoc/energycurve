import { fileURLToPath } from "node:url"

import { defaultExclude, defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // `import "server-only"` throws outside a React Server Component, which
      // makes any module carrying it untestable. The guard is worth keeping —
      // it's what stops a client component pulling a secret into the browser
      // bundle — so it's neutralised here rather than removed from the modules
      // that need it.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    // Agent worktrees under .claude/ are full checkouts of this repo, so the
    // default glob walks into them and runs another branch's suite alongside
    // ours — inflating the reported count and surfacing failures that don't
    // exist in this tree. Same reason .claude/** is in the eslint ignores.
    // (CI clones fresh, so it always saw the real number; only local runs lied.)
    // e2e/ belongs to Playwright. Its files end in .spec.ts, which matches
    // Vitest's default glob, so without this Vitest picks them up and
    // `test.describe` throws — Playwright's runner isn't there to receive it.
    // The two runners have to be told about each other exactly once, here.
    exclude: [...defaultExclude, "**/.claude/**", "**/.next/**", "e2e/**"],
  },
})
