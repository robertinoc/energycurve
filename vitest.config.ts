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
    exclude: [...defaultExclude, "**/.claude/**", "**/.next/**"],
  },
})
