// Compiles the app's Tailwind v4 stylesheet into the design-sync cssEntry, then
// appends the three brand-font CSS variables that next/font sets at runtime in
// the real app (so they don't exist in globals.css) but which the DS bundle
// needs statically. Run before package-build.mjs (this is cfg.buildCmd).
//
// Requires the Tailwind v4 CLI installed under .ds-sync/node_modules (the
// isolated converter dep dir): (cd .ds-sync && npm i @tailwindcss/cli@4)
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';

const IN = 'app/globals.css';
const OUT = '.design-sync/.cache/tailwind.css';
const CLI = '.ds-sync/node_modules/@tailwindcss/cli/dist/index.mjs';

if (!existsSync(CLI)) {
  console.error(`[build-css] Tailwind CLI missing at ${CLI} — run: (cd .ds-sync && npm i @tailwindcss/cli@4)`);
  process.exit(1);
}

const r = spawnSync(process.execPath, [CLI, '-i', IN, '-o', OUT], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);

// next/font assigns these at runtime in the app; define them so bundled
// components render in the brand families (faces ship via cfg.extraFonts).
appendFileSync(
  OUT,
  `\n:root {\n` +
    `  --font-manrope: 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif;\n` +
    `  --font-space-grotesk: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif;\n` +
    `  --font-space-mono: 'Space Mono', ui-monospace, SFMono-Regular, monospace;\n` +
    `}\n`,
);
console.error('[build-css] compiled tailwind.css + appended brand font vars');
