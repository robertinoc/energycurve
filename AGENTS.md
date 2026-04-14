<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# EnergyCurve Notes

- Current scope is setup and infrastructure only. Do not add playlist analysis, BPM processing, or other DJ product logic in this phase.
- Authentication must use WorkOS AuthKit. Do not introduce Supabase Auth.
- Supabase is reserved for application data and is accessed server-side only through `lib/supabase/server.ts`.
- `proxy.ts` fulfills the middleware/protected-route role because this project uses Next.js 16.
- Keep `README.md` and `docs/*.md` updated whenever infrastructure changes.
