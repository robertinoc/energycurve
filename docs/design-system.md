# Design System

## Visual Direction

EnergyCurve uses a dark product surface with neon-accent highlights. The target
feel is modern SaaS discipline with music-tech energy:

- restrained layout structure
- bold contrast
- minimal chrome
- precise spacing
- controlled glow instead of noisy effects
- centered, launch-poster hero compositions on top-level marketing screens

## Core Tokens

### Colors

- Primary: `#7B3FE4`
- Secondary: `#00D1FF`
- Accent: `#FF2D75`
- Background: `#0B0B0F`
- Surface: `#1A1A22`
- Strong surface: `#14141B`
- Border: `#2A2A35`
- Foreground: `#F7F7FB`
- Muted text: `#9297AD`

### Typography

- Headings: `Space Grotesk`
- Body: `Inter`
- Mono / IDs: `Geist Mono`

### Radius and Spacing

- Primary radius range: `8px` to `12px`
- Larger hero/dashboard shells may stretch to `24px+` for atmosphere
- Layout spacing follows an `8px` rhythm

## Component Guidance

### Buttons

- Filled CTAs should use the brand gradient or the primary violet.
- Secondary actions should use dark surfaces with subtle borders.
- Hover states should lift slightly and gain soft glow, never heavy shadows.

### Cards

- Cards sit on dark surfaces with visible borders and restrained elevation.
- Avoid flat black blocks without separation.
- Use rounded corners and enough padding to keep each section breathable.

### Graphs

- Curves should feel like audio-energy motion, not generic finance charts.
- Smooth interpolation is preferred over sharp angles.
- Peaks and dips should be visually obvious.
- Accent the active segment and surface track context on hover.

## Screen Patterns

### Landing Page

- Center the brand, tagline, and hero message early
- Visual proof should feel like a product launch poster, not a generic marketing chart
- Feature sections separated by strong rhythm, not by dense copy
- Social proof can remain placeholder while the product is early

### Dashboard

- Tracklist panel
- Center energy graph with a stronger theatrical glow treatment
- Metrics rail
- Branded header band so the dashboard feels like the same product world as the landing page
- Foundation / infrastructure status pushed lower in the hierarchy

## Implementation Notes

- The current graph and track data in the dashboard are illustrative UI data.
- They exist to validate product direction and interaction design before real
  playlist analysis logic is implemented.
- Brand tokens live primarily in [app/globals.css](/Users/robertinoc/Documents/code/energycurve/app/globals.css).
- The current landing and dashboard were tuned against a higher-fidelity visual target so future design work should preserve the centered composition, banded sections, and neon-on-dark contrast ratio.
