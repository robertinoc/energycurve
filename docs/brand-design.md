# Brand & Design

## Purpose

This document captures the first brand pass for EnergyCurve so visual decisions
stay consistent as the product grows beyond infrastructure.

## Logo Concept

- The logo is a minimal ISO mark built from a single rounded waveform.
- It represents the rise, fall, and release of energy across a DJ set.
- The shape avoids literal music notes or overused DJ symbols.
- The motion language is smooth, geometric, and slightly futuristic.

## Core Palette

- Background: `#0B0B0F`
- Primary violet: `#7B3FE4`
- Secondary cyan: `#00D1FF`
- Accent pink: `#FF2D75`
- Surface: `#1A1A22`
- Monochrome mark: `#F3F7FF`

The gradient transitions from violet to cyan to suggest motion, nightlife, and
energy without adding shadows or heavy effects.

## Typography

- Headings use `Space Grotesk`
- Body copy uses `Inter`
- Product IDs and technical values can use `Geist Mono`

This pairing keeps the interface clean and modern while adding a slightly edgy
music-tech tone through the heading style.

## Assets Created

- Gradient ISO mark: [energycurve-iso-gradient.svg](/Users/robertinoc/Documents/code/energycurve/public/brand/energycurve-iso-gradient.svg)
- Monochrome ISO mark: [energycurve-iso-mono.svg](/Users/robertinoc/Documents/code/energycurve/public/brand/energycurve-iso-mono.svg)
- App icon / favicon: [icon.svg](/Users/robertinoc/Documents/code/energycurve/app/icon.svg)
- Reusable React lockup: [energycurve-logo.tsx](/Users/robertinoc/Documents/code/energycurve/components/brand/energycurve-logo.tsx)

## Current Integration

- The landing page now uses the logo and palette as the first branded surface.
- Auth screens use the logo lockup and dark nightlife-inspired backgrounds.
- The dashboard now includes a branded interactive curve concept, tracklist panel, and metrics rail.
- The browser icon uses the gradient mark through `app/icon.svg`.
- Core visual tokens now live in `app/globals.css` so the whole app shares the same dark design system.

## Usage Guidance

- Use the gradient mark on dark surfaces when the brand should feel most expressive.
- Use the monochrome mark when contrast or simplicity matters more than color.
- Prefer the ISO mark at small sizes such as favicons, compact headers, and future mobile/app icons.
- Keep the mark on dark backgrounds unless a dedicated inverse system is added later.
- Avoid literal notes, turntables, headphones, or generic DJ clichés in future visual assets.

## Product UI Direction

- Dark UI by default
- Clean surfaces with visible borders
- Soft hover glows, not aggressive shadows
- Rounded corners and deliberate spacing
- Curves and motion used as the primary visual motif

The current dashboard graph is intentionally illustrative. It exists to define
how EnergyCurve should feel before real analysis and playlist logic are built.

## Follow-ups

- Extend the same palette and motion language into dashboard and product surfaces.
- Add a full wordmark export set if marketing pages or social assets need it.
- Expand the design system with form, table, and empty-state guidance.
- Revisit illustration, motion, and empty-state guidance once playlist workflows exist.
