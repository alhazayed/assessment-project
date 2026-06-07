import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ScrollText } from 'lucide-react'

export default async function AdminAuditPage() {
  await requireAdmin()
  const db = createAdminClient()

  const { data: logs } = await db
    .from('audit_log')
    .select('*, profiles(full_name_en, role)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-500 mt-1">Last 100 platform admin actions</p>
        </div>
        <ScrollText className="w-6 h-6 text-gray-400" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Target</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!logs || logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No audit entries yet</td></tr>
            ) : logs.map((log: any) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{log.profiles?.full_name_en || '—'}</p>
                  <p className="text-xs text-gray-400 capitalize">{log.profiles?.role}</p>
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{log.action}</code>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {log.target_type && <span className="text-xs capitalize">{log.target_type}</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{log.reason || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
