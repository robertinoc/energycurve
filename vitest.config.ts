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

    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "html", "lcov"],
      reportsDirectory: "./coverage",

      // Only what a test could meaningfully cover. Pages and layouts are
      // composition — they render other things and are exercised by Playwright;
      // counting them would make the number move when the app grows rather than
      // when the tested surface does.
      include: ["lib/**/*.ts", "services/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "**/*.d.ts",
        "lib/content/**", // copy tables: data, not behaviour
        "docs/**",
      ],

      // Note: Vitest 4 dropped the `all` flag — with an explicit `include`,
      // files no test imports are reported at zero by default, which is the
      // behaviour that matters here. Without it a headline percentage lies by
      // omission: the untested half is simply invisible.

      /**
       * Thresholds are the floor already cleared, not an aspiration — a gate
       * that fails on day one gets removed on day two.
       *
       * The per-directory entries are the point. `services/` is where data
       * ownership is enforced (every function takes a profileId and scopes by
       * it; AGENTS.md: "RLS will not catch a miss"), and it currently has no
       * tests at all — so its floor starts at zero and is raised as the suite
       * from F2 lands. `lib/engine` and `lib/playlists` carry the scoring rules
       * and the parsers, which is where a regression costs a user real data.
       */
      thresholds: {
        // Measured on 2026-09-11, then set one point below. A floor is what has
        // already been cleared; a gate that fails the day it lands gets deleted
        // the day after. Raise them as coverage arrives — never lower one to
        // make a run pass.
        //
        // Baseline 63.1/62.1/71.5/62.6 on 2026-09-11, raised as the F2 suites
        // landed: now 67.5/65.8/74.7/67.1.
        statements: 67,
        branches: 65,
        functions: 74,
        lines: 67,

        // The engine and the parsers are where a regression costs a DJ real
        // data — a wrong score, or a library entry overwritten on export.
        "lib/engine/**": { statements: 94, branches: 85, functions: 95, lines: 94 },
        "lib/playlists/**": { statements: 93, branches: 86, functions: 96, lines: 93 },
        "lib/music/**": { statements: 98, branches: 92, functions: 99, lines: 98 },
        "lib/product/**": { statements: 96, branches: 94, functions: 87, lines: 96 },
        "lib/smart-order/**": { statements: 96, branches: 92, functions: 99, lines: 96 },

        // Both started at zero and are still low, which is the point: the
        // number has to be visible rather than absent. services/ is where data
        // ownership is enforced — every function takes a profileId and scopes by
        // it, and AGENTS.md is explicit that RLS will not catch a miss. The
        // tenancy suite covers playlist-service; the other sixteen services are
        // still untested. app/api went 0 → 43 with the six route suites; what
        // remains uncovered there is mostly the smart-order Claude path, which
        // needs a recorded conversation rather than a guard test.
        "services/**": { statements: 8, branches: 8, functions: 12, lines: 8 },
        "app/api/**": { statements: 43, branches: 38, functions: 38, lines: 43 },
      },
    },
  },
})
