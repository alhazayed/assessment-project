export default function AuthLoading() {
  return (
    <div className="space-y-4 animate-pulse w-full" role="status" aria-live="polite">
      <div className="h-8 rounded bg-gray-200 dark:bg-gray-700 w-3/4 mb-8" />
      <div className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-11 rounded bg-gray-300 dark:bg-gray-600 mt-2" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
