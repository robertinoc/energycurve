# EnergyCurve — Brand Implementation Master Prompt

> Copy everything below this line into Claude (Claude Code) at the root of the EnergyCurve repo.
> Attach or reference the `assets/` folder from this brand kit (logo PNGs) — copy it into the app's public/static assets directory first.

---

You are implementing the official **EnergyCurve brand system** across the entire app. EnergyCurve is a copilot that helps DJs design better sets by analyzing the energy curve of their music. Tagline: **"Shape the curve. Own the dancefloor."** Brand personality: **Intelligent · Creative · Nightlife**. The UI must feel like a dark club with the rigor of a data dashboard: neon on near-black, glowing data, calm confident copy.

Apply ALL of the following exactly. Do not invent new colors, fonts, radii or shadows — everything derives from these tokens.

## 1. Design tokens

Define these as CSS custom properties (or the equivalent in the app's styling system, e.g. Tailwind theme extension) and use them EVERYWHERE. Never hardcode other hues.

```css
:root {
  /* Surfaces (purple-tinted near-black — never pure #000) */
  --ec-bg:        #08050F;  /* base canvas */
  --ec-sunken:    #0C0917;  /* wells, inputs, chart backgrounds */
  --ec-surface:   #14101F;  /* cards, panels */
  --ec-raised:    #1C1730;  /* hover states, progress track */

  /* Brand */
  --ec-violet:    #A24DE0;  /* primary brand */
  --ec-indigo:    #4C6EF5;  /* secondary */
  --ec-cyan:      #22D3EE;  /* accent, focus rings, links, eyebrow labels */
  --ec-magenta:   #F0348A;  /* peaks / high energy ONLY — not a general accent */
  --ec-amber:     #F5A524;  /* warnings: sharp drops, flat zones */

  /* Signature gradient — hero moments, primary CTAs, the logo, key data */
  --ec-gradient:  linear-gradient(96deg, #A24DE0 0%, #6A5CF0 46%, #22D3EE 100%);

  /* Text */
  --ec-text:      #F5F2FC;  /* primary */
  --ec-text-muted:#ACA4C4;  /* secondary */
  --ec-text-dim:  #6E6788;  /* captions, timestamps, deemphasized */

  /* Lines */
  --ec-border:    rgba(255,255,255,0.08);
  --ec-border-strong: rgba(255,255,255,0.14);
}
```

Background treatment for full pages: `--ec-bg` plus faint radial glows, e.g.
`radial-gradient(1100px 700px at 15% -8%, rgba(162,77,224,0.16), transparent 60%), radial-gradient(1000px 700px at 92% 4%, rgba(34,211,238,0.12), transparent 58%)`.

Semantic energy colors (for scores, chart markers, badges):
- Energy 8–10 / peaks → `--ec-magenta`
- Energy 5–7 / building → `--ec-violet`
- Energy 1–4 / low → `--ec-indigo`
- Strong close / success → `--ec-cyan`
- Issues (sharp drop, flat zone, weak ending) → `--ec-amber`
- Errors / destructive → `#FF6B8A`

## 2. Typography

Load from Google Fonts: **Space Grotesk** (300–700), **Manrope** (400–800), **Space Mono** (400, 700).

- **Space Grotesk** — headings, the wordmark, big display numbers. Tight letter-spacing on large sizes (−0.02em to −0.03em).
- **Manrope** — ALL body/UI text: paragraphs, labels, buttons, nav.
- **Space Mono** — data ONLY: scores, BPM, timecodes, track numbers, eyebrow labels. Eyebrow labels are 11–12px, weight 700, uppercase, letter-spacing 0.2em, colored `--ec-cyan`.

Scale: Display 76/0.98, H2 42/1.04, H3 19/1.2, Body 16/1.6, Small 13–14, Label 11–12. Never below 12px.

Wordmark in text: `ENERGY` bold 700 with the signature gradient as background-clip text + `CURVE` weight 300 in `#DCD7EC`. Never break this weight contrast.

## 3. Logo

Use the provided PNG assets for marketing surfaces (`logo-horizontal-trans.png` primary, `logo-icon-lockup-trans.png` stacked, `app-icon.png` for app icon contexts). For in-UI use (nav, favicon, empty states) use this exact inline SVG mark — a waveform inside a circle:

```html
<svg viewBox="0 0 228 172" width="34">
  <defs><linearGradient id="ecMark" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#A24DE0"/><stop offset=".5" stop-color="#5468E8"/><stop offset="1" stop-color="#22D3EE"/>
  </linearGradient></defs>
  <circle cx="114" cy="86" r="82" fill="none" stroke="url(#ecMark)" stroke-width="7" opacity="0.9"/>
  <path d="M 24 86 C 28.7 86, 43.7 83, 52 86 C 60.3 89, 66 112.3, 74 104 C 82 95.7, 91.3 34, 100 36 C 108.7 38, 117 111.7, 126 116 C 135 120.3, 145.3 67, 154 62 C 162.7 57, 169.7 82, 178 86 C 186.3 90, 199.7 86, 204 86"
        fill="none" stroke="url(#ecMark)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Give it a neon glow with `filter: drop-shadow(0 0 7px rgba(120,120,255,0.5))`. Rules: minimum 24px tall (icon) / 20px (horizontal); clearspace ≥ the circle's height on all sides; never recolor, stretch, rotate, put on light/busy backgrounds, or add extra shadows. Monochrome fallback: stroke `#F5F2FC` on dark, `#0C0917` on light.

## 4. Components

**Cards / panels**: background `--ec-surface`, `1px solid --ec-border`, border-radius **16–18px**, padding 22–32px. Sunken wells inside cards use `--ec-sunken`, radius 11–12px.

**Buttons** (radius 11px, font Manrope 700 14px, padding 13px 24px):
- Primary: background `--ec-gradient`, white text, `box-shadow: 0 8px 24px rgba(120,60,220,0.35)`.
- Secondary: transparent, `1px solid rgba(255,255,255,0.2)`, text `--ec-text`.
- Tertiary/action: `rgba(34,211,238,0.1)` bg, `1px solid rgba(34,211,238,0.35)`, text `--ec-cyan`.
- Ghost: transparent, `1px solid --ec-border`, text `--ec-text-dim`.

**Inputs**: background `--ec-sunken`, `1px solid rgba(255,255,255,0.1)`, radius 11px, padding 13px 15px, Manrope 14px. Focus: border `--ec-cyan` + `box-shadow: 0 0 0 3px rgba(34,211,238,0.15)`.

**Badges/chips**: pill (radius 20px), Space Mono 700 11.5px uppercase, padding 6px 12px, tinted pattern = `rgba(color, 0.12–0.15)` background + `1px solid rgba(color, 0.4)` border + lightened text of the same hue. E.g. PEAK = magenta family, SHARP DROP / FLAT ZONE = amber/indigo, STRONG CLOSE = cyan, genre chips = violet.

**Track rows**: `--ec-sunken` bg, radius 11px, padding 12px 15px, flex with 14px gap: mono track number (`--ec-text-dim`) · title (Manrope 600 14px) with BPM/duration below in Space Mono 11.5px dim · a 96×7px energy bar (track `--ec-raised`, fill = gradient matching energy level) · mono score number colored by the semantic energy scale.

**Score gauge**: circular SVG ring, 12px stroke, track `--ec-raised`, progress stroke = gradient indigo→violet→magenta with `stroke-linecap: round` and a soft glow; big Space Mono 700 number in the center with the signature gradient as text fill; "OUT OF 10" caption in Space Mono dim.

## 5. The Energy Curve (signature element — most important)

Every set is drawn as a glowing smooth line, energy 1–10 over time. This is the hero of every screen. Spec:

- Smooth curve (Catmull-Rom / monotone cubic interpolation — never straight polylines).
- Stroke 3–3.5px, gradient along the x-axis (indigo → violet → cyan), `stroke-linecap: round`, glow via `filter: drop-shadow(0 0 8px rgba(162,77,224,0.55))`.
- Area fill under the line: vertical gradient `rgba(162,77,224,0.34) → transparent`.
- Chart background: `--ec-sunken`, faint horizontal gridlines `rgba(255,255,255,0.05)`.
- Markers: peak = 7px magenta dot with magenta glow; issue (drop/flat) = 6px amber dot with amber glow; strong close = cyan dot; opening = indigo dot.
- Annotations: small floating pills (Space Mono 700 10.5px) using the tinted-chip pattern: `▲ PEAK 9.7`, `▼ DROP −3`, `FLAT ZONE`. Flat zones also get a translucent amber rect shading behind the curve (`rgba(245,165,36,0.07)`).
- Phase axis below the chart: OPENING · BUILD-UP · PEAK TIME · CLOSING in Space Mono dim, letter-spacing 0.14em.
- Draw-in animation on load: animate `stroke-dashoffset` from path length to 0 over 1.6s `cubic-bezier(.4,0,.2,1)`. Respect `prefers-reduced-motion`.
- Key stats beside/above the chart in Space Mono 700 (30px+): Energy Score (gradient text), Peak (magenta), Duration (white), with tiny Manrope muted labels above each.

Curve states the engine detects — always visualized in these colors: **Peak** (magenta), **Sharp drop** (amber, energy falls ≥3), **Flat zone** (indigo/amber shading, 3+ tracks at one level), **Weak ending** (dim gray line tail).

## 6. Voice & tone (all copy in the app)

Confident coach, never a critic. Clear > jargon. Specific: name the track, the fix, and the why. Encouraging: credit what works before flagging issues. The artist keeps final say — suggest, never command.

- ✅ "Your energy peaks early — try moving track 6 later to build tension."
- ✅ "Strong close. This set lands where it should."
- ❌ "Your set is bad. Score: 3/10." / "Our AI detected suboptimal spectral entropy." / "You must reorder these tracks now."

## 7. Global rules

- Dark theme ONLY. Never pure black; always the purple-tinted scale.
- Neon glow is reserved for: the logo, the energy curve, chart markers, and the score gauge. Do NOT glow buttons, cards or text.
- Magenta means PEAK/high-energy; never use it decoratively.
- No emoji in UI copy. No border-left accent cards. Gradients only where specified (CTA, logo, curve, key numbers).
- Focus states always cyan. Hit targets ≥ 44px on mobile.
- Numbers/data are ALWAYS Space Mono. Everything else follows the two-font rule.

Start by creating the token layer, loading the fonts, and restyling the app shell (nav + background). Then restyle the energy curve chart to the spec in §5, then buttons/inputs/cards/badges/track rows, then the score gauge, then sweep all copy for voice (§6). After each area, show me the result before moving on.
