<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# EnergyCurve Notes

- Current scope is the product MVP: playlist ingestion, the energy/analysis/recommendation engines, and the results UI. Implement engines strictly against the frozen constants in `lib/product/strategy.ts` — do not invent new scoring rules.
- Data ownership is enforced in the service layer (`services/*-service.ts`): every playlist/track function takes a `profileId` and scopes queries by it. Never skip that check — RLS will not catch it (see decision 22 in `docs/decisions.md`).
- Authentication must use WorkOS AuthKit. Do not introduce Supabase Auth.
- Supabase is reserved for application data and is accessed server-side only through `lib/supabase/server.ts`.
- `proxy.ts` fulfills the middleware/protected-route role because this project uses Next.js 16.
- Keep `README.md` and `docs/*.md` updated whenever infrastructure changes.
