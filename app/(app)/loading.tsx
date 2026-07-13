export default function AppLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-8">
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--vw-blue)', borderTopColor: 'transparent' }}
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}
