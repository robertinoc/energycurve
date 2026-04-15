# Technical Decisions

## 1. WorkOS AuthKit over Supabase Auth

**Decision**

Use WorkOS AuthKit as the authentication system.

**Why**

- It matches the explicit product requirement.
- It provides a clean hosted auth experience with App Router support.
- It keeps authentication concerns separate from the application database.

**Consequence**

- Supabase is used only for app data.
- The app needs a profile sync layer to relate WorkOS users to database records.

## 2. Supabase Postgres for application data only

**Decision**

Use Supabase Postgres strictly as the data store for domain tables.

**Why**

- It preserves a clear auth/data boundary.
- It avoids coupling application records to Supabase Auth assumptions.
- It keeps future vendor changes more manageable.

**Consequence**

- Server-side data access is required for now.
- Client-side Supabase access is intentionally postponed.

## 3. Server-only Supabase service role client

**Decision**

Use `SUPABASE_SERVICE_ROLE_KEY` only in server modules.

**Why**

- It avoids secret leakage to the browser.
- It simplifies the initial infrastructure before RLS policies are designed around WorkOS identities.

**Consequence**

- All current reads and writes happen on the server.
- If browser-side access is added later, RLS policies and a browser-safe client strategy must be introduced first.

## 4. `proxy.ts` for route protection

**Decision**

Use `proxy.ts` instead of `middleware.ts`.

**Why**

- Next.js 16 renamed the file convention from `middleware.ts` to `proxy.ts`.
- The user requested middleware-based route protection, and this is the current framework equivalent.

**Consequence**

- Documentation calls out that `proxy.ts` satisfies the middleware requirement.
- Future upgrades should continue following the active Next.js convention.

## 5. Profile synchronization on auth success

**Decision**

Sync the application profile after successful WorkOS authentication and again when bootstrapping the dashboard.

**Why**

- It guarantees a `profiles` record exists early.
- The second sync makes the dashboard resilient if the callback-side sync ever fails temporarily.

**Consequence**

- There is a small amount of intentional duplication for reliability.
- Sync logic remains centralized in `services/profile-service.ts`.

## 6. Freeze product strategy before implementing the analysis engine

**Decision**

Document and freeze the EnergyCurve v1 product strategy in the repository before implementing the analysis engine itself.

**Why**

- The product scope is now clear enough to codify without prematurely building the full engine.
- Engineering needs a stable source of truth for score ranges, contexts, genres, and MVP boundaries.
- This keeps product intent from drifting between docs, schema, and future implementation work.

**Consequence**

- The repository now contains a canonical `docs/product-strategy.md` and `lib/product/strategy.ts`.
- The actual analysis engine remains future implementation work.
- Schema and domain types should align with the frozen strategy instead of placeholder assumptions.

## 7. Fail gracefully when WorkOS is not ready

**Decision**

Convert WorkOS initialization failures into guided setup states or safe redirects instead of raw framework error pages.

**Why**

- Early infrastructure environments frequently start without valid credentials.
- Recoverable failures are easier to debug than proxy/runtime crashes.
- This keeps the project runnable locally even before secrets are configured.

**Consequence**

- Auth entry points now distinguish between a healthy app and an incomplete auth setup.
- End-to-end authentication still cannot be verified without valid WorkOS credentials, but the app remains stable while being configured.

## 8. Keep the official AuthKit provider mounted

**Decision**

Mount `AuthKitProvider` in the root layout even though the current app is mostly server-rendered.

**Why**

- The official WorkOS Next.js guide marks `AuthKitProvider` as required to cover auth edge cases.
- Hosted sign-in and callback flows can trigger browser-side router quirks during development without it.
- The small amount of extra client work is worth the stability gain for the authentication foundation.

**Consequence**

- Auth still remains mostly server-first in EnergyCurve.
- The root layout now includes the provider so future WorkOS client hooks remain compatible.

