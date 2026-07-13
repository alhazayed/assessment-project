/** Log errors without serializing full PostgREST/Supabase objects (may contain PHI). */
export function logError(context: string, err: unknown): void {
  if (err instanceof Error) {
    console.error(context, err.message)
    return
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    console.error(context, String((err as { message: unknown }).message))
    return
  }
  console.error(context, 'unknown error')
}
