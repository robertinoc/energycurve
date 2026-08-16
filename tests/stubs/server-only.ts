/**
 * No-op stand-in for the `server-only` package under Vitest.
 *
 * The real module throws on import outside a React Server Component, which is
 * exactly what it's for — and which would otherwise make every server module
 * impossible to unit test. Aliased in vitest.config.ts.
 */
export {}
