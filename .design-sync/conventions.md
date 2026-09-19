# EnergyCurve — design system conventions

EnergyCurve is a **dark-only** design system (a DJ set / energy-curve analysis product).
Every component assumes a dark, purple-tinted near-black background. Build on that surface.

## Setup — no provider, but set the dark surface
Components render standalone (no context provider needed). But they use near-white text and
translucent borders, so they only read on a dark background. Set the page up like the app does:

```jsx
// styles.css is already loaded (it @imports the fonts and component CSS).
<div style={{ background: "var(--ec-bg)", color: "var(--ec-text)", fontFamily: "var(--font-sans)", minHeight: "100vh" }}>
  {/* your screen */}
</div>
```

`--ec-bg` is `#08050f`. Never place these components on a white or light surface.

## Styling idiom — CSS variables (+ Tailwind utilities)
Component internals are already styled — you don't pass class names to restyle them; you compose
them and style your **own** layout with the same tokens. Prefer the CSS variables below; they are
the single source of truth (defined in `styles.css`).

**Surfaces:** `--ec-bg` (page) · `--ec-sunken` (inputs) · `--ec-surface` (cards) · `--ec-raised`
**Brand hues:** `--ec-violet` · `--ec-indigo` · `--ec-cyan` · `--ec-magenta` (peaks) · `--ec-amber` (warnings)
**Text:** `--ec-text` · `--ec-text-muted` · `--ec-text-dim`
**Lines:** `--ec-border` · `--ec-border-strong`
**Semantic (shadcn-mapped):** `--primary` · `--secondary` · `--accent` · `--destructive` · `--card` · `--muted` · `--border` · `--ring`
**Fonts:** `--font-sans` (Manrope, body) · `--font-heading` (Space Grotesk, headings) · `--font-mono` (Space Mono, data/eyebrows)

**Signature utility classes** (use verbatim): `ec-gradient-text` (fills text with the violet→cyan
brand gradient — use for hero numbers/wordmarks), `ec-gradient-bg` (the primary CTA gradient
surface), `ec-eyebrow` (Space Mono uppercase cyan label). The gradient is `--ec-gradient`.

## Component API — style via props, not classes
Variants are chosen with props (typed in each `<Name>.d.ts`):

- **Button** — `variant`: `default` (gradient CTA) · `secondary` (cyan) · `outline` · `ghost` ·
  `destructive` · `link`. `size`: `xs` · `sm` · `default` · `lg` · `icon` (+ `icon-xs/-sm/-lg`).
  A leading/trailing inline `<svg>` becomes the button icon.
- **Badge** — `variant`: `default` (violet) · `outline` · `accent` (cyan) · `peak` (magenta) ·
  `warning` (amber) · `positive` (green). Always Space Mono, uppercase — use for data chips (BPM, key).
- **Alert** — `variant`: `default` · `destructive`; compose `AlertTitle`, `AlertDescription`, and a
  leading `<svg>`; optional `AlertAction` (pins a control top-right).
- **Card** — compound: `Card` + `CardHeader` / `CardTitle` / `CardDescription` / `CardAction` /
  `CardContent` / `CardFooter`.
- **Input**, **Textarea**, **NativeSelect** — native form controls on `--ec-sunken`; set
  `aria-invalid` for the error state. Pair each with a **Label** (`htmlFor`/`id`).
- **Separator** — `orientation` `horizontal` | `vertical` (vertical needs a fixed-height parent).
- **Toast** — controlled: `{ show, message }`, fixed bottom-center. **EmptyState** — `{ icon, title,
  description, action }`. **EnergyCurveLogo** — `{ kind: horizontal|square|monochrome, tone, size }`.

## Where the truth lives
Read `styles.css` (and its `@import`ed `_ds_bundle.css`) for the full token set, and each
component's `<Name>.prompt.md` + `<Name>.d.ts` before composing it.

## One idiomatic snippet
```jsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from "energycurve";

<div style={{ background: "var(--ec-bg)", padding: 32, fontFamily: "var(--font-sans)" }}>
  <Card style={{ maxWidth: 380 }}>
    <CardHeader>
      <CardTitle>Set analysis</CardTitle>
      <CardDescription>Your last mix, scored on energy flow.</CardDescription>
    </CardHeader>
    <CardContent>
      <div style={{ display: "flex", gap: 8 }}>
        <Badge variant="accent">128 BPM</Badge>
        <Badge variant="peak">2 peaks</Badge>
      </div>
      <Button variant="default" style={{ marginTop: 16 }}>View report</Button>
    </CardContent>
  </Card>
</div>
```