## 9. Use document navigation for hosted auth entry points

**Decision**

Use normal browser navigation for hosted auth entry points instead of `next/link`.

**Why**

- `/auth/login` and `/auth/signup` immediately redirect to hosted WorkOS URLs on another origin.
- App Router fetch navigation can surface `Failed to fetch` when a client transition follows an external redirect.
- A full document navigation is simpler and more reliable for provider handoffs.

**Consequence**

- Landing CTAs and auth-page CTAs that hand off to WorkOS perform regular browser navigation on purpose.
- `next/link` remains appropriate only when the destination stays inside EnergyCurve.

## 10. Separate infrastructure by environment

**Decision**

Use WorkOS `Staging` for local development, WorkOS `Production` for the Vercel production deployment, and prefer separate Supabase projects for dev and production.

**Why**

- WorkOS user IDs are environment-specific, even when the email address is the same.
- Sharing a single database across staging and production auth identities can create duplicate `profiles` rows for the same human user.
- Clean environment boundaries reduce the chance of testing against production state and make debugging much simpler.

**Consequence**

- `.env.local` should stay aligned with local URLs and WorkOS `Staging`.
- Vercel production env vars should use WorkOS `Production` credentials and production callback URLs.
- A separate production Supabase project is strongly recommended before product data starts to matter.

## 11. Start the product identity with an ISO mark

**Decision**

Introduce the EnergyCurve brand with a minimal waveform ISO mark before expanding into a larger visual system.

**Why**

- The product needed a recognizable identity without waiting for full product design.
- A single smooth waveform ties directly to the idea of rising and falling set energy.
- SVG logo assets are lightweight, scalable, and easy to reuse across the app, docs, and future marketing surfaces.

**Consequence**

- The current brand pass focuses on the logo, favicon, landing page, and auth surfaces first.
- Broader dashboard and product styling can build from the same palette and shape language later.

## 12. Use illustrative dashboard data during the design pass

**Decision**

Use intentionally static demo track and energy data for the branded dashboard interactions until product logic is implemented.

**Why**

- The goal of this pass is to validate product feel, layout, and interaction patterns.
- Real playlist analysis, BPM extraction, and scoring logic are still explicitly deferred.
- A clear illustrative layer keeps design momentum high without pretending the product logic already exists.

**Consequence**

- The dashboard graph, tracklist, and set metrics currently showcase interaction design rather than live playlist analysis.
- Infrastructure facts such as auth state, profile sync, and database-backed counts remain real underneath.

## 13. Prefer a centered product-poster layout for early brand expression

**Decision**

Push the landing page and dashboard toward a centered, launch-poster composition instead of a standard left-aligned SaaS marketing layout.

**Why**

- EnergyCurve needs to feel like a music-tech product, not just a generic operations tool.
- A centered composition gives the logo, tagline, curve visual, and product mockups more presence.
- This direction better matches the intended nightclub-meets-SaaS tone without overcomplicating the component system.

**Consequence**

- Hero sections, dashboard headers, and showcase cards now bias toward symmetry, glow-led framing, and stronger visual hierarchy.
- Future screens should preserve this visual grammar unless a product-specific workflow clearly demands a denser utility layout.

## 14. Return logout traffic to the landing page

**Decision**

After logout, redirect the user back to `/` instead of sending them to a login waypoint.

**Why**

- Returning to the landing page matches the product expectation more closely.
- It keeps the marketing surface and the auth entry surface cleanly separated.

**Consequence**

- Logout now returns to `/`.

## 15. Prefer app-controlled email/password entry over hosted handoff for the primary auth UX

**Decision**

Use app-controlled `/login` and `/signup` forms backed by WorkOS user-management APIs for the primary authentication experience.

**Why**

- The hosted handoff proved too opaque and unpredictable for a typical SaaS-style login and signup flow.
- Product-owned forms make sign-in and account creation debuggable, testable, and consistent for users who are not already known to the auth provider.
- WorkOS still handles credentials, token issuance, and session security underneath.

