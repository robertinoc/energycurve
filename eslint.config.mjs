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
    // Design-system material imported from Claude Design (PR #241). Same class
    // as docs/brand-kit above: previews and build helpers that arrive from a
    // generator, not app code anybody writes here. Linting them turned main's
    // CI red the moment they landed — nineteen errors in files whose style is
    // decided somewhere else, and which re-arrive unchanged on the next import.
    ".design-sync/**",
    // Generated coverage report. Istanbul's HTML bundles ship their own
    // eslint-disable headers, which this config then reports as unused —
    // two warnings on every local run, from files nobody wrote.
    "coverage/**",
  ]),
]);

export default eslintConfig;
