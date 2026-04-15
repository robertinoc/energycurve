# Branding Implementation

## Purpose

This document defines the production branding implementation for EnergyCurve so
logos, icons, and navigation behavior stay consistent across the marketing
landing and authenticated app.

## Asset Locations

- Canonical horizontal logo source:
  [energycurve-logo-horizontal.png](/Users/robertinoc/Documents/code/energycurve/public/branding/source/energycurve-logo-horizontal.png)
- Canonical square logo source:
  [energycurve-logo-square.png](/Users/robertinoc/Documents/code/energycurve/public/branding/source/energycurve-logo-square.png)
- Canonical stacked transparent brand source:
  [energycurve-logo-monochrome.png](/Users/robertinoc/Documents/code/energycurve/public/branding/source/energycurve-logo-monochrome.png)
- Legacy reconstructed SVG exports kept only for reference:
  [energycurve-logo-horizontal.svg](/Users/robertinoc/Documents/code/energycurve/public/branding/logos/energycurve-logo-horizontal.svg),
  [energycurve-logo-square.svg](/Users/robertinoc/Documents/code/energycurve/public/branding/logos/energycurve-logo-square.svg),
  [energycurve-logo-monochrome.svg](/Users/robertinoc/Documents/code/energycurve/public/branding/logos/energycurve-logo-monochrome.svg)
- App/site icon:
  [energycurve-icon.png](/Users/robertinoc/Documents/code/energycurve/public/branding/icons/energycurve-icon.png)
- Next.js app icon source:
  [app/icon.png](/Users/robertinoc/Documents/code/energycurve/app/icon.png)
- Reusable logo component:
  [energycurve-logo.tsx](/Users/robertinoc/Documents/code/energycurve/components/brand/energycurve-logo.tsx)

## Usage Rules

- Navbar, header, hero, and footer:
  use the horizontal logo by default.
- Favicon, site icon, and compact UI contexts:
  use the square logo / icon.
- Monochrome logo:
  keep available for fallback contexts where a neutral high-contrast treatment
  is needed, but do not use it as the default brand expression.
- The transparent icon asset is the source of truth for compact brand
  placements and app/site icon usage.

## Current Integration

- Landing navbar uses the horizontal logo and stays fixed while scrolling.
- Hero, auth screens, setup states, and dashboard header use the horizontal logo.
- Footer now includes the horizontal logo for a stronger brand close.
- App metadata icons now point to the official square PNG asset.
- `app/icon.png` mirrors the official square brand mark so App Router icon
  generation and metadata stay aligned.
- The current production raster logos now ship with transparent backgrounds, so
  the UI no longer relies on blend-mode workarounds to hide a black matte.

## Fidelity Note

- The provided PNG logos are currently the source of truth because the previous
  reconstructed SVG wordmark was visually incorrect.
- Until a high-fidelity vector redraw is completed, product UI should use the
  canonical PNG sources above instead of the reconstructed SVG files.

## Color Notes

- Background: `#0B0B0F`
- Surface: `#1A1A22`
- Violet: `#7B3FE4`
- Cyan: `#00D1FF`
- Accent pink: `#FF2D75`

The brand system stays dark, premium, and restrained. Glows should be subtle
and mostly reserved for logo lighting, CTA emphasis, and refined hover/focus
states.

## Navbar Decision

EnergyCurve keeps a sticky single-page navigation with section anchors.

Reason:
- the landing is already structured as a single editorial product story
- anchor navigation is faster and lighter than splitting the page into multiple
  routes
- a fixed navbar keeps users oriented after jumping to sections like Story or
  Contact without introducing more routing complexity

Implementation notes:
- the navbar is fixed at the top of the viewport
- sections use `scroll-mt` offsets so anchors do not land underneath the navbar
- hover and active states use subtle brand glow rather than loud effects

## Follow-ups

- If EnergyCurve later gets an Open Graph image pipeline, generate a dedicated
  social preview using the horizontal logo rather than reusing UI screenshots.
- If a light theme is ever introduced, add explicit inverse logo exports rather
  than relying on CSS tricks.
- When marketing assets expand, add `/public/branding/social` for authored OG
  and sharing images.
