import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Brand kit documentation (interactive guide helpers, not app code):
    "docs/brand-kit/**",
    // Claude Code session artifacts (agent worktrees are full repo copies):
    ".claude/**",
    // Generated coverage report. Istanbul's HTML bundles ship their own
    // eslint-disable headers, which this config then reports as unused —
    // two warnings on every local run, from files nobody wrote.
    "coverage/**",
  ]),
]);

export default eslintConfig;
