# design-sync NOTES — energycurve

Repo-specific gotchas for the claude.ai/design sync. Read before re-syncing.

## This repo is a Next.js APP, not a component package
- There is no `dist/` and no published entry. The bundle is built from a hand-written
  entry at `.design-sync/.cache/entry.tsx` (gitignored) that re-exports exactly the scoped
  surface: `components/ui/*` (11 shadcn primitives) + `components/brand/energycurve-logo`.
  Passed to the converter via `--entry ./.design-sync/.cache/entry.tsx`.
- **Scope is fixed by two places that must stay in sync**: `cfg.componentSrcMap` (the 12 names +
  their src paths) and the entry file's re-exports. Adding a `components/ui/*` file does NOT
  auto-appear — update both. Regenerate the entry if scope changes.
- `cfg.srcDir = "components"` so group derivation works (brand → group `brand`; ui files land in
  group `general` because both `components` and `ui` are generic dir names).

## CSS is compiled Tailwind v4 (cfg.buildCmd)
- `cfg.cssEntry` points at `.design-sync/.cache/tailwind.css` (gitignored, generated).
- `cfg.buildCmd = "node .design-sync/build-css.mjs"` compiles `app/globals.css` with the Tailwind v4
  CLI and appends the three brand `--font-*` vars. **Run it before every `package-build.mjs`.**
- Requires `@tailwindcss/cli@4` installed in the isolated `.ds-sync/node_modules`
  (`(cd .ds-sync && npm i @tailwindcss/cli@4)`) — that dir is gitignored, so reinstall on a fresh clone.

## next/image crashes the bundle — shimmed
- The real `next/image` drags the Next runtime into the browser bundle and throws
  `ReferenceError: process is not defined` at load, which kills the whole IIFE (nothing lands on
  `window.EnergyCurve`). Aliased to a plain `<img>` shim via `.design-sync/tsconfig.build.json`
  paths → `.design-sync/shims/next-image.tsx`. `cfg.tsconfig` points at that build tsconfig
  (which also carries the `@/*` alias). Only `EnergyCurveLogo` imports next/image.

## Fonts self-hosted (Manrope, Space Grotesk, Space Mono)
- The app loads these via `next/font/google` (runtime-injected `--font-*` vars that don't exist in
  globals.css). We self-host the latin woff2 in `.design-sync/fonts/` (committed) and wire them via
  `cfg.extraFonts`. The `--font-manrope/space-grotesk/space-mono` vars are defined in
  `build-css.mjs`. Downloaded once from the Google Fonts CDN at setup; the woff2 are committed so
  re-sync never refetches.

## Component-specific
- **Toast** is `position: fixed` → `cfg.overrides.Toast = {cardMode:"single", viewport:"480x240"}`
  so the toast renders inside its card instead of escaping. NOTE: `viewport` is a graded key, so
  changing it requires a full `package-build.mjs` re-stamp (a scoped `preview-rebuild` alone aborts
  with `[CONFIG_STALE]`).
- **EnergyCurveLogo**: never author `size="xl"` — that path uses next/image with an absolute PNG
  (`/brand-kit/logo-horizontal-trans.png`) that won't resolve in the bundle. Preview sm/md/lg only
  (self-contained SVG mark + wordmark, gradient renders correctly).
- **Alert** expects a leading inline `<svg>` child (grid layout). **Separator** vertical needs the
  parent flex row to have an explicit height.
- Icons in previews are inline `<svg>` — lucide-react is NOT a bundle export.

## Known render warns
- (none expected once all 12 previews are authored). Before authoring, Badge/EmptyState floor cards
  tripped `[RENDER_BLANK]` — that was the unauthored floor card, resolved by authoring.

## Cosmetic (not a defect)
- Per-story review sheets show tall empty dark space below the short Stage — it's the capture
  viewport, not a rendering problem. Content is top-aligned and complete.

## Re-sync risks (watch-list)
- **Generated inputs are gitignored**: `.design-sync/.cache/{entry.tsx,tailwind.css}` and
  `.ds-sync/node_modules` (incl. `@tailwindcss/cli@4`). On a fresh clone: reinstall `.ds-sync` deps,
  reinstall `@tailwindcss/cli@4`, re-run `cfg.buildCmd`, and regenerate the entry (its content is in
  this file's history / trivially re-derivable from `componentSrcMap`).
- **Scope drift**: entry + `componentSrcMap` are the only definition of what's synced; a new
  `components/ui/*` primitive is invisible until added to both.
- **Font families**: if `app/globals.css` changes the font stack, the self-hosted woff2 in
  `.design-sync/fonts/` and the `--font-*` vars in `build-css.mjs` must be regenerated.
- **CLI version drift**: `@tailwindcss/cli` self-resolved 4.3.x vs the repo's `tailwindcss` 4.2.2 —
  minor; if utility output ever looks off, pin the CLI to match.
