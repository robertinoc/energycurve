# Roadmap Status

## Section 1 — Product & Strategy

**Status:** Complete for v1 definition

What is now closed:

- ICP documented
- MVP scope frozen
- product KPIs defined
- track energy score range defined as `1–10`
- energy score v1 logic documented
- analysis rules documented
- context modes documented
- standard track duration documented

Repository anchors:

- [docs/product-strategy.md](/Users/robertinoc/Documents/code/energycurve/docs/product-strategy.md)
- [lib/product/strategy.ts](/Users/robertinoc/Documents/code/energycurve/lib/product/strategy.ts)

What is intentionally still future work:

- implementing the actual scoring engine
- implementing automated recommendation generation
- building the playlist ingestion and analysis workflows

## Section 2 — Setup & Infra

**Status:** Complete for foundation

What is now closed:

- GitHub repository
- Next.js + TypeScript + Tailwind + `shadcn/ui`
- WorkOS auth infrastructure chosen and wired
- Supabase used as database only
- initial schema created and aligned to the v1 product domain
- environment variables documented
- Vercel deployment configured
- basic structured logging centralized

Repository anchors:

- [docs/setup-infra.md](/Users/robertinoc/Documents/code/energycurve/docs/setup-infra.md)
- [docs/architecture.md](/Users/robertinoc/Documents/code/energycurve/docs/architecture.md)
- [docs/decisions.md](/Users/robertinoc/Documents/code/energycurve/docs/decisions.md)
- [lib/observability/logger.ts](/Users/robertinoc/Documents/code/energycurve/lib/observability/logger.ts)

Known non-blockers:

- WorkOS production unlock remains a deployment-hardening step, not a local foundation blocker
- dedicated Supabase production separation is still strongly recommended before production launch

## Section 3 — Auth & Users

**Status:** Complete for MVP

What is now closed:

- email/password signup
- email/password login
- logout
- route protection through `proxy.ts`
- secure WorkOS-backed session persistence
- minimal user model in `profiles`
- initial post-login dashboard
- common auth failure handling and setup fallback
- optional Google sign-in
- initial auth workflow test coverage

Repository anchors:

- [docs/auth-users.md](/Users/robertinoc/Documents/code/energycurve/docs/auth-users.md)
- [docs/auth-hardening-backlog.md](/Users/robertinoc/Documents/code/energycurve/docs/auth-hardening-backlog.md)
- [app/login/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/login/page.tsx)
- [app/signup/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/signup/page.tsx)
- [app/dashboard/page.tsx](/Users/robertinoc/Documents/code/energycurve/app/dashboard/page.tsx)
- [proxy.ts](/Users/robertinoc/Documents/code/energycurve/proxy.ts)
- [tests/auth-routing.test.ts](/Users/robertinoc/Documents/code/energycurve/tests/auth-routing.test.ts)
- [tests/password-auth-helpers.test.ts](/Users/robertinoc/Documents/code/energycurve/tests/password-auth-helpers.test.ts)

Known post-MVP follow-ups:

- real email verification
- password reset / recovery
- broader auth integration / end-to-end coverage
- account settings / profile management