**Consequence**

- `/login` and `/signup` now submit directly to WorkOS-backed server actions that authenticate users and persist the session with `saveSession`.
- The hosted callback flow remains in the codebase for future auth methods, but it is no longer the primary entry point for email/password users.
- Sign-up currently marks accounts as verified immediately to keep the foundation phase unblocked; a stricter verification flow should be added before production hardening.

## 16. Add Google as a secondary WorkOS-backed auth path

**Decision**

Keep email/password under product-owned UI, but add a dedicated `Continue with Google` path that redirects into WorkOS social login.

**Why**

- EnergyCurve needs a faster sign-in option without giving up the predictability of app-controlled email/password forms.
- WorkOS already owns the OAuth callback, session creation, and identity handling, so social login can reuse the existing secure foundation.
- Keeping Google behind its own route makes the behavior explicit and easier to debug than mixing everything back into the hosted auth landing.

**Consequence**

- `/login` and `/signup` now include a Google CTA that routes through `/auth/social/google`.
- Google Social Login must be enabled in WorkOS for that button to work.
- Email/password and Google now coexist cleanly without reverting the whole auth experience to the hosted handoff.

## 17. Start landing copy with a locale-aware global navigation map

**Decision**

Introduce a small content dictionary for shared landing navigation labels before expanding the rest of the marketing copy.

**Why**

- The next copy pass will arrive in multiple parts and should not be hardcoded ad hoc inside the landing component.
- A minimal locale-aware structure gives EnergyCurve a clean base for English and Spanish copy without forcing full-blown i18n infrastructure too early.
- Shared navigation labels are the safest first slice because they touch multiple anchors and CTA surfaces.

**Consequence**

- Landing navigation labels now come from `lib/content/site-copy.ts`.
- The current marketing screen still renders in English by default, but the structure is ready for future locale switching.
- Future landing copy updates should extend the same content map rather than introducing scattered string constants.
- Hero, features, how-it-works, story, contact, CTA, and footer copy now all hang off the same content source instead of living inline in the page component.

## 18. Keep the public landing page client-light but interaction-capable

**Decision**

Use a small client-side landing shell for locale persistence, navbar scroll behavior, mobile navigation, and section reveal motion, while keeping the rest of the page component tree modular and content-driven.

**Why**

- The marketing page needs EN/ES switching, sticky navigation state, smooth section behavior, and lightweight motion from day one.
- These concerns are inherently client-side, but they do not justify turning the whole app into a heavily interactive frontend bundle.
- A dedicated landing shell keeps the interactivity contained and easy to evolve later.

**Consequence**

- The landing page now uses a focused client wrapper with modular section components.
- Language selection is persisted locally and updates the document language attribute.
- The rest of the app can stay server-first where that remains the better fit.

## 19. Use a public route handler for contact submissions

**Decision**

Implement the public contact form with `app/api/contact` instead of coupling it to auth or dashboard services.

**Why**

- The marketing landing is public and should not require WorkOS authentication.
- A route handler cleanly supports server-side validation, same-origin checks, honeypot handling, rate limiting, and structured logging in one place.
- This keeps the contact flow production-minded without introducing an unnecessary third-party form dependency.

**Consequence**

- Contact submissions are validated and sanitized on the server with Zod.
- The current implementation uses safe structured logging as the delivery fallback until a production notification channel is chosen.
- A future email or CRM integration can plug into `services/contact-service.ts` without changing the public form contract.

## Pending Technical Debt / Follow-ups

- Add automated auth/integration tests once the preferred testing stack is chosen.
- Add RLS policies aligned to WorkOS identities before browser-side Supabase access is introduced.
- Consider dynamic WorkOS redirect URI handling if Vercel preview environments need first-class support.
- Generate database types from Supabase automatically if the schema begins changing frequently.
