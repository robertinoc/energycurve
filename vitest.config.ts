import { fileURLToPath } from "node:url"

import { defaultExclude, defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
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
