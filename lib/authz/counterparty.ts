import type { SupabaseClient } from '@supabase/supabase-js'

export type DisplayProfile = {
  full_name_en: string | null
  full_name_ar: string | null
  avatar_url: string | null
}

/**
 * Display-safe profile fields (name and avatar only) for the other party of
 * relationships the caller already loaded through RLS.
 *
 * profiles RLS only lets a user read their own row, so an embed of the
 * counterparty's profile always came back null: patients approved access
 * requests without seeing who asked, and clinicians saw blank patient names.
 * Pass the service-role client and ONLY ids taken from relationship rows the
 * caller is a party to.
 */
export async function fetchDisplayProfiles(
  admin: SupabaseClient,
  ids: string[],
): Promise<Map<string, DisplayProfile>> {
  const byId = new Map<string, DisplayProfile>()
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (unique.length === 0) return byId

  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name_en, full_name_ar, avatar_url')
    .in('id', unique)
  if (error) {
    console.error('[fetchDisplayProfiles] query error:', error)
    return byId
  }
  for (const p of data ?? []) {
    byId.set(p.id as string, {
      full_name_en: p.full_name_en ?? null,
      full_name_ar: p.full_name_ar ?? null,
      avatar_url: p.avatar_url ?? null,
    })
  }
  return byId
}
