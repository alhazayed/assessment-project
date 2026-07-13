const SESSION_KEY = 'vw_rescreen_checked'

/** Fire rescreening check at most once per browser session to avoid duplicate API calls. */
export function triggerRescreeningCheck(): void {
  if (typeof window === 'undefined') return
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // sessionStorage unavailable — still attempt the check
  }
  fetch('/api/check-rescreening', { method: 'POST' }).catch(() => {})
}
