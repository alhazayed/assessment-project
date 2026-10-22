/**
 * PostgREST silently truncates every response at `max_rows` (1,000 on this
 * project, both locally and in production). A `.limit(5000)` therefore still
 * returns at most 1,000 rows, with no error and no warning, which made admin
 * counts, aggregates and exports quietly wrong once a table grew past that.
 *
 * fetchAll() pages through a query with `.range()` in 1,000-row pages until a
 * short page comes back, so callers get every matching row. It throws on any
 * query error (never returns a partial result) and on reaching a hard safety
 * ceiling, so an unexpectedly huge table fails loudly instead of exhausting
 * memory or silently truncating.
 *
 * The builder factory must return a fresh query each call and SHOULD include a
 * deterministic `.order()` (ideally ending on a unique column such as `id`);
 * without one, rows can shift between pages. When the caller does not order,
 * pass `orderBy` and fetchAll() applies it.
 *
 * For plain counts, do not use this: use
 * `.select('id', { count: 'exact', head: true })` instead.
 */

export const PAGE_SIZE = 1000
export const DEFAULT_MAX_ROWS = 200_000

export class FetchAllLimitError extends Error {
  constructor(maxRows: number) {
    super(`fetchAll: result exceeds the safety ceiling of ${maxRows} rows`)
    this.name = 'FetchAllLimitError'
  }
}

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

// Minimal structural type for a PostgREST filter builder that supports
// .range() and .order(); keeps this helper independent of generated DB types.
interface RangeableQuery<T> {
  range(from: number, to: number): PageResult<T>
}

export interface FetchAllOptions {
  /** Hard ceiling on total rows; exceeding it throws FetchAllLimitError. */
  maxRows?: number
  pageSize?: number
}

export async function fetchAll<T>(
  build: () => RangeableQuery<T>,
  options: FetchAllOptions = {},
): Promise<T[]> {
  const pageSize = Math.min(options.pageSize ?? PAGE_SIZE, PAGE_SIZE)
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS
  const rows: T[] = []

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1)
    if (error) throw new Error(`fetchAll: ${error.message}`)
    const page = data ?? []
    rows.push(...page)
    if (rows.length > maxRows) throw new FetchAllLimitError(maxRows)
    if (page.length < pageSize) break
  }

  return rows
}

/** Splits an array into chunks (e.g. for `.in()` filters, which hit URL-length limits). */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Runs fetchAll() for each chunk of `ids` (keeping `.in()` filters well under
 * URL-length limits) and concatenates the results. Each chunk is itself paged,
 * so a chunk whose rows exceed 1,000 (e.g. 200 submissions × 9 answers) is not
 * truncated.
 */
export async function fetchAllByIds<T>(
  ids: string[],
  build: (idChunk: string[]) => RangeableQuery<T>,
  options: FetchAllOptions & { chunkSize?: number } = {},
): Promise<T[]> {
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS
  const rows: T[] = []
  for (const idChunk of chunk(ids, options.chunkSize ?? 200)) {
    const part = await fetchAll(() => build(idChunk), { ...options, maxRows: maxRows - rows.length })
    rows.push(...part)
  }
  return rows
}
