import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { ScrollText } from 'lucide-react'

export default async function AdminAuditPage() {
  await requireAdmin()
  const db = createAdminClient()
  const lang = getLanguage()

  const { data: logs } = await db
    .from('audit_log')
    .select('*, profiles(full_name_en, role)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('admin.audit.title', lang)}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{t('admin.audit.subtitle', lang)}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-50">
          <ScrollText className="w-5 h-5 text-brand-600" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-alt)', borderBottom: '1px solid var(--divider)' }}>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.audit.col.actor', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.audit.col.action', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.audit.col.target', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.audit.col.reason', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.audit.col.timestamp', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {!logs || logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.audit.empty', lang)}</td></tr>
            ) : logs.map((log: any) => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td className="px-4 py-3">
                  <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{log.profiles?.full_name_en || '—'}</p>
                  <p className="text-[11.5px] capitalize" style={{ color: 'var(--text-muted)' }}>{log.profiles?.role}</p>
                </td>
                <td className="px-4 py-3">
                  <code className="text-[11.5px] font-mono px-2 py-0.5 rounded-[4px]"
                    style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{log.action}</code>
                </td>
                <td className="px-4 py-3 text-[12.5px] capitalize" style={{ color: 'var(--text-secondary)' }}>
                  {log.target_type || '—'}
                </td>
                <td className="px-4 py-3 text-[12px] max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>{log.reason || '—'}</td>
                <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
