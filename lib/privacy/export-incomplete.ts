/**
 * The export could not read everything, so it is not delivered.
 *
 * In its own module so the route can recognise it without importing the
 * service, which is server-only and, in the route's tests, a mock.
 *
 * Thrown rather than returned so no caller can forget to look: the route turns
 * it into an error response, and the person gets "try again" instead of a file
 * labelled "all your data" that is missing some of it.
 */
export class ExportIncompleteError extends Error {
  constructor(
    readonly table: string,
    readonly reason: "read_failed" | "ceiling_reached" | "count_mismatch" | "count_failed",
    readonly detail: Record<string, unknown> = {}
  ) {
    super(`account export incomplete: ${table} (${reason})`)
    this.name = "ExportIncompleteError"
  }
}
