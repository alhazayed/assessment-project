/** Client-safe storage key for guest claim tokens. Do not put crypto here. */
export const GUEST_CLAIM_STORAGE_KEY = 'vw_guest_claim_tokens'

/** Guest results older than this are no longer offered for claiming. */
export const GUEST_CLAIM_MAX_AGE_MS = 24 * 60 * 60 * 1000

const MAX_TOKENS = 10

/** Local keys that hold in-progress answers (guest and signed-in drafts). */
const DRAFT_KEY_PREFIXES = ['vw_guest_', 'vw_assessment_']

type StoredClaim = { t: string; at: number }

function parse(raw: string | null): StoredClaim[] {
  if (!raw) return []
  try {
    const list: unknown = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    // Legacy entries were bare strings with no timestamp. Their age is unknown,
    // so they are treated as expired rather than claimed by whoever signs in.
    return list.filter(
      (e): e is StoredClaim =>
        !!e && typeof e === 'object' && typeof (e as StoredClaim).t === 'string' && typeof (e as StoredClaim).at === 'number'
    )
  } catch {
    return []
  }
}

/** Remember a claim token issued for a guest submission. */
export function addGuestClaimToken(token: string): void {
  try {
    const now = Date.now()
    const existing = parse(localStorage.getItem(GUEST_CLAIM_STORAGE_KEY))
      .filter(e => now - e.at < GUEST_CLAIM_MAX_AGE_MS && e.t !== token)
    const next = [...existing, { t: token, at: now }].slice(-MAX_TOKENS)
    localStorage.setItem(GUEST_CLAIM_STORAGE_KEY, JSON.stringify(next))
  } catch {}
}

/** Unexpired claim tokens. Expired ones are pruned from storage as a side effect. */
export function readGuestClaimTokens(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_CLAIM_STORAGE_KEY)
    if (raw === null) return []
    const now = Date.now()
    const all = parse(raw)
    const fresh = all.filter(e => now - e.at < GUEST_CLAIM_MAX_AGE_MS)
    if (fresh.length === 0) localStorage.removeItem(GUEST_CLAIM_STORAGE_KEY)
    else if (fresh.length !== all.length || raw !== JSON.stringify(fresh)) {
      localStorage.setItem(GUEST_CLAIM_STORAGE_KEY, JSON.stringify(fresh))
    }
    return fresh.map(e => e.t)
  } catch {
    return []
  }
}

export function clearGuestClaimTokens(): void {
  try { localStorage.removeItem(GUEST_CLAIM_STORAGE_KEY) } catch {}
}

/**
 * Remove guest-claim tokens and every locally saved assessment draft. Called on
 * logout so the next person on a shared device can't see or claim them.
 */
export function clearLocalAssessmentData(): void {
  try {
    const doomed: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key === GUEST_CLAIM_STORAGE_KEY || DRAFT_KEY_PREFIXES.some(p => key.startsWith(p)))) {
        doomed.push(key)
      }
    }
    doomed.forEach(k => localStorage.removeItem(k))
  } catch {}
}
