const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Returns true when `s` looks like a Postgres uuid (for exact id lookup). */
export function isUuid(s: string): boolean {
  return UUID_RE.test(s)
}

/** Cap on how many candidate user ids a text search folds into a `user_id.in.(...)` filter. */
export const MAX_ID_FILTER = 200

/**
 * Escapes `%` and `_` for use inside a PostgREST `ilike` pattern's value portion.
 * Does NOT make the value safe to interpolate into an `.or()`/`.and()` filter string —
 * use `ilikeOrCondition` for that.
 */
function escapeIlikeWildcards(fragment: string): string {
  return fragment.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Builds one `column.ilike."<value>"` condition safe to embed in a PostgREST `.or(...)`
 * filter string. The `.or()` grammar treats `,`, `(`, `)`, and `.` as structural — a raw
 * search string containing any of them (e.g. "Acme (Pro)") corrupts the filter and the
 * request 400s. PostgREST's own escape hatch is to double-quote the value; this quotes it
 * and escapes the wildcard chars plus the quote/backslash so the quoting itself can't be broken out of.
 */
export function ilikeOrCondition(column: string, rawSearch: string): string {
  const wildcardEscaped = escapeIlikeWildcards(rawSearch)
  const pattern = `%${wildcardEscaped}%`
  const quoted = pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `${column}.ilike."${quoted}"`
}

/**
 * Joins several `ilikeOrCondition` results (or other pre-built PostgREST conditions) into
 * one `.or()` filter string.
 */
export function joinOrConditions(conditions: string[]): string {
  return conditions.join(',')
}

/**
 * Builds a `column.in.(id1,id2,...)` condition. Ids are assumed to be uuids already
 * validated by the caller (e.g. straight from a `users` table query), never raw user input.
 */
export function inCondition(column: string, ids: string[]): string {
  return `${column}.in.(${ids.join(',')})`
}
