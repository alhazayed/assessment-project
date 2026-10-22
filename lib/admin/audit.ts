import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AdminAuditEntry {
  actorId: string
  action: string
  targetType: string
  /** audit_log.target_id is a uuid column; a non-uuid id is moved into details.target_key. */
  targetId?: string | null
  details?: Record<string, unknown>
}

/**
 * Writes one admin audit_log row through the service-role client and returns
 * whether it succeeded. It never throws: callers decide whether a failed audit
 * write should fail the request (it should for destructive or PHI-revealing
 * actions) or only be logged.
 */
export async function writeAdminAudit(
  entry: AdminAuditEntry,
  db?: SupabaseClient,
): Promise<boolean> {
  try {
    const client = db ?? createAdminClient()
    const isUuid = entry.targetId != null && UUID_RE.test(entry.targetId)
    const details = { ...(entry.details ?? {}) }
    if (entry.targetId != null && !isUuid) details.target_key = entry.targetId
    const { error } = await client.from('audit_log').insert({
      actor_id: entry.actorId,
      action: entry.action,
      target_type: entry.targetType,
      target_id: isUuid ? entry.targetId : null,
      details,
    })
    if (error) {
      console.error('[admin-audit] insert failed', entry.action, error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[admin-audit] insert threw', entry.action, err instanceof Error ? err.message : err)
    return false
  }
}
